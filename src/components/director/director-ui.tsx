'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DirectorPageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string
  subtitle?: string
  actions?: ReactNode
}) {
  return (
    <div className="bg-white border-b border-zinc-200">
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900">{title}</h1>
          {subtitle && <p className="text-sm text-zinc-400 mt-0.5">{subtitle}</p>}
        </div>
        {actions ? <div className="flex items-center gap-2 flex-shrink-0">{actions}</div> : null}
      </div>
    </div>
  )
}

export function DirectorKpiCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = 'emerald',
}: {
  label: string
  value: string | number
  hint?: string
  icon: LucideIcon
  tone?: 'emerald' | 'amber' | 'sky' | 'indigo'
}) {
  const tones = {
    emerald: { bg: 'bg-emerald-50', icon: 'text-emerald-600', ring: 'ring-emerald-100' },
    amber: { bg: 'bg-amber-50', icon: 'text-amber-600', ring: 'ring-amber-100' },
    sky: { bg: 'bg-sky-50', icon: 'text-sky-600', ring: 'ring-sky-100' },
    indigo: { bg: 'bg-indigo-50', icon: 'text-indigo-600', ring: 'ring-indigo-100' },
  }[tone]

  return (
    <div className="bg-white rounded-2xl border border-zinc-100 px-4 py-4 flex items-center gap-3 shadow-sm">
      <div
        className={cn(
          'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ring-1',
          tones.bg,
          tones.ring
        )}
      >
        <Icon size={15} className={tones.icon} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
        <p className="text-xl font-bold text-zinc-900 leading-none tabular-nums mt-0.5">{value}</p>
        {hint && <p className="text-[11px] text-zinc-400 mt-1 truncate">{hint}</p>}
      </div>
    </div>
  )
}

export function DirectorEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon
  title: string
  description: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center px-6 py-14 gap-2">
      <Icon size={28} className="text-zinc-200" />
      <p className="text-sm font-medium text-zinc-700 mt-1">{title}</p>
      <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">{description}</p>
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  )
}

export function PresenceStatusPill({
  status,
  direction,
}: {
  status: string
  direction?: string | null
}) {
  const label =
    status === 'PRESENT'
      ? 'Présent'
      : status === 'LATE'
        ? 'Retard'
        : status === 'ABSENT'
          ? 'Absent'
          : status === 'EXITED'
            ? 'Sorti'
            : status

  return (
    <span className="inline-flex flex-wrap items-center gap-1">
      <span
        className={cn(
          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
          status === 'PRESENT'
            ? 'bg-emerald-50 text-emerald-700'
            : status === 'LATE'
              ? 'bg-amber-50 text-amber-700'
              : status === 'ABSENT'
                ? 'bg-red-50 text-red-700'
                : status === 'EXITED'
                  ? 'bg-sky-50 text-sky-800'
                  : 'bg-zinc-100 text-zinc-600'
        )}
      >
        {label}
      </span>
      {(direction === 'ARRIVAL' || direction === 'EXIT') && (
        <span
          className={cn(
            'text-[10px] font-medium px-1.5 py-0.5 rounded-full',
            direction === 'ARRIVAL'
              ? 'bg-indigo-50 text-indigo-700'
              : 'bg-violet-50 text-violet-700',
          )}
        >
          {direction === 'ARRIVAL' ? 'Arrivée' : 'Sortie'}
        </span>
      )}
    </span>
  )
}
