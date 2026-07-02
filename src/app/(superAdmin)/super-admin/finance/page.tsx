'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Building2, TrendingUp, TrendingDown, ShieldAlert, ShieldCheck,
  Star, Banknote, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, Activity, Loader2,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'
import {
  useSchools,
  useFinancePerformance, useFinanceEfficiency, useTopPayers,
  useFinanceAnomalies, useFinanceAuditFull, useEndOfDaySnapshot,
  usePaymentSecurityAudit, useHighRiskProfiles,
} from '@/lib/hooks/use-super-admin'
import { financeApi } from '@/lib/superAdmin/api/finance.api'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

const pct = (n: number) => `${Math.round(n)}%`

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces', ORANGE_MONEY: 'Orange Money', MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money', BANK: 'Virement', CARD: 'Carte',
}
const METHOD_COLORS: Record<string, string> = {
  CASH: '#71717a', ORANGE_MONEY: '#f97316', MPESA: '#22c55e',
  AIRTEL_MONEY: '#ef4444', BANK: '#6366f1', CARD: '#3b82f6',
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function FinancePage() {
  const { data: schools } = useSchools()
  const [schoolId, setSchoolId] = useState<number | null>(null)
  const id = schoolId ?? 0
  const qc = useQueryClient()

  /* KYC payment profiles */
  const { data: kycProfiles = [], isLoading: loadingKyc } = useQuery({
    queryKey: ['superadmin', 'finance', 'payment-profiles'],
    queryFn: () => financeApi.getPaymentProfiles(),
  })
  const [kycAction, setKycAction] = useState<{ schoolId: number; action: 'verify' | 'reject' } | null>(null)
  const [kycFeedback, setKycFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const verifyMut = useMutation({
    mutationFn: (sid: number) => financeApi.verifyKycProfile(sid),
    onSuccess: () => {
      setKycFeedback({ type: 'success', message: 'Profil KYC validé.' })
      setKycAction(null)
      qc.invalidateQueries({ queryKey: ['superadmin', 'finance', 'payment-profiles'] })
    },
    onError: () => setKycFeedback({ type: 'error', message: 'Erreur lors de la validation.' }),
  })
  const rejectMut = useMutation({
    mutationFn: (sid: number) => financeApi.rejectKycProfile(sid),
    onSuccess: () => {
      setKycFeedback({ type: 'success', message: 'Profil KYC rejeté.' })
      setKycAction(null)
      qc.invalidateQueries({ queryKey: ['superadmin', 'finance', 'payment-profiles'] })
    },
    onError: () => setKycFeedback({ type: 'error', message: 'Erreur lors du rejet.' }),
  })

  const { data: perf,        isLoading: loadingPerf }       = useFinancePerformance(id)
  const { data: levels,      isLoading: loadingLevels }     = useFinanceEfficiency(id)
  const { data: payers,      isLoading: loadingPayers }     = useTopPayers(id)
  const { data: anomalies,   isLoading: loadingAnomalies }  = useFinanceAnomalies(id)
  const { data: audit,       isLoading: loadingAudit }      = useFinanceAuditFull(id)
  const { data: snapshot,    isLoading: loadingSnapshot }   = useEndOfDaySnapshot(id)
  const { data: secAudit,    isLoading: loadingSecAudit }   = usePaymentSecurityAudit(id)
  const { data: highRisk,    isLoading: loadingHighRisk }   = useHighRiskProfiles(id)

  const schoolName = schools?.find((s) => s.id === schoolId)?.name ?? ''

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── Header ── */}
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="max-w-7xl mx-auto px-8 py-6 flex items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Finance</h1>
            <p className="text-sm text-zinc-400 mt-1">
              {schoolName ? `Analyse — ${schoolName}` : 'Sélectionnez un établissement'}
            </p>
          </div>
          {/* School selector */}
          <div className="flex items-center gap-2 border border-zinc-200 rounded-xl px-4 py-2.5 bg-white">
            <Building2 size={14} className="text-zinc-400 flex-shrink-0" />
            <select
              value={schoolId ?? ''}
              onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
              className="text-sm text-zinc-700 bg-transparent focus:outline-none min-w-[220px]"
            >
              <option value="">Choisir un établissement…</option>
              {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
        </div>
      </motion.div>

      {!schoolId ? (
        <div className="max-w-7xl mx-auto px-8 py-24 flex flex-col items-center gap-4 text-zinc-400">
          <Building2 size={40} className="text-zinc-200" />
          <p className="text-sm">Sélectionnez un établissement pour afficher les données financières</p>
        </div>
      ) : (
        <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

          {/* ══ 1. KPI PERFORMANCE ══════════════════════════════════════════ */}
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {loadingPerf ? [...Array(6)].map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />) : perf ? (
              <>
                <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Encaissé</p>
                  <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">{fmt(perf.collected)}</p>
                  <p className="text-xs text-zinc-400 mt-2">{perf.studentCount} élèves</p>
                </div>

                <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-6">
                  <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-3">Restant dû</p>
                  <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">{fmt(perf.remaining)}</p>
                  <p className="text-xs text-zinc-400 mt-2">Seuil break-even : {perf.breakEvenThreshold} élèves</p>
                </div>

                <div className={cn(
                  'rounded-2xl border shadow-[0_2px_12px_rgba(0,0,0,0.06)] px-7 py-6',
                  perf.isHealthy ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'
                )}>
                  <p className="text-xs font-semibold uppercase tracking-wider mb-3 text-zinc-500">Efficacité</p>
                  <p className={cn('text-3xl font-bold tabular-nums leading-none', perf.isHealthy ? 'text-emerald-700' : 'text-red-600')}>
                    {pct(perf.efficiency)}
                  </p>
                  <div className="flex items-center gap-1.5 mt-2">
                    {perf.isHealthy
                      ? <><CheckCircle2 size={12} className="text-emerald-600" /><span className="text-xs text-emerald-600 font-medium">Rentable</span></>
                      : <><XCircle size={12} className="text-red-500" /><span className="text-xs text-red-500 font-medium">Sous seuil</span></>
                    }
                  </div>
                </div>
              </>
            ) : null}
          </div>

          {/* ══ 2. CLÔTURE DU JOUR ══════════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold text-zinc-900">Clôture du jour</h2>
                <p className="text-xs text-zinc-400 mt-0.5">Paiements confirmés aujourd'hui</p>
              </div>
              {snapshot && (
                <span className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full',
                  snapshot.reconciliation.status === 'READY_FOR_DEPOSIT'
                    ? 'bg-emerald-50 text-emerald-700'
                    : 'bg-zinc-100 text-zinc-500'
                )}>
                  {snapshot.reconciliation.status === 'READY_FOR_DEPOSIT' ? 'Prêt pour dépôt' : 'Aucune activité'}
                </span>
              )}
            </div>

            {loadingSnapshot ? <Skeleton className="h-32 rounded-xl" /> : snapshot ? (
              <div className="flex flex-wrap gap-6 items-start">
                <div>
                  <p className="text-4xl font-bold text-zinc-900 tabular-nums">{fmt(snapshot.total)}</p>
                  <p className="text-xs text-zinc-400 mt-1">{snapshot.count} transactions · Réf. {snapshot.reconciliation.reference}</p>
                </div>
                {snapshot.methods.length > 0 && (
                  <div className="flex flex-wrap gap-3 mt-1">
                    {snapshot.methods.map((m) => (
                      <div key={m.method} className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-xl px-4 py-2.5">
                        <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: METHOD_COLORS[m.method] ?? '#a1a1aa' }} />
                        <div>
                          <p className="text-xs font-semibold text-zinc-700">{fmt(m.amount)}</p>
                          <p className="text-[10px] text-zinc-400">{METHOD_LABELS[m.method] ?? m.method} · {m.count} txn</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-zinc-400">Aucune activité aujourd'hui</p>
            )}
          </div>

          {/* ══ 3. EFFICACITÉ PAR NIVEAU + TOP PAYEURS ══════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Efficacité par niveau */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <h2 className="text-base font-semibold text-zinc-900 mb-1">Recouvrement par niveau</h2>
              <p className="text-xs text-zinc-400 mb-5">Taux d'encaissement par segment</p>
              {loadingLevels ? <Skeleton className="h-52 rounded-xl" /> : levels?.length ? (
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={levels} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={28}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                    <XAxis
                      dataKey="levelName"
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: '#a1a1aa' }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v) => `${v}%`}
                      domain={[0, 100]}
                    />
                    <RechartsTooltip
                      formatter={(v: number) => [`${Math.round(v)}%`, 'Efficacité']}
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
                    />
                    <Bar dataKey="efficiency" radius={[6, 6, 0, 0]}>
                      {levels.map((entry, i) => (
                        <Cell
                          key={i}
                          fill={entry.efficiency >= 70 ? '#22c55e' : entry.efficiency >= 50 ? '#f97316' : '#ef4444'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-52 flex items-center justify-center text-sm text-zinc-400">Aucune donnée</div>
              )}
            </div>

            {/* Top payeurs */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-7 py-6 border-b border-zinc-100 flex items-center gap-2">
                <Star size={14} className="text-amber-400" />
                <h2 className="text-base font-semibold text-zinc-900">Top payeurs</h2>
                <span className="ml-auto text-xs text-zinc-400">Score ≥ 95</span>
              </div>
              {loadingPayers ? (
                <div className="divide-y divide-zinc-100">
                  {[...Array(5)].map((_, i) => <div key={i} className="px-6 py-3"><Skeleton className="h-4" /></div>)}
                </div>
              ) : payers?.length ? (
                <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                  {payers.slice(0, 10).map((p, idx) => (
                    <div key={p.id} className="flex items-center justify-between px-6 py-3 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn(
                          'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0',
                          idx === 0 ? 'bg-amber-50 text-amber-600'
                            : idx === 1 ? 'bg-zinc-100 text-zinc-500'
                            : 'bg-zinc-50 text-zinc-400'
                        )}>
                          {idx + 1}
                        </span>
                        <p className="text-sm text-zinc-700 font-medium truncate">{p.fullName}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-zinc-400 tabular-nums">{fmt(p.totalPaid)}</span>
                        <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full tabular-nums">
                          {p.score}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-10 text-center text-sm text-zinc-400">Aucun élève avec score ≥ 95</div>
              )}
            </div>
          </div>

          {/* ══ 4. ANOMALIES + AUDIT 360° ════════════════════════════════════ */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Anomalies */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Détection d'anomalies</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">30 derniers jours · Loi de Benford</p>
                </div>
                {anomalies && (
                  <span className={cn(
                    'text-xs font-bold px-3 py-1.5 rounded-full',
                    anomalies.severity === 'HIGH'
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                      : 'bg-emerald-50 text-emerald-700'
                  )}>
                    {anomalies.severity === 'HIGH' ? 'RISQUE ÉLEVÉ' : 'Normal'}
                  </span>
                )}
              </div>

              {loadingAnomalies ? <Skeleton className="h-32 rounded-xl" /> : anomalies ? (
                <div className="space-y-3">
                  {anomalies.reason ? (
                    <p className="text-sm text-zinc-400">{anomalies.reason}</p>
                  ) : (
                    <>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="bg-zinc-50 rounded-xl px-4 py-3">
                          <p className="text-xs text-zinc-400 mb-1">Déviance</p>
                          <p className="text-xl font-bold text-zinc-900 tabular-nums">{anomalies.deviance?.toFixed(2) ?? '—'}</p>
                        </div>
                        <div className={cn('rounded-xl px-4 py-3', anomalies.benfordValid ? 'bg-emerald-50' : 'bg-red-50')}>
                          <p className="text-xs text-zinc-400 mb-1">Loi de Benford</p>
                          <p className={cn('text-sm font-bold', anomalies.benfordValid ? 'text-emerald-700' : 'text-red-600')}>
                            {anomalies.benfordValid ? 'Valide' : 'Suspecte'}
                          </p>
                        </div>
                      </div>

                      {anomalies.anomalies.length > 0 && (
                        <div>
                          <p className="text-xs text-zinc-500 font-semibold mb-2">{anomalies.anomalies.length} paiements suspects</p>
                          <div className="space-y-2 max-h-32 overflow-y-auto">
                            {anomalies.anomalies.slice(0, 5).map((a) => (
                              <div key={a.id} className="flex items-center justify-between text-xs bg-red-50 rounded-lg px-3 py-2">
                                <span className="text-zinc-600">{METHOD_LABELS[a.method] ?? a.method}</span>
                                <span className="font-semibold text-red-600 tabular-nums">{fmt(a.amount)}</span>
                                <span className="text-zinc-400">σ {a.audit.deviance.toFixed(1)}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {anomalies.anomalies.length === 0 && anomalies.severity === 'LOW' && (
                        <div className="flex items-center gap-2 text-sm text-emerald-600">
                          <ShieldCheck size={14} />
                          Aucune anomalie détectée
                        </div>
                      )}
                    </>
                  )}
                </div>
              ) : null}
            </div>

            {/* Audit 360° */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-7">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="text-base font-semibold text-zinc-900">Audit 360°</h2>
                  <p className="text-xs text-zinc-400 mt-0.5">Intégrité base de données</p>
                </div>
                {audit && (
                  <span className={cn(
                    'text-xs font-bold px-3 py-1.5 rounded-full',
                    audit.meta.risk === 'CRITICAL'
                      ? 'bg-red-50 text-red-600 ring-1 ring-red-200'
                      : 'bg-emerald-50 text-emerald-700'
                  )}>
                    {audit.meta.risk}
                  </span>
                )}
              </div>

              {loadingAudit ? <Skeleton className="h-48 rounded-xl" /> : audit ? (
                <div className="space-y-3">
                  {/* Intégrité */}
                  <div className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    audit.audit.integrity.count > 0 ? 'bg-red-50' : 'bg-emerald-50'
                  )}>
                    <div className="flex items-center gap-2">
                      {audit.audit.integrity.count > 0
                        ? <AlertTriangle size={14} className="text-red-500" />
                        : <ShieldCheck size={14} className="text-emerald-600" />
                      }
                      <span className="text-sm font-medium text-zinc-700">Intégrité DB</span>
                    </div>
                    <span className={cn(
                      'text-sm font-bold tabular-nums',
                      audit.audit.integrity.count > 0 ? 'text-red-600' : 'text-emerald-700'
                    )}>
                      {audit.audit.integrity.count} anomalie{audit.audit.integrity.count !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {/* Security gap */}
                  <div className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    audit.audit.securityGap.totalAlerts > 0 ? 'bg-amber-50' : 'bg-zinc-50'
                  )}>
                    <div className="flex items-center gap-2">
                      <ShieldAlert size={14} className={audit.audit.securityGap.totalAlerts > 0 ? 'text-amber-500' : 'text-zinc-400'} />
                      <span className="text-sm font-medium text-zinc-700">Alertes présence</span>
                    </div>
                    <div className="text-right">
                      <span className={cn('text-sm font-bold tabular-nums', audit.audit.securityGap.totalAlerts > 0 ? 'text-amber-600' : 'text-zinc-500')}>
                        {audit.audit.securityGap.totalAlerts}
                      </span>
                      <span className="text-xs text-zinc-400 ml-2">
                        score moy. {audit.audit.securityGap.averageScore.toFixed(1)}
                      </span>
                    </div>
                  </div>

                  {/* Benford */}
                  <div className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    audit.audit.stats.benfordSuspect ? 'bg-red-50' : 'bg-zinc-50'
                  )}>
                    <div className="flex items-center gap-2">
                      <Activity size={14} className={audit.audit.stats.benfordSuspect ? 'text-red-500' : 'text-zinc-400'} />
                      <span className="text-sm font-medium text-zinc-700">Distribution Benford</span>
                    </div>
                    <span className={cn('text-sm font-bold', audit.audit.stats.benfordSuspect ? 'text-red-600' : 'text-zinc-500')}>
                      {audit.audit.stats.benfordSuspect ? 'Suspecte' : 'Normale'}
                    </span>
                  </div>

                  {/* Fraude */}
                  <div className={cn(
                    'flex items-center justify-between rounded-xl px-4 py-3',
                    audit.audit.stats.fraudAlerts.severity === 'HIGH' ? 'bg-red-50' : 'bg-zinc-50'
                  )}>
                    <div className="flex items-center gap-2">
                      {audit.audit.stats.fraudAlerts.severity === 'HIGH'
                        ? <TrendingDown size={14} className="text-red-500" />
                        : <TrendingUp size={14} className="text-zinc-400" />
                      }
                      <span className="text-sm font-medium text-zinc-700">Alertes fraude</span>
                    </div>
                    <span className={cn(
                      'text-xs font-bold px-2.5 py-1 rounded-full',
                      audit.audit.stats.fraudAlerts.severity === 'HIGH' ? 'bg-red-100 text-red-700' : 'bg-zinc-100 text-zinc-500'
                    )}>
                      {audit.audit.stats.fraudAlerts.severity}
                    </span>
                  </div>

                  <p className="text-[10px] text-zinc-300 text-right tabular-nums">
                    Généré le {new Date(audit.meta.at).toLocaleString('fr-FR')}
                  </p>
                </div>
              ) : null}
            </div>

          </div>

          {/* ══ 5. AUDIT SÉCURITÉ PAIEMENTS ═════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 py-5 border-b border-zinc-100 flex items-center gap-2">
              <ShieldAlert size={14} className="text-amber-500" />
              <h2 className="text-base font-semibold text-zinc-900">Audit sécurité paiements</h2>
            </div>
            {loadingSecAudit ? (
              <div className="px-7 py-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-4 rounded-lg" />)}
              </div>
            ) : secAudit && secAudit.length > 0 ? (
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-zinc-100 bg-zinc-50">
                      <th className="px-5 py-3 text-left font-medium text-zinc-400">Paiement</th>
                      <th className="px-5 py-3 text-left font-medium text-zinc-400">Méthode</th>
                      <th className="px-5 py-3 text-left font-medium text-zinc-400">Montant</th>
                      <th className="px-5 py-3 text-left font-medium text-zinc-400">Présence ✓</th>
                      <th className="px-5 py-3 text-left font-medium text-zinc-400">Score risque</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100">
                    {secAudit.map((item, i) => (
                      <tr key={i} className="hover:bg-zinc-50 transition-colors">
                        <td className="px-5 py-3 font-mono text-zinc-700">#{item.paymentId ?? '—'}</td>
                        <td className="px-5 py-3 text-zinc-500 capitalize">{item.method ?? '—'}</td>
                        <td className="px-5 py-3 tabular-nums text-zinc-700">
                          {item.amount !== undefined ? new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(item.amount) : '—'}
                        </td>
                        <td className="px-5 py-3">
                          {item.presenceMatch === true
                            ? <CheckCircle2 size={13} className="text-emerald-500" />
                            : item.presenceMatch === false
                            ? <XCircle size={13} className="text-red-500" />
                            : <span className="text-zinc-300">—</span>
                          }
                        </td>
                        <td className="px-5 py-3">
                          {item.riskScore !== undefined ? (
                            <span className={cn(
                              'font-mono font-bold tabular-nums',
                              item.riskScore >= 70 ? 'text-red-600' : item.riskScore >= 40 ? 'text-amber-500' : 'text-zinc-500'
                            )}>
                              {item.riskScore}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">
                {secAudit ? 'Aucun paiement suspect détecté' : 'Sélectionnez un établissement'}
              </div>
            )}
          </div>

          {/* ══ 6. PROFILS HAUT RISQUE ══════════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 py-5 border-b border-zinc-100 flex items-center gap-2">
              <AlertTriangle size={14} className="text-red-500" />
              <h2 className="text-base font-semibold text-zinc-900">Profils haut risque</h2>
            </div>
            {loadingHighRisk ? (
              <div className="divide-y divide-zinc-100">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="px-7 py-4"><Skeleton className="h-4 rounded-lg" /></div>
                ))}
              </div>
            ) : highRisk && highRisk.length > 0 ? (
              <div className="divide-y divide-zinc-100 max-h-72 overflow-y-auto">
                {highRisk.map((profile, i) => {
                  const fullName = `${profile.firstName ?? ''} ${profile.lastName ?? ''}`.trim()
                  const name = profile.studentName ?? (fullName || `#${profile.studentId ?? profile.id}`)
                  const debt = profile.totalDebt ?? profile.feesBalance
                  return (
                    <div key={i} className="flex items-center justify-between px-7 py-4 hover:bg-zinc-50 transition-colors">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                        {profile.factors && profile.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {profile.factors.slice(0, 3).map((f, j) => (
                              <span key={j} className="text-[10px] text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{f}</span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-4 flex-shrink-0 ml-4">
                        {debt !== undefined && (
                          <span className="text-sm font-mono text-red-600 tabular-nums">
                            {new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(debt)}
                          </span>
                        )}
                        {profile.riskScore !== undefined && (
                          <span className={cn(
                            'text-xs font-bold px-2.5 py-1 rounded-full tabular-nums',
                            profile.riskScore >= 70 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-600'
                          )}>
                            {profile.riskScore}
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">
                {highRisk ? 'Aucun profil à risque élevé' : 'Sélectionnez un établissement'}
              </div>
            )}
          </div>

          {/* ══ 7. KYC PROFILS DE RÈGLEMENT ═════════════════════════════════ */}
          <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="px-7 py-5 border-b border-zinc-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Banknote size={14} className="text-emerald-600" />
                <h2 className="text-base font-semibold text-zinc-900">Profils de règlement KYC</h2>
              </div>
              {kycFeedback && (
                <span className={cn(
                  'text-xs font-semibold px-3 py-1.5 rounded-full',
                  kycFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}>
                  {kycFeedback.message}
                </span>
              )}
            </div>
            {loadingKyc ? (
              <div className="px-7 py-6 space-y-3">
                {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
              </div>
            ) : (kycProfiles as Record<string, unknown>[]).length === 0 ? (
              <div className="px-7 py-10 text-center text-sm text-zinc-400">Aucun profil enregistré</div>
            ) : (
              <div className="divide-y divide-zinc-100">
                {(kycProfiles as Record<string, unknown>[]).map((profile) => {
                  const sid = profile.schoolId as number
                  const name = (profile.school as Record<string, unknown> | undefined)?.name as string | undefined ?? `École #${sid}`
                  const status = profile.kycStatus as string | undefined
                  const isActing = kycAction?.schoolId === sid
                  const STATUS_COLORS: Record<string, string> = {
                    VERIFIED:     'bg-emerald-50 text-emerald-700',
                    PENDING:      'bg-amber-50 text-amber-700',
                    NOT_CONFIGURED: 'bg-zinc-100 text-zinc-500',
                    REJECTED:     'bg-red-50 text-red-600',
                  }
                  return (
                    <div key={sid} className="flex items-center justify-between px-7 py-4 hover:bg-zinc-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Building2 size={14} className="text-zinc-400 flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                          {!!profile.legalName && (
                            <p className="text-xs text-zinc-400 truncate">{String(profile.legalName)}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        {status && (
                          <span className={cn('text-[10px] font-bold px-2.5 py-0.5 rounded-full', STATUS_COLORS[status] ?? 'bg-zinc-100 text-zinc-500')}>
                            {status}
                          </span>
                        )}
                        {status !== 'VERIFIED' && (
                          <button
                            onClick={() => { setKycAction({ schoolId: sid, action: 'verify' }); setKycFeedback(null); verifyMut.mutate(sid) }}
                            disabled={isActing && verifyMut.isPending}
                            className="flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {isActing && verifyMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <CheckCircle2 size={10} />}
                            Valider
                          </button>
                        )}
                        {status !== 'REJECTED' && status !== 'NOT_CONFIGURED' && (
                          <button
                            onClick={() => { setKycAction({ schoolId: sid, action: 'reject' }); setKycFeedback(null); rejectMut.mutate(sid) }}
                            disabled={isActing && rejectMut.isPending}
                            className="flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 px-2.5 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                          >
                            {isActing && rejectMut.isPending ? <Loader2 size={10} className="animate-spin" /> : <XCircle size={10} />}
                            Rejeter
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Lien rapide vers exports */}
          <div className="flex justify-end">
            <a
              href="/super-admin/export"
              className="inline-flex items-center gap-2 text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
            >
              Exporter les données financières
              <ChevronRight size={14} />
            </a>
          </div>

        </div>
      )}
    </div>
  )
}
