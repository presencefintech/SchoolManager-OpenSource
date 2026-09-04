'use client'

import { useState } from 'react'
import { Undo2, Loader2 } from 'lucide-react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import type { PaymentFeeLine, StudentPaymentDetail } from '@/lib/finance/payment-history.utils'
import { cn } from '@/lib/utils'

function pickCorrectableSuffix(fees: PaymentFeeLine[]): PaymentFeeLine | null {
  const active = fees.filter((f) => f.id && !f.reversedAt)
  if (active.length < 2) return null
  const monthly = active.filter((f) => f.isMonthly && f.monthYear)
  if (monthly.length < 2) return null
  const sorted = [...monthly].sort((a, b) => String(a.monthYear).localeCompare(String(b.monthYear)))
  return sorted[sorted.length - 1] ?? null
}

type Props = {
  payment: StudentPaymentDetail
  className?: string
  onDone?: () => void
}

/**
 * Annule le mois le plus récent d’un paiement cash multi-mois (ex. déc coché par erreur).
 * Soft-reverse côté API — aucune suppression.
 */
export function CorrectLastMonthButton({ payment, className, onDone }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('Mois coché par erreur')
  const [error, setError] = useState<string | null>(null)

  const target = pickCorrectableSuffix(payment.fees)
  const canShow =
    payment.method === 'CASH' &&
    (payment.status === 'CONFIRMED' || payment.status === 'RECONCILED') &&
    target?.id != null

  const mutation = useMutation({
    mutationFn: () =>
      financeRoleApi.correctPaymentLines(payment.id, {
        paymentFeeIds: [target!.id!],
        reason: reason.trim() || 'Mois coché par erreur',
      }),
    onSuccess: async () => {
      setOpen(false)
      setError(null)
      await qc.invalidateQueries({ queryKey: ['finance'] })
      onDone?.()
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        (err instanceof Error ? err.message : 'Correction impossible')
      setError(msg)
    },
  })

  if (!canShow || !target) return null

  const currency = (payment.currency || 'USD') as FinanceCurrencyCode

  return (
    <div className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => {
          setError(null)
          setOpen((v) => !v)
        }}
        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800 hover:bg-amber-100"
      >
        <Undo2 size={12} />
        Corriger mois
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-zinc-900">
            Annuler {target.feeLabel}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Montant rendu : {formatMoney(target.amount, currency)}. La ligne reste visible
            (annulée) et le mois redevient dû. Session de caisse encore ouverte requise.
          </p>
          <label className="mt-2 block text-[10px] font-medium uppercase tracking-wide text-zinc-400">
            Motif
          </label>
          <input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-xs"
            maxLength={500}
          />
          {error ? <p className="mt-2 text-[11px] text-red-600">{error}</p> : null}
          <div className="mt-3 flex justify-end gap-2">
            <button
              type="button"
              className="rounded-lg px-2 py-1 text-[11px] text-zinc-500 hover:bg-zinc-50"
              onClick={() => setOpen(false)}
            >
              Fermer
            </button>
            <button
              type="button"
              disabled={mutation.isPending || reason.trim().length < 5}
              onClick={() => mutation.mutate()}
              className="inline-flex items-center gap-1 rounded-lg bg-amber-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-amber-700 disabled:opacity-50"
            >
              {mutation.isPending ? <Loader2 size={12} className="animate-spin" /> : null}
              Confirmer
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}
