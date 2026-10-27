'use client'

import { Activity, Fingerprint, Info, KeyRound, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ControlDashboardStats } from '@/types/admin'
import { ADMIN_OPS_UI } from '@/lib/admin/admin-ops-messages'

const COLORS = {
  indigo: 'bg-indigo-50 text-indigo-600',
  emerald: 'bg-emerald-50 text-emerald-600',
  violet: 'bg-violet-50 text-violet-600',
  amber: 'bg-amber-50 text-amber-600',
} as const

function Card({
  label,
  value,
  sub,
  tooltip,
  color,
  icon: Icon,
  loading,
}: {
  label: string
  value: string | number
  sub?: string
  tooltip: string
  color: keyof typeof COLORS
  icon: React.ElementType
  loading?: boolean
}) {
  return (
    <div className="bg-white/90 rounded-xl border border-zinc-200/80 px-5 py-5 min-h-[7rem]">
      {loading ? (
        <div className="h-16 rounded-lg bg-slate-100 animate-pulse" aria-busy="true" />
      ) : (
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide mb-1.5 flex items-center gap-1">
              {label}
              <span title={tooltip} className="text-slate-300 cursor-help inline-flex" aria-label={tooltip}>
                <Info size={12} />
              </span>
            </p>
            <p className="text-3xl font-bold text-slate-900 tabular-nums leading-none">{value}</p>
            {sub ? <p className="text-sm text-slate-500 mt-1.5">{sub}</p> : null}
          </div>
          <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', COLORS[color])}>
            <Icon size={18} />
          </div>
        </div>
      )}
    </div>
  )
}

export function SchoolOpsKpiCards({
  stats,
  loading,
  error,
}: {
  stats?: ControlDashboardStats
  loading?: boolean
  error?: string | null
}) {
  const kpis = stats?.schoolAttendance
  if (error && !loading) {
    return (
      <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm text-rose-800">
        {error}
      </div>
    )
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <Card
        label="Élèves inscrits"
        value={kpis?.totalEnrolled ?? kpis?.totalStudents ?? 0}
        tooltip="Effectif ACTIVE de l’établissement (totalEnrolled)."
        icon={Users}
        color="indigo"
        loading={loading}
      />
      <Card
        label="Présents aujourd’hui"
        value={kpis?.presentToday ?? 0}
        sub={ADMIN_OPS_UI.STATS_OK}
        tooltip="Arrivées PRESENT ou LATE du jour civil, un élève compté une fois."
        icon={Activity}
        color="emerald"
        loading={loading}
      />
      <Card
        label="Dont facial"
        value={kpis?.facialCount ?? kpis?.presentByMethod?.FACIAL ?? 0}
        tooltip="Pointages du jour réalisés par reconnaissance faciale (facialCount)."
        icon={Fingerprint}
        color="violet"
        loading={loading}
      />
      <Card
        label="Dont PIN"
        value={kpis?.pinCount ?? kpis?.presentByMethod?.PIN ?? 0}
        sub={kpis ? `Taux école ${kpis.attendanceRate.toFixed(1)}%` : undefined}
        tooltip="Pointages PIN / saisie manuelle tablette (pinCount). Taux = présents / inscrits."
        icon={KeyRound}
        color="amber"
        loading={loading}
      />
    </div>
  )
}
