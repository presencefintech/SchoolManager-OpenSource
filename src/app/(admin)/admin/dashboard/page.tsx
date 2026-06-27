'use client'

import { motion } from 'framer-motion'
import { fadeUp, stagger } from '@/lib/animations'
import {
  GraduationCap, CheckCircle2, XCircle, Clock,
  ShieldAlert, Activity,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStats, useLiveFeed, useFraudAlerts, useControlStats } from '@/lib/hooks/use-admin'
import { Skeleton } from '@/components/ui/skeleton'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function KpiCard({ label, value, sub, icon: Icon, color = 'indigo', loading }: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'indigo' | 'emerald' | 'amber' | 'rose'; loading?: boolean
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  if (loading) return <Skeleton className="h-28" />
  return (
    <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1.5">{label}</p>
          <p className="text-3xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-sm text-zinc-500 mt-1.5">{sub}</p>}
        </div>
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon size={18} />
        </div>
      </div>
    </div>
  )
}

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  PRESENT: { label: 'Présent', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  ABSENT:  { label: 'Absent',  dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700' },
  LATE:    { label: 'Retard',  dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700' },
}

const SEVERITY_CFG: Record<string, string> = {
  LOW:    'bg-zinc-100 text-zinc-500',
  MEDIUM: 'bg-amber-50 text-amber-700',
  HIGH:   'bg-red-50 text-red-700',
}

export default function AdminDashboardPage() {
  const { data: stats, isLoading: loadingStats } = useAdminStats()
  const { data: feed, isLoading: loadingFeed } = useLiveFeed({ limit: 20 })
  const { data: alerts, isLoading: loadingAlerts } = useFraudAlerts()
  const { data: control, isLoading: loadingControl } = useControlStats()

  const attendanceRate = stats?.attendanceRate ?? 0

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Dashboard</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize" suppressHydrationWarning>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Mise à jour toutes les 60s
          </div>
        </div>
      </motion.div>

      <motion.div className="max-w-7xl mx-auto px-8 py-8 space-y-6" variants={stagger} initial="hidden" animate="show">

        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Élèves total" value={stats?.totalStudents ?? '—'} icon={GraduationCap} color="indigo" loading={loadingStats} />
          <KpiCard label="Présents" value={stats?.presentToday ?? '—'} sub={`${attendanceRate}% présence`} icon={CheckCircle2} color="emerald" loading={loadingStats} />
          <KpiCard label="Absents" value={stats?.absentToday ?? '—'} icon={XCircle} color="rose" loading={loadingStats} />
          <KpiCard label="En retard" value={stats?.lateToday ?? '—'} icon={Clock} color="amber" loading={loadingStats} />
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard label="Taux de présence" value={`${attendanceRate.toFixed(1)}%`} icon={Activity} color="emerald" loading={loadingStats} />
          <KpiCard label="Fraudes détectées" value={stats?.fraudAlerts ?? '—'} icon={ShieldAlert} color="rose" loading={loadingStats} />
          {control ? (
            <>
              <KpiCard label="Alertes sécurité" value={control.security?.alerts ?? 0} icon={ShieldAlert} color="rose" loading={loadingControl} />
              <KpiCard label="Workers actifs" value={control.workers?.active ?? 0} icon={Activity} color="indigo" loading={loadingControl} />
            </>
          ) : (
            <><Skeleton className="h-28" /><Skeleton className="h-28" /></>
          )}
        </motion.div>

        <motion.div variants={fadeUp} className="grid grid-cols-1 lg:grid-cols-3 gap-4">

          {/* Live Feed */}
          <div className="lg:col-span-2 bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-sm font-medium text-zinc-700">Flux de présence en direct</span>
              </div>
              <span className="text-xs text-zinc-400">Actualisation auto 15s</span>
            </div>
            {loadingFeed ? (
              <div className="p-4 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
            ) : feed?.entries?.length ? (
              <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
                {feed.entries.map((entry) => {
                  const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.ABSENT
                  return (
                    <div key={entry.id} className="flex items-center justify-between px-6 py-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={cn('w-2 h-2 rounded-full flex-shrink-0', cfg.dot)} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">{entry.studentName}</p>
                          <p className="text-xs text-zinc-400">{entry.className}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
                        <span className="text-xs text-zinc-400 tabular-nums">
                          {new Date(entry.timestamp).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-zinc-400">Aucun enregistrement pour l'instant</div>
            )}
          </div>

          {/* Fraud Alerts */}
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
              <ShieldAlert size={14} className="text-red-500" />
              <span className="text-sm font-medium text-zinc-700">Alertes fraude</span>
              {alerts && alerts.length > 0 && (
                <span className="ml-auto text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">{alerts.length}</span>
              )}
            </div>
            {loadingAlerts ? (
              <div className="p-4 space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
            ) : alerts?.length ? (
              <div className="divide-y divide-zinc-50 max-h-96 overflow-y-auto">
                {alerts.map((alert) => (
                  <div key={alert.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-xs font-semibold text-zinc-700 leading-tight">{alert.type}</span>
                      <span className={cn('text-[10px] font-medium px-1.5 py-0.5 rounded-full flex-shrink-0', SEVERITY_CFG[alert.severity])}>
                        {alert.severity}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-500 leading-snug">{alert.description}</p>
                    {alert.studentName && <p className="text-xs text-indigo-600 mt-1">{alert.studentName}</p>}
                    <p className="text-[10px] text-zinc-300 mt-1.5 tabular-nums">
                      {new Date(alert.createdAt).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-5 py-10 text-center text-sm text-zinc-400">
                <ShieldAlert size={24} className="mx-auto mb-2 text-zinc-200" />
                Aucune alerte active
              </div>
            )}
          </div>
        </motion.div>

      </motion.div>
    </div>
  )
}
