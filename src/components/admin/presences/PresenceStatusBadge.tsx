'use client'

import { cn } from '@/lib/utils'
import type { PresenceDirection } from '@/types/admin'

const STATUS_CFG = {
  PRESENT: { label: 'Présent', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ABSENT: { label: 'Absent', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  LATE: { label: 'Retard', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  EXCUSED: { label: 'Excusé', className: 'bg-sky-50 text-sky-800 ring-sky-600/20' },
  UNIFORM_VIOLATION: { label: 'Tenue', className: 'bg-violet-50 text-violet-800 ring-violet-600/20' },
  EXITED: { label: 'Sorti', className: 'bg-indigo-50 text-indigo-800 ring-indigo-600/20' },
} as const

const DIRECTION_CFG: Record<
  PresenceDirection,
  { label: string; className: string }
> = {
  ARRIVAL: { label: 'Arrivée', className: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20' },
  EXIT: { label: 'Sortie', className: 'bg-violet-50 text-violet-700 ring-violet-600/20' },
}

export function PresenceStatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const cfg = STATUS_CFG[status as keyof typeof STATUS_CFG] ?? STATUS_CFG.ABSENT
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        cfg.className,
        className,
      )}
    >
      {cfg.label}
    </span>
  )
}

export function PresenceDirectionBadge({
  direction,
  className,
}: {
  direction?: PresenceDirection | string | null
  className?: string
}) {
  if (!direction || (direction !== 'ARRIVAL' && direction !== 'EXIT')) return null
  const cfg = DIRECTION_CFG[direction]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ring-1 ring-inset',
        cfg.className,
        className,
      )}
    >
      {cfg.label}
    </span>
  )
}

/** Statut + direction côte à côte (live / history). */
export function PresenceScanBadges({
  status,
  direction,
  className,
}: {
  status: string
  direction?: PresenceDirection | string | null
  className?: string
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-1.5', className)}>
      <PresenceStatusBadge status={status} />
      <PresenceDirectionBadge direction={direction} />
    </div>
  )
}
