'use client'

import {
  PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip as RechartsTooltip, ResponsiveContainer,
} from 'recharts'
import { useSchoolMoney } from '@/lib/finance/use-school-money'

export interface PaymentCategoryDatum { name: string; value: number; count: number; color: string }
export interface PaymentMethodDatum { name: string; amount: number; count: number }

export function PaymentCategoryDonutChart({ data, total }: { data: PaymentCategoryDatum[]; total: number }) {
  const { format: formatMoney } = useSchoolMoney()
  const chartData = data.filter((d) => d.value > 0)

  if (!chartData.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune transaction aujourd&apos;hui</p>
  }

  return (
    <div className="flex flex-col items-center">
      <div className="relative w-40 h-40">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={chartData} cx="50%" cy="50%" innerRadius={48} outerRadius={72} paddingAngle={3} dataKey="value" strokeWidth={0}>
              {chartData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
            </Pie>
            <RechartsTooltip
              formatter={(v: number, _name, entry) => [
                `${formatMoney(v)} · ${(entry?.payload as PaymentCategoryDatum)?.count ?? 0} tx`,
                'Montant',
              ]}
              contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none px-4 text-center">
          <span className="text-sm font-bold text-zinc-900 tabular-nums leading-tight">{formatMoney(total)}</span>
          <span className="text-[10px] text-zinc-400 uppercase">total</span>
        </div>
      </div>
      <div className="flex flex-wrap justify-center gap-x-4 gap-y-1.5 mt-3">
        {chartData.map((d) => (
          <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
            <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.color }} />
            {d.name} <span className="font-semibold tabular-nums">{formatMoney(d.value)}</span>
            <span className="text-zinc-400">· {d.count} tx</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export function PaymentMethodBarChart({ data }: { data: PaymentMethodDatum[] }) {
  const { format: formatMoney } = useSchoolMoney()
  const chartData = data.filter((d) => d.amount > 0)

  if (!chartData.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune transaction aujourd&apos;hui</p>
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <RechartsTooltip
          formatter={(v: number, _name, entry) => [
            `${formatMoney(v)} · ${(entry?.payload as PaymentMethodDatum)?.count ?? 0} tx`,
            'Montant',
          ]}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Bar dataKey="amount" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function PaymentMethodCountBarChart({ data }: { data: PaymentMethodDatum[] }) {
  const chartData = data.filter((d) => d.count > 0)

  if (!chartData.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune transaction aujourd&apos;hui</p>
  }

  return (
    <ResponsiveContainer width="100%" height={160}>
      <BarChart data={chartData} margin={{ top: 8, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
        <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
        <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
        <RechartsTooltip
          formatter={(v: number) => [`${v} tx`, 'Transactions']}
          contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
        />
        <Bar dataKey="count" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={24} />
      </BarChart>
    </ResponsiveContainer>
  )
}
