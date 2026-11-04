'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, Cell, LabelList, ReferenceLine,
} from 'recharts'
import { useSchoolMoney } from '@/lib/finance/use-school-money'

/** Palette inspirée Power BI */
const PBI = {
  blue: '#118DFF',
  green: '#1AAB40',
  orange: '#D9B300',
  red: '#D64550',
  grid: '#E8E6E3',
  axis: '#605E5C',
  tooltipBg: '#FFFFFF',
  tooltipBorder: '#C8C6C4',
  target: '#8764B8',
} as const

export interface EfficiencyLevelDatum {
  levelName: string
  efficiency: number
  studentCount?: number
  totalDue?: number
}

function efficiencyColor(value: number): string {
  if (value >= 70) return PBI.green
  if (value >= 50) return PBI.orange
  return PBI.red
}

function efficiencyLabel(value: number): string {
  if (value >= 70) return 'Bon'
  if (value >= 50) return 'Moyen'
  return 'Critique'
}

function PowerBiTooltip({ active, payload }: {
  active?: boolean
  payload?: Array<{ payload: EfficiencyLevelDatum }>
}) {
  const { format: formatMoney } = useSchoolMoney()
  if (!active || !payload?.[0]) return null
  const row = payload[0].payload
  const color = efficiencyColor(row.efficiency)

  return (
    <div
      className="rounded-md border bg-white px-3 py-2.5 shadow-lg"
      style={{ borderColor: PBI.tooltipBorder, minWidth: 180 }}
    >
      <p className="text-xs font-semibold text-[#323130] mb-2">{row.levelName}</p>
      <div className="space-y-1 text-[11px]">
        <div className="flex justify-between gap-4">
          <span className="text-[#605E5C]">Recouvrement</span>
          <span className="font-bold tabular-nums" style={{ color }}>{row.efficiency.toFixed(1)}%</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#605E5C]">Statut</span>
          <span className="font-medium" style={{ color }}>{efficiencyLabel(row.efficiency)}</span>
        </div>
        {row.studentCount != null && (
          <div className="flex justify-between gap-4">
            <span className="text-[#605E5C]">Élèves</span>
            <span className="font-medium text-[#323130] tabular-nums">{row.studentCount}</span>
          </div>
        )}
        {row.totalDue != null && (
          <div className="flex justify-between gap-4">
            <span className="text-[#605E5C]">Solde dû</span>
            <span className="font-medium text-[#323130] tabular-nums">{formatMoney(row.totalDue)}</span>
          </div>
        )}
      </div>
    </div>
  )
}

export function FinanceEfficiencyBarChart({
  data,
  target = 70,
}: {
  data: EfficiencyLevelDatum[]
  target?: number
}) {
  if (!data.length) {
    return (
      <div className="h-56 flex items-center justify-center text-sm text-[#605E5C] bg-[#F3F2F1] rounded-lg border border-[#EDEBE9]">
        Aucune donnée disponible
      </div>
    )
  }

  const chartData = [...data].sort((a, b) => b.efficiency - a.efficiency)
  const barHeight = Math.max(220, chartData.length * 52)

  return (
    <div className="space-y-3">
      {/* Légende Power BI */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px] text-[#605E5C]">
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PBI.green }} />
          Bon (≥ 70 %)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PBI.orange }} />
          Moyen (50–69 %)
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: PBI.red }} />
          Critique (&lt; 50 %)
        </span>
        <span className="flex items-center gap-1.5 ml-auto">
          <span className="w-4 h-0 border-t-2 border-dashed" style={{ borderColor: PBI.target }} />
          Objectif {target} %
        </span>
      </div>

      <div className="rounded-lg border border-[#EDEBE9] bg-[#FAF9F8] p-3 pt-4">
        <ResponsiveContainer width="100%" height={barHeight}>
          <BarChart
            data={chartData}
            layout="vertical"
            margin={{ top: 4, right: 48, left: 4, bottom: 4 }}
            barCategoryGap="20%"
          >
            <CartesianGrid stroke={PBI.grid} strokeDasharray="0" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tick={{ fontSize: 11, fill: PBI.axis }}
              tickLine={false}
              axisLine={{ stroke: PBI.grid }}
              tickFormatter={(v) => `${v}%`}
            />
            <YAxis
              type="category"
              dataKey="levelName"
              width={72}
              tick={{ fontSize: 11, fill: '#323130', fontWeight: 500 }}
              tickLine={false}
              axisLine={false}
            />
            <RechartsTooltip content={<PowerBiTooltip />} cursor={{ fill: 'rgba(17,141,255,0.06)' }} />
            <ReferenceLine
              x={target}
              stroke={PBI.target}
              strokeDasharray="4 4"
              strokeWidth={2}
              label={{
                value: `Objectif ${target}%`,
                position: 'top',
                fill: PBI.target,
                fontSize: 10,
                fontWeight: 600,
              }}
            />
            <Bar dataKey="efficiency" radius={[0, 4, 4, 0]} barSize={22} maxBarSize={28}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={efficiencyColor(entry.efficiency)} />
              ))}
              <LabelList
                dataKey="efficiency"
                position="right"
                formatter={(v: number) => `${Math.round(v)}%`}
                style={{ fontSize: 11, fontWeight: 600, fill: '#323130' }}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
