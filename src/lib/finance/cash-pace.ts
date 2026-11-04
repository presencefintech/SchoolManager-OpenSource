import { formatMoney } from '@/lib/finance/currency'

export type CashPaceAmounts = {
  todayUsd: number
  yesterdayUsd: number
  weekUsd: number
}

export type CashPaceTrend = 'up' | 'down' | 'flat'

const TREND_TOLERANCE_USD = 0.02

export function cashPaceTrend(todayUsd: number, yesterdayUsd: number): CashPaceTrend {
  const today = Number.isFinite(todayUsd) ? todayUsd : 0
  const yesterday = Number.isFinite(yesterdayUsd) ? yesterdayUsd : 0
  const delta = Math.round((today - yesterday) * 100) / 100
  if (Math.abs(delta) < TREND_TOLERANCE_USD) return 'flat'
  return delta > 0 ? 'up' : 'down'
}

export function presentCashPace(pace: CashPaceAmounts) {
  const today = formatMoney(Number(pace.todayUsd) || 0)
  const yesterday = formatMoney(Number(pace.yesterdayUsd) || 0)
  const week = formatMoney(Number(pace.weekUsd) || 0)
  return {
    trend: cashPaceTrend(Number(pace.todayUsd) || 0, Number(pace.yesterdayUsd) || 0),
    today,
    yesterday,
    week,
    sentence: `Aujourd'hui ${today}, hier ${yesterday}, cette semaine ${week}`,
  }
}
