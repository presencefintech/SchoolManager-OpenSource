'use client'

import {
  PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer,
  AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts'

export interface DashboardHeroChartsProps {
  loadingRevenue: boolean
  revenueSchoolId: number | null
  dailyData: { label: string; amount: number }[]
  chartData: { name: string; label: string; value: number; color: string; pct: string }[]
  loadingProviders: boolean
  providerTotal: number
  fmt: (n: number) => string
  fmtShort: (n: number) => string
}

function AreaTooltip({ active, payload, label, fmtFn }: {
  active?: boolean; label?: string; payload?: Array<{ value: number }>; fmtFn: (n: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-zinc-500 mb-1">{label}</p>
      <p className="font-bold text-zinc-900 tabular-nums">{fmtFn(payload[0].value)}</p>
    </div>
  )
}

function DonutTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ value: number; payload: { label: string; pct: string } }>
}) {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="bg-white border border-zinc-200 rounded-lg px-3 py-2 shadow-md text-xs">
      <p className="font-medium text-zinc-700">{d.payload.label}</p>
      <p className="text-zinc-400 tabular-nums mt-0.5">
        {d.value.toLocaleString('fr-FR')} txns · {d.payload.pct}%
      </p>
    </div>
  )
}

export function DashboardRevenueAreaChart({
  loadingRevenue,
  revenueSchoolId,
  dailyData,
  fmt: fmtFn,
  fmtShort,
}: Pick<DashboardHeroChartsProps, 'loadingRevenue' | 'revenueSchoolId' | 'dailyData' | 'fmt' | 'fmtShort'>) {
  if (!revenueSchoolId) {
    return (
      <div className="h-48 flex flex-col items-center justify-center gap-2 text-sm text-zinc-400">
        Sélectionnez un établissement pour afficher la courbe
      </div>
    )
  }

  if (loadingRevenue) {
    return <div className="h-48 rounded-xl bg-zinc-100 animate-pulse" />
  }

  if (!dailyData.length) {
    return <div className="h-48 flex items-center justify-center text-sm text-zinc-400">Aucun paiement confirmé sur cette période</div>
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 6)} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => fmtShort(v)} />
        <RechartsTooltip content={<AreaTooltip fmtFn={fmtFn} />} />
        <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
  )
}

export function DashboardPaymentDonutChart({
  chartData,
  loadingProviders,
  providerTotal,
}: Pick<DashboardHeroChartsProps, 'chartData' | 'loadingProviders' | 'providerTotal'>) {
  if (loadingProviders) {
    return (
      <div className="flex-1 flex flex-col items-center gap-4">
        <div className="w-40 h-40 rounded-full bg-zinc-100 animate-pulse" />
        <div className="w-full space-y-3">{[...Array(3)].map((_, i) => <div key={i} className="h-4 bg-zinc-100 rounded animate-pulse" />)}</div>
      </div>
    )
  }

  if (!chartData.length) {
    return <div className="flex-1 flex items-center justify-center text-sm text-zinc-400">Aucune donnée</div>
  }

  return (
    <>
      <div className="relative w-44 h-44 mx-auto flex-shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value" strokeWidth={0}>
              {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip content={<DonutTooltip />} />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-lg font-bold text-zinc-900 tabular-nums leading-none">{providerTotal.toLocaleString('fr-FR')}</span>
          <span className="text-[10px] text-zinc-400 mt-1 uppercase tracking-wide">txns</span>
        </div>
      </div>
      <div className="flex flex-col gap-2.5 mt-5">
        {chartData.map((entry) => (
          <div key={entry.name} className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: entry.color }} />
              <span className="text-xs text-zinc-600 truncate">{entry.label}</span>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="text-xs font-semibold text-zinc-900 tabular-nums">{entry.value.toLocaleString('fr-FR')}</span>
              <span className="text-[10px] text-zinc-400 w-8 text-right tabular-nums">{entry.pct}%</span>
            </div>
          </div>
        ))}
      </div>
    </>
  )
}
