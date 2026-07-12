export type ReportPeriodCode =
  | 'DAILY'
  | 'WEEKLY'
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'SEMESTER'
  | 'ANNUAL'
  | 'J'
  | 'H'
  | 'M'
  | 'T'
  | 'S'
  | 'A'

export type SchoolCurrencyConfig = {
  schoolId: number
  baseCurrency: string
  displayCurrency: string
  exchangeToleranceBps: number
  legacyRate: number
}

export type ExchangeRateRow = {
  id: string
  fromCurrency: string
  toCurrency: string
  rate: string
  effectiveAt: string
  source: string
  notes: string | null
  paymentId: number | null
  createdAt: string
}

export type AggregatedReportMetrics = {
  transactionCount: number
  totalAmountBase: string
  totalAmountDisplay: string
  displayCurrency: string
  byMethod: Record<string, { count: number; amountBase: string; amountDisplay: string }>
  byFeeCategory: Record<string, { count: number; amountBase: string }>
}

export type FinanceAggregateReport = {
  schoolId: number
  period: string
  periodKey: string
  periodStart: string
  periodEnd: string
  metrics: AggregatedReportMetrics
  exchangeRate: {
    id: string | null
    rate: string
    fromCurrency: string
    toCurrency: string
    source: string
  }
  fromCache: boolean
  snapshotId?: number
}
