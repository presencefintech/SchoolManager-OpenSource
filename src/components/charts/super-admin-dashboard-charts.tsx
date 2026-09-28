'use client'

import {
  Area,
  AreaChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { formatMoney, formatMoneyCompact } from '@/lib/finance/currency'

export type EnrollmentTrendPoint = { label: string; count: number }

export function EnrollmentTrendArea({ data: chartData }: { data: EnrollmentTrendPoint[] }) {
  return (
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
  )
}

function AreaTooltip({ active, payload, label }: { active?: boolean; label?: string; payload?: Array<{ value: number }> }) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-white border border-zinc-200 rounded-xl px-4 py-3 shadow-lg text-xs min-w-[140px]">
      <p className="font-semibold text-zinc-500 mb-1">{label}</p>
      <p className="font-bold text-zinc-900 tabular-nums">{formatMoney(payload[0].value)}</p>
    </div>
  )
}

export function PlatformRevenueArea({ data: dailyData }: { data: Array<{ label: string; amount: number }> }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <AreaChart data={dailyData} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="gradRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%"  stopColor="#6366f1" stopOpacity={0.2} />
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} interval={Math.floor(dailyData.length / 6)} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => formatMoneyCompact(v)} />
        <Tooltip content={<AreaTooltip />} />
        <Area type="monotone" dataKey="amount" stroke="#6366f1" strokeWidth={2} fill="url(#gradRevenue)" dot={false} />
      </AreaChart>
    </ResponsiveContainer>
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

export function ProviderDonut({ data: chartData }: { data: Array<{ value: number; color: string; label: string; pct: string }> }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={chartData} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={2} dataKey="value" strokeWidth={0}>
          {chartData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Pie>
        <Tooltip content={<DonutTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  )
}
