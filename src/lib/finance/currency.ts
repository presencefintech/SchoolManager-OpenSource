/** Devise école — alignée sur `School.baseCurrency` backend (défaut USD). */
export const DEFAULT_FINANCE_CURRENCY = 'USD' as const

export type FinanceCurrencyCode = typeof DEFAULT_FINANCE_CURRENCY | 'XOF' | 'CDF' | string

const MONEY_INSIGHT_KEYS = new Set([
  'totalCollecte',
  'soldeRestant',
  'seuilEquilibre',
])

/**
 * Formate un montant avec la devise métier (USD par défaut).
 * Les montants API sont stockés en USD ; ne pas afficher en FCFA sans conversion.
 */
export function formatMoney(
  amount: number,
  currency: FinanceCurrencyCode = DEFAULT_FINANCE_CURRENCY,
  options?: { maximumFractionDigits?: number },
): string {
  const digits = options?.maximumFractionDigits ?? (currency === 'USD' ? 2 : 0)

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
      maximumFractionDigits: digits,
      minimumFractionDigits: currency === 'USD' ? 0 : digits,
    }).format(amount)
  } catch {
    const suffix = currency === 'USD' ? ' $' : ` ${currency}`
    return `${amount.toLocaleString('fr-FR', { maximumFractionDigits: digits })}${suffix}`
  }
}

export function formatInsightValue(key: string, value: unknown): string {
  if (typeof value === 'number') {
    if (MONEY_INSIGHT_KEYS.has(key)) return formatMoney(value)
    if (key === 'efficaciteRecouvrement') return `${value.toLocaleString('fr-FR')}%`
    return value.toLocaleString('fr-FR')
  }
  return String(value ?? '—')
}
