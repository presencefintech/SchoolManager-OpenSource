'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useProcessPayment, useResolvedCashSession } from '@/lib/hooks/use-finance'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import type { FeeScheduleLineDto, ProcessPaymentResponse } from '@/types/finance'
import { cn } from '@/lib/utils'
import { lineRemainingAmount } from '@/lib/finance/fee-schedule.utils'

const METHODS = [
  { value: 'CASH', label: 'Espèces' },
  { value: 'BANK', label: 'Virement bancaire' },
  { value: 'ORANGE_MONEY', label: 'Orange Money' },
  { value: 'MPESA', label: 'M-Pesa' },
  { value: 'AIRTEL_MONEY', label: 'Airtel Money' },
  { value: 'CARD', label: 'Carte bancaire' },
] as const

type PayMethod = (typeof METHODS)[number]['value']

interface PaymentModalProps {
  open: boolean
  onClose: () => void
  studentId: number
  academicSessionId: number
  line: FeeScheduleLineDto | null
  currency: FinanceCurrencyCode
  onSuccess: (paymentId: number) => void
}

export function PaymentModal({
  open,
  onClose,
  studentId,
  academicSessionId,
  line,
  currency,
  onSuccess,
}: PaymentModalProps) {
  const { mutateAsync: processPayment, isPending } = useProcessPayment()
  const {
    hasOpenSession,
    isLoading: sessionLoading,
    couldNotVerify,
  } = useResolvedCashSession()

  const [method, setMethod] = useState<PayMethod>('CASH')
  const [reference, setReference] = useState('')
  const [comment, setComment] = useState('')
  const [payAmount, setPayAmount] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open || !line) return
    setMethod('CASH')
    setReference('')
    setComment('')
    setErrorMsg('')
    setPayAmount(String(lineRemainingAmount(line)))
  }, [open, line])

  if (!open || !line) return null

  const maxAmount = lineRemainingAmount(line)
  const amount = Number(payAmount) || 0
  const needsRef = method !== 'CASH'
  const requiresCashSession =
    method === 'CASH' && !hasOpenSession && !couldNotVerify && !sessionLoading

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    const currentLine = line
    if (!currentLine) return

    if (requiresCashSession) {
      setErrorMsg("Ouvrez une session de caisse dans Caisse avant d'encaisser des espèces.")
      return
    }
    if (needsRef && reference.trim().length < 3) {
      setErrorMsg('Référence obligatoire (min. 3 caractères) pour ce mode de paiement.')
      return
    }
    if (currentLine.billingPeriod === 'MONTHLY' && !currentLine.monthYear) {
      setErrorMsg('Période mensuelle manquante sur cette ligne.')
      return
    }

    if (amount <= 0 || amount > maxAmount + 0.01) {
      setErrorMsg(`Montant invalide — maximum ${formatMoney(maxAmount, line.currency || currency)}`)
      return
    }

    try {
      const result = (await processPayment({
        studentId,
        amount,
        method,
        sessionId: academicSessionId,
        feeStructureId: currentLine.feeStructureId,
        monthYear: currentLine.monthYear ?? undefined,
        reference: needsRef ? reference.trim() : undefined,
        comment: comment.trim() || undefined,
      })) as ProcessPaymentResponse

      const paymentId = result?.paymentId ?? result?.id
      if (!paymentId) {
        setErrorMsg('Paiement enregistré mais identifiant reçu introuvable.')
        return
      }
      onSuccess(paymentId)
      onClose()
    } catch (err) {
      setErrorMsg(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-2">
          <div>
            <h2 id="payment-modal-title" className="text-base font-semibold text-zinc-900">
              Encaisser un paiement
            </h2>
            <p className="text-xs text-zinc-500 mt-1">{line.categoryName}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={(e) => void handleSubmit(e)} className="px-6 pb-6 space-y-4">
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Barème</span>
              <span className="font-medium tabular-nums text-zinc-700">
                {formatMoney(line.amount, line.currency || currency)}
              </span>
            </div>
            {(line.amountPaid ?? 0) > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Déjà payé</span>
                <span className="font-medium tabular-nums text-amber-700">
                  {formatMoney(line.amountPaid ?? 0, line.currency || currency)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-xs">
              <span className="text-zinc-400">Solde restant</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatMoney(maxAmount, line.currency || currency)}
              </span>
            </div>
            {line.monthYear ? (
              <div className="flex justify-between text-xs">
                <span className="text-zinc-400">Période</span>
                <span className="font-mono text-zinc-600">{line.monthYear}</span>
              </div>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">
              Montant à encaisser <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min={0.01}
              max={maxAmount}
              step="0.01"
              value={payAmount}
              onChange={(e) => setPayAmount(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
            {maxAmount < line.amount && (
              <button
                type="button"
                onClick={() => setPayAmount(String(maxAmount))}
                className="mt-1 text-[11px] text-emerald-700 hover:underline"
              >
                Encaisser le solde complet ({formatMoney(maxAmount, line.currency || currency)})
              </button>
            )}
          </div>

          {requiresCashSession && (
            <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5">
              <AlertTriangle size={15} className="text-amber-600 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-900">
                Aucune session caisse ouverte. Allez dans{' '}
                <span className="font-medium">Caisse</span> pour ouvrir une session.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Mode de paiement</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as PayMethod)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              {METHODS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
          </div>

          {needsRef && (
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">
                Référence <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                minLength={3}
                required
                placeholder="TXN-2026-001234"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Commentaire</label>
            <input
              type="text"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              maxLength={255}
              placeholder="Optionnel"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
              {errorMsg}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending || requiresCashSession}
              className={cn(
                'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl',
                'text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50',
              )}
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Confirmer le paiement
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
