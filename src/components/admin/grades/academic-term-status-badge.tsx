import { cn } from '@/lib/utils'
import type { AcademicTermStatus } from '@/types/teacher-grades'

const META: Record<AcademicTermStatus, { label: string; className: string }> = {
  DRAFT: { label: 'Ouvert', className: 'bg-amber-50 text-amber-800 ring-amber-200' },
  SUBMITTED: { label: 'Soumis', className: 'bg-sky-50 text-sky-800 ring-sky-200' },
  LOCKED: { label: 'Verrouillé', className: 'bg-zinc-100 text-zinc-700 ring-zinc-300' },
}

export function AcademicTermStatusBadge({
  status,
  className,
}: {
  status: AcademicTermStatus | string
  className?: string
}) {
  const meta = META[status as AcademicTermStatus] ?? {
    label: status,
    className: 'bg-zinc-100 text-zinc-600 ring-zinc-200',
  }
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset',
        meta.className,
        className,
      )}
    >
      {meta.label}
    </span>
  )
}
