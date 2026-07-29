import {
  CDF_DENOMINATIONS,
  USD_DENOMINATIONS,
  type TenderCurrency,
} from '@/lib/finance/congo-money.utils'
import type { CashDenominationLine, CashDenominationSheet } from '@/types/finance'

export function denomsFor(currency: TenderCurrency): readonly number[] {
  return currency === 'CDF' ? CDF_DENOMINATIONS : USD_DENOMINATIONS
}

export function sheetTotal(lines: CashDenominationLine[], currency: TenderCurrency = 'USD'): number {
  const sum = lines.reduce((acc, line) => acc + Number(line.denom || 0) * Number(line.count || 0), 0)
  return currency === 'USD' ? Number(sum.toFixed(2)) : Math.round(sum)
}

export function buildDenomSheet(
  currency: TenderCurrency,
  counts: Record<number, number>,
): CashDenominationSheet {
  const lines: CashDenominationLine[] = denomsFor(currency)
    .map((denom) => ({ denom, count: Math.max(0, Math.floor(Number(counts[denom] ?? 0))) }))
    .filter((l) => l.count > 0)
  const total =
    currency === 'USD'
      ? Number(lines.reduce((a, l) => a + l.denom * l.count, 0).toFixed(2))
      : lines.reduce((a, l) => a + l.denom * l.count, 0)
  return { currency, lines, total }
}

export function emptyDenomCounts(currency: TenderCurrency): Record<number, number> {
  return Object.fromEntries(denomsFor(currency).map((d) => [d, 0]))
}

export function formatDurationMinutes(minutes: number | undefined): string {
  if (minutes == null || !Number.isFinite(minutes)) return '—'
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${m} min` : `${h} h`
}

export const METHOD_LABELS: Record<string, string> = {
  CASH: 'Espèces',
  ORANGE_MONEY: 'Orange Money',
  MPESA: 'M-Pesa',
  AIRTEL_MONEY: 'Airtel Money',
  CARD: 'Carte',
  BANK: 'Banque',
  BANK_TRANSFER: 'Virement',
  MOBILE_MONEY: 'Mobile money',
}
