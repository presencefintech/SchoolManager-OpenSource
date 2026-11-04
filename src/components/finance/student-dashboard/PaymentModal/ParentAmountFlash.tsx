'use client'

import { Eye, X } from 'lucide-react'
import { formatDualMoney } from '@/lib/finance/congo-money.utils'
import type { FinanceCurrencyCode } from '@/lib/finance/currency'

/**
 * Affichage parent — gros montants USD/FC pour transparence au guichet RDC.
 * (Parent regarde l'écran pendant que le caissier encaissse.)
 */
export function ParentAmountFlash({
  open,
  onClose,
  amountUsd,
  rate,
  studentName,
  baseCurrency = 'USD',
}: {
  open: boolean
  onClose: () => void
  amountUsd: number
  rate?: number | null
  studentName: string
  baseCurrency?: FinanceCurrencyCode
}) {
  if (!open || amountUsd <= 0) return null
  const dual = formatDualMoney(amountUsd, rate, baseCurrency)

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-zinc-950/95 p-6">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Fermer"
      >
        <X size={22} />
      </button>
      <div className="w-full max-w-xl text-center text-white space-y-4">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-white/50">
          Montant à payer
        </p>
        <p className="text-lg text-white/80 truncate px-2">{studentName}</p>
        <p className="text-5xl sm:text-6xl font-bold tabular-nums tracking-tight">
          {dual.primary}
        </p>
        {dual.secondary ? (
          <p className="text-3xl sm:text-4xl font-semibold tabular-nums text-emerald-300">
            {dual.secondary}
          </p>
        ) : null}
        {dual.rateLabel ? (
          <p className="text-sm text-white/40">{dual.rateLabel}</p>
        ) : null}
        <p className="text-xs text-white/35 pt-4">Appuyez n&apos;importe où ou Échap pour fermer</p>
        <button
          type="button"
          onClick={onClose}
          className="mt-2 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900"
        >
          <Eye size={14} />
          Vu par le parent
        </button>
      </div>
      <button
        type="button"
        className="absolute inset-0 -z-10 cursor-default"
        aria-label="Fermer l'affichage"
        onClick={onClose}
      />
    </div>
  )
}
