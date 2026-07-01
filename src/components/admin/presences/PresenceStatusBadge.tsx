'use client'

import { cn } from '@/lib/utils'

const STATUS_CFG = {
  PRESENT: { label: 'Présent', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  ABSENT: { label: 'Absent', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  LATE: { label: 'Retard', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
} as const

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
