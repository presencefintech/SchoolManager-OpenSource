import type { SchoolCurrencyConfig } from '@/types/finance-reporting'
import { DEFAULT_FINANCE_CURRENCY, formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'

function usdToCdf(amountUsd: number, rate: number): number {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(rate) || rate <= 0) return 0
  return Math.round(amountUsd * rate)
}

function cdfToUsd(amountCdf: number, rate: number): number {
  if (!Number.isFinite(amountCdf) || !Number.isFinite(rate) || rate <= 0) return 0
  return Number((amountCdf / rate).toFixed(2))
}

/** USD / CDF / EUR — sinon base comptable USD (jamais CDF par défaut). */
export function normalizeMoneyCurrency(code?: string | null): FinanceCurrencyCode {
  const c = (code ?? '').trim().toUpperCase()
  if (c === 'FC' || c === 'CDF') return 'CDF'
  if (c === 'USD' || c === 'EUR') return c
  return DEFAULT_FINANCE_CURRENCY
}

export type LedgerMoneyConfig = Pick<SchoolCurrencyConfig, 'displayCurrency' | 'legacyRate'> | {
  displayCurrency?: string | null
  legacyRate?: number | null
} | null

/**
 * Montant de grand livre → une seule devise à l’écran.
 * Les montants API sont en USD sauf si `storedCurrency` dit le contraire.
 * Sans taux, on n’affiche pas de francs « fantômes » (50 $ ≠ 50 FC).
 */
export function formatLedgerAmount(
  amount: number,
  storedCurrency?: string | null,
  config?: LedgerMoneyConfig,
): string {
  const stored = normalizeMoneyCurrency(storedCurrency)
  const display = normalizeMoneyCurrency(config?.displayCurrency ?? DEFAULT_FINANCE_CURRENCY)
  const rate = Number(config?.legacyRate)

  if (stored === display) return formatMoney(amount, stored)

  if (stored === 'USD' && display === 'CDF') {
    if (rate > 0) return formatMoney(usdToCdf(amount, rate), 'CDF')
    return formatMoney(amount, 'USD')
  }
  if (stored === 'CDF' && display === 'USD') {
    if (rate > 0) return formatMoney(cdfToUsd(amount, rate), 'USD')
    return formatMoney(amount, 'CDF')
  }
  return formatMoney(amount, stored)
}
