'use client'

import { ArrowLeftRight } from 'lucide-react'
import { formatDualMoney } from '@/lib/finance/congo-money.utils'
import type { FinanceCurrencyCode } from '@/lib/finance/currency'

/** Bandeau double devise USD ↔ FC — colonne vertébrale guichet Congo. */
export function DualCurrencyStrip({
  amountUsd,
  rate,
  baseCurrency = 'USD',
}: {
  amountUsd: number
  rate?: number | null
  baseCurrency?: FinanceCurrencyCode
}) {
  const dual = formatDualMoney(amountUsd, rate, baseCurrency)
  if (amountUsd <= 0) return null

  return (
    <div className="flex items-center gap-2 rounded-xl border border-sky-100 bg-sky-50/80 px-3 py-2">
      <ArrowLeftRight size={14} className="text-sky-600 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold tabular-nums text-sky-950">
          {dual.primary}
          {dual.secondary ? (
            <span className="text-sky-700/90"> · {dual.secondary}</span>
          ) : null}
        </p>
        {dual.rateLabel ? (
          <p className="text-[10px] text-sky-700/70 mt-0.5">{dual.rateLabel}</p>
        ) : (
          <p className="text-[10px] text-sky-700/70 mt-0.5">
            Devise affichage école — configurez le taux pour l&apos;équivalent FC
          </p>
        )}
      </div>
    </div>
  )
}
