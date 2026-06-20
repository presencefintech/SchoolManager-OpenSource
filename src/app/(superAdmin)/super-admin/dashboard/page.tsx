'use client'

import Link from 'next/link'
import {
  Building2, GraduationCap, Users, Banknote, TrendingUp,
  ArrowRight, ShieldCheck, AlertTriangle, Activity,
  Wifi, WifiOff, Clock, Zap, ChevronRight,
  UserCheck, FileSearch, HardDrive, ScrollText,
} from 'lucide-react'
import {
  usePlatformStats, useSchools,
  useReconciliationHealth, useProviderStats, useSecurityAlerts,
  useAnomalyDashboard, useMobileMoneyMetrics, useFraudRadar, useQueueStatus,
  useActiveSessions, useAuditSnapshot, useStorageStats, useAuditTrail,
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
    <span className={cn('inline-block w-2.5 h-2.5 rounded-full flex-shrink-0', {
      'bg-emerald-500': level === 'EXCELLENT',
      'bg-sky-400':    level === 'STABLE',
      'bg-red-500':    level === 'CRITICAL',
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
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ring-1', cfg.cls)}>
      <Dot level={level} />
      {cfg.label}
    </span>
  )
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums',
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
  const { data: sessions, isLoading: loadingSessions } = useActiveSessions()
  const { data: auditSnap, isLoading: loadingAudit } = useAuditSnapshot()
  const { data: storage, isLoading: loadingStorage } = useStorageStats()
  const { data: auditTrail, isLoading: loadingTrail } = useAuditTrail()

  const healthCount = schools?.reduce(
    (acc, s) => { acc[s.health.level] = (acc[s.health.level] ?? 0) + 1; return acc },
    {} as Record<string, number>,
  )

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize">
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <Link
            href="/super-admin/schools"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl bg-zinc-900 text-white hover:bg-zinc-700 transition-colors"
          >
            Établissements
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-6">

        {/* ── Error banner ─────────────────────────────────────────────────── */}
        {isError && (
          <div className="flex items-center justify-between rounded-xl border border-red-200 bg-red-50 px-5 py-4 text-sm text-red-700">
            <span>Impossible de charger les statistiques.</span>
            <button onClick={() => refetch()} className="font-medium underline underline-offset-2">Réessayer</button>
          </div>
        )}

        {/* ══ 1. KPIs FINANCIERS ═════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-7 py-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">Revenus totaux</span>
              <Banknote size={16} className="text-zinc-300" />
            </div>
            {isLoading
              ? <Sk className="h-12 w-44" />
              : <p className="text-5xl font-bold text-zinc-900 tabular-nums tracking-tight leading-none">
                  {stats?.totalRevenue != null ? fmt(Number(stats.totalRevenue)) : '—'}
                </p>}
            <p className="text-xs text-zinc-400 mt-4">Ensemble de la plateforme</p>
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-7 py-6">
            <div className="flex items-center justify-between mb-5">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-widest">ARPU</span>
              <TrendingUp size={16} className="text-zinc-300" />
            </div>
            {isLoading
              ? <Sk className="h-12 w-32" />
              : <p className="text-5xl font-bold text-zinc-900 tabular-nums tracking-tight leading-none">
                  {stats?.arpu != null ? fmt(Number(stats.arpu)) : '—'}
                </p>}
            <p className="text-xs text-zinc-400 mt-4">Revenu moyen par élève actif</p>
          </div>

        </div>

        {/* ══ 1b. KPIs OPÉRATIONNELS ═════════════════════════════════════════ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Établissements',   icon: Building2,     value: isLoading ? null : (stats?.totalSchools ?? '—') },
            { label: 'Élèves',           icon: GraduationCap, value: isLoading ? null : (stats?.totalStudents?.toLocaleString('fr-FR') ?? '—') },
            { label: 'Utilisateurs',     icon: Users,         value: isLoading ? null : (stats?.activeUsers ?? '—') },
            {
              label: 'Sessions en ligne',
              icon: UserCheck,
              value: loadingSessions ? null : (sessions?.length ?? '—'),
              dot: !loadingSessions && sessions && sessions.length > 0,
            },
          ].map(({ label, icon: Icon, value, dot }) => (
            <div key={label} className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-6 py-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-medium text-zinc-400">{label}</span>
                <div className="flex items-center gap-1.5">
                  {dot && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
                  <Icon size={14} className="text-zinc-200" />
                </div>
              </div>
              {value === null
                ? <Sk className="h-8 w-14 mt-1" />
                : <p className="text-2xl font-semibold text-zinc-900 tabular-nums">{value}</p>}
            </div>
          ))}
        </div>

        {/* ══ 2. SANTÉ + INFRASTRUCTURE ══════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
            <p className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-5">Santé des établissements</p>
            {loadingSchools
              ? <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <Sk key={i} className="h-12" />)}</div>
              : (
                <div className="divide-y divide-zinc-50">
                  {(['EXCELLENT', 'STABLE', 'CRITICAL'] as const).map((level) => (
                    <div key={level} className="flex items-center justify-between py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center gap-3">
                        <Dot level={level} />
                        <span className="text-sm text-zinc-600">{HEALTH_LABEL[level]}</span>
                      </div>
                      <span className="text-lg font-semibold text-zinc-900 tabular-nums">
                        {healthCount?.[level] ?? 0}
                      </span>
                    </div>
                  ))}
                </div>
              )}
          </div>

          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-3 gap-4">

            {loadingRecon ? <Sk className="h-40" /> : reconciliation && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">Réconciliation</span>
                </div>
                <p className={cn('text-3xl font-semibold tabular-nums', reconciliation.metrics.totalErrors > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {reconciliation.metrics.successRate.toFixed(1)}%
                </p>
                <div className="text-xs text-zinc-400 space-y-1">
                  <p>{reconciliation.metrics.totalErrors} erreur{reconciliation.metrics.totalErrors !== 1 ? 's' : ''}</p>
                  <p>moy. {reconciliation.metrics.avgProcessTime}s</p>
                </div>
                <span className={cn('self-start text-xs font-medium px-2 py-1 rounded-lg',
                  reconciliation.metrics.totalErrors > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                  {reconciliation.metrics.totalErrors > 0 ? 'Erreurs' : 'OK'}
                </span>
              </div>
            )}

            {loadingProviders ? <Sk className="h-40" /> : providers && providers.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center gap-2 mb-5">
                  <Wifi size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">Gateways</span>
                </div>
                <div className="space-y-3">
                  {providers.map((p) => (
                    <div key={p.method} className="flex items-center gap-2.5">
                      <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                        p.reliabilityRate >= 90 ? 'bg-emerald-500' : p.reliabilityRate >= 70 ? 'bg-amber-400' : 'bg-red-500')} />
                      <span className="text-sm text-zinc-600 flex-1 truncate">{p.method}</span>
                      <span className={cn('text-sm font-mono font-semibold tabular-nums',
                        p.reliabilityRate >= 90 ? 'text-emerald-600' : p.reliabilityRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                        {p.reliabilityRate.toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {loadingQueue ? <Sk className="h-40" /> : queue && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  {queue.redisEnabled ? <Zap size={14} className="text-zinc-400" /> : <WifiOff size={14} className="text-zinc-400" />}
                  <span className="text-xs font-medium text-zinc-400">Queue BullMQ</span>
                </div>
                {!queue.redisEnabled
                  ? <p className="text-sm text-zinc-400">Redis indisponible</p>
                  : (
                    <div className="space-y-2.5">
                      {([
                        { label: 'Waiting', val: queue.waiting, alert: false },
                        { label: 'Active',  val: queue.active,  alert: false },
                        { label: 'Failed',  val: queue.failed,  alert: queue.failed > 0 },
                      ]).map(({ label, val, alert }) => (
                        <div key={label} className="flex justify-between text-sm">
                          <span className="text-zinc-400">{label}</span>
                          <span className={cn('font-mono font-semibold tabular-nums', alert ? 'text-red-600' : 'text-zinc-800')}>{val}</span>
                        </div>
                      ))}
                    </div>
                  )}
              </div>
            )}
          </div>
        </div>

        {/* ══ 3. ACTIVITÉ PLATEFORME ═════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {loadingSessions ? <Sk className="h-48" /> : sessions && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <UserCheck size={15} className="text-zinc-400" />
                  <span className="text-sm font-medium text-zinc-500">Sessions actives</span>
                </div>
                <span className="text-2xl font-semibold tabular-nums text-zinc-900">{sessions.length}</span>
              </div>
              {sessions.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {sessions.slice(0, 4).map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-600 truncate max-w-[160px]">{s.user.firstName} {s.user.lastName}</span>
                      <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-lg">{s.user.role}</span>
                    </div>
                  ))}
                  {sessions.length > 4 && <p className="text-xs text-zinc-400 pt-3">+ {sessions.length - 4} autres</p>}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucune session active</p>}
            </div>
          )}

          {loadingAudit ? <Sk className="h-48" /> : auditSnap && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <FileSearch size={15} className={auditSnap.length > 0 ? 'text-orange-500' : 'text-zinc-200'} />
                  <span className="text-sm font-medium text-zinc-500">Audit sécurité</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', auditSnap.length > 0 ? 'text-orange-600' : 'text-zinc-300')}>
                  {auditSnap.length}
                </span>
              </div>
              {auditSnap.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {auditSnap.slice(0, 4).map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-600 truncate max-w-[140px]">{e.action}</span>
                      <span className={cn('text-xs font-medium px-2 py-0.5 rounded-lg',
                        e.severity === 'CRITICAL' ? 'bg-red-50 text-red-600'
                        : e.severity === 'WARNING' ? 'bg-amber-50 text-amber-600'
                        : 'bg-zinc-100 text-zinc-500')}>
                        {e.severity}
                      </span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucun événement critique</p>}
            </div>
          )}

          {loadingStorage ? <Sk className="h-48" /> : storage && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6 flex flex-col gap-5">
              <div className="flex items-center gap-2">
                <HardDrive size={14} className="text-zinc-400" />
                <span className="text-xs font-medium text-zinc-400">Stockage Cloudinary</span>
              </div>
              <p className="text-3xl font-semibold tabular-nums text-zinc-900">{storage.storage_used}</p>
              <div className="text-sm text-zinc-400 space-y-1">
                <p>{storage.total_files.toLocaleString('fr-FR')} fichiers</p>
                <p>Bande passante : {storage.bandwidth}</p>
              </div>
            </div>
          )}
        </div>

        {/* ══ 4. ALERTES & FRAUDE ════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {loadingAlerts ? <Sk className="h-52" /> : alerts && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={15} className={alerts.count > 0 ? 'text-red-500' : 'text-zinc-200'} />
                  <span className="text-sm font-medium text-zinc-500">Paiements suspects</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', alerts.count > 0 ? 'text-red-600' : 'text-zinc-300')}>
                  {alerts.count}
                </span>
              </div>
              {alerts.recent.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {alerts.recent.slice(0, 4).map((a) => (
                    <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-500 capitalize">{a.method.toLowerCase()}</span>
                      <span className="text-sm font-mono font-semibold text-red-600 tabular-nums">{fmt(a.amount)}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucune alerte active</p>}
            </div>
          )}

          {loadingAnomalies ? <Sk className="h-52" /> : anomalies && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck size={15} className={anomalies.count > 0 ? 'text-amber-500' : 'text-zinc-200'} />
                  <span className="text-sm font-medium text-zinc-500">Anomalies présences</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', anomalies.count > 0 ? 'text-amber-600' : 'text-zinc-300')}>
                  {anomalies.count}
                </span>
              </div>
              {anomalies.data.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {anomalies.data.slice(0, 4).map((e) => (
                    <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-600 truncate max-w-[200px]">
                        {e.presence ? `${e.presence.student.firstName} ${e.presence.student.lastName}` : `Event #${e.id}`}
                      </span>
                      <ScoreBadge score={e.fraudScore} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucune anomalie détectée</p>}
            </div>
          )}
        </div>

        {/* ══ 5. MOBILE MONEY ════════════════════════════════════════════════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

          {loadingMM ? <Sk className="h-52" /> : mmMetrics && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <Clock size={15} className={mmMetrics.length > 0 ? 'text-amber-500' : 'text-zinc-200'} />
                  <span className="text-sm font-medium text-zinc-500">Mobile Money — Pending</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', mmMetrics.length > 0 ? 'text-amber-600' : 'text-zinc-300')}>
                  {mmMetrics.length}
                </span>
              </div>
              {mmMetrics.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {mmMetrics.slice(0, 4).map((p) => (
                    <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-500 truncate max-w-[190px]">{p.school.name}</span>
                      <span className="text-sm font-mono font-semibold text-zinc-800 tabular-nums">{fmt(p.amount)}</span>
                    </div>
                  ))}
                  {mmMetrics.length > 4 && <p className="text-xs text-zinc-400 pt-3">+ {mmMetrics.length - 4} autres</p>}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucun paiement en attente</p>}
            </div>
          )}

          {loadingFraud ? <Sk className="h-52" /> : fraudRadar && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center justify-between mb-5">
                <div className="flex items-center gap-2.5">
                  <AlertTriangle size={15} className={fraudRadar.length > 0 ? 'text-red-500' : 'text-zinc-200'} />
                  <span className="text-sm font-medium text-zinc-500">Radar fraude (score &gt;70)</span>
                </div>
                <span className={cn('text-2xl font-semibold tabular-nums', fraudRadar.length > 0 ? 'text-red-600' : 'text-zinc-300')}>
                  {fraudRadar.length}
                </span>
              </div>
              {fraudRadar.length > 0 ? (
                <div className="divide-y divide-zinc-50">
                  {fraudRadar.slice(0, 4).map((f) => (
                    <div key={f.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                      <span className="text-sm text-zinc-500 truncate max-w-[190px]">{f.payment.school.name}</span>
                      <ScoreBadge score={f.fraudScore} />
                    </div>
                  ))}
                </div>
              ) : <p className="text-sm text-zinc-400">Aucune anomalie critique</p>}
            </div>
          )}
        </div>

        {/* ══ 6. ACTIVITÉ RÉCENTE ════════════════════════════════════════════ */}
        {(loadingTrail || (auditTrail && auditTrail.count > 0)) && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <ScrollText size={15} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-500">Activité récente</span>
              </div>
              {auditTrail && (
                <span className="text-sm text-zinc-400 tabular-nums">{auditTrail.count} entrée{auditTrail.count !== 1 ? 's' : ''}</span>
              )}
            </div>
            {loadingTrail ? <Sk className="h-56 rounded-none" /> : auditTrail && (
              <div className="divide-y divide-zinc-50">
                {auditTrail.data.slice(0, 8).map((entry) => (
                  <div key={entry.id} className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors">
                    <span className={cn('w-2 h-2 rounded-full flex-shrink-0',
                      entry.severity === 'CRITICAL' ? 'bg-red-500'
                      : entry.severity === 'WARNING' ? 'bg-amber-400'
                      : 'bg-zinc-300')} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2.5">
                        <span className="text-sm font-medium text-zinc-800 truncate">{entry.action}</span>
                        <span className="text-xs text-zinc-400 bg-zinc-100 px-2 py-0.5 rounded-lg flex-shrink-0">{entry.resource}</span>
                      </div>
                      {entry.description && <p className="text-xs text-zinc-400 truncate mt-0.5">{entry.description}</p>}
                    </div>
                    <div className="text-right flex-shrink-0">
                      {entry.actor && <p className="text-sm text-zinc-500">{entry.actor.firstName} {entry.actor.lastName}</p>}
                      <p className="text-xs text-zinc-300 tabular-nums">
                        {new Date(entry.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
                {auditTrail.count > 8 && (
                  <div className="px-6 py-4">
                    <span className="text-sm text-zinc-400">+ {auditTrail.count - 8} entrées supplémentaires</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ══ 7. ÉTABLISSEMENTS ══════════════════════════════════════════════ */}
        {(loadingSchools || (schools && schools.length > 0)) && (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-50">
              <span className="text-sm font-medium text-zinc-500">Établissements</span>
              <Link href="/super-admin/schools" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium transition-colors">
                Voir tous →
              </Link>
            </div>
            {loadingSchools ? <Sk className="h-56 rounded-none" /> : schools && (
              <div className="divide-y divide-zinc-50">
                {schools.slice(0, 6).map((school) => (
                  <Link
                    key={school.id}
                    href={`/super-admin/schools/${school.id}`}
                    className="flex items-center justify-between px-6 py-4 hover:bg-zinc-50 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <Dot level={school.health.level} />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{school.name}</p>
                        <p className="text-xs text-zinc-400">
                          {school.city} · {school._count.students.toLocaleString('fr-FR')} élève{school._count.students !== 1 ? 's' : ''}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-4">
                      <HealthBadge level={school.health.level} />
                      <ChevronRight size={14} className="text-zinc-200 group-hover:text-zinc-500 transition-colors" />
                    </div>
                  </Link>
                ))}
                {schools.length > 6 && (
                  <div className="px-6 py-4">
                    <Link href="/super-admin/schools" className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">
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
