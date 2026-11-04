import { cn } from '@/lib/utils'
import type { DeliberationDecision } from '@/lib/admin/api/deliberations.api'

const STYLES: Record<
  DeliberationDecision,
  { label: string; className: string }
> = {
  PASSE: {
    label: 'Passe',
    className: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  },
  REPECHAGE: {
    label: 'Répêchage',
    className: 'bg-amber-50 text-amber-900 ring-amber-200',
  },
  DOUBLE: {
    label: 'Double',
    className: 'bg-rose-50 text-rose-800 ring-rose-200',
  },
  EN_ATTENTE: {
    label: 'En attente',
    className: 'bg-slate-100 text-slate-700 ring-slate-200',
  },
}

export function DecisionBadge({
  decision,
  label,
}: {
  decision: DeliberationDecision | string
  label?: string | null
}) {
  const key = (decision in STYLES ? decision : 'EN_ATTENTE') as DeliberationDecision
  const style = STYLES[key]
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        style.className,
      )}
    >
      {label?.trim() || style.label}
    </span>
  )
}
