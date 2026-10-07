/** Devise école — alignée sur `School.baseCurrency` backend (défaut USD). */
export const DEFAULT_FINANCE_CURRENCY = 'USD' as const

export type FinanceCurrencyCode = typeof DEFAULT_FINANCE_CURRENCY | 'XOF' | 'CDF' | string

const MONEY_INSIGHT_KEYS = new Set([
  'totalCollecte',
  'soldeRestant',
  'collected',
  'remaining',
  'TOTAL',
  'CASH',
  'BANK',
  'MOBILE_MONEY',
  'encaissementsMois',
  'collectedThisMonth',
  'ticketMoyenEleve',
  'avgPerStudent',
])

const PERCENT_INSIGHT_KEYS = new Set([
  'efficaciteRecouvrement',
  'efficiency',
  'digitalSharePct',
])

const COUNT_INSIGHT_KEYS = new Set([
  'nombreEleves',
  'studentCount',
  'seuilEquilibre',
  'seuilEquilibreEleves',
  'breakEvenThreshold',
  'totalTransactions',
  'debiteurs',
  'debtorsCount',
  'paiementsEnAttente',
  'pendingPayments',
  'scoreSante',
  'healthScore',
])

/**
 * Formate un montant avec la devise métier (USD ou CDF).
 * CDF : `50.000 CDF` (francs entiers). USD : `100 $US`.
 */
export function formatMoney(
  amount: number,
  currency: FinanceCurrencyCode = DEFAULT_FINANCE_CURRENCY,
  options?: { maximumFractionDigits?: number; notation?: 'standard' | 'compact' },
): string {
  const safe = Number.isFinite(Number(amount)) ? Number(amount) : 0
  const raw = String(currency || 'USD').toUpperCase()
  const code = raw === 'FC' ? 'CDF' : raw

  if (code === 'CDF') {
    const whole = Math.round(safe)
    return `${whole.toLocaleString('de-DE')} CDF`
  }

  const digits = options?.maximumFractionDigits ?? (code === 'USD' ? 2 : 0)

  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: code === 'USD' ? 'USD' : code,
      currencyDisplay: 'code',
      maximumFractionDigits: digits,
      minimumFractionDigits: code === 'USD' ? 0 : digits,
      notation: options?.notation ?? 'standard',
    })
      .format(safe)
      .replace(/\bUSD\b/g, '$US')
      .trim()
  } catch {
    const suffix = code === 'USD' ? ' $US' : ` ${code}`
    return `${safe.toLocaleString('fr-FR', { maximumFractionDigits: digits })}${suffix}`
  }
}

/** Affichage compact pour graphiques / KPI (ex. 12,5 k $). */
export function formatMoneyCompact(
  amount: number,
  currency: FinanceCurrencyCode = DEFAULT_FINANCE_CURRENCY,
): string {
  return formatMoney(amount, currency, { notation: 'compact', maximumFractionDigits: 1 })
}

export function formatInsightValue(key: string, value: unknown): string {
  if (typeof value === 'boolean') {
    if (key === 'isHealthy' || key === 'surEncaissement') return value ? 'Oui' : 'Non'
    return value ? 'Oui' : 'Non'
  }
  if (typeof value === 'number') {
    if (MONEY_INSIGHT_KEYS.has(key)) return formatMoney(value)
    if (PERCENT_INSIGHT_KEYS.has(key)) {
      const pct = Math.min(100, Math.max(0, value))
      return `${pct.toLocaleString('fr-FR', { maximumFractionDigits: 1 })}%`
    }
    if (key === 'totalTransactions') {
      return value.toLocaleString('fr-FR')
    }
    if (COUNT_INSIGHT_KEYS.has(key)) {
      return value.toLocaleString('fr-FR')
    }
    return value.toLocaleString('fr-FR')
  }
  if (typeof value === 'string') {
    if (/^\d{4}-\d{2}-\d{2}T/.test(value)) {
      const d = new Date(value)
      if (!Number.isNaN(d.getTime())) {
        return d.toLocaleString('fr-FR', {
          dateStyle: 'medium',
          timeStyle: 'short',
        })
      }
    }
    return value
  }
  return String(value ?? '—')
}
