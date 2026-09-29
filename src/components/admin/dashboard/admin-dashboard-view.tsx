'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  GraduationCap, CheckCircle2, XCircle, Clock, ShieldAlert, Activity,
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Zap, RefreshCw,
  Radio, Users, BookOpen, ClipboardList, FileBarChart,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useAdminStats, useLiveFeed, useFraudAlerts, useControlStats, useHeatmap, useClasses,
  useTriggerWeeklyReport,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { useAuth } from '@/providers/auth-provider'
import { useAdminRealtimeStatus } from '@/lib/admin/hooks/admin-realtime-provider'
import { useToast } from '@/providers/toast-provider'
import {
  LazyWeeklyAttendanceChart as WeeklyAttendanceChart,
  LazyHourlyScansChart as HourlyScansChart,
  LazyAttendanceDonutChart as AttendanceDonutChart,
  LazyClassEnrollmentChart as ClassEnrollmentChart,
} from '@/components/charts/lazy'
import { AttendanceReadinessPanel } from '@/components/admin/dashboard/attendance-readiness-panel'
import { AttendanceSettingsBanner } from '@/components/admin/dashboard/attendance-settings-banner'
import { ControlDashboardPanel } from '@/components/admin/dashboard/control-dashboard-panel'
import { AttendanceActivityFeed } from '@/components/admin/dashboard/attendance-activity-feed'
import { DashboardActionWidgets } from '@/components/admin/dashboard/dashboard-action-widgets'
import { ActiveQrSessionsPanel } from '@/components/admin/dashboard/active-qr-sessions-panel'
import { SyncBatchesPanel } from '@/components/admin/dashboard/sync-batches-panel'
import { AdminPlatformEventsPanel } from '@/components/admin/dashboard/admin-platform-events-panel'
import { StudentPaymentStatusWidget } from '@/components/finance/student-payment-status-widget'
import { CashJournalReport } from '@/components/finance/cash-journal-report'

const LIVE_FEED_PARAMS = { limit: 25 } as const
const ACTIVE_CLASSES_PARAMS = { isActive: true } as const

const QUICK_LINKS = [
  { href: '/admin/presences', label: 'Présences', icon: Radio },
  { href: '/admin/enrollments', label: 'Inscriptions', icon: ClipboardList },
  { href: '/admin/students', label: 'Élèves', icon: Users },
  { href: '/admin/classes', label: 'Classes', icon: BookOpen },
  { href: '/admin/fraud', label: 'Fraude', icon: ShieldAlert },
] as const

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  PRESENT: { label: 'Présent', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  ABSENT: { label: 'Absent', dot: 'bg-red-500', badge: 'bg-red-50 text-red-700' },
  LATE: { label: 'Retard', dot: 'bg-amber-500', badge: 'bg-amber-50 text-amber-700' },
}

const SEVERITY_CFG: Record<string, string> = {
  LOW: 'bg-slate-100 text-slate-600',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH: 'bg-red-50 text-red-700',
}

const SEVERITY_LABEL: Record<string, string> = {
  LOW: 'Faible',
  MEDIUM: 'Moyen',
  HIGH: 'Élevé',
}

function humanizeCode(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase())
}

function realtimeLabel(status: string) {
  if (status === 'live') return 'Temps réel'
  if (status === 'connecting') return 'Connexion…'
  return 'Actualisation'
}

const KPI_COLORS = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  amber: 'bg-amber-50 text-amber-600',
  rose: 'bg-rose-50 text-rose-600',
  violet: 'bg-violet-50 text-violet-600',
} as const

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-slate-200/60 animate-pulse', className)} />
}

function fmtKpi(value: number | undefined, loading: boolean): string | number {
  if (loading) return '…'
  return value ?? 0
}

function HeroMetric({
  label,
  value,
  loading,
  valueClassName,
  icon: Icon,
}: {
  label: string
  value: string | number
  loading?: boolean
  valueClassName?: string
  icon: React.ElementType
}) {
  return (
    <div className="flex flex-col justify-center gap-2 px-5 sm:px-6 py-5 min-w-0 border-t sm:border-t-0 sm:border-l border-white/10 first:border-l-0">
      <div className="flex items-center gap-2">
        <Icon size={14} className="text-emerald-300/80 flex-shrink-0" />
        <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-100/70 truncate">{label}</p>
      </div>
      <p className={cn('text-3xl sm:text-4xl font-bold tabular-nums leading-none', valueClassName ?? 'text-white')}>
        {loading ? (
          <span className="inline-block w-12 h-9 bg-white/10 rounded animate-pulse" />
        ) : (
          value
        )}
      </p>
    </div>
  )
}

function Panel({
  title,
  subtitle,
  action,
  children,
  className,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn(
      'rounded-xl border border-slate-200/80 bg-white/85 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden',
      className,
    )}>
      <div className="flex items-start justify-between gap-3 px-5 py-3.5 border-b border-slate-100/90 bg-slate-50/50">
        <div>
          <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function KpiCard({
  label,
  value,
  sub,
  trend,
  icon: Icon,
  color = 'indigo',
  loading,
}: {
  label: string
  value: string | number
  sub?: string
  trend?: { delta: number; label: string }
  icon: React.ElementType
  color?: keyof typeof KPI_COLORS
  loading?: boolean
}) {
  if (loading) return <Sk className="h-28" />

  return (
    <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-zinc-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.05)] px-5 py-5 min-h-[7rem]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-sm text-slate-500 mt-1.5">{sub}</p>}
          {trend && (
            <div className={cn(
              'inline-flex items-center gap-1 mt-2 text-[11px] font-medium',
              trend.delta >= 0 ? 'text-emerald-600' : 'text-rose-600',
            )}>
              {trend.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
              {trend.delta >= 0 ? '+' : ''}{trend.delta.toFixed(1)}% {trend.label}
            </div>
          )}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', KPI_COLORS[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

export function AdminDashboardView() {
  const { user, isLoading: authLoading } = useAuth()
  const toast = useToast()
  const { mutate: triggerWeeklyReport, isPending: weeklyReportPending } = useTriggerWeeklyReport()
  const { status: realtimeStatus } = useAdminRealtimeStatus()
  const {
    data: stats,
    isPending: statsPending,
    isError: statsError,
    refetch: refetchStats,
    isFetching: statsFetching,
  } = useAdminStats()
  const {
    data: feed,
    isPending: feedPending,
    isError: feedError,
    refetch: refetchFeed,
  } = useLiveFeed(LIVE_FEED_PARAMS)
  const { data: alerts, isPending: alertsPending } = useFraudAlerts()
  const {
    data: control,
    isPending: controlPending,
    isError: controlError,
    refetch: refetchControl,
  } = useControlStats()
  const { data: heatmap = [], isPending: heatmapPending } = useHeatmap()
  const { data: classes = [], isPending: classesPending } = useClasses(ACTIVE_CLASSES_PARAMS)

  const loadingStats = authLoading || statsPending
  const loadingFeed = authLoading || feedPending
  const loadingAlerts = authLoading || alertsPending
  const loadingControl = authLoading || controlPending
  const loadingHeatmap = authLoading || heatmapPending
  const loadingClasses = authLoading || classesPending

  const attendanceRate = stats?.attendanceRate ?? 0
  const weeklyTrend = useMemo(() => stats?.weeklyTrend ?? [], [stats])

  const rateDelta = useMemo(() => {
    if (weeklyTrend.length < 2) return undefined
    const prev = weeklyTrend[weeklyTrend.length - 2]?.rate ?? 0
    const curr = weeklyTrend[weeklyTrend.length - 1]?.rate ?? attendanceRate
    return { delta: curr - prev, label: 'vs hier' }
  }, [weeklyTrend, attendanceRate])

  const pieData = useMemo(
    () => [
      { name: 'Présents', value: stats?.presentToday ?? 0, color: '#10b981' },
      { name: 'Retards', value: stats?.lateToday ?? 0, color: '#f59e0b' },
      { name: 'Absents', value: stats?.absentToday ?? 0, color: '#f43f5e' },
    ],
    [stats],
  )

  const classBarData = useMemo(
    () =>
      [...classes]
        .sort((a, b) => (b.studentCount ?? 0) - (a.studentCount ?? 0))
        .slice(0, 8)
        .map((c) => ({
          name: c.name.length > 10 ? `${c.name.slice(0, 9)}…` : c.name,
          effectif: c.studentCount ?? 0,
        })),
    [classes],
  )

  const todayLabel = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Bonjour'
    if (h < 18) return 'Bon après-midi'
    return 'Bonsoir'
  })()

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <div className="relative w-full overflow-hidden bg-gradient-to-br from-slate-900 via-emerald-950 to-slate-900 text-white shadow-[0_4px_24px_rgba(0,0,0,0.18)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_rgba(16,185,129,0.22),_transparent_55%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_rgba(15,23,42,0.4),_transparent_50%)]" />

        <div className="relative max-w-7xl mx-auto px-6 lg:px-8 pt-6 pb-0">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-5 pb-5">
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-300/90">
                Tableau de bord · Présences
              </p>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight mt-1.5" suppressHydrationWarning>
                {greeting}{user?.firstName ? `, ${user.firstName}` : ''}
              </h1>
              <p className="text-sm text-emerald-100/60 mt-1 capitalize" suppressHydrationWarning>
                {todayLabel}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
              <span className={cn(
                'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold ring-1',
                realtimeStatus === 'live'
                  ? 'bg-emerald-500/20 text-emerald-100 ring-emerald-400/30'
                  : 'bg-white/10 text-emerald-100/70 ring-white/20',
              )}>
                <span className={cn(
                  'w-2 h-2 rounded-full',
                  realtimeStatus === 'live' ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-400',
                )} />
                {realtimeLabel(realtimeStatus)}
              </span>
              <button
                type="button"
                disabled={weeklyReportPending}
                onClick={() =>
                  triggerWeeklyReport(undefined, {
                    onSuccess: (res) => toast.success('Rapport hebdo généré', res?.message),
                    onError: (err) => toast.error('Échec de la génération', getApiErrorMessage(err)),
                  })
                }
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors disabled:opacity-50"
              >
                <FileBarChart size={14} />
                {weeklyReportPending ? 'Génération…' : 'Rapport hebdo'}
              </button>
              <Link
                href="/admin/presences"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors"
              >
                <Activity size={14} />
                Cahiers
              </Link>
              <Link
                href="/admin/presences"
                className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 transition-colors"
              >
                <Radio size={14} />
                Pointage
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 pb-5">
            {QUICK_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-emerald-50/90 bg-white/8 hover:bg-white/12 border border-white/10 transition-colors"
              >
                <Icon size={13} className="text-emerald-200/80" />
                {label}
              </Link>
            ))}
          </div>
        </div>

        <div className="relative border-t border-white/10 bg-black/20 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-5">
            <HeroMetric
              label="Présents"
              value={fmtKpi(stats?.presentToday, loadingStats)}
              loading={loadingStats}
              valueClassName="text-emerald-300"
              icon={CheckCircle2}
            />
            <HeroMetric
              label="Absents"
              value={fmtKpi(stats?.absentToday, loadingStats)}
              loading={loadingStats}
              valueClassName="text-rose-300"
              icon={XCircle}
            />
            <HeroMetric
              label="Retards"
              value={fmtKpi(stats?.lateToday, loadingStats)}
              loading={loadingStats}
              valueClassName="text-amber-300"
              icon={Clock}
            />
            <HeroMetric
              label="Total élèves"
              value={fmtKpi(stats?.totalStudents, loadingStats)}
              loading={loadingStats}
              icon={GraduationCap}
            />
            <HeroMetric
              label="Fraudes critiques"
              value={fmtKpi(stats?.fraudAlerts, loadingStats)}
              loading={loadingStats}
              valueClassName={(stats?.fraudAlerts ?? 0) > 0 ? 'text-rose-300' : 'text-white'}
              icon={ShieldAlert}
            />
          </div>
          {!loadingStats && (
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3 px-6 py-2.5 border-t border-white/10 text-xs text-emerald-100/70">
              <span>
                Taux de présence :{' '}
                <strong className="text-white tabular-nums">{attendanceRate.toFixed(1)}%</strong>
              </span>
              {rateDelta && (
                <span className={cn(
                  'inline-flex items-center gap-1 font-medium tabular-nums',
                  rateDelta.delta >= 0 ? 'text-emerald-300' : 'text-rose-300',
                )}>
                  {rateDelta.delta >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                  {rateDelta.delta >= 0 ? '+' : ''}{rateDelta.delta.toFixed(1)}% {rateDelta.label}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        <AttendanceReadinessPanel />
        <AttendanceSettingsBanner />
        <DashboardActionWidgets />

        {statsError && !authLoading && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-sm text-amber-900">
            <span>
              Impossible de charger les statistiques — vérifiez la connexion au serveur
              et reconnectez-vous si besoin.
            </span>
            <button
              type="button"
              onClick={() => refetchStats()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950"
            >
              <RefreshCw size={13} className={cn(statsFetching && 'animate-spin')} />
              Réessayer
            </button>
          </div>
        )}
        {controlError && !statsError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm text-slate-700">
            <span>Indicateurs système indisponibles pour le moment.</span>
            <button
              type="button"
              onClick={() => refetchControl()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-700"
            >
              <RefreshCw size={13} />
              Réessayer
            </button>
          </div>
        )}

        <StudentPaymentStatusWidget href="/admin/finance/controle" />
        <CashJournalReport />

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <KpiCard
            label="Taux de présence"
            value={loadingStats ? '…' : `${attendanceRate.toFixed(1)}%`}
            trend={rateDelta}
            icon={Activity}
            color="violet"
            loading={loadingStats}
          />
          <KpiCard
            label="Alertes sécurité"
            value={fmtKpi(control?.security?.alerts, loadingControl)}
            icon={AlertTriangle}
            color="amber"
            loading={loadingControl}
          />
          <KpiCard
            label="Traitements actifs"
            value={fmtKpi(control?.workers?.active, loadingControl)}
            sub={control?.pipeline?.healthy !== false ? 'Système opérationnel' : 'Système ralenti'}
            icon={Zap}
            color="indigo"
            loading={loadingControl}
          />
        </div>

        <ControlDashboardPanel />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ActiveQrSessionsPanel />
          <SyncBatchesPanel />
        </div>

        <AdminPlatformEventsPanel />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <Panel title="Tendance de présence" subtitle="7 derniers jours (%)" className="lg:col-span-5">
            {loadingStats ? <Sk className="h-[220px]" /> : <WeeklyAttendanceChart data={weeklyTrend} />}
          </Panel>
          <Panel title="Répartition du jour" subtitle="Présents · retards · absents" className="lg:col-span-3">
            {loadingStats ? <Sk className="h-[200px]" /> : (
              <AttendanceDonutChart pieData={pieData} rate={attendanceRate} />
            )}
          </Panel>
          <Panel title="Activité horaire" subtitle="Scans du jour" className="lg:col-span-4">
            {loadingHeatmap ? <Sk className="h-[220px]" /> : <HourlyScansChart data={heatmap} />}
          </Panel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-4">
            <AttendanceActivityFeed />

            <div className="rounded-xl border border-slate-200/80 bg-white/85 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-semibold text-slate-800">Activité récente</span>
                </div>
                <span className="text-[10px] text-slate-400">Actualisé</span>
              </div>
              <div className="flex-1 overflow-y-auto max-h-64">
              {loadingFeed ? (
                <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
              ) : feedError ? (
                <div className="px-5 py-10 text-center">
                  <p className="text-sm text-slate-500">Flux indisponible</p>
                  <button
                    type="button"
                    onClick={() => refetchFeed()}
                    className="mt-2 text-xs font-medium text-indigo-600"
                  >
                    Réessayer
                  </button>
                </div>
              ) : feed?.entries?.length ? (
                <ul className="divide-y divide-slate-50">
                  {feed.entries.map((entry) => {
                    const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.ABSENT
                    return (
                      <li key={entry.id} className="flex items-center justify-between px-5 py-2.5 hover:bg-slate-50/80">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{entry.studentName}</p>
                            <p className="text-xs text-slate-400 truncate">{entry.className}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={cn('text-[10px] font-medium px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
                          <span className="text-[10px] text-slate-400 tabular-nums">
                            {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              ) : (
                <div className="px-5 py-12 text-center text-sm text-slate-400">Aucun enregistrement</div>
              )}
              </div>
            </div>
          </div>

          <Panel
            title="Effectifs par classe"
            subtitle="Top 8"
            className="lg:col-span-5"
            action={
              <Link href="/admin/classes" className="text-xs text-indigo-600 hover:text-indigo-700 font-medium">
                Voir tout →
              </Link>
            }
          >
            {loadingClasses ? <Sk className="h-[220px]" /> : <ClassEnrollmentChart data={classBarData} />}
          </Panel>

          <div className="lg:col-span-3 space-y-4">
            <Panel title="Alertes fraude" subtitle="Actives">
              {loadingAlerts ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Sk key={i} className="h-12" />)}</div>
              ) : alerts?.length ? (
                <ul className="space-y-2 max-h-44 overflow-y-auto">
                  {alerts.slice(0, 4).map((alert) => (
                    <li key={alert.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">{humanizeCode(alert.type)}</span>
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', SEVERITY_CFG[alert.severity])}>
                          {SEVERITY_LABEL[alert.severity] ?? alert.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2">{alert.description}</p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-slate-400 text-center py-6">Aucune alerte</p>
              )}
              <Link href="/admin/fraud" className="mt-3 flex items-center justify-center gap-1 text-xs text-indigo-600 font-medium">
                Centre fraude <ArrowRight size={12} />
              </Link>
            </Panel>
          </div>
        </div>
      </div>
    </div>
  )
}
