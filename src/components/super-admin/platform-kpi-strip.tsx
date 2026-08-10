'use client'

import { Building2, GraduationCap, Users, TrendingUp, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { PlatformStats } from '@/types/super-admin'
import { Skeleton } from '@/components/ui/skeleton'

function Kpi({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'neutral',
}: {
  label: string
  value: string
  sub?: string
  icon: React.ElementType
  tone?: 'neutral' | 'indigo' | 'emerald'
}) {
  const ring =
    tone === 'indigo' ? 'ring-indigo-500/10' : tone === 'emerald' ? 'ring-emerald-500/10' : 'ring-zinc-500/5'

  return (
    <div className={cn('rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1', ring)}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center text-zinc-500">
          <Icon size={15} />
        </div>
      </div>
      <p className="text-2xl font-bold text-zinc-900 tabular-nums tracking-tight">{value}</p>
      {sub ? <p className="text-[11px] text-zinc-400 mt-1.5">{sub}</p> : null}
    </div>
  )
}

export function PlatformKpiStrip({ stats, loading }: { stats?: PlatformStats; loading: boolean }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-28 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!stats) return null

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      <Kpi label="Établissements" value={String(stats.totalSchools)} icon={Building2} tone="indigo" />
      <Kpi label="Élèves" value={stats.totalStudents.toLocaleString('fr-FR')} icon={GraduationCap} />
      <Kpi
        label="Volume encaissé"
        value={stats.totalRevenue}
        sub="Paiements confirmés"
        icon={Wallet}
        tone="emerald"
      />
      <Kpi label="Utilisateurs" value={stats.activeUsers.toLocaleString('fr-FR')} icon={Users} />
      <Kpi label="ARPU" value={stats.arpu} sub="Revenu / élève" icon={TrendingUp} tone="indigo" />
    </div>
  )
}
