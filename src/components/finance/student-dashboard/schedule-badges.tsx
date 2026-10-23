'use client'

import { AlertCircle, CalendarDays, CheckCircle2, Clock } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { FeeScheduleLineDto, FeeScheduleLineStatus } from '@/types/finance'

/** Pastilles de statut : fond doux, icône fine, texte de la même teinte. */
const STATUS_CFG: Record<FeeScheduleLineStatus, { label: string; icon: LucideIcon; className: string }> = {
  PAID: { label: 'Payé', icon: CheckCircle2, className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/10' },
  PARTIALLY_PAID: { label: 'Partiel', icon: Clock, className: 'bg-amber-50 text-amber-700 ring-amber-600/10' },
  DUE: { label: 'Dû', icon: AlertCircle, className: 'bg-rose-50 text-rose-700 ring-rose-600/10' },
  // Dû dont l'échéance est passée : même famille, un ton plus marqué.
  OVERDUE: { label: 'En retard', icon: AlertCircle, className: 'bg-rose-100/70 text-rose-800 ring-rose-700/15' },
  UPCOMING: { label: 'À venir', icon: CalendarDays, className: 'bg-zinc-100 text-zinc-500 ring-zinc-500/10' },
}

export function FeeScheduleStatusBadge({
  status,
  className,
}: {
  status: FeeScheduleLineStatus
  className?: string
}) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.DUE
  const Icon = cfg.icon
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-normal ring-1 ring-inset whitespace-nowrap',
        cfg.className,
        className,
      )}
    >
      <Icon size={12} strokeWidth={1.75} aria-hidden />
      {cfg.label}
    </span>
  )
}

const ATTRIBUTION_CFG: Record<
  NonNullable<FeeScheduleLineDto['attributionSource']>,
  { label: string; className: string }
> = {
  AUTOMATIC: { label: 'Auto', className: 'bg-emerald-50 text-emerald-700' },
  ASSIGN: { label: 'Attribué', className: 'bg-sky-50 text-sky-700' },
  OVERRIDE: { label: 'Custom', className: 'bg-amber-50 text-amber-700' },
  EXEMPT: { label: 'Exonéré', className: 'bg-zinc-100 text-zinc-600' },
}

/** Origine d'une ligne hors barème automatique (attribution, montant custom, exonération). */
export function FeeAttributionSourceBadge({
  source,
  reason,
  className,
}: {
  source?: FeeScheduleLineDto['attributionSource']
  reason?: string | null
  className?: string
}) {
  if (!source || source === 'AUTOMATIC') return null
  const cfg = ATTRIBUTION_CFG[source]
  return (
    <span
      className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-normal', cfg.className, className)}
      title={reason ?? undefined}
    >
      {cfg.label}
    </span>
  )
}
