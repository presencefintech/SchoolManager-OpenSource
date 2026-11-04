import type { ReportPeriodCode } from '@/types/finance-reporting'

export const REPORT_PERIOD_OPTIONS: {
  value: ReportPeriodCode
  label: string
  short: string
}[] = [
  { value: 'J', label: 'Journalier', short: 'J' },
  { value: 'H', label: 'Hebdomadaire', short: 'H' },
  { value: 'M', label: 'Mensuel', short: 'M' },
  { value: 'T', label: 'Trimestriel', short: 'T' },
  { value: 'S', label: 'Semestriel', short: 'S' },
  { value: 'A', label: 'Annuel', short: 'A' },
]

const EXCHANGE_SOURCE_LABELS: Record<string, string> = {
  SCHOOL_DEFAULT: 'Paramètre école',
  MANUAL_ADMIN: 'Saisie direction',
  PAYMENT_CAPTURE: 'Figé au paiement',
  SYSTEM_IMPORT: 'Import système',
  LEGACY_SCHOOL_FIELD: 'Taux legacy (école)',
}

export function formatExchangeRateSource(source: string): string {
  return EXCHANGE_SOURCE_LABELS[source] ?? source
}

export function barShare(value: number, total: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(total) || total <= 0) return 0
  return Math.min(100, Math.round((value / total) * 100))
}

export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
