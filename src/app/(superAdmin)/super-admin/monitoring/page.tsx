'use client'

import { useState } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle2, AlertCircle, XCircle, Clock,
  BarChart3, ShieldAlert, Eye, MessageSquare, Loader2, Send,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { getApiErrorMessage } from '@/lib/api/client'
import { monitoringApi } from '@/lib/superAdmin/api/monitoring.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'
import type { SmsIntegrationStatus } from '@/types/super-admin'
import { formatMoney } from '@/lib/finance/currency'

const CARD = 'bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6'
const SKELETON = 'bg-zinc-100 rounded-xl animate-pulse'

function StatBox({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-zinc-400">{sub}</p>}
    </div>
  )
}

function CardTitle({ icon: Icon, title, desc }: { icon: React.ElementType; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-zinc-500" />
      </div>
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
        <p className="text-xs text-zinc-400 mt-0.5">{desc}</p>
      </div>
    </div>
  )
}

function SmsStatusBadge({ status }: { status: SmsIntegrationStatus }) {
  if (status.ready) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg">
        <CheckCircle2 size={12} /> Connecté
      </span>
    )
  }
  if (status.enabled && !status.forceMock) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 px-2 py-1 rounded-lg">
        <AlertCircle size={12} /> Config incomplète
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 bg-zinc-100 px-2 py-1 rounded-lg">
      <Clock size={12} /> Mock (dev)
    </span>
  )
}

export default function MonitoringPage() {
  const [testPhone, setTestPhone] = useState('')
  const [smsFeedback, setSmsFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  const { data: health, isLoading: loadingHealth } = useQuery({
    queryKey: ['superadmin', 'monitoring', 'reconciliation'],
    queryFn: monitoringApi.getReconciliationHealth,
    refetchInterval: 60_000,
  })

  const { data: providers = [], isLoading: loadingProviders } = useQuery({
    queryKey: ['superadmin', 'monitoring', 'providers'],
    queryFn: monitoringApi.getProviderStats,
    refetchInterval: 60_000,
  })

  const { data: alerts, isLoading: loadingAlerts } = useQuery({
    queryKey: ['superadmin', 'monitoring', 'alerts'],
    queryFn: monitoringApi.getSecurityAlerts,
    refetchInterval: 30_000,
  })

  const { data: anomalies, isLoading: loadingAnomalies } = useQuery({
    queryKey: ['superadmin', 'anomalies', 'dashboard'],
    queryFn: anomaliesApi.getDashboard,
    refetchInterval: 60_000,
  })

  const { data: smsStatus, isLoading: loadingSms, refetch: refetchSms } = useQuery({
    queryKey: ['superadmin', 'monitoring', 'sms'],
    queryFn: monitoringApi.getSmsStatus,
    refetchInterval: 60_000,
  })

  const smsTestMutation = useMutation({
    mutationFn: (phone: string) => monitoringApi.sendSmsTest(phone),
    onSuccess: (result) => {
      refetchSms()
      if (result.delivery.success) {
        setSmsFeedback({
          type: 'success',
          message: `SMS envoyé via ${result.delivery.provider} (id: ${result.delivery.messageId ?? '—'})`,
        })
      } else {
        setSmsFeedback({
          type: 'error',
          message: result.delivery.errorMessage ?? 'Échec envoi SMS',
        })
      }
    },
    onError: (err) => {
      setSmsFeedback({ type: 'error', message: getApiErrorMessage(err) })
    },
  })

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div className="max-w-6xl mx-auto px-8 py-6">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center">
              <Activity size={17} className="text-zinc-500" />
            </div>
            <div>
              <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Monitoring</h1>
              <p className="text-sm text-zinc-400 mt-0.5">Réconciliation, providers, alertes sécurité — surveillance temps réel</p>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-5">

        {/* ── Réconciliation ───────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={CheckCircle2} title="Santé de la réconciliation" desc="Dernier cycle de rapprochement des paiements" />
          {loadingHealth ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-14')} />)}
            </div>
          ) : health ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                <StatBox
                  label="Taux de succès"
                  value={`${(health.metrics.successRate * 100).toFixed(1)} %`}
                />
                <StatBox
                  label="Erreurs totales"
                  value={health.metrics.totalErrors}
                />
                <StatBox
                  label="Temps moyen (ms)"
                  value={health.metrics.avgProcessTime.toFixed(0)}
                />
              </div>
              {health.lastRun && (
                <div className="border-t border-zinc-100 pt-4">
                  <p className="text-xs font-medium text-zinc-500 mb-2">Dernier run</p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs text-zinc-600">
                    <div>
                      <p className="text-zinc-400 mb-0.5">Début</p>
                      <p className="font-mono">{new Date(health.lastRun.startTime).toLocaleString('fr-FR')}</p>
                    </div>
                    {health.lastRun.endTime && (
                      <div>
                        <p className="text-zinc-400 mb-0.5">Fin</p>
                        <p className="font-mono">{new Date(health.lastRun.endTime).toLocaleString('fr-FR')}</p>
                      </div>
                    )}
                    <div>
                      <p className="text-zinc-400 mb-0.5">Réconciliés</p>
                      <p className="font-semibold">{health.lastRun.reconciled}</p>
                    </div>
                    <div>
                      <p className="text-zinc-400 mb-0.5">Erreurs</p>
                      <p className={cn('font-semibold', health.lastRun.errors > 0 ? 'text-red-600' : 'text-emerald-600')}>
                        {health.lastRun.errors}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Aucune donnée de réconciliation</p>
          )}
        </div>

        {/* ── SMS ─────────────────────────────────────────────────────── */}
        <div className={CARD}>
          <div className="flex items-start justify-between mb-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-zinc-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare size={16} className="text-zinc-500" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-zinc-900">Intégration SMS</h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Africa&apos;s Talking — OTP staff, invitations, notifications parents
                </p>
              </div>
            </div>
            {smsStatus && <SmsStatusBadge status={smsStatus} />}
          </div>

          {loadingSms ? (
            <div className={cn(SKELETON, 'h-24')} />
          ) : smsStatus ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                <div>
                  <p className="text-zinc-400 mb-0.5">Provider configuré</p>
                  <p className="font-mono text-zinc-800">{smsStatus.provider}</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-0.5">Provider actif</p>
                  <p className="font-mono text-zinc-800">{smsStatus.activeProvider}</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-0.5">Sender ID</p>
                  <p className="font-mono text-zinc-800">{smsStatus.senderId}</p>
                </div>
                <div>
                  <p className="text-zinc-400 mb-0.5">Credentials</p>
                  <p className={cn('font-semibold', smsStatus.credentialsPresent ? 'text-emerald-600' : 'text-red-600')}>
                    {smsStatus.credentialsPresent ? 'Présents' : 'Manquants'}
                  </p>
                </div>
              </div>

              {!smsStatus.ready && (
                <p className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
                  Sur Render, définissez{' '}
                  <code className="bg-white/80 px-1 rounded">SMS_PROVIDER_ENABLED=true</code>,{' '}
                  <code className="bg-white/80 px-1 rounded">SMS_PROVIDER=africas_talking</code>,{' '}
                  <code className="bg-white/80 px-1 rounded">SMS_USERNAME</code> et{' '}
                  <code className="bg-white/80 px-1 rounded">SMS_API_KEY</code>, puis redéployez.
                </p>
              )}

              <div className="border-t border-zinc-100 pt-4 flex flex-col sm:flex-row gap-3">
                <input
                  type="tel"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                  placeholder="+243810000000"
                  className="flex-1 border border-zinc-200 rounded-xl px-3 py-2.5 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-indigo-200"
                />
                <button
                  type="button"
                  disabled={!testPhone.trim() || smsTestMutation.isPending}
                  onClick={() => smsTestMutation.mutate(testPhone.trim())}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium disabled:opacity-50"
                >
                  {smsTestMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Envoyer test SMS
                </button>
              </div>

              {smsFeedback && (
                <p className={cn(
                  'text-xs rounded-xl px-3 py-2',
                  smsFeedback.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                )}>
                  {smsFeedback.message}
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Statut SMS indisponible</p>
          )}
        </div>

        {/* ── Providers ───────────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={BarChart3} title="Statistiques providers" desc="Fiabilité et volume par méthode de paiement" />
          {loadingProviders ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-10')} />)}
            </div>
          ) : providers.length === 0 ? (
            <p className="text-sm text-zinc-400">Aucune donnée provider</p>
          ) : (
            <div className="space-y-3">
              {providers.map((p) => (
                <div key={p.method} className="flex items-center gap-4">
                  <div className="w-28 flex-shrink-0">
                    <span className="text-xs font-medium text-zinc-700 font-mono uppercase">{p.method}</span>
                  </div>
                  <div className="flex-1">
                    <div className="h-2 rounded-full bg-zinc-100 overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          p.reliabilityRate >= 0.95 ? 'bg-emerald-500'
                            : p.reliabilityRate >= 0.80 ? 'bg-amber-400'
                            : 'bg-red-500'
                        )}
                        style={{ width: `${(p.reliabilityRate * 100).toFixed(0)}%` }}
                      />
                    </div>
                  </div>
                  <div className="w-20 text-right flex-shrink-0">
                    <span className="text-xs font-semibold text-zinc-700">{(p.reliabilityRate * 100).toFixed(1)} %</span>
                  </div>
                  <div className="w-24 text-right flex-shrink-0">
                    <span className="text-xs text-zinc-400">{p.volume.toLocaleString('fr-FR')} tx</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Alertes sécurité ────────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={ShieldAlert} title="Alertes sécurité" desc="Transactions suspectes détectées récemment" />
          {loadingAlerts ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-12')} />)}
            </div>
          ) : !alerts ? (
            <p className="text-sm text-zinc-400">Aucune alerte</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2 mb-1">
                {alerts.count > 0
                  ? <XCircle size={15} className="text-red-500" />
                  : <CheckCircle2 size={15} className="text-emerald-500" />
                }
                <span className="text-sm font-semibold text-zinc-700">
                  {alerts.count} alerte{alerts.count !== 1 ? 's' : ''} active{alerts.count !== 1 ? 's' : ''}
                </span>
              </div>
              {alerts.recent.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucune alerte récente</p>
              ) : (
                <div className="border border-zinc-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-400 text-left">
                        <th className="px-4 py-2.5 font-medium">ID</th>
                        <th className="px-4 py-2.5 font-medium">Montant</th>
                        <th className="px-4 py-2.5 font-medium">Méthode</th>
                        <th className="px-4 py-2.5 font-medium">Élève #</th>
                        <th className="px-4 py-2.5 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {alerts.recent.map((a) => (
                        <tr key={a.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-zinc-500">{a.id}</td>
                          <td className="px-4 py-2.5 font-semibold text-zinc-700">
                            {formatMoney(a.amount)}
                          </td>
                          <td className="px-4 py-2.5 font-mono uppercase text-zinc-500">{a.method}</td>
                          <td className="px-4 py-2.5 text-zinc-500">{a.studentId}</td>
                          <td className="px-4 py-2.5 text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(a.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Dashboard anomalies ────────────────────────────────────── */}
        <div className={CARD}>
          <CardTitle icon={Eye} title="Dashboard anomalies" desc="Événements suspects détectés — toutes écoles" />
          {loadingAnomalies ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => <div key={i} className={cn(SKELETON, 'h-12')} />)}
            </div>
          ) : !anomalies ? (
            <p className="text-sm text-zinc-400">Aucune donnée</p>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                {anomalies.count > 0
                  ? <AlertCircle size={15} className="text-amber-500" />
                  : <CheckCircle2 size={15} className="text-emerald-500" />
                }
                <span className="text-sm font-semibold text-zinc-700">
                  {anomalies.count} anomalie{anomalies.count !== 1 ? 's' : ''} détectée{anomalies.count !== 1 ? 's' : ''}
                </span>
              </div>
              {anomalies.data.length === 0 ? (
                <p className="text-sm text-zinc-400">Aucun événement récent</p>
              ) : (
                <div className="border border-zinc-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-zinc-50 text-zinc-400 text-left">
                        <th className="px-4 py-2.5 font-medium">ID</th>
                        <th className="px-4 py-2.5 font-medium">Élève</th>
                        <th className="px-4 py-2.5 font-medium">École</th>
                        <th className="px-4 py-2.5 font-medium">Score fraude</th>
                        <th className="px-4 py-2.5 font-medium">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {anomalies.data.map((ev) => (
                        <tr key={ev.id} className="hover:bg-zinc-50 transition-colors">
                          <td className="px-4 py-2.5 font-mono text-zinc-500">{ev.id}</td>
                          <td className="px-4 py-2.5 text-zinc-700">
                            {ev.presence
                              ? formatStudentFullName(ev.presence.student)
                              : '—'
                            }
                          </td>
                          <td className="px-4 py-2.5 text-zinc-500 truncate max-w-[160px]">
                            {ev.presence?.school.name ?? '—'}
                          </td>
                          <td className="px-4 py-2.5">
                            <span className={cn(
                              'font-bold tabular-nums',
                              ev.fraudScore >= 0.7 ? 'text-red-600' : ev.fraudScore >= 0.4 ? 'text-amber-600' : 'text-emerald-600'
                            )}>
                              {(ev.fraudScore * 100).toFixed(0)} %
                            </span>
                          </td>
                          <td className="px-4 py-2.5 text-zinc-400">
                            <span className="flex items-center gap-1">
                              <Clock size={10} />
                              {new Date(ev.createdAt).toLocaleDateString('fr-FR')}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
