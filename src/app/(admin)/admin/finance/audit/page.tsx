'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Shield, AlertTriangle, ClipboardList, CheckCircle, Send, XCircle, ShieldCheck, Search, UserCog,
} from 'lucide-react'
import {
  useFinanceFraudAlerts, useFinanceAuditLogs, useTriggerManualAudit,
  useFinanceIntegrityScan, useFinanceRiskProfiles, useFinanceDuplicates,
  useFinanceLedger, useFinancePresenceSecurity, useFraudRiskAnalysis, useFinanceCashierAudit,
} from '@/lib/hooks/use-admin'
import type { AuditLogEntry } from '@/types/admin'
import { formatMoney } from '@/lib/finance/currency'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { getApiErrorMessage } from '@/lib/api/client'
import { StudentSearchField } from '@/components/admin/shared/student-search-field'

function EmptyState({ icon: Icon, message }: { icon: React.ElementType; message: string }) {
  return (
    <div className="py-12 text-center">
      <Icon size={28} className="mx-auto text-zinc-300 mb-2" />
      <p className="text-sm text-zinc-400">{message}</p>
    </div>
  )
}

export default function AuditPage() {
  const { data: alerts = [], isLoading: alertsLoading, isError: alertsError } = useFinanceFraudAlerts()
  const { data: logs = [] } = useFinanceAuditLogs()
  const { mutate: triggerAudit, isPending: auditing } = useTriggerManualAudit()
  const { data: integrity } = useFinanceIntegrityScan()
  const { data: riskProfiles } = useFinanceRiskProfiles()
  const { data: duplicates } = useFinanceDuplicates()
  const { data: ledger } = useFinanceLedger()
  const { data: presenceSecurity } = useFinancePresenceSecurity()
  const { mutate: analyzeFraudRisk, isPending: analyzingRisk, data: fraudRiskResult } = useFraudRiskAnalysis()
  const [logPage, setLogPage] = useState(1)
  const LOGS_PER_PAGE = 20

  const [riskStudentId, setRiskStudentId] = useState(0)
  const [riskError, setRiskError] = useState('')
  const [cashierId, setCashierId] = useState('')
  const [cashierIdSubmitted, setCashierIdSubmitted] = useState(0)
  const { data: cashierAudit, isLoading: loadingCashierAudit } = useFinanceCashierAudit(cashierIdSubmitted)

  function handleAnalyzeRisk(e: React.FormEvent) {
    e.preventDefault()
    if (!riskStudentId) { setRiskError('Sélectionnez un élève'); return }
    setRiskError('')
    analyzeFraudRisk({ studentId: riskStudentId }, {
      onError: (err) => setRiskError(getApiErrorMessage(err)),
    })
  }

  const rp = riskProfiles as unknown[] | { count?: number } | undefined
  const dup = duplicates as unknown[] | { count?: number } | undefined

  const paginatedLogs = (logs as AuditLogEntry[]).slice((logPage - 1) * LOGS_PER_PAGE, logPage * LOGS_PER_PAGE)
  const totalLogPages = Math.ceil((logs as AuditLogEntry[]).length / LOGS_PER_PAGE)

  return (
    <div className="space-y-6">
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Audit & Fraude</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Surveillance, intégrité et détection des anomalies</p>
        </div>
        <button
          onClick={() => triggerAudit()}
          disabled={auditing}
          className="flex items-center gap-2 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
        >
          <Send size={13} />
          {auditing ? 'Audit en cours...' : 'Déclencher audit manuel'}
        </button>
      </motion.div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center">
              <Shield size={14} className="text-blue-500" />
            </div>
            <p className="text-xs text-zinc-500">Intégrité</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {integrity?.anomaliesFound ?? '—'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">
            {integrity
              ? `${integrity.totalChecked} profils vérifiés · ${integrity.status === 'SECURE' ? 'Système sain' : 'Attention requise'}`
              : 'anomalies en attente de scan'}
          </p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-500" />
            </div>
            <p className="text-xs text-zinc-500">Profils à risque</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {Array.isArray(rp) ? rp.length : rp?.count ?? '—'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">profils identifiés</p>
        </div>
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
              <XCircle size={14} className="text-red-500" />
            </div>
            <p className="text-xs text-zinc-500">Doublons</p>
          </div>
          <p className="text-2xl font-bold text-zinc-900">
            {Array.isArray(dup) ? dup.length : dup?.count ?? '—'}
          </p>
          <p className="text-xs text-zinc-400 mt-1">doublons détectés</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-zinc-900">Alertes fraude</h3>
          {alerts.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-700 font-medium">{alerts.length}</span>
          )}
        </div>
        {alertsError ? (
          <div className="px-5 py-8 text-center">
            <AlertTriangle size={24} className="mx-auto text-red-400 mb-2" />
            <p className="text-sm text-red-600">Impossible de charger les alertes fraude</p>
          </div>
        ) : alertsLoading ? (
          <motion.div className="px-5 py-8 text-center text-sm text-zinc-400">Chargement…</motion.div>
        ) : alerts.length === 0 ? (
          <EmptyState icon={CheckCircle} message="Aucune alerte fraude" />
        ) : (
          <div className="divide-y divide-zinc-50">
            {alerts.map((alert) => (
              <div key={alert.id} className="px-5 py-4 flex items-start gap-3">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${alert.severity === 'HIGH' ? 'bg-red-500' : alert.severity === 'MEDIUM' ? 'bg-amber-500' : 'bg-zinc-400'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${alert.severity === 'HIGH' ? 'bg-red-50 text-red-700' : alert.severity === 'MEDIUM' ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                      {alert.severity}
                    </span>
                    <span className="text-xs font-medium text-zinc-700">{alert.type}</span>
                    {alert.studentName && <span className="text-xs text-zinc-500">{alert.studentName}</span>}
                  </div>
                  <p className="text-xs text-zinc-500 mt-1">{alert.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  {alert.amount != null && <p className="text-sm font-semibold text-zinc-900">{formatMoney(Number(alert.amount))}</p>}
                  <p className="text-xs text-zinc-400">{new Date(alert.createdAt).toLocaleDateString('fr-FR')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center">
              <ShieldCheck size={14} className="text-teal-600" />
            </div>
            <p className="text-xs text-zinc-500">Sécurité présences</p>
          </div>
          {presenceSecurity != null && typeof presenceSecurity === 'object' ? (
            <div className="space-y-1.5">
              {Object.entries(presenceSecurity as Record<string, unknown>)
                .filter(([, v]) => v != null && typeof v !== 'object')
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="text-xs font-semibold text-zinc-800">{String(v)}</span>
                  </div>
                ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Aucune donnée disponible</p>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-rose-50 flex items-center justify-center">
              <Search size={14} className="text-rose-600" />
            </div>
            <p className="text-xs text-zinc-500">Analyse risque fraude</p>
          </div>
          <form onSubmit={handleAnalyzeRisk} className="space-y-2">
            <StudentSearchField
              studentId={riskStudentId}
              onSelect={setRiskStudentId}
              label="Élève"
            />
            {riskError && <p className="text-xs text-red-500">{riskError}</p>}
            <button
              type="submit"
              disabled={analyzingRisk}
              className="w-full px-3 py-1.5 rounded-lg bg-rose-600 text-xs text-white font-medium hover:bg-rose-700 disabled:opacity-50"
            >
              {analyzingRisk ? 'Analyse...' : 'Analyser'}
            </button>
            {fraudRiskResult != null && typeof fraudRiskResult === 'object' && (
              <div className="mt-2 space-y-1 border-t border-zinc-50 pt-2">
                {Object.entries(fraudRiskResult as Record<string, unknown>)
                  .filter(([, v]) => v != null && typeof v !== 'object')
                  .slice(0, 3)
                  .map(([k, v]) => (
                    <div key={k} className="flex items-center justify-between">
                      <span className="text-xs text-zinc-400 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                      <span className="text-xs font-semibold text-zinc-800">{String(v)}</span>
                    </div>
                  ))}
              </div>
            )}
          </form>
        </div>

        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center">
              <UserCog size={14} className="text-indigo-600" />
            </div>
            <p className="text-xs text-zinc-500">Audit caissier</p>
          </div>
          <div className="flex gap-1.5">
            <input
              type="number" min={1}
              value={cashierId}
              onChange={(e) => setCashierId(e.target.value)}
              placeholder="ID caissier"
              className="w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            <button
              onClick={() => setCashierIdSubmitted(Number(cashierId))}
              disabled={!cashierId}
              className="px-3 py-1.5 rounded-lg bg-zinc-800 text-xs text-white font-medium hover:bg-zinc-900 disabled:opacity-50 whitespace-nowrap"
            >
              Voir
            </button>
          </div>
          {loadingCashierAudit ? (
            <p className="text-xs text-zinc-400 mt-2">Chargement...</p>
          ) : cashierAudit != null && typeof cashierAudit === 'object' ? (
            <div className="mt-2 space-y-1">
              {Object.entries(cashierAudit as Record<string, unknown>)
                .filter(([, v]) => v != null && typeof v !== 'object')
                .slice(0, 4)
                .map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between">
                    <span className="text-xs text-zinc-400 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                    <span className="text-xs font-semibold text-zinc-800">{String(v)}</span>
                  </div>
                ))}
            </div>
          ) : null}
        </div>
      </div>

      {integrity && integrity.details.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Anomalies d'intégrité</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {integrity.details.slice(0, 10).map((detail) => (
              <div key={detail.id} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">
                    {formatStudentFullName(detail) || `Élève #${detail.id}`}
                  </p>
                  <p className="text-xs text-zinc-400">
                    Frais {formatMoney(Number(detail.totalFees ?? 0))} · payé {formatMoney(Number(detail.feesPaid ?? 0))}
                  </p>
                </div>
                <span className="text-xs font-semibold text-red-600 tabular-nums">
                  Solde {formatMoney(Number(detail.tuitionBalance ?? 0))}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {rp && Array.isArray(rp) && rp.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Profils à risque</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {rp.map((r: any, i: number) => (
              <div key={r.id ?? i} className="px-5 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-zinc-900">{r.studentName ?? r.name ?? `Profil #${r.id ?? i + 1}`}</p>
                  {r.reason && <p className="text-xs text-zinc-400">{r.reason}</p>}
                </div>
                {r.score != null && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.score > 70 ? 'bg-red-50 text-red-700' : r.score > 40 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500'}`}>
                    Score {r.score}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {dup && Array.isArray(dup) && dup.length > 0 && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
          <div className="px-5 py-4 border-b border-zinc-100">
            <h3 className="text-sm font-semibold text-zinc-900">Doublons détectés</h3>
          </div>
          <div className="divide-y divide-zinc-50">
            {dup.map((d: any, i: number) => (
              <div key={d.id ?? i} className="px-5 py-3.5">
                <p className="text-sm text-zinc-700">{d.description ?? d.reference ?? `Doublon #${i + 1}`}</p>
                {d.amount != null && <p className="text-xs text-zinc-400">{formatMoney(Number(d.amount))}</p>}
              </div>
            ))}
          </div>
        </div>
      )}

      {ledger && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <h3 className="text-sm font-semibold text-zinc-900 mb-4">Grand livre (Ledger)</h3>
          <div className="space-y-2">
            {Object.entries(ledger as object).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between py-1.5 border-b border-zinc-50 last:border-0">
                <span className="text-xs text-zinc-500 capitalize">{k.replace(/([A-Z])/g, ' $1').toLowerCase()}</span>
                <span className="text-xs font-semibold text-zinc-800">
                  {typeof v === 'number' ? Number(v).toLocaleString('fr-FR') : String(v)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-900">Journal d'audit</h3>
        </div>
        {(logs as AuditLogEntry[]).length === 0 ? (
          <EmptyState icon={ClipboardList} message="Aucun événement d'audit" />
        ) : (
          <>
            <div className="divide-y divide-zinc-50">
              {paginatedLogs.map((log) => (
                <div key={log.id} className="px-5 py-3.5 flex items-start gap-3">
                  <div className="w-2 h-2 rounded-full bg-zinc-300 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">{log.action}</span>
                      <span className="text-xs text-zinc-400">{log.resource}</span>
                      {log.actorEmail && <span className="text-xs text-zinc-400">· {log.actorEmail}</span>}
                    </div>
                    {log.description && <p className="text-xs text-zinc-500 mt-0.5">{log.description}</p>}
                  </div>
                  <span className="text-xs text-zinc-400 flex-shrink-0">
                    {new Date(log.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                  </span>
                </div>
              ))}
            </div>
            {totalLogPages > 1 && (
              <div className="px-5 py-3 border-t border-zinc-100 flex items-center justify-between">
                <span className="text-xs text-zinc-400">Page {logPage} / {totalLogPages}</span>
                <div className="flex gap-2">
                  <button disabled={logPage === 1} onClick={() => setLogPage(p => p - 1)}
                    className="px-3 py-1 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40">
                    Précédent
                  </button>
                  <button disabled={logPage === totalLogPages} onClick={() => setLogPage(p => p + 1)}
                    className="px-3 py-1 rounded-lg border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40">
                    Suivant
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
