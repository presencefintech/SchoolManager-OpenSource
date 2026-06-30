'use client'

import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function RingProgress({
  pct, color = '#10b981', size = 52,
}: {
  pct: number; color?: string; size?: number
}) {
  const r = (size - 6) / 2
  const circ = 2 * Math.PI * r
  const dash = (Math.min(Math.max(pct, 0), 100) / 100) * circ
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f4f4f5" strokeWidth={5} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={5}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${size / 2} ${size / 2})`}
      />
      <text x={size / 2} y={size / 2 + 4} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>
        {Math.round(pct)}%
      </text>
    </svg>
  )
}

export function KpiCard({
  label, value, sub, icon: Icon,
  iconBg, iconColor,
  ring, ringColor,
  trend,
  children,
}: {
  label: string
  value: string | number
  sub?: string
  icon: LucideIcon
  iconBg: string
  iconColor: string
  ring?: number
  ringColor?: string
  trend?: 'up' | 'down'
  children?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 flex flex-col gap-3">
      <div className="flex items-start justify-between">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', iconBg)}>
          <Icon size={16} className={iconColor} />
        </div>
        {ring != null && (
          <RingProgress
            pct={ring}
            color={ringColor ?? (ring >= 70 ? '#10b981' : ring >= 50 ? '#f59e0b' : '#ef4444')}
          />
        )}
      </div>
      <div>
        <p className="text-2xl font-bold text-zinc-900 leading-none tabular-nums">{value}</p>
        {sub && <p className="text-xs text-zinc-400 mt-1">{sub}</p>}
      </div>
      <p className="text-xs text-zinc-500">{label}</p>
      {children}
    </div>
  )
}

/** Barre de progression inline */
export function MiniBar({
  value, max, color = 'bg-emerald-500',
}: {
  value: number; max: number; color?: string
}) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 0
  return (
    <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
      <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

/** Grille de cartes KPI — 2 cols sur mobile, N cols sur desktop */
export function KpiGrid({
  cols = 4, children,
}: {
  cols?: 2 | 3 | 4 | 5
  children: React.ReactNode
}) {
  return (
    <div
      className={cn(
        'grid gap-4',
        cols === 2 && 'grid-cols-2',
        cols === 3 && 'grid-cols-2 sm:grid-cols-3',
        cols === 4 && 'grid-cols-2 sm:grid-cols-4',
        cols === 5 && 'grid-cols-2 sm:grid-cols-5',
      )}
    >
      {children}
    </div>
  )
}
