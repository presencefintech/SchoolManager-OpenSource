'use client'

import { RefreshCw, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { SessionEnrollment } from '@/types/admin'
import { fmtMoney } from '@/components/admin/finance/verification-ui'

function balanceTone(balance: number) {
  if (balance <= 0) return 'text-emerald-700'
  if (balance > 0) return 'text-red-600'
  return 'text-zinc-700'
}

export function SessionEnrollmentsTable({
  enrollments,
  onSync,
  syncingId,
  compact = false,
}: {
  enrollments: SessionEnrollment[]
  onSync?: (enrollmentId: number) => void
  syncingId?: number | null
  compact?: boolean
}) {
  if (!enrollments.length) {
    return <p className="text-sm text-zinc-400 py-4 text-center">Aucune inscription par session</p>
  }

  return (
    <div className="overflow-x-auto">
      <table className={cn('w-full', compact ? 'text-xs' : 'text-sm')}>
        <thead>
          <tr className="border-b border-zinc-100">
            <th className="text-left px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Session</th>
            <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Dû</th>
            <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Payé</th>
            <th className="text-right px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Solde</th>
            <th className="text-left px-3 py-2 text-[11px] font-semibold text-zinc-400 uppercase tracking-wide">Statut</th>
            {onSync && <th className="px-3 py-2" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-50">
          {enrollments.map((en) => (
            <tr key={en.id} className="hover:bg-zinc-50/80">
              <td className="px-3 py-2.5">
                <p className="font-medium text-zinc-900">{en.session?.label ?? `Session #${en.sessionId}`}</p>
                {en.session?.isCurrent && (
                  <span className="text-[10px] text-emerald-600 font-medium">Courante</span>
                )}
              </td>
              <td className="px-3 py-2.5 text-right tabular-nums text-zinc-600">{fmtMoney(en.totalAmount)}</td>
              <td className="px-3 py-2.5 text-right tabular-nums text-emerald-700">{fmtMoney(en.paidAmount)}</td>
              <td className={cn('px-3 py-2.5 text-right tabular-nums font-semibold', balanceTone(en.balance))}>
                {fmtMoney(en.balance)}
              </td>
              <td className="px-3 py-2.5">
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-600">{en.status}</span>
              </td>
              {onSync && (
                <td className="px-3 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onSync(en.id)}
                    disabled={syncingId === en.id}
                    title="Resynchroniser le solde depuis les frais de session"
                    className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-50"
                  >
                    {syncingId === en.id ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
