'use client'

import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, History, Loader2 } from 'lucide-react'
import {
  useStudentPaymentsDetailed,
  useStudentConfirmedPayments,
  useStudentWallet,
} from '@/lib/hooks/use-finance'
import { useAdminStudentPaymentsDetailed } from '@/lib/hooks/use-admin'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import { CorrectLastMonthButton } from '@/components/finance/student-dashboard/CorrectLastMonthButton'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import type { StudentPaymentDetail } from '@/lib/finance/payment-history.utils'

export type StudentFinanceApi = 'finance' | 'admin'

const STATUS_CLASS: Record<string, string> = {
  CONFIRMED: 'bg-emerald-50 text-emerald-700',
  PENDING: 'bg-amber-50 text-amber-700',
  FAILED: 'bg-red-50 text-red-700',
  REJECTED: 'bg-red-50 text-red-700',
  REFUNDED: 'bg-sky-50 text-sky-700',
  RECONCILED: 'bg-emerald-50 text-emerald-700',
}

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  CARD: 'Carte bancaire',
  BANK: 'Virement bancaire',
  BANK_TRANSFER: 'Virement bancaire',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  MOBILE_MONEY: 'Mobile money',
}

const PAGE_SIZE = 10

function toDetailFromLoose(row: Record<string, unknown>): StudentPaymentDetail | null {
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const method = String(row.method ?? '')
  return {
    id,
    studentId: Number(row.studentId ?? 0),
    studentName: String(row.studentName ?? ''),
    studentFirstName: '',
    studentLastName: '',
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'USD'),
    status: String(row.status ?? 'CONFIRMED'),
    method,
    methodLabel: METHOD_LABELS[method] ?? method ?? '—',
    channel: null,
    reference: String(row.reference ?? ''),
    createdAt: String(row.createdAt ?? ''),
    confirmedAt: (row.confirmedAt as string | null) ?? null,
    receiptNumber: (row.receiptNumber as string | null) ?? null,
    feeSummary: String(row.feeSummary ?? row.comment ?? 'Paiement'),
    fees: [],
    isMonthlyPayment: false,
  }
}

interface StudentPaymentHistoryProps {
  studentId: number
  className?: string
  compact?: boolean
  api?: StudentFinanceApi
}

export function StudentPaymentHistory({
  studentId,
  className,
  compact,
  api = 'finance',
}: StudentPaymentHistoryProps) {
  const [page, setPage] = useState(1)
  const params = { page, limit: PAGE_SIZE }
  const financeQuery = useStudentPaymentsDetailed(studentId, params, {
    enabled: api === 'finance',
  })
  const adminQuery = useAdminStudentPaymentsDetailed(studentId, params, {
    enabled: api === 'admin',
  })
  const confirmedFallback = useStudentConfirmedPayments(api === 'finance' ? studentId : 0)
  const walletFallback = useStudentWallet(api === 'finance' ? studentId : 0)

  const { data, isLoading, isFetching, isError, error, refetch } =
    api === 'admin' ? adminQuery : financeQuery

  const payments = useMemo(() => {
    const primary = data?.data ?? []
    if (primary.length > 0) return primary

    const fromSearch = Array.isArray(confirmedFallback.data)
      ? confirmedFallback.data
          .map((row) => toDetailFromLoose(row as unknown as Record<string, unknown>))
          .filter((p): p is StudentPaymentDetail => p != null)
      : []
    if (fromSearch.length > 0) return fromSearch

    const wallet = walletFallback.data as
      | { transactions?: unknown[]; recentPayments?: unknown[] }
      | undefined
    const walletTx = wallet?.recentPayments ?? wallet?.transactions
    if (Array.isArray(walletTx)) {
      return walletTx
        .map((row) => toDetailFromLoose(row as Record<string, unknown>))
        .filter((p): p is StudentPaymentDetail => p != null)
    }
    return []
  }, [data?.data, confirmedFallback.data, walletFallback.data])

  if (studentId <= 0) return null

  const total = data?.total && data.data.length > 0 ? data.total : payments.length
  const lastPage = data?.lastPage && data.data.length > 0 ? data.lastPage : 1
  const loading =
    isLoading ||
    (api === 'finance' &&
      payments.length === 0 &&
      (confirmedFallback.isLoading || walletFallback.isLoading))

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
        {isFetching && !loading && (
          <Loader2 size={14} className="animate-spin text-zinc-400" />
        )}
      </div>

      {loading ? (
        <div className="space-y-3 p-5">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-14 rounded-lg" />
          ))}
        </div>
      ) : isError && payments.length === 0 ? (
        <div className="px-5 py-8 text-center space-y-2">
          <p className="text-sm text-red-600">Impossible de charger l&apos;historique</p>
          <p className="text-xs text-zinc-400">
            {getApiErrorMessage(error)}
          </p>
          <button
            type="button"
            onClick={() => void refetch()}
            className="text-xs font-medium text-emerald-700 hover:underline"
          >
            Réessayer
          </button>
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
                    <span className="text-xs font-medium text-zinc-900 tabular-nums">#{p.id}</span>
                    <span className="rounded bg-zinc-100 px-1.5 py-0.5 text-xs text-zinc-600">
                      {p.methodLabel || p.method || '—'}
                    </span>
                    {p.status ? (
                      <span
                        className={cn(
                          'rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase',
                          statusClass,
                        )}
                      >
                        {p.status}
                      </span>
                    ) : null}
                    {p.receiptNumber ? (
                      <span className="text-[10px] text-zinc-400">Reçu {p.receiptNumber}</span>
                    ) : null}
                  </div>
                  <p className="mt-1 truncate text-xs text-zinc-600">{p.feeSummary}</p>
                  {p.fees.length > 0 ? (
                    <ul className="mt-1 space-y-0.5">
                      {p.fees.map((f, idx) => (
                        <li
                          key={f.id ?? `${f.feeStructureId}-${f.monthYear}-${idx}`}
                          className={cn(
                            'text-[10px] text-zinc-400',
                            f.reversedAt && 'line-through text-zinc-300',
                          )}
                        >
                          {f.feeLabel}
                          {f.reversedAt ? ' (annulé)' : ''}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                  {dateLabel ? (
                    <p className="mt-1 text-[10px] text-zinc-400">
                      {new Date(dateLabel).toLocaleString('fr-FR', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-3 sm:flex-col sm:items-end">
                  <span className="text-sm font-semibold text-emerald-700 tabular-nums">
                    {formatMoney(Number(p.amount), currency)}
                  </span>
                  <div className="flex items-center gap-2">
                    {api === 'finance' && p.status === 'CONFIRMED' ? (
                      <CorrectLastMonthButton payment={p} onDone={() => void refetch()} />
                    ) : null}
                    {p.status === 'CONFIRMED' ? <PrintReceiptButton paymentId={p.id} /> : null}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {lastPage > 1 ? (
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
      ) : null}
    </section>
  )
}
