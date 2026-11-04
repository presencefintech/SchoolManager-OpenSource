'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

function ChartTooltip({ active, payload, label, formatter }: {
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
  formatter?: (v: number) => string
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl border border-zinc-700/50">
      {label && <p className="text-zinc-400 mb-1">{label}</p>}
      {payload.map((p) => (
        <p key={p.name} className="font-medium tabular-nums">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: p.color }} />
          {p.name} : {formatter ? formatter(p.value) : p.value}
        </p>
      ))}
    </div>
  )
}

export interface PieDatum { name: string; value: number; color: string }

export function SchoolFinanceDonutChart({
  data,
  centerLabel,
  fmt,
}: {
  data: PieDatum[]
  centerLabel: string
  fmt: (n: number) => string
}) {
  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }) => (
              <ChartTooltip
                active={active}
                payload={payload?.map((p) => ({
                  name: String(p.name),
                  value: Number(p.value),
                  color: String(p.payload?.color ?? '#6366f1'),
                }))}
                formatter={fmt}
              />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-zinc-900 tabular-nums">{centerLabel}</span>
        <span className="text-[10px] text-zinc-400 uppercase">efficacité</span>
      </div>
    </div>
  )
}

export function SchoolPresenceDonutChart({
  data,
  centerLabel,
}: {
  data: PieDatum[]
  centerLabel: string
}) {
  return (
    <div className="relative w-44 h-44 flex-shrink-0">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={52} outerRadius={78} paddingAngle={3} dataKey="value" strokeWidth={0}>
            {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
          </Pie>
          <RechartsTooltip
            content={({ active, payload }) => (
              <ChartTooltip active={active} payload={payload?.map((p) => ({
                name: String(p.name),
                value: Number(p.value),
                color: String(p.payload?.color ?? '#6366f1'),
              }))} />
            )}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
        <span className="text-lg font-bold text-zinc-900 tabular-nums">{centerLabel}</span>
        <span className="text-[10px] text-zinc-400 uppercase">taux</span>
      </div>
    </div>
  )
}

export interface ClassBarDatum {
  name: string
  élèves: number
  capacité: number
  taux: number
}

export function SchoolClassBarChart({ data }: { data: ClassBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <RechartsTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as ClassBarDatum
            return (
              <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                <p className="font-medium mb-1">{label}</p>
                <p>{row.élèves} élèves / {row.capacité} places ({row.taux}%)</p>
              </div>
            )
          }}
        />
        <Bar dataKey="élèves" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Bar dataKey="capacité" fill="#e4e4e7" radius={[4, 4, 0, 0]} maxBarSize={28} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(v) => <span className="text-zinc-500">{v === 'élèves' ? 'Inscrits' : 'Capacité'}</span>}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface TreasuryBarDatum { label: string; montant: number }

export function SchoolTreasuryBarChart({
  data,
  fmt,
  fmtShort,
}: {
  data: TreasuryBarDatum[]
  fmt: (n: number) => string
  fmtShort: (n: number) => string
}) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" horizontal={false} />
        <XAxis type="number" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickFormatter={fmtShort} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: '#71717a' }} width={90} tickLine={false} axisLine={false} />
        <RechartsTooltip
          content={({ active, payload }) => (
            <ChartTooltip
              active={active}
              payload={payload?.map((p) => ({
                name: String(p.payload?.label ?? ''),
                value: Number(p.value),
                color: '#6366f1',
              }))}
              formatter={fmt}
            />
          )}
        />
        <Bar dataKey="montant" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}

export interface EfficiencyBarDatum { name: string; efficacité: number; élèves: number }

export function SchoolEfficiencyBarChart({ data }: { data: EfficiencyBarDatum[] }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
        <RechartsTooltip
          content={({ active, payload, label }) => {
            if (!active || !payload?.length) return null
            const row = payload[0]?.payload as EfficiencyBarDatum
            return (
              <div className="bg-zinc-900/95 text-white text-xs rounded-lg px-3 py-2 shadow-xl">
                <p className="font-medium mb-1">{label}</p>
                <p>Efficacité : {row.efficacité}%</p>
                <p>{row.élèves} élèves</p>
              </div>
            )
          }}
        />
        <Bar dataKey="efficacité" fill="#06b6d4" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  )
}
