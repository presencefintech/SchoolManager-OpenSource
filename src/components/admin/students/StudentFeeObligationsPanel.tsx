'use client'

import { useQuery } from '@tanstack/react-query'
import { Loader2, Wallet } from 'lucide-react'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { cn } from '@/lib/utils'

type ObligationRow = {
  id: number
  categoryCode: string
  categoryName: string
  feeStructureId: number | null
  grossAmount: number
  discountAmount: number
  netAmount: number
  paidAmount: number
  remaining: number
  currency: string
  status: 'OPEN' | 'PARTIAL' | 'PAID' | string
}

function statusTone(status: string) {
  if (status === 'PAID') return 'bg-emerald-50 text-emerald-800 border-emerald-200'
  if (status === 'PARTIAL') return 'bg-amber-50 text-amber-900 border-amber-200'
  return 'bg-rose-50 text-rose-800 border-rose-200'
}

function statusDot(status: string) {
  if (status === 'PAID') return '🟢'
  if (status === 'PARTIAL') return '🟡'
  return '🔴'
}

function fmt(n: number, currency = 'USD') {
  return `${n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
}

export function StudentFeeObligationsPanel({
  studentId,
  sessionId,
  hideAmounts,
}: {
  studentId: number
  sessionId?: number
  hideAmounts?: boolean
}) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'student-obligations', studentId, sessionId ?? null],
    queryFn: () => financeRoleApi.listStudentObligations(studentId, sessionId),
    enabled: studentId > 0,
    staleTime: 30_000,
  })

  const obligations: ObligationRow[] = data?.obligations ?? []

  return (
    <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2">
        <Wallet size={14} className="text-zinc-500" />
        <h3 className="text-sm font-semibold text-zinc-800">Obligations V2</h3>
        {isLoading && <Loader2 size={12} className="animate-spin text-zinc-400 ml-auto" />}
      </div>

      {isError && (
        <p className="px-4 py-3 text-xs text-rose-700">Impossible de charger les obligations.</p>
      )}

      {!isLoading && !isError && obligations.length === 0 && (
        <p className="px-4 py-3 text-xs text-zinc-500">Aucune obligation ouverte pour cette session.</p>
      )}

      {obligations.length > 0 && (
        <ul className="divide-y divide-zinc-50">
          {obligations.map((row) => (
            <li key={row.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-medium text-zinc-800 truncate">
                  {row.categoryName}
                  <span className="text-zinc-400 font-normal"> · {row.categoryCode}</span>
                </p>
                <span
                  className={cn(
                    'mt-1 inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
                    statusTone(row.status),
                  )}
                >
                  {statusDot(row.status)} {row.status}
                </span>
              </div>
              {!hideAmounts && (
                <div className="text-right shrink-0">
                  <p className="text-xs font-semibold tabular-nums text-zinc-800">
                    {fmt(row.netAmount, row.currency)}
                  </p>
                  {row.status === 'PARTIAL' && (
                    <p className="text-[10px] tabular-nums text-amber-800">
                      {fmt(row.paidAmount, row.currency)} / {fmt(row.netAmount, row.currency)}
                    </p>
                  )}
                  {row.status === 'OPEN' && row.paidAmount <= 0 && (
                    <p className="text-[10px] text-rose-700">Reste dû {fmt(row.remaining, row.currency)}</p>
                  )}
                  {row.status === 'PAID' && (
                    <p className="text-[10px] text-emerald-700">Soldé</p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {obligations.length > 0 && !hideAmounts && data && (
        <div className="px-4 py-2.5 border-t border-zinc-100 bg-zinc-50/80 text-[11px] flex justify-between tabular-nums text-zinc-700">
          <span>Net {fmt(data.totalNet)}</span>
          <span>Payé {fmt(data.totalPaid)}</span>
          <span className="font-semibold">Reste {fmt(data.totalRemaining)}</span>
        </div>
      )}
    </div>
  )
}
