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

function isSameLocalDay(iso: string): boolean {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

function printRectification(pdfBase64?: string | null, filename?: string | null) {
  if (!pdfBase64) return
  const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const popup = window.open(url)
  if (!popup) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'recu-rectificatif.pdf'
    link.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

/**
 * Correction de saisie sur un encaissement espèces de la session ouverte.
 * Contre-passation : la ligne d'origine reste, un avoir et un reçu rectificatif sont émis.
 */
export function CorrectLastMonthButton({ payment, className, onDone }: Props) {
  const qc = useQueryClient()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('Erreur de sélection de mois par le caissier')
  const [error, setError] = useState<string | null>(null)

  const target = pickCorrectableSuffix(payment.fees)
  const canShow =
    payment.method === 'CASH' &&
    payment.amount > 0 &&
    (payment.status === 'CONFIRMED' || payment.status === 'RECONCILED') &&
    isSameLocalDay(payment.confirmedAt || payment.createdAt) &&
    target?.id != null

  const mutation = useMutation({
    mutationFn: () =>
      financeRoleApi.correctPaymentLines(payment.id, {
        paymentFeeIds: [target!.id!],
        reason: reason.trim() || 'Mois coché par erreur',
      }),
    onSuccess: async (result) => {
      setOpen(false)
      setError(null)
      printRectification(result?.pdfBase64, result?.pdfFilename)
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
        Correction de saisie
      </button>

      {open ? (
        <div className="absolute right-0 z-20 mt-2 w-72 rounded-xl border border-zinc-200 bg-white p-3 shadow-lg">
          <p className="text-xs font-semibold text-zinc-900">
            Annuler {target.feeLabel}
          </p>
          <p className="mt-1 text-[11px] text-zinc-500">
            Montant retiré de la caisse : {formatMoney(target.amount, currency)}. Le reçu
            d’origine reste archivé. Un avoir et un reçu « Rectification du reçu précédent »
            sont imprimés tout de suite. L’administrateur est alerté sans bloquer le guichet.
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
              disabled={mutation.isPending || reason.trim().length < 8}
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
