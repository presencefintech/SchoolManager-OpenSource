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
import { previewCashTender } from '@/lib/finance/mixed-tender'

export type TenderMode = TenderCurrency | 'MIXED'
import { changeExceedsDrawer } from '@/lib/finance/guichet-ops.utils'
import { cn } from '@/lib/utils'

/**
 * Billetage guichet RDC — espèces USD ou Francs Congolais.
 * `amountDue` est dans la devise de l'école (`currency`) ; conversion seulement quand
 * le client paie dans l'autre devise. Le serveur confirme le rendu.
 */
export function CashChangeCalculator({
  amountDue,
  currency,
  exchangeRate,
  tendered,
  tenderCurrency,
  onTenderedChange,
  onTenderCurrencyChange,
  tenderedUsd = '',
  tenderedCdf = '',
  onTenderedUsdChange,
  onTenderedCdfChange,
  availableDrawerUsd,
  allowedTenderCurrencies = ['USD', 'CDF'],
}: {
  /** Dû dans la devise de l'école (`currency`). */
  amountDue: number
  currency: FinanceCurrencyCode
  exchangeRate?: number | null
  tendered: string
  tenderCurrency: TenderMode
  onTenderedChange: (value: string) => void
  onTenderCurrencyChange: (value: TenderMode) => void
  tenderedUsd?: string
  tenderedCdf?: string
  onTenderedUsdChange?: (value: string) => void
  onTenderedCdfChange?: (value: string) => void
  /** Fond + cash déjà en caisse (USD) — alerte si rendu trop élevé. */
  availableDrawerUsd?: number | null
  allowedTenderCurrencies?: TenderCurrency[]
}) {
  const rate = exchangeRate != null && exchangeRate > 0 ? exchangeRate : null
  const dueCurrency: TenderCurrency = currency === 'CDF' ? 'CDF' : 'USD'
  const otherCurrency: TenderCurrency = dueCurrency === 'CDF' ? 'USD' : 'CDF'
  /** Dû converti dans l'autre devise (≈), null sans taux. */
  const dueInOther = rate
    ? dueCurrency === 'USD'
      ? usdToCdf(amountDue, rate)
      : cdfToUsd(amountDue, rate)
    : null
  const tenderIsOther = tenderCurrency === otherCurrency
  const dueInTender = tenderIsOther && dueInOther != null ? dueInOther : amountDue
  /** Remise dans l'autre devise ou mixte : il faut le taux. */
  const needsRate = tenderCurrency !== dueCurrency

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

  const mixedPreview = tenderCurrency === 'MIXED'
    ? previewCashTender(
        amountDue,
        Number(tenderedUsd) || 0,
        Number(tenderedCdf) || 0,
        rate,
        dueCurrency,
      )
    : null
  const mixedChangeUsd = mixedPreview && !mixedPreview.short ? mixedPreview.changeUsd : 0
  const mixedChangeCdfUsd = mixedPreview && !mixedPreview.short && rate
    ? cdfToUsd(mixedPreview.changeCdf, rate)
    : 0
  const floatTight =
    availableDrawerUsd != null && changeExceedsDrawer(
      tenderCurrency === 'MIXED' ? mixedChangeUsd + mixedChangeCdfUsd : changeUsd,
      availableDrawerUsd,
    )

  function addMixedDenomination(currencyCode: 'USD' | 'CDF', value: number) {
    if (currencyCode === 'USD') {
      onTenderedUsdChange?.(String((Number(tenderedUsd) || 0) + value))
      return
    }
    onTenderedCdfChange?.(String((Number(tenderedCdf) || 0) + value))
  }

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
          <button
            type="button"
            onClick={() => onTenderCurrencyChange('MIXED')}
            className={cn(
              'rounded-md px-2 py-0.5 text-[10px] font-semibold',
              tenderCurrency === 'MIXED'
                ? 'bg-amber-600 text-white'
                : 'text-amber-900/70 hover:bg-amber-50',
            )}
          >
            Mixte
          </button>
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
          {formatMoney(amountDue, currency)}
        </span>
        {dueInOther != null && needsRate ? (
          <>
            {' '}
            ≈{' '}
            <span className="font-semibold tabular-nums text-amber-900">
              {formatMoney(dueInOther, otherCurrency)}
            </span>
          </>
        ) : null}
      </div>

      {!rate && needsRate ? (
        <p className="text-[10px] text-amber-800">
          Taux école indisponible — encaissez en {dueCurrency === 'CDF' ? 'FC' : 'USD'} ou configurez le taux Admin.
        </p>
      ) : null}

      {tenderCurrency === 'MIXED' ? (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-1">
            {USD_DENOMINATIONS.map((d) => (
              <button
                key={`usd-${d}`}
                type="button"
                disabled={dueCurrency === 'CDF' && !rate}
                onClick={() => addMixedDenomination('USD', d)}
                className="rounded-md border border-amber-200/90 bg-white px-2 py-1 text-[10px] font-semibold text-amber-950 hover:bg-amber-50"
              >
                +${d}
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-1">
            {CDF_DENOMINATIONS.map((d) => (
              <button
                key={`cdf-${d}`}
                type="button"
                disabled={dueCurrency === 'USD' && !rate}
                onClick={() => addMixedDenomination('CDF', d)}
                className="rounded-md border border-amber-200/90 bg-white px-2 py-1 text-[10px] font-semibold text-amber-950 hover:bg-amber-50 disabled:opacity-40"
              >
                +{d.toLocaleString('fr-CD')} FC
              </button>
            ))}
            <button
              type="button"
              onClick={() => {
                onTenderedUsdChange?.('')
                onTenderedCdfChange?.('')
              }}
              className="rounded-md border border-zinc-200 bg-white px-2 py-1 text-[10px] font-medium text-zinc-500 hover:bg-zinc-50"
            >
              Effacer
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Remis en USD</label>
              <input
                type="number"
                min={0}
                step={0.01}
                value={tenderedUsd}
                disabled={dueCurrency === 'CDF' && !rate}
                onChange={(e) => onTenderedUsdChange?.(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-[11px] text-zinc-500 mb-1">Remis en FC</label>
              <input
                type="number"
                min={0}
                step={1}
                value={tenderedCdf}
                disabled={dueCurrency === 'USD' && !rate}
                onChange={(e) => onTenderedCdfChange?.(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400 disabled:opacity-40"
              />
            </div>
          </div>
          <div className="rounded-lg border border-emerald-200 bg-white px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-emerald-800">Rendu de monnaie</p>
            <p className={cn(
              'mt-1 text-base font-semibold tabular-nums',
              mixedPreview?.short || floatTight ? 'text-red-600' : 'text-emerald-700',
            )}>
              {mixedPreview == null
                ? '—'
                : mixedPreview.short
                  ? mixedPreview.message
                  : mixedPreview.changeUsd <= 0 && mixedPreview.changeCdf <= 0
                    ? 'Aucun rendu'
                    : [
                        mixedPreview.changeUsd > 0 ? formatMoney(mixedPreview.changeUsd, 'USD') : null,
                        mixedPreview.changeCdf > 0 ? formatMoney(mixedPreview.changeCdf, 'CDF') : null,
                      ].filter(Boolean).join(' · ')}
            </p>
            {rate ? (
              <p className="mt-0.5 text-[10px] text-zinc-500">
                Taux du jour : 1 USD = {rate.toLocaleString('fr-CD')} FC. Le serveur confirme le rendu.
              </p>
            ) : null}
          </div>
        </div>
      ) : (
      <>
      <div className="flex flex-wrap gap-1">
        {denominations.map((d) => (
          <button
            key={d}
            type="button"
            disabled={tenderIsOther && !rate}
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
                ? `Manque ${formatMoney(Math.abs(changeInTender), tenderCurrency === 'CDF' ? 'CDF' : 'USD')}`
                : formatMoney(changeInTender, tenderCurrency === 'CDF' ? 'CDF' : 'USD')}
          </p>
          {changeUsd != null && changeUsd > 0 && tenderCurrency === 'CDF' ? (
            <p className="text-[10px] text-zinc-400 tabular-nums">
              ≈ {formatMoney(changeUsd, 'USD')}
            </p>
          ) : null}
        </div>
      </div>
      </>
      )}

      {floatTight ? (
        <div className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-[11px] text-red-900">
          <AlertTriangle size={13} className="mt-0.5 shrink-0 text-red-600" />
          <p>
            Rendu ({formatMoney(
              tenderCurrency === 'MIXED' ? mixedChangeUsd + mixedChangeCdfUsd : (changeUsd ?? 0),
              'USD',
            )}) supérieur au fond disponible (
            {formatMoney(availableDrawerUsd ?? 0, 'USD')}). Demandez le montant exact ou un
            billet plus petit — classique file d&apos;attente Kinshasa / Lubumbashi.
          </p>
        </div>
      ) : null}
    </div>
  )
}
