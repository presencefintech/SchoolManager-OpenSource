'use client'

import { History } from 'lucide-react'
import { buildRefundHistoryEvents, type RefundHistorySource } from '@/lib/finance/refund-history.utils'
import { cn, formatDateTime } from '@/lib/utils'

const TONE_STYLES: Record<string, { dot: string; card: string }> = {
  neutral: { dot: 'bg-slate-400 shadow-slate-400/50', card: 'text-slate-700' },
  success: { dot: 'bg-emerald-500 shadow-emerald-500/50', card: 'text-emerald-800' },
  danger:  { dot: 'bg-rose-500 shadow-rose-500/50', card: 'text-rose-800' },
  warning: { dot: 'bg-amber-500 shadow-amber-500/50', card: 'text-amber-800' },
  info:    { dot: 'bg-sky-500 shadow-sky-500/50', card: 'text-sky-800' },
}

export function RefundDecisionHistory({ refund }: { refund: RefundHistorySource }) {
  const events = buildRefundHistoryEvents(refund)

  if (events.length <= 1 && !events[0]?.actor && !events[0]?.detail) {
    return (
      <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/70 to-indigo-50/50 px-3 py-3 text-xs">
        <p className="mb-1 flex items-center gap-1.5 font-semibold text-violet-800">
          <History size={13} />
          Historique de décision
        </p>
        <p className="text-violet-700/80">En attente de validation administrative.</p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-violet-200/60 bg-gradient-to-br from-violet-50/80 via-indigo-50/40 to-slate-50/60 px-3 py-3 text-xs">
      <p className="mb-2.5 flex items-center gap-1.5 font-semibold text-violet-900">
        <History size={13} />
        Historique de décision
      </p>
      <ol className="space-y-2.5">
        {events.map((event, index) => {
          const style = TONE_STYLES[event.tone] ?? TONE_STYLES.neutral
          return (
            <li key={event.key} className="flex gap-2.5">
              <div className="flex flex-col items-center pt-1">
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full shadow-sm', style.dot)} />
                {index < events.length - 1 && (
                  <span className="mt-1 min-h-[14px] w-px flex-1 bg-gradient-to-b from-violet-300/80 to-transparent" />
                )}
              </div>
              <div className="min-w-0 pb-0.5">
                <p className={cn('font-semibold', style.card)}>{event.label}</p>
                {event.date && (
                  <p className="text-slate-500">{formatDateTime(event.date)}</p>
                )}
                {event.actor && (
                  <p className="text-slate-600">Par <span className="font-medium">{event.actor}</span></p>
                )}
                {event.detail && (
                  <p className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-white/50 px-2 py-1.5 text-slate-600 ring-1 ring-violet-100/80">
                    {event.detail}
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
