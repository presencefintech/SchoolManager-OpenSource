'use client'

import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import type { HeatmapEntry, WeeklyTrendPoint, ScanFlowPoint } from '@/types/admin'
import type { BarDatum, PieDatum } from '@/components/charts/presence-analytics-charts'
import { PresencePieChart, PresenceClassBarChart } from '@/components/charts/presence-analytics-charts'

const CHART_H = 220

/** Recharts exige un conteneur parent avec hauteur explicite */
export function ChartFrame({ children, height = CHART_H }: { children: React.ReactNode; height?: number }) {
  return (
    <div className="w-full min-w-0" style={{ height, minHeight: height }}>
      {children}
    </div>
  )
}

function ChartTooltip({
  active,
  payload,
  label,
  valueLabel,
}: {
  active?: boolean
  payload?: Array<{ value: number; name?: string }>
  label?: string
  valueLabel: string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-slate-800/95 text-white rounded-lg px-3 py-2 shadow-lg text-xs border border-slate-700/50">
      <p className="text-slate-300 mb-0.5">{label}</p>
      <p className="font-bold tabular-nums">
        {payload[0].value.toLocaleString('fr-FR')} {valueLabel}
      </p>
    </div>
  )
}

export function buildFallbackWeeklyTrend(): WeeklyTrendPoint[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return {
      date: d.toISOString().slice(0, 10),
      label: d.toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric' }),
      present: 0,
      rate: 0,
    }
  })
}

export function buildFallbackHeatmap(): HeatmapEntry[] {
  return Array.from({ length: 24 }, (_, i) => ({ hour: `${i}h`, count: 0 }))
}

export function WeeklyAttendanceChart({ data }: { data: WeeklyTrendPoint[] }) {
  const chartData = data.length > 0 ? data : buildFallbackWeeklyTrend()
  const hasData = data.some((d) => d.rate > 0 || d.present > 0)

  return (
    <div className="relative">
      {!hasData && (
        <p className="absolute top-0 left-0 right-0 text-center text-[11px] text-slate-400 z-10 pointer-events-none">
          En attente de données — le graphique se remplira au fil des pointages
        </p>
      )}
      <ChartFrame>
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 16, right: 8, left: -12, bottom: 0 }}>
            <defs>
              <linearGradient id="gradWeeklyAdmin" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis dataKey="label" tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} />
            <YAxis
              tick={{ fontSize: 10, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
            />
            <RechartsTooltip content={<ChartTooltip valueLabel="%" />} />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#6366f1"
              strokeWidth={2}
              fill="url(#gradWeeklyAdmin)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#4f46e5' }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}

export function HourlyScansChart({ data }: { data: HeatmapEntry[] }) {
  const chartData = data.length > 0 ? data : buildFallbackHeatmap()
  const hasData = data.some((h) => h.count > 0)

  return (
    <div className="relative">
      {!hasData && (
        <p className="absolute top-0 left-0 right-0 text-center text-[11px] text-slate-400 z-10 pointer-events-none">
          Aucun scan aujourd&apos;hui — les barres apparaîtront en temps réel
        </p>
      )}
      <ChartFrame>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 16, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="hour"
              tick={{ fontSize: 9, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <RechartsTooltip content={<ChartTooltip valueLabel="scans" />} />
            <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={16} opacity={hasData ? 1 : 0.35} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}

export function AttendanceDonutChart({
  pieData,
  rate,
}: {
  pieData: PieDatum[]
  rate: number
}) {
  return (
    <ChartFrame height={200}>
      <div className="h-full flex items-center justify-center">
        <PresencePieChart data={pieData} rate={Math.round(rate)} />
      </div>
    </ChartFrame>
  )
}

export function ClassEnrollmentChart({ data }: { data: BarDatum[] }) {
  const chartData = data.length > 0 ? data : [{ name: '—', effectif: 0 }]

  return (
    <ChartFrame>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} />
          <YAxis tick={{ fontSize: 10, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
          <RechartsTooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
          />
          <Bar dataKey="effectif" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} opacity={data.length ? 1 : 0.35} />
        </BarChart>
      </ResponsiveContainer>
    </ChartFrame>
  )
}

export function ScanFlowChart({ data }: { data: ScanFlowPoint[] }) {
  const chartData = data.length > 0 ? data : [{ label: '—', timestamp: '', count: 0 }]
  const hasData = data.some((p) => p.count > 0)

  return (
    <div className="relative">
      {!hasData && (
        <p className="absolute top-0 left-0 right-0 text-center text-[11px] text-slate-400 z-10 pointer-events-none">
          Débit scans — en attente d&apos;activité
        </p>
      )}
      <ChartFrame height={140}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 8, fill: '#64748b' }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis tick={{ fontSize: 9, fill: '#64748b' }} tickLine={false} axisLine={false} allowDecimals={false} />
            <RechartsTooltip content={<ChartTooltip valueLabel="scans" />} />
            <Bar dataKey="count" fill="#6366f1" radius={[3, 3, 0, 0]} maxBarSize={12} opacity={hasData ? 1 : 0.35} />
          </BarChart>
        </ResponsiveContainer>
      </ChartFrame>
    </div>
  )
}
