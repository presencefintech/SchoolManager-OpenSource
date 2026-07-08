'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, History, Loader2 } from 'lucide-react'
import { useStudentPaymentsDetailed } from '@/lib/hooks/use-finance'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'

const STATUS_CLASS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700',
  REJECTED: 'bg-red-50 text-red-700',
}

const PAGE_SIZE = 10

interface StudentPaymentHistoryProps {
  studentId: number
  className?: string
  compact?: boolean
}

export function StudentPaymentHistory({ studentId, className, compact }: StudentPaymentHistoryProps) {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useStudentPaymentsDetailed(studentId, {
    page,
    limit: PAGE_SIZE,
  })

  if (studentId <= 0) return null

  const payments = data?.data ?? []
  const total = data?.total ?? 0
  const lastPage = data?.lastPage ?? 1

  return (
    <section className={cn('rounded-xl border border-zinc-200/60 bg-white', className)}>
      <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
        <div className="flex items-center gap-2">
          <History size={15} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Historique des paiements</h2>
          {total > 0 && (
            <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500">
              {total}
            </span>
          )}
        </div>
        {isFetching && !isLoading && (
          <Loader2 size={14} className="animate-spin text-zinc-400" />
        )}
      </div>

      {isLoading ? (
        <div className="space-y-3 p-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="text-sm text-zinc-400">Aucun paiement enregistré</p>
        </div>
      ) : (
        <div className={cn('divide-y divide-zinc-50', compact && 'max-h-72 overflow-y-auto')}>
          {payments.map((p) => {
            const currency = (p.currency || 'USD') as FinanceCurrencyCode
            const statusClass = STATUS_CLASS[p.status] ?? 'bg-zinc-100 text-zinc-600'
            const dateLabel = p.confirmedAt ?? p.createdAt

            return (
              <div
                key={p.id}
                className="flex flex-col gap-3 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-zinc-900 tabular-nums">
                      #{p.id}
                    </span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      {p.methodLabel || p.method || '—'}
                    </span>
                    {p.status && (
                      <span className={cn('rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase', statusClass)}>
                        {p.status}
                      </span>
                    )}
                    {p.receiptNumber && (
                      <span className="text-[10px] text-zinc-400">Reçu {p.receiptNumber}</span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-600">{p.feeSummary}</p>
                  {p.fees.length > 1 && (
                    <p className="mt-0.5 text-[10px] text-zinc-400">
                      {p.fees.length} lignes ventilées
                    </p>
                  )}
                  {dateLabel && (
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {new Date(dateLabel).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                    {formatMoney(Number(p.amount), currency)}
                  </span>
                  {p.status === 'CONFIRMED' && (
                    <PrintReceiptButton paymentId={p.id} />
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lastPage > 1 && (
        <div className="flex items-center justify-between border-t border-zinc-100 px-5 py-3">
          <p className="text-xs text-zinc-400">
            Page {page} / {lastPage}
          </p>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1 || isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={page >= lastPage || isFetching}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-zinc-200 p-1.5 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </section>
  )
}
