import type { FeeScheduleLineDto } from '@/types/finance'
import type { PaymentFeeLinePayload } from '@/types/finance'

const PAYABLE_STATUSES = new Set<FeeScheduleLineDto['status']>(['DUE', 'OVERDUE', 'PARTIALLY_PAID'])

export function feeScheduleLineKey(line: Pick<FeeScheduleLineDto, 'feeStructureId' | 'monthYear'>): string {
  return `${line.feeStructureId}:${line.monthYear ?? ''}`
}

export function isPayableFeeLine(line: FeeScheduleLineDto): boolean {
  return PAYABLE_STATUSES.has(line.status)
}

export function filterPayableFeeLines(lines: FeeScheduleLineDto[]): FeeScheduleLineDto[] {
  return lines.filter(isPayableFeeLine)
}

export function lineRemainingAmount(line: FeeScheduleLineDto): number {
  if (line.amountRemaining != null && line.amountRemaining >= 0) {
    return line.amountRemaining
  }
  return line.amount
}

export function buildPaymentFeeLines(
  selections: Array<{ line: FeeScheduleLineDto; amount: number }>,
): PaymentFeeLinePayload[] {
  return selections.map(({ line, amount }) => ({
    feeStructureId: line.feeStructureId,
    monthYear: line.monthYear ?? undefined,
    amount,
  }))
}

export function formatFeePeriodLabel(line: FeeScheduleLineDto): string {
  if (line.billingPeriod === 'ONE_TIME') {
    if (!line.dueDate) return 'Frais unique'
    const date = new Date(line.dueDate)
    if (Number.isNaN(date.getTime())) return 'Frais unique'
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
  }
  if (!line.monthYear) return '—'
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(line.monthYear)
  if (!match) return line.monthYear
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}
