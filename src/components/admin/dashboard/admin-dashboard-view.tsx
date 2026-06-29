'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  GraduationCap, CheckCircle2, XCircle, Clock, ShieldAlert, Activity,
  TrendingUp, TrendingDown, ArrowRight, AlertTriangle, Server, Zap, RefreshCw,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useAdminStats, useLiveFeed, useFraudAlerts, useControlStats, useHeatmap, useClasses,
} from '@/lib/hooks/use-admin'
import {
  WeeklyAttendanceChart,
  HourlyScansChart,
  AttendanceDonutChart,
  ClassEnrollmentChart,
} from '@/components/admin/dashboard/admin-dashboard-charts'

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' as const } },
}
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.05 } } }

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
    <motion.div
      variants={fadeUp}
      className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/80 shadow-[0_1px_4px_rgba(15,23,42,0.05)] px-5 py-5 min-h-[7rem]"
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
    </motion.div>
  )
}

export function AdminDashboardView() {
  const { data: stats, isLoading: loadingStats, isError: statsError, refetch: refetchStats } = useAdminStats()
  const { data: feed, isLoading: loadingFeed } = useLiveFeed({ limit: 25 })
  const { data: alerts, isLoading: loadingAlerts } = useFraudAlerts()
  const { data: control, isLoading: loadingControl } = useControlStats()
  const { data: heatmap = [], isLoading: loadingHeatmap } = useHeatmap()
  const { data: classes = [], isLoading: loadingClasses } = useClasses({ isActive: true })

  const attendanceRate = stats?.attendanceRate ?? 0
  const weeklyTrend = stats?.weeklyTrend ?? []

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

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <motion.div
        className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {statsError && (
          <div className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-amber-50/90 border border-amber-200/80 text-sm text-amber-900">
            <span>Impossible de charger les statistiques — vérifiez votre session.</span>
            <button
              type="button"
              onClick={() => refetchStats()}
              className="inline-flex items-center gap-1 text-xs font-semibold text-amber-800 hover:text-amber-950"
            >
              <RefreshCw size={13} />
              Réessayer
            </button>
          </div>
        )}

        {/* KPI — dimensions originales h-28 */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Élèves total"
            value={fmtKpi(stats?.totalStudents, loadingStats)}
            sub="Effectif actif"
            icon={GraduationCap}
            color="indigo"
            loading={loadingStats}
          />
          <KpiCard
            label="Présents"
            value={fmtKpi(stats?.presentToday, loadingStats)}
            sub={`${attendanceRate.toFixed(1)}% présence`}
            trend={rateDelta}
            icon={CheckCircle2}
            color="emerald"
            loading={loadingStats}
          />
          <KpiCard
            label="Absents"
            value={fmtKpi(stats?.absentToday, loadingStats)}
            icon={XCircle}
            color="rose"
            loading={loadingStats}
          />
          <KpiCard
            label="En retard"
            value={fmtKpi(stats?.lateToday, loadingStats)}
            icon={Clock}
            color="amber"
            loading={loadingStats}
          />
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Taux de présence"
            value={loadingStats ? '…' : `${attendanceRate.toFixed(1)}%`}
            icon={Activity}
            color="violet"
            loading={loadingStats}
          />
          <KpiCard
            label="Fraudes détectées"
            value={fmtKpi(stats?.fraudAlerts, loadingStats)}
            icon={ShieldAlert}
            color="rose"
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
            label="Workers actifs"
            value={fmtKpi(control?.workers?.active, loadingControl)}
            sub={control?.pipeline?.healthy !== false ? 'Pipeline OK' : 'Pipeline dégradé'}
            icon={Zap}
            color="indigo"
            loading={loadingControl}
          />
        </div>

        {/* Graphiques */}
        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-12 gap-4">
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

          {/* Live feed */}
          <div className="lg:col-span-4 rounded-xl border border-slate-200/80 bg-white/85 backdrop-blur-sm shadow-[0_1px_3px_rgba(15,23,42,0.06)] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-sm font-semibold text-slate-800">Flux en direct</span>
              </div>
              <span className="text-[10px] text-slate-400">15s</span>
            </div>
            <div className="flex-1 overflow-y-auto max-h-80">
              {loadingFeed ? (
                <div className="p-4 space-y-2">{[...Array(5)].map((_, i) => <Sk key={i} className="h-10" />)}</div>
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

          <div className="lg:col-span-3 space-y-4">
            <Panel title="Alertes fraude" subtitle="Actives">
              {loadingAlerts ? (
                <div className="space-y-2">{[...Array(3)].map((_, i) => <Sk key={i} className="h-12" />)}</div>
              ) : alerts?.length ? (
                <ul className="space-y-2 max-h-44 overflow-y-auto">
                  {alerts.slice(0, 4).map((alert) => (
                    <li key={alert.id} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                      <div className="flex justify-between gap-2">
                        <span className="text-xs font-semibold text-slate-800">{alert.type}</span>
                        <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded-full', SEVERITY_CFG[alert.severity])}>
                          {alert.severity}
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

            <Panel title="Santé système">
              {loadingControl ? (
                <Sk className="h-24" />
              ) : control ? (
                <div className="space-y-3 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Workers</span>
                    <span className="font-semibold text-slate-800 tabular-nums">{control.workers?.active ?? 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Alertes sécurité</span>
                    <span className="font-semibold tabular-nums">{control.security?.alerts ?? 0}</span>
                  </div>
                  <div className="flex items-center gap-1.5 pt-1 text-slate-600">
                    <Server size={13} className={control.pipeline?.healthy ? 'text-emerald-500' : 'text-amber-500'} />
                    Pipeline {control.pipeline?.healthy ? 'OK' : 'dégradé'}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-4">Indisponible</p>
              )}
            </Panel>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
