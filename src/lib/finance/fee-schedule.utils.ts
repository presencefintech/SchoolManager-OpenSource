import type { FeeScheduleLineDto } from '@/types/finance'
import type { PaymentFeeLinePayload } from '@/types/finance'

const PAYABLE_STATUSES = new Set<FeeScheduleLineDto['status']>(['DUE', 'OVERDUE', 'PARTIALLY_PAID'])

export function compareMonthYear(a: string, b: string): number {
  return a.localeCompare(b)
}

export function monthAfter(monthYear: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthYear)
  if (!match) return monthYear
  let year = Number(match[1])
  let month = Number(match[2]) + 1
  if (month > 12) {
    month = 1
    year += 1
  }
  return `${year}-${String(month).padStart(2, '0')}`
}

export function feeScheduleLineKey(line: Pick<FeeScheduleLineDto, 'feeStructureId' | 'monthYear'>): string {
  return `${line.feeStructureId}:${line.monthYear ?? ''}`
}

export function isPayableFeeLine(line: FeeScheduleLineDto): boolean {
  return PAYABLE_STATUSES.has(line.status)
}

/** @deprecated Préférer getSelectableFeeLines pour la sélection multi-mois */
export function filterPayableFeeLines(lines: FeeScheduleLineDto[]): FeeScheduleLineDto[] {
  return lines.filter(isPayableFeeLine)
}

function groupLinesByStructure(lines: FeeScheduleLineDto[]): Map<number, FeeScheduleLineDto[]> {
  const map = new Map<number, FeeScheduleLineDto[]>()
  for (const line of lines) {
    const group = map.get(line.feeStructureId) ?? []
    group.push(line)
    map.set(line.feeStructureId, group)
  }
  return map
}

/** Lignes mensuelles d'un barème, triées chronologiquement. */
export function getStructureMonthlyLines(
  lines: FeeScheduleLineDto[],
  feeStructureId: number,
): FeeScheduleLineDto[] {
  return lines
    .filter((l) => l.feeStructureId === feeStructureId && l.billingPeriod === 'MONTHLY' && l.monthYear)
    .sort((a, b) => compareMonthYear(a.monthYear!, b.monthYear!))
}

/**
 * Lignes sélectionnables : dues/en retard/partielles + mois futurs (avance),
 * à partir du premier mois non soldé de chaque barème mensuel.
 */
export function getSelectableFeeLines(lines: FeeScheduleLineDto[]): FeeScheduleLineDto[] {
  const result: FeeScheduleLineDto[] = []
  const byStructure = groupLinesByStructure(lines)

  for (const structLines of Array.from(byStructure.values())) {
    if (structLines[0]?.billingPeriod === 'MONTHLY') {
      const sorted = getStructureMonthlyLines(lines, structLines[0].feeStructureId)
      const firstUnpaidIdx = sorted.findIndex((l) => l.status !== 'PAID')
      if (firstUnpaidIdx >= 0) {
        result.push(...sorted.slice(firstUnpaidIdx))
      }
    } else {
      result.push(...structLines.filter(isPayableFeeLine))
    }
  }

  return result.sort((a, b) => {
    const dateCmp = (a.dueDate ?? a.monthYear ?? '').localeCompare(b.dueDate ?? b.monthYear ?? '')
    if (dateCmp !== 0) return dateCmp
    return a.categoryName.localeCompare(b.categoryName)
  })
}

export function lineRemainingAmount(line: FeeScheduleLineDto): number {
  if (line.amountRemaining != null && line.amountRemaining >= 0) {
    return line.amountRemaining
  }
  return line.amount
}

export type FeeLineSelection = {
  line: FeeScheduleLineDto
  amount: number
}

/** Sélection contiguë du premier mois impayé jusqu'à la ligne cible (inclus). */
export function buildContiguousSelectionThrough(
  targetLine: FeeScheduleLineDto,
  allLines: FeeScheduleLineDto[],
): FeeLineSelection[] {
  if (targetLine.billingPeriod !== 'MONTHLY' || !targetLine.monthYear) {
    if (!isPayableFeeLine(targetLine)) return []
    return [{ line: targetLine, amount: lineRemainingAmount(targetLine) }]
  }

  const structureLines = getStructureMonthlyLines(allLines, targetLine.feeStructureId)
  const firstUnpaidIdx = structureLines.findIndex((l) => l.status !== 'PAID')
  if (firstUnpaidIdx < 0) return []

  const targetIdx = structureLines.findIndex(
    (l) => feeScheduleLineKey(l) === feeScheduleLineKey(targetLine),
  )
  if (targetIdx < firstUnpaidIdx) return []

  return structureLines.slice(firstUnpaidIdx, targetIdx + 1).map((line) => ({
    line,
    amount: lineRemainingAmount(line),
  }))
}

/** Bascule une ligne en respectant la règle séquentielle (pas de trou). */
export function toggleContiguousFeeSelection(
  targetLine: FeeScheduleLineDto,
  current: FeeLineSelection[],
  allLines: FeeScheduleLineDto[],
): FeeLineSelection[] {
  const key = feeScheduleLineKey(targetLine)
  const isSelected = current.some((sel) => feeScheduleLineKey(sel.line) === key)

  if (targetLine.billingPeriod !== 'MONTHLY' || !targetLine.monthYear) {
    if (isSelected) {
      return current.filter((sel) => feeScheduleLineKey(sel.line) !== key)
    }
    return [...current, { line: targetLine, amount: lineRemainingAmount(targetLine) }]
  }

  const structureLines = getStructureMonthlyLines(allLines, targetLine.feeStructureId)
  const targetIdx = structureLines.findIndex((l) => feeScheduleLineKey(l) === key)
  if (targetIdx < 0) return current

  const otherStructures = current.filter(
    (sel) => sel.line.feeStructureId !== targetLine.feeStructureId,
  )

  if (isSelected) {
    const toRemove = new Set(
      structureLines.slice(targetIdx).map((l) => feeScheduleLineKey(l)),
    )
    return [
      ...otherStructures,
      ...current.filter(
        (sel) =>
          sel.line.feeStructureId !== targetLine.feeStructureId ||
          !toRemove.has(feeScheduleLineKey(sel.line)),
      ),
    ]
  }

  const contiguous = buildContiguousSelectionThrough(targetLine, allLines)
  const merged = new Map(current.map((sel) => [feeScheduleLineKey(sel.line), sel]))
  for (const sel of contiguous) {
    merged.set(feeScheduleLineKey(sel.line), sel)
  }
  return Array.from(merged.values())
}

/** Sélectionne tous les mois restants d'un barème mensuel. */
export function selectAllRemainingMonths(
  feeStructureId: number,
  current: FeeLineSelection[],
  allLines: FeeScheduleLineDto[],
): FeeLineSelection[] {
  const selectable = getSelectableFeeLines(allLines).filter(
    (l) => l.feeStructureId === feeStructureId && l.billingPeriod === 'MONTHLY',
  )
  const merged = new Map(current.map((sel) => [feeScheduleLineKey(sel.line), sel]))
  for (const line of selectable) {
    merged.set(feeScheduleLineKey(line), { line, amount: lineRemainingAmount(line) })
  }
  return Array.from(merged.values())
}

export function buildPaymentFeeLines(
  selections: FeeLineSelection[],
): PaymentFeeLinePayload[] {
  return selections.map(({ line, amount }) => ({
    feeStructureId: line.feeStructureId,
    monthYear: line.monthYear ?? undefined,
    amount,
  }))
}

export function selectionTotalAmount(selections: FeeLineSelection[]): number {
  return Number(selections.reduce((sum, sel) => sum + sel.amount, 0).toFixed(2))
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
