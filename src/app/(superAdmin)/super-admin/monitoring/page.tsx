'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  Activity, CheckCircle2, AlertCircle, XCircle, Clock,
  BarChart3, ShieldAlert, Eye,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { monitoringApi } from '@/lib/superAdmin/api/monitoring.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'

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

export default function MonitoringPage() {
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
                            {a.amount.toLocaleString('fr-FR')} FCFA
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
                              ? `${ev.presence.student.firstName} ${ev.presence.student.lastName}`
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
