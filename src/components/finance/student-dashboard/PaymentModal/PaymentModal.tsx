'use client'

import { useEffect, useState } from 'react'
import { AlertTriangle, Loader2, X } from 'lucide-react'
import { useProcessPayment, useResolvedCashSession } from '@/lib/hooks/use-finance'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import type { ProcessPaymentResponse } from '@/types/finance'
import { cn } from '@/lib/utils'
import {
  buildPaymentFeeLines,
  formatFeePeriodLabel,
} from '@/lib/finance/fee-schedule.utils'
import type { FeeAttributionValue } from '@/components/finance/fee-attribution-picker'

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
  selection: FeeAttributionValue | null
  currency: FinanceCurrencyCode
  onSuccess: (paymentId: number) => void
}

export function PaymentModal({
  open,
  onClose,
  studentId,
  academicSessionId,
  selection,
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
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    if (!open) return
    setMethod('CASH')
    setReference('')
    setComment('')
    setErrorMsg('')
  }, [open, selection])

  if (!open || !selection || selection.lines.length === 0) return null

  const totalAmount = selection.totalAmount
  const needsRef = method !== 'CASH'
  const requiresCashSession =
    method === 'CASH' && !hasOpenSession && !couldNotVerify && !sessionLoading
  const isMulti = selection.lines.length > 1
  const structureCount = new Set(selection.lines.map((sel) => sel.line.feeStructureId)).size
  const primaryLine = selection.lines[0].line
  const modalTitle =
    isMulti && structureCount > 1
      ? `Encaisser ${selection.lines.length} lignes`
      : isMulti
        ? `Encaisser ${selection.lines.length} mois`
        : 'Encaisser un paiement'

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrorMsg('')

    if (!selection) return

    if (requiresCashSession) {
      setErrorMsg("Ouvrez une session de caisse dans Caisse avant d'encaisser des espèces.")
      return
    }
    if (needsRef && reference.trim().length < 3) {
      setErrorMsg('Référence obligatoire (min. 3 caractères) pour ce mode de paiement.')
      return
    }

    for (const sel of selection.lines) {
      if (sel.line.billingPeriod === 'MONTHLY' && !sel.line.monthYear) {
        setErrorMsg('Période mensuelle manquante sur une ligne sélectionnée.')
        return
      }
    }

    try {
      const feeLines = buildPaymentFeeLines(selection.lines)
      const result = (await processPayment({
        studentId,
        amount: totalAmount,
        method,
        sessionId: academicSessionId,
        fees: feeLines.length > 1 ? feeLines : undefined,
        feeStructureId: feeLines.length === 1 ? feeLines[0].feeStructureId : undefined,
        monthYear: feeLines.length === 1 ? feeLines[0].monthYear : undefined,
        reference: needsRef ? reference.trim() : undefined,
        comment: comment.trim() || undefined,
      })) as ProcessPaymentResponse

      const paymentId = result.paymentId ?? result.id ?? result.payment?.id
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
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby="payment-modal-title"
      >
        <div className="flex items-start justify-between px-6 pt-6 pb-2 shrink-0">
          <div>
            <h2 id="payment-modal-title" className="text-base font-semibold text-zinc-900">
              {modalTitle}
            </h2>
            <p className="text-xs text-zinc-500 mt-1">
              {structureCount > 1
                ? `${structureCount} barèmes · ${primaryLine.categoryName}`
                : primaryLine.categoryName}
            </p>
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

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="px-6 pb-6 space-y-4 overflow-y-auto"
        >
          <div className="rounded-xl bg-zinc-50 border border-zinc-100 px-4 py-3 space-y-2">
            {isMulti ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto">
                {selection.lines.map((sel) => (
                  <div
                    key={`${sel.line.feeStructureId}:${sel.line.monthYear ?? ''}`}
                    className="flex justify-between text-xs gap-2"
                  >
                    <span className="text-zinc-600 truncate">
                      {structureCount > 1
                        ? `${sel.line.categoryName} · ${formatFeePeriodLabel(sel.line)}`
                        : formatFeePeriodLabel(sel.line)}
                    </span>
                    <span className="font-medium tabular-nums text-zinc-800 shrink-0">
                      {formatMoney(sel.amount, sel.line.currency || currency)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Barème</span>
                  <span className="font-medium tabular-nums text-zinc-700">
                    {formatMoney(primaryLine.amount, primaryLine.currency || currency)}
                  </span>
                </div>
                {primaryLine.monthYear ? (
                  <div className="flex justify-between text-xs">
                    <span className="text-zinc-400">Période</span>
                    <span className="text-zinc-600">{formatFeePeriodLabel(primaryLine)}</span>
                  </div>
                ) : null}
              </>
            )}
            <div className="flex justify-between text-xs border-t border-zinc-200/80 pt-2">
              <span className="text-zinc-500 font-medium">Total à encaisser</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatMoney(totalAmount, currency)}
              </span>
            </div>
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
              Confirmer · {formatMoney(totalAmount, currency)}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
