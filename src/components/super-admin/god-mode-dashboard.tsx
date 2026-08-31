'use client'

import {
  DollarSign,
  School,
  Users,
  TrendingUp,
  TrendingDown,
  Minus,
} from 'lucide-react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import type { GodModeDashboardStats } from '@/types/super-admin'

import { formatMoney } from '@/lib/finance/currency'

function DeltaBadge({ pct }: { pct: number }) {
  const flat = Math.abs(pct) < 0.05
  const up = pct > 0
  const Icon = flat ? Minus : up ? TrendingUp : TrendingDown
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold',
        flat && 'bg-zinc-100 text-zinc-600',
        !flat && up && 'bg-emerald-50 text-emerald-700',
        !flat && !up && 'bg-red-50 text-red-700',
      )}
    >
      <Icon size={12} />
      {flat ? '0%' : `${up ? '+' : ''}${pct.toFixed(1)}%`}
      <span className="font-normal text-zinc-400">vs mois préc.</span>
    </span>
  )
}

function CardShell({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1 ring-zinc-500/5',
        className,
      )}
    >
      {children}
    </div>
  )
}

export function GodModeKpiCards({
  data,
  loading,
}: {
  data?: GodModeDashboardStats
  loading: boolean
}) {
  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
    )
  }
  if (!data) return null

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <CardShell className="sm:col-span-1 bg-gradient-to-br from-white to-indigo-50/40">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            MRR estimé
          </span>
          <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
            <DollarSign size={16} />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
          {formatMoney(data.mrr.amount)}
        </p>
        <div className="mt-2">
          <DeltaBadge pct={data.mrr.deltaPct} />
        </div>
        <p className="mt-2 text-[10px] text-zinc-400 leading-relaxed">
          {data.totalStudents.toLocaleString('fr-FR')} élèves × ${data.mrr.commissionPerCard} +{' '}
          {data.schools.active} écoles × ${data.mrr.avgSubscription.toFixed(0)} abo
        </p>
      </CardShell>

      <CardShell>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Écoles
          </span>
          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
            <School size={16} />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
          {data.schools.active}
          <span className="text-lg font-semibold text-zinc-400"> / {data.schools.suspended}</span>
        </p>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <span className="rounded-full bg-emerald-50 text-emerald-700 px-2 py-0.5 text-[11px] font-semibold">
            {data.schools.active} actives
          </span>
          <span className="rounded-full bg-red-50 text-red-700 px-2 py-0.5 text-[11px] font-semibold">
            {data.schools.suspended} suspendues
          </span>
          {(data.schools.pending ?? 0) > 0 ? (
            <span className="rounded-full bg-amber-50 text-amber-700 px-2 py-0.5 text-[11px] font-semibold">
              {data.schools.pending} pending
            </span>
          ) : null}
        </div>
      </CardShell>

      <CardShell>
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
            Total élèves
          </span>
          <div className="w-9 h-9 rounded-xl bg-zinc-100 text-zinc-600 flex items-center justify-center">
            <Users size={16} />
          </div>
        </div>
        <p className="text-3xl font-bold tracking-tight text-zinc-900 tabular-nums">
          {data.totalStudents.toLocaleString('fr-FR')}
        </p>
        <p className="mt-2 text-[11px] text-zinc-400">Volume global plateforme</p>
      </CardShell>
    </div>
  )
}

export function EnrollmentTrendChart({
  data,
  loading,
}: {
  data?: GodModeDashboardStats
  loading: boolean
}) {
  if (loading) return <Skeleton className="h-72 rounded-2xl" />
  if (!data) return null

  const chartData = data.enrollmentsLast30Days.map((d) => ({
    ...d,
    label: new Date(d.date + 'T12:00:00').toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
    }),
  }))
  const total = chartData.reduce((s, d) => s + d.count, 0)
  const peak = chartData.reduce((m, d) => (d.count > m.count ? d : m), chartData[0] ?? { count: 0, label: '—' })

  return (
    <CardShell className="p-6">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
        <div>
          <h2 className="text-base font-semibold text-zinc-900">Inscriptions — 30 derniers jours</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Évolution quotidienne · pic rentrée
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Total période</p>
            <p className="text-lg font-bold tabular-nums text-zinc-900">{total.toLocaleString('fr-FR')}</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wide text-zinc-400">Pic</p>
            <p className="text-lg font-bold tabular-nums text-indigo-600">
              {peak.count}{' '}
              <span className="text-xs font-medium text-zinc-400">{peak.label}</span>
            </p>
          </div>
        </div>
      </div>

      {total === 0 ? (
        <div className="h-52 flex items-center justify-center text-sm text-zinc-400">
          Aucune inscription sur les 30 derniers jours
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={chartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id="gradEnroll" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickLine={false}
              axisLine={false}
              interval={Math.max(0, Math.floor(chartData.length / 7))}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: '#a1a1aa' }}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip
              contentStyle={{
                borderRadius: 12,
                border: '1px solid #e4e4e7',
                fontSize: 12,
              }}
              formatter={(value: number) => [`${value} inscription${value > 1 ? 's' : ''}`, 'Volume']}
            />
            <Area
              type="monotone"
              dataKey="count"
              stroke="#4f46e5"
              strokeWidth={2.5}
              fill="url(#gradEnroll)"
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      )}
    </CardShell>
  )
}
