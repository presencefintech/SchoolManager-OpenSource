'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

export interface EfficiencyLevelDatum {
  levelName: string
  efficiency: number
}

export function FinanceEfficiencyBarChart({ data }: { data: EfficiencyLevelDatum[] }) {
  if (!data.length) {
    return <div className="h-52 flex items-center justify-center text-sm text-zinc-400">Aucune donnée</div>
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barSize={28}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="levelName" tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}%`} domain={[0, 100]} />
        <RechartsTooltip
          formatter={(v: number) => [`${Math.round(v)}%`, 'Efficacité']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e4e4e7' }}
        />
        <Bar dataKey="efficiency" radius={[6, 6, 0, 0]}>
          {data.map((entry, i) => (
            <Cell
              key={i}
              fill={entry.efficiency >= 70 ? '#22c55e' : entry.efficiency >= 50 ? '#f97316' : '#ef4444'}
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
