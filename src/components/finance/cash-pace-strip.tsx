'use client'

import { Minus, TrendingDown, TrendingUp } from 'lucide-react'
import { presentCashPace, type CashPaceAmounts, type CashPaceTrend } from '@/lib/finance/cash-pace'
import { cn } from '@/lib/utils'

function TrendMark({ trend }: { trend: CashPaceTrend }) {
  if (trend === 'up') {
    return <TrendingUp size={13} className="text-emerald-600" aria-label="Au-dessus d'hier" />
  }
  if (trend === 'down') {
    return <TrendingDown size={13} className="text-red-500" aria-label="En dessous d'hier" />
  }
  return <Minus size={13} className="text-zinc-300" aria-label="Identique à hier" />
}

export function CashPaceStrip({
  pace,
  className,
}: {
  pace?: CashPaceAmounts | null
  className?: string
}) {
  if (!pace) return null
  const view = presentCashPace(pace)

  return (
    <p
      className={cn(
        'flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-xl border border-zinc-200/80 bg-white px-3 py-2 text-xs text-zinc-600 shadow-sm',
        className,
      )}
    >
      <span>
        Aujourd&apos;hui{' '}
        <span className="font-semibold tabular-nums text-zinc-900">{view.today}</span>
      </span>
      <TrendMark trend={view.trend} />
      <span className="text-zinc-300" aria-hidden>
        ,
      </span>
      <span>
        hier <span className="font-semibold tabular-nums text-zinc-900">{view.yesterday}</span>
      </span>
      <span className="text-zinc-300" aria-hidden>
        ,
      </span>
      <span>
        cette semaine{' '}
        <span className="font-semibold tabular-nums text-zinc-900">{view.week}</span>
      </span>
    </p>
  )
}
