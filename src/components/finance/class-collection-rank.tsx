'use client'

import { presentClassRanking, type ClassCollectionRankRow, type ClassRankTone } from '@/lib/finance/class-collection-rank'
import { cn } from '@/lib/utils'

const BAR: Record<ClassRankTone, string> = {
  high: 'bg-emerald-500',
  mid: 'bg-amber-500',
  low: 'bg-red-400',
  empty: 'bg-zinc-200',
}

const RATE: Record<ClassRankTone, string> = {
  high: 'text-emerald-700',
  mid: 'text-amber-700',
  low: 'text-red-600',
  empty: 'text-zinc-400',
}

export function ClassCollectionRank({
  rows,
  className,
}: {
  rows?: ClassCollectionRankRow[] | null
  className?: string
}) {
  if (rows == null) return null
  const view = presentClassRanking(rows)

  return (
    <section className={cn('rounded-2xl border border-zinc-200/80 bg-white shadow-sm', className)}>
      <div className="border-b border-zinc-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-zinc-900">Recouvrement par classe</h2>
        <p className="text-[11px] text-zinc-400">Du mieux encaissé au plus en retard</p>
      </div>
      {view.length === 0 ? (
        <p className="px-4 py-8 text-center text-sm text-zinc-400">Aucune classe à classer</p>
      ) : (
        <ul className="max-h-80 divide-y divide-zinc-50 overflow-y-auto">
          {view.map((row) => (
            <li key={row.classId} className="px-4 py-2.5">
              <div className="flex items-baseline justify-between gap-3">
                <p className="min-w-0 truncate text-sm text-zinc-900">
                  <span className="mr-2 text-[11px] font-semibold tabular-nums text-zinc-400">
                    {row.rank}
                  </span>
                  {row.name}
                </p>
                <p className={cn('shrink-0 text-sm font-semibold tabular-nums', RATE[row.tone])}>
                  {row.rateLabel}
                </p>
              </div>
              <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-zinc-100">
                <div className={cn('h-full rounded-full', BAR[row.tone])} style={{ width: `${row.barPct}%` }} />
              </div>
              <p className="mt-1 text-[11px] text-zinc-500">
                <span className="tabular-nums">{row.paidLabel}</span>
                <span className="text-zinc-300"> / </span>
                <span className="tabular-nums">{row.expectedLabel}</span>
                <span className="text-zinc-300"> · </span>
                {row.studentLabel}
              </p>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
