'use client'

import Link from 'next/link'
import {
  Building2, GraduationCap, Users, Banknote, TrendingUp,
  ArrowRight, ShieldCheck, AlertTriangle, Activity,
  Wifi, WifiOff, Clock, Zap, ChevronRight,
} from 'lucide-react'
import {
  usePlatformStats, useSchools,
  useReconciliationHealth, useProviderStats, useSecurityAlerts,
  useAnomalyDashboard, useMobileMoneyMetrics, useFraudRadar, useQueueStatus,
} from '@/lib/hooks/use-super-admin'
import { cn } from '@/lib/utils'

/* ── helpers ──────────────────────────────────────────────────────────────── */

const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function Dot({ level }: { level: 'EXCELLENT' | 'STABLE' | 'CRITICAL' }) {
  return (
    <span className={cn('inline-block w-2 h-2 rounded-full flex-shrink-0', {
      'bg-emerald-500': level === 'EXCELLENT',
      'bg-sky-400': level === 'STABLE',
      'bg-red-500': level === 'CRITICAL',
    })} />
  )
}

function HealthBadge({ level }: { level: 'EXCELLENT' | 'STABLE' | 'CRITICAL' }) {
  const cfg = {
    EXCELLENT: { label: 'Excellente', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-100' },
    STABLE:    { label: 'Stable',     cls: 'bg-sky-50 text-sky-700 ring-sky-100' },
    CRITICAL:  { label: 'Critique',   cls: 'bg-red-50 text-red-700 ring-red-100' },
  }[level]
  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium ring-1', cfg.cls)}>
      <Dot level={level} />
      {cfg.label}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      'inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums',
      score >= 80 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
    )}>
      {score}
    </span>
  )
}

const HEALTH_LABEL = { EXCELLENT: 'Excellente', STABLE: 'Stable', CRITICAL: 'Critique' } as const

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function SuperAdminDashboardPage() {
  const { data: stats, isLoading, isError, refetch } = usePlatformStats()
  const { data: schools, isLoading: loadingSchools } = useSchools()
  const { data: reconciliation, isLoading: loadingRecon } = useReconciliationHealth()
  const { data: providers, isLoading: loadingProviders } = useProviderStats()
  const { data: alerts, isLoading: loadingAlerts } = useSecurityAlerts()
  const { data: anomalies, isLoading: loadingAnomalies } = useAnomalyDashboard()
  const { data: mmMetrics, isLoading: loadingMM } = useMobileMoneyMetrics()
  const { data: fraudRadar, isLoading: loadingFraud } = useFraudRadar()
  const { data: queue, isLoading: loadingQueue } = useQueueStatus()

  const healthCount = schools?.reduce(
    (acc, s) => { acc[s.health.level] = (acc[s.health.level] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-6 py-5">
          <div>
            <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-xs text-zinc-400 mt-0.5 capitalize">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <Link
            href="/super-admin/schools"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
          >
            Établissements
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-6 space-y-4">

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {isError && (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <span>Impossible de charger les statistiques.</span>
            <button onClick={() => refetch()} className="font-medium underline underline-offset-2">Réessayer</button>
          </div>
        )}

        {/* ══ 1. KPI STRIP ═══════════════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {[
            { label: 'Établissements', icon: Building2,    value: stats?.totalSchools },
            { label: 'Élèves',         icon: GraduationCap, value: stats?.totalStudents?.toLocaleString('fr-FR') },
            { label: 'Utilisateurs',   icon: Users,         value: stats?.activeUsers },
            { label: 'ARPU',           icon: TrendingUp,    value: stats?.arpu != null ? fmt(Number(stats.arpu)) : undefined },
            { label: 'Revenus totaux', icon: Banknote,      value: stats?.totalRevenue != null ? fmt(Number(stats.totalRevenue)) : undefined },
          ].map(({ label, icon: Icon, value }) => (
            <div key={label} className="bg-white rounded-2xl border border-zinc-100 shadow-sm px-5 py-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">{label}</span>
                <Icon size={13} className="text-zinc-200" />
              </div>
              {isLoading
                ? <Sk className="h-7 w-16 mt-1" />
                : <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value ?? '—'}</p>}
            </div>
          ))}
        </div>

        {/* ══ 2. SANTÉ + INFRASTRUCTURE ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">

          {/* Santé des établissements */}
          <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
            <p className="text-xs font-medium text-zinc-400 mb-4">Santé des établissements</p>
            {loadingSchools
              ? <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-10" />)}</div>
              : (
                <div className="divide-y divide-zinc-50">
                  {(['EXCELLENT', 'STABLE', 'CRITICAL'] as const).map((level) => (
                    <div key={level} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-2.5">
                        <Dot level={level} />
                        <span className="text-sm text-zinc-600">{HEALTH_LABEL[level]}</span>
                      </div>
                      <span className="text-sm font-semibold text-zinc-900 tabular-nums">
                        {healthCount?.[level] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          {/* Infrastructure — 3 colonnes */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-3">

            {/* Réconciliation */}
            {loadingRecon
              ? <Sk className="h-36" />
              : reconciliation && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    <Activity size={12} className="text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-medium">Réconciliation</span>
                  </div>
                  <p className={cn(
                    'text-2xl font-semibold tabular-nums',
                    reconciliation.metrics.totalErrors > 0 ? 'text-red-600' : 'text-emerald-600',
                  )}>
                    {reconciliation.metrics.successRate.toFixed(1)}%
                  </p>
                  <div className="text-[11px] text-zinc-400 space-y-0.5">
                    <p>{reconciliation.metrics.totalErrors} erreur{reconciliation.metrics.totalErrors !== 1 ? 's' : ''}</p>
                    <p>moy. {reconciliation.metrics.avgProcessTime}s</p>
                  </div>
                  <span className={cn(
                    'self-start text-[10px] font-medium px-1.5 py-0.5 rounded',
                    reconciliation.metrics.totalErrors > 0
                      ? 'bg-red-50 text-red-600'
                      : 'bg-emerald-50 text-emerald-600',
                  )}>
                    {reconciliation.metrics.totalErrors > 0 ? 'Erreurs' : 'OK'}
                  </span>
                </div>
              )}

            {/* Gateways paiement */}
            {loadingProviders
              ? <Sk className="h-36" />
              : providers && providers.length > 0 && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4">
                  <div className="flex items-center gap-1.5 mb-4">
                    <Wifi size={12} className="text-zinc-400" />
                    <span className="text-xs text-zinc-400 font-medium">Gateways</span>
                  </div>
                  <div className="space-y-2.5">
                    {providers.map((p) => (
                      <div key={p.method} className="flex items-center gap-2">
                        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0',
                          p.reliabilityRate >= 90 ? 'bg-emerald-500'
                          : p.reliabilityRate >= 70 ? 'bg-amber-400' : 'bg-red-500',
                        )} />
                        <span className="text-xs text-zinc-600 flex-1 truncate">{p.method}</span>
                        <span className={cn('text-xs font-mono font-semibold tabular-nums',
                          p.reliabilityRate >= 90 ? 'text-emerald-600'
                          : p.reliabilityRate >= 70 ? 'text-amber-600' : 'text-red-600',
                        )}>
                          {p.reliabilityRate.toFixed(0)}%
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* Queue BullMQ */}
            {loadingQueue
              ? <Sk className="h-36" />
              : queue && (
                <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-4 flex flex-col gap-3">
                  <div className="flex items-center gap-1.5">
                    {queue.redisEnabled
                      ? <Zap size={12} className="text-zinc-400" />
                      : <WifiOff size={12} className="text-zinc-400" />}
                    <span className="text-xs text-zinc-400 font-medium">Queue</span>
                  </div>
                  {!queue.redisEnabled
                    ? <p className="text-xs text-zinc-400">Redis indisponible</p>
                    : (
                      <div className="space-y-2">
                        {([
                          { label: 'Waiting', val: queue.waiting, alert: false },
                          { label: 'Active',  val: queue.active,  alert: false },
                          { label: 'Failed',  val: queue.failed,  alert: queue.failed > 0 },
                        ]).map(({ label, val, alert }) => (
                          <div key={label} className="flex justify-between text-xs">
                            <span className="text-zinc-400">{label}</span>
                            <span className={cn('font-mono font-semibold tabular-nums',
                              alert ? 'text-red-600' : 'text-zinc-800',
                            )}>
                              {val}
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                </div>
              )}
          </div>
        </div>

        {/* ══ 3. ALERTES & FRAUDE ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Paiements suspects */}
          {loadingAlerts
            ? <Sk className="h-44" />
            : alerts && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className={alerts.count > 0 ? 'text-red-500' : 'text-zinc-200'} />
                    <span className="text-xs font-medium text-zinc-500">Paiements suspects</span>
                  </div>
                  <span className={cn('text-xl font-semibold tabular-nums',
                    alerts.count > 0 ? 'text-red-600' : 'text-zinc-300',
                  )}>
                    {alerts.count}
                  </span>
                </div>
                {alerts.recent.length > 0
                  ? (
                    <div className="divide-y divide-zinc-50">
                      {alerts.recent.slice(0, 4).map((a) => (
                        <div key={a.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-xs text-zinc-500 capitalize">{a.method.toLowerCase()}</span>
                          <span className="text-xs font-mono font-semibold text-red-600 tabular-nums">{fmt(a.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )
                  : <p className="text-xs text-zinc-400">Aucune alerte active</p>}
              </div>
            )}

          {/* Anomalies présences */}
          {loadingAnomalies
            ? <Sk className="h-44" />
            : anomalies && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldCheck size={13} className={anomalies.count > 0 ? 'text-amber-500' : 'text-zinc-200'} />
                    <span className="text-xs font-medium text-zinc-500">Anomalies présences</span>
                  </div>
                  <span className={cn('text-xl font-semibold tabular-nums',
                    anomalies.count > 0 ? 'text-amber-600' : 'text-zinc-300',
                  )}>
                    {anomalies.count}
                  </span>
                </div>
                {anomalies.data.length > 0
                  ? (
                    <div className="divide-y divide-zinc-50">
                      {anomalies.data.slice(0, 4).map((e) => (
                        <div key={e.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-xs text-zinc-600 truncate max-w-[200px]">
                            {e.presence
                              ? `${e.presence.student.firstName} ${e.presence.student.lastName}`
                              : `Event #${e.id}`}
                          </span>
                          <ScoreBadge score={e.fraudScore} />
                        </div>
                      ))}
                    </div>
                  )
                  : <p className="text-xs text-zinc-400">Aucune anomalie détectée</p>}
              </div>
            )}
        </div>

        {/* ══ 4. MOBILE MONEY ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">

          {/* Paiements en attente */}
          {loadingMM
            ? <Sk className="h-44" />
            : mmMetrics && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={13} className={mmMetrics.length > 0 ? 'text-amber-500' : 'text-zinc-200'} />
                    <span className="text-xs font-medium text-zinc-500">Mobile Money — Pending</span>
                  </div>
                  <span className={cn('text-xl font-semibold tabular-nums',
                    mmMetrics.length > 0 ? 'text-amber-600' : 'text-zinc-300',
                  )}>
                    {mmMetrics.length}
                  </span>
                </div>
                {mmMetrics.length > 0
                  ? (
                    <div className="divide-y divide-zinc-50">
                      {mmMetrics.slice(0, 4).map((p) => (
                        <div key={p.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-xs text-zinc-500 truncate max-w-[190px]">{p.school.name}</span>
                          <span className="text-xs font-mono font-semibold text-zinc-800 tabular-nums">{fmt(p.amount)}</span>
                        </div>
                      ))}
                      {mmMetrics.length > 4 && (
                        <p className="text-[11px] text-zinc-400 pt-2">+ {mmMetrics.length - 4} autres</p>
                      )}
                    </div>
                  )
                  : <p className="text-xs text-zinc-400">Aucun paiement en attente</p>}
              </div>
            )}

          {/* Fraud radar */}
          {loadingFraud
            ? <Sk className="h-44" />
            : fraudRadar && (
              <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={13} className={fraudRadar.length > 0 ? 'text-red-500' : 'text-zinc-200'} />
                    <span className="text-xs font-medium text-zinc-500">Radar fraude (score &gt;70)</span>
                  </div>
                  <span className={cn('text-xl font-semibold tabular-nums',
                    fraudRadar.length > 0 ? 'text-red-600' : 'text-zinc-300',
                  )}>
                    {fraudRadar.length}
                  </span>
                </div>
                {fraudRadar.length > 0
                  ? (
                    <div className="divide-y divide-zinc-50">
                      {fraudRadar.slice(0, 4).map((f) => (
                        <div key={f.id} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <span className="text-xs text-zinc-500 truncate max-w-[190px]">{f.payment.school.name}</span>
                          <ScoreBadge score={f.fraudScore} />
                        </div>
                      ))}
                    </div>
                  )
                  : <p className="text-xs text-zinc-400">Aucune anomalie critique</p>}
              </div>
            )}
        </div>

        {/* ══ 5. ÉTABLISSEMENTS ══════════════════════════════════════════════ */}
        {(loadingSchools || (schools && schools.length > 0)) && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-50">
              <span className="text-xs font-medium text-zinc-500">Établissements</span>
              <Link
                href="/super-admin/schools"
                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium transition-colors"
              >
                Voir tous →
              </Link>
            </div>
            {loadingSchools
              ? <Sk className="h-48 rounded-none" />
              : schools && (
                <div className="divide-y divide-zinc-50">
                  {schools.slice(0, 6).map((school) => (
                    <Link
                      key={school.id}
                      href={`/super-admin/schools/${school.id}`}
                      className="flex items-center justify-between px-5 py-3.5 hover:bg-zinc-50 transition-colors group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Dot level={school.health.level} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 truncate">{school.name}</p>
                          <p className="text-xs text-zinc-400">
                            {school.city}
                            {' · '}
                            {school._count.students.toLocaleString('fr-FR')} élève{school._count.students !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 ml-3">
                        <HealthBadge level={school.health.level} />
                        <ChevronRight size={13} className="text-zinc-200 group-hover:text-zinc-500 transition-colors" />
                      </div>
                    </Link>
                  ))}
                  {schools.length > 6 && (
                    <div className="px-5 py-3">
                      <Link href="/super-admin/schools" className="text-xs text-zinc-400 hover:text-zinc-600 transition-colors">
                        + {schools.length - 6} autres établissements
                      </Link>
                    </div>
                  )}
                </div>
              )}
          </div>
        )}

      </div>
    </div>
  )
}
