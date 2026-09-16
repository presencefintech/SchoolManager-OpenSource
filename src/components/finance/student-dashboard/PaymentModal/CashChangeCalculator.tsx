'use client'

import { AlertTriangle } from 'lucide-react'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import {
  CDF_DENOMINATIONS,
  USD_DENOMINATIONS,
  cdfToUsd,
  type TenderCurrency,
  usdToCdf,
} from '@/lib/finance/congo-money.utils'
import { changeExceedsDrawer } from '@/lib/finance/guichet-ops.utils'
import { cn } from '@/lib/utils'

/**
 * Billetage guichet RDC — espèces USD ou Francs Congolais.
 * Client-only : le paiement serveur reste en devise de base (USD).
 */
export function CashChangeCalculator({
  amountDueUsd,
  currency,
  exchangeRate,
  tendered,
  tenderCurrency,
  onTenderedChange,
  onTenderCurrencyChange,
  availableDrawerUsd,
  allowedTenderCurrencies = ['USD', 'CDF'],
}: {
  amountDueUsd: number
  currency: FinanceCurrencyCode
  exchangeRate?: number | null
  tendered: string
  tenderCurrency: TenderCurrency
  onTenderedChange: (value: string) => void
  onTenderCurrencyChange: (value: TenderCurrency) => void
  /** Fond + cash déjà en caisse (USD) — alerte si rendu trop élevé. */
  availableDrawerUsd?: number | null
  allowedTenderCurrencies?: TenderCurrency[]
}) {
  const rate = exchangeRate != null && exchangeRate > 0 ? exchangeRate : null
  const dueInTender =
    tenderCurrency === 'CDF' && rate
      ? usdToCdf(amountDueUsd, rate)
      : amountDueUsd

  const tenderedNum = Number(tendered)
  const hasTendered = tendered.trim() !== '' && Number.isFinite(tenderedNum)
  const changeInTender = hasTendered ? tenderedNum - dueInTender : null
  const short = changeInTender != null && changeInTender < -0.001

  const denominations =
    tenderCurrency === 'CDF' ? CDF_DENOMINATIONS : USD_DENOMINATIONS

  function addDenomination(value: number) {
    const current = Number(tendered) || 0
    onTenderedChange(String(current + value))
  }

  const changeUsd =
    changeInTender != null && !short
      ? tenderCurrency === 'CDF' && rate
        ? cdfToUsd(changeInTender, rate)
        : changeInTender
      : null

  const floatTight =
    availableDrawerUsd != null && changeExceedsDrawer(changeUsd, availableDrawerUsd)

  return (
    <div className="rounded-xl border border-amber-100 bg-amber-50/70 px-3 py-2.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800/80">
          Billetage · guichet RDC
        </p>
        {allowedTenderCurrencies.length > 1 ? (
        <div className="inline-flex rounded-lg border border-amber-200 bg-white p-0.5">
          {allowedTenderCurrencies.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                onTenderCurrencyChange(c)
                onTenderedChange('')
              }}
              className={cn(
                'rounded-md px-2 py-0.5 text-[10px] font-semibold',
                tenderCurrency === c
                  ? 'bg-amber-600 text-white'
                  : 'text-amber-900/70 hover:bg-amber-50',
              )}
            >
              {c === 'CDF' ? 'FC' : 'USD'}
            </button>
          ))}
        </div>
        ) : (
          <p className="text-[10px] font-semibold text-amber-800/80">
            {tenderCurrency === 'CDF' ? 'FC' : 'USD'}
          </p>
        )}
      </div>

      <div className="rounded-lg bg-white/80 border border-amber-100 px-2.5 py-1.5 text-[11px] text-zinc-600">
        Dû{' '}
        <span className="font-semibold tabular-nums text-zinc-900">
          {formatMoney(amountDueUsd, currency)}
        </span>
        {rate && tenderCurrency === 'CDF' ? (
          <>
            {' '}
            ≈{' '}
            <span className="font-semibold tabular-nums text-amber-900">
              {formatMoney(dueInTender, 'CDF')}
            </span>
          </>
        ) : null}
      </div>

      {!rate && tenderCurrency === 'CDF' ? (
        <p className="text-[10px] text-amber-800">
          Taux école indisponible — basculez en USD ou configurez le taux Admin.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1">
        {denominations.map((d) => (
          <button
            key={d}
            type="button"
            disabled={tenderCurrency === 'CDF' && !rate}
            onClick={() => addDenomination(d)}
            className="rounded-md border border-amber-200/90 bg-white px-2 py-1 text-[10px] font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-40"
          >
            +{tenderCurrency === 'CDF' ? `${d.toLocaleString('fr-CD')} FC` : `$${d}`}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onTenderedChange(String(dueInTender))}
          className="rounded-md border border-emerald-200 bg-emerald-50 px-2 py-1 text-[10px] font-semibold text-emerald-800 hover:bg-emerald-100"
        >
          Exact
        </button>
        <button
          type="button"
          onClick={() => onTenderedChange('')}
          className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50"
        >
          Effacer
        </button>
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
        <div>
          <label className="block text-[11px] text-zinc-500 mb-1">
            Montant remis ({tenderCurrency === 'CDF' ? 'FC' : 'USD'})
          </label>
          <input
            type="number"
            min={0}
            step={tenderCurrency === 'CDF' ? 1 : 0.01}
            value={tendered}
            onChange={(e) => onTenderedChange(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>
        <div className="text-right pb-0.5 min-w-[6rem]">
          <p className="text-[10px] text-zinc-400 uppercase">Rendu</p>
          <p
            className={
              short || floatTight
                ? 'text-sm font-semibold tabular-nums text-red-600'
                : 'text-sm font-semibold tabular-nums text-emerald-700'
            }
          >
            {changeInTender == null
              ? '—'
              : short
                ? `Manque ${formatMoney(Math.abs(changeInTender), tenderCurrency)}`
                : formatMoney(changeInTender, tenderCurrency)}
          </p>
          {changeUsd != null && changeUsd > 0 && tenderCurrency === 'CDF' ? (
            <p className="text-[10px] text-zinc-400 tabular-nums">
              ≈ {formatMoney(changeUsd, 'USD')}
            </p>
          ) : null}
        </div>
      </div>

      {floatTight ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-900">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-600" />
          <p>
            Rendu ({formatMoney(changeUsd ?? 0, 'USD')}) supérieur au fond disponible (
            {formatMoney(availableDrawerUsd ?? 0, 'USD')}). Demandez le montant exact ou un
            billet plus petit — classique file d&apos;attente Kinshasa / Lubumbashi.
          </p>
        </div>
      ) : null}
    </div>
  )
}
