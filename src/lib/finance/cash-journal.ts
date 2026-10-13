import { cashPaceTrend, type CashPaceTrend } from '@/lib/finance/cash-pace'
import { formatMoney } from '@/lib/finance/currency'

export type JournalPeriod = 'day' | 'week' | 'month' | 'quarter' | 'semester' | 'year' | 'cashier' | 'range'

export type CashJournalParams = {
  period: JournalPeriod
  date?: string
  from?: string
  to?: string
  sectionId?: number
  classId?: number
  optionId?: number
}

export type RevealedMoney = { usd: number | null; cdf: number | null }

export type JournalRole = 'FINANCE' | 'IT' | 'DIRECTOR'

export type CashJournalVisibility = {
  hideAmounts: Record<JournalRole, boolean>
  hideTotals: Record<JournalRole, boolean>
}

export type CashJournalVisibilityPatch = {
  hideAmounts?: Partial<Record<JournalRole, boolean>>
  hideTotals?: Partial<Record<JournalRole, boolean>>
}

export type CashJournalCatalogs = {
  sections: { id: number; name: string }[]
  options: { id: number; name: string; sectionId: number }[]
  classes: { id: number; name: string; sectionId: number; optionId: number }[]
}

export type CashJournalTransaction = {
  id: number
  createdAt: string
  receipt: string
  student: string
  className: string
  section: string
  option: string
  payer: string
  motive: string
  method: string
  amount: { currency: 'USD' | 'CDF'; usd: number | null; cdf: number | null }
  balanceUsd: number | null
  cashier: string
  status: string
  badge: 'validated' | 'pending' | 'cancelled' | 'reconciled'
  badgeLabel: string
}

export type CashJournalReport = {
  generatedAt: string
  schoolName: string
  viewer: {
    role: string
    seeAmounts: boolean
    seeTotals: boolean
    canConfigure: boolean
  }
  visibility: CashJournalVisibility
  filters: {
    period: JournalPeriod
    from: string
    to: string
    capped: boolean
    sectionId: number | null
    classId: number | null
    optionId: number | null
    section: string | null
    className: string | null
    option: string | null
  }
  catalogs: CashJournalCatalogs
  reportTitle?: string
  pace: {
    layout?: 'trio' | 'compare'
    labels?: { today: string; yesterday: string; week: string }
    today: RevealedMoney
    yesterday: RevealedMoney
    week: RevealedMoney
  }
  monthlySituation?: {
    exercise: string | null
    months: { label: string; count: number; usd: number | null; cdf: number | null }[]
  } | null
  methods: { method: string; label: string; count: number; usd: number | null; cdf: number | null }[]
  transactions: CashJournalTransaction[]
  truncated: boolean
}

export const JOURNAL_ROLE_LABEL: Record<JournalRole, string> = {
  FINANCE: 'Caissier / Finance',
  IT: 'IT / Secrétaire',
  DIRECTOR: 'Directeur',
}

export const METHOD_LABEL: Record<string, string> = {
  CASH: 'Cash',
  AIRTEL_MONEY: 'Airtel Money',
  MPESA: 'M-Pesa',
  ORANGE_MONEY: 'Orange Money',
  BANK: 'Banque',
  CARD: 'Carte',
}

export function todayInputValue(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

function piece(slot: RevealedMoney): string {
  if (slot.usd == null && slot.cdf == null) return '—'
  const parts: string[] = []
  if (slot.usd != null) parts.push(formatMoney(slot.usd, 'USD'))
  if (slot.cdf != null) parts.push(formatMoney(slot.cdf, 'CDF'))
  return parts.join(' · ')
}

export function presentJournalPace(pace: CashJournalReport['pace']): {
  trend: CashPaceTrend | null
  today: string
  yesterday: string
  week: string
  todayLabel: string
  yesterdayLabel: string
  weekLabel: string
  layout: 'trio' | 'compare'
  sentence: string
} {
  const labels = pace.labels ?? { today: "Aujourd'hui", yesterday: 'hier', week: 'cette semaine' }
  const today = piece(pace.today)
  const yesterday = piece(pace.yesterday)
  const week = piece(pace.week)
  const layout = pace.layout ?? 'trio'
  const trend =
    pace.today.usd != null && pace.yesterday.usd != null
      ? cashPaceTrend(pace.today.usd, pace.yesterday.usd)
      : null
  const sentence = layout === 'compare'
    ? `${labels.today} ${today}, ${labels.yesterday} ${yesterday}`
    : `${labels.today} ${today}, ${labels.yesterday} ${yesterday}, ${labels.week} ${week}`
  return {
    trend,
    today,
    yesterday,
    week,
    todayLabel: labels.today,
    yesterdayLabel: labels.yesterday,
    weekLabel: labels.week,
    layout,
    sentence,
  }
}

export function formatJournalTime(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Kinshasa',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).format(date)
}

export function formatGeneratedAt(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('fr-FR', {
    timeZone: 'Africa/Kinshasa',
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date)
}

export function formatJournalAmount(amount: CashJournalTransaction['amount']): string {
  if (amount.usd == null && amount.cdf == null) return '—'
  if (amount.currency === 'CDF') return amount.cdf == null ? '—' : formatMoney(amount.cdf, 'CDF')
  return amount.usd == null ? '—' : formatMoney(amount.usd, 'USD')
}
