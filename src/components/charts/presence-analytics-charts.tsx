'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'

export interface PieDatum { name: string; value: number; color: string }
export interface BarDatum { name: string; effectif: number }

export function PresencePieChart({ data, rate }: { data: PieDatum[]; rate: number }) {
  if (!data.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune donnée</p>
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {data.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip
              formatter={(v: number) => [v, 'élèves']}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <span className="text-xl font-bold text-zinc-900 tabular-nums">{rate}%</span>
          <span className="text-[10px] text-zinc-400 uppercase">taux</span>
        </div>
      </div>
      <div className="flex gap-4 mt-3">
        {data.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
            {d.name} <span className="font-semibold tabular-nums">{d.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PresenceClassBarChart({ data }: { data: BarDatum[] }) {
  if (!data.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune classe</p>
  }

  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <RechartsTooltip contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
        <Bar dataKey="effectif" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
