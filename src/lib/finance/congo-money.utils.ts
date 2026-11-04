import type { FinanceCurrencyCode } from '@/lib/finance/currency'
import { formatMoney } from '@/lib/finance/currency'

/** Billets courants RDC — guichet manuel. */
export const CDF_DENOMINATIONS = [500, 1000, 5000, 10_000, 20_000] as const
export const USD_DENOMINATIONS = [1, 5, 10, 20, 50, 100] as const

export type TenderCurrency = 'USD' | 'CDF'

/** Convertit un montant USD vers FC (taux école 1 USD = rate FC). */
export function usdToCdf(amountUsd: number, rate: number): number {
  if (!Number.isFinite(amountUsd) || !Number.isFinite(rate) || rate <= 0) return 0
  return Math.round(amountUsd * rate)
}

/** Convertit FC vers USD. */
export function cdfToUsd(amountCdf: number, rate: number): number {
  if (!Number.isFinite(amountCdf) || !Number.isFinite(rate) || rate <= 0) return 0
  return Number((amountCdf / rate).toFixed(2))
}

export function formatDualMoney(
  amountUsd: number,
  rate: number | null | undefined,
  baseCurrency: FinanceCurrencyCode = 'USD',
): { primary: string; secondary?: string; rateLabel?: string } {
  const primary = formatMoney(amountUsd, baseCurrency)
  if (rate == null || rate <= 0) return { primary }
  const cdf = usdToCdf(amountUsd, rate)
  return {
    primary,
    secondary: formatMoney(cdf, 'CDF'),
    rateLabel: `1 $ ≈ ${rate.toLocaleString('fr-CD')} FC`,
  }
}

/** Normalise un numéro RDC vers +243… */
export function normalizeCongoPhone(raw: string): string {
  const digits = raw.replace(/[^\d+]/g, '').trim()
  if (!digits) return ''
  if (digits.startsWith('+243')) return digits
  if (digits.startsWith('243') && digits.length >= 12) return `+${digits}`
  if (digits.startsWith('0') && digits.length >= 10) return `+243${digits.slice(1)}`
  if (/^9\d{8}$/.test(digits) || /^8\d{8}$/.test(digits)) return `+243${digits}`
  return digits.startsWith('+') ? digits : digits
}

/**
 * Nettoie une référence collée depuis SMS Orange Money / Airtel / M-Pesa.
 * Ex. "Votre transaction MP240125.1234.A est reussie" → "MP240125.1234.A"
 */
export function sanitizeOperatorReference(raw: string): string {
  const trimmed = raw.trim()
  if (!trimmed) return ''

  // ID style MP… / OM… / AT… / TXN… isolé
  const idMatch = trimmed.match(
    /\b((?:MP|OM|AT|MM|TXN|REF)[\w.\-]{4,}|[A-Z0-9]{2,}\d{6,}[\w.\-]*)\b/i,
  )
  if (idMatch?.[1]) return idMatch[1].toUpperCase()

  // Ligne entière sans espaces inutiles
  const compact = trimmed
    .replace(/^réf(érence)?\s*[:=]?\s*/i, '')
    .replace(/^ref(erence)?\s*[:=]?\s*/i, '')
    .replace(/\s+/g, '')
    .replace(/[^A-Za-z0-9.\-_]/g, '')

  return compact.slice(0, 64)
}

/** True si erreur réseau / timeout (garder la clé d'idempotency). */
export function isRetriablePaymentError(err: unknown): boolean {
  if (!err || typeof err !== 'object') return true
  const e = err as {
    code?: string
    message?: string
    response?: { status?: number }
  }
  if (e.code === 'ERR_NETWORK' || e.code === 'ECONNABORTED') return true
  if (typeof e.message === 'string' && /network|timeout|failed to fetch/i.test(e.message)) {
    return true
  }
  const status = e.response?.status
  if (status == null) return true
  return status >= 500 || status === 408 || status === 429
}
