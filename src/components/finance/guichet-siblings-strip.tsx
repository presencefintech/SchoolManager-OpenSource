'use client'

import Link from 'next/link'
import { Users } from 'lucide-react'
import { useStudentSiblings } from '@/lib/hooks/use-finance'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'

/** Fratrie — un parent paie plusieurs enfants dans la même file (RDC). */
export function GuichetSiblingsStrip({
  studentId,
  onSelect,
}: {
  studentId: number
  onSelect?: (id: number) => void
}) {
  const { data: siblings = [], isLoading } = useStudentSiblings(studentId)

  if (isLoading) {
    return (
      <div className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-xs text-zinc-400 animate-pulse">
        Recherche fratrie…
      </div>
    )
  }

  if (siblings.length === 0) return null

  return (
    <div className="rounded-xl border border-sky-100 bg-sky-50/50 p-4 space-y-2">
      <div className="flex items-center gap-2">
        <Users size={14} className="text-sky-600" />
        <p className="text-xs font-semibold text-sky-950">
          Fratrie · même parent ({siblings.length})
        </p>
      </div>
      <p className="text-[11px] text-sky-800/80">
        Le parent peut régler plusieurs enfants sans quitter le guichet.
      </p>
      <div className="flex flex-wrap gap-2">
        {siblings.map((s) => {
          const debtor = Number(s.balance) > 0.01
          const inner = (
            <>
              <span className="font-medium text-zinc-900 truncate max-w-[10rem]">{s.name}</span>
              <span className="text-zinc-400">{s.matricule}</span>
              {s.isCrossSite && s.schoolName ? (
                <span className="rounded bg-amber-100 px-1 py-0.5 text-[10px] font-medium text-amber-900">
                  {s.schoolName}
                </span>
              ) : null}
              {s.className ? <span className="text-zinc-500">{s.className}</span> : null}
              <span
                className={cn(
                  'tabular-nums font-semibold',
                  debtor ? 'text-red-600' : 'text-emerald-700',
                )}
              >
                {formatMoney(Number(s.balance) || 0)}
              </span>
            </>
          )
          if (onSelect) {
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => onSelect(s.id)}
                className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] hover:bg-sky-50"
              >
                {inner}
              </button>
            )
          }
          return (
            <Link
              key={s.id}
              href={`/finances/paiements?studentId=${s.id}`}
              className="inline-flex flex-wrap items-center gap-1.5 rounded-lg border border-sky-200 bg-white px-2.5 py-1.5 text-[11px] hover:bg-sky-50"
            >
              {inner}
            </Link>
          )
        })}
      </div>
    </div>
  )
}
