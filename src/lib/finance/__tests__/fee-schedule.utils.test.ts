import {
  feeScheduleLineKey,
  filterPayableFeeLines,
  isPayableFeeLine,
  lineRemainingAmount,
  buildPaymentFeeLines,
  getSelectableFeeLines,
  buildContiguousSelectionThrough,
  toggleContiguousFeeSelection,
  selectAllRemainingMonths,
} from '@/lib/finance/fee-schedule.utils'
import type { FeeScheduleLineDto } from '@/types/finance'

const line = (overrides: Partial<FeeScheduleLineDto>): FeeScheduleLineDto => ({
  feeStructureId: 1,
  categoryId: 1,
  categoryCode: 'MIN',
  categoryName: 'Minerval',
  billingPeriod: 'MONTHLY',
  amount: 50,
  currency: 'USD',
  monthYear: '2026-01',
  dueDate: null,
  status: 'DUE',
  paid: false,
  ...overrides,
})

describe('fee-schedule.utils', () => {
  it('builds stable line keys', () => {
    expect(feeScheduleLineKey(line({ feeStructureId: 3, monthYear: '2026-02' }))).toBe('3:2026-02')
    expect(feeScheduleLineKey(line({ monthYear: null, billingPeriod: 'ONE_TIME' }))).toBe('1:')
  })

  it('filters payable lines including partial', () => {
    const lines = [
      line({ status: 'DUE' }),
      line({ status: 'PAID' }),
      line({ status: 'PARTIALLY_PAID', monthYear: '2025-12', amountRemaining: 20 }),
    ]
    expect(filterPayableFeeLines(lines)).toHaveLength(2)
    expect(isPayableFeeLine(line({ status: 'PARTIALLY_PAID' }))).toBe(true)
  })

  it('includes upcoming months in selectable lines after first unpaid', () => {
    const lines = [
      line({ monthYear: '2026-01', status: 'PAID' }),
      line({ monthYear: '2026-02', status: 'DUE' }),
      line({ monthYear: '2026-03', status: 'UPCOMING' }),
      line({ monthYear: '2026-04', status: 'UPCOMING' }),
    ]
    const selectable = getSelectableFeeLines(lines)
    expect(selectable.map((l) => l.monthYear)).toEqual(['2026-02', '2026-03', '2026-04'])
  })

  it('builds contiguous selection through target month', () => {
    const lines = [
      line({ monthYear: '2026-01', status: 'OVERDUE' }),
      line({ monthYear: '2026-02', status: 'DUE' }),
      line({ monthYear: '2026-03', status: 'UPCOMING' }),
    ]
    const selection = buildContiguousSelectionThrough(lines[2], lines)
    expect(selection.map((s) => s.line.monthYear)).toEqual(['2026-01', '2026-02', '2026-03'])
  })

  it('toggle selects contiguous block and prevents skipping', () => {
    const lines = [
      line({ monthYear: '2026-01', status: 'OVERDUE' }),
      line({ monthYear: '2026-02', status: 'DUE' }),
      line({ monthYear: '2026-03', status: 'UPCOMING' }),
    ]
    const afterToggle = toggleContiguousFeeSelection(lines[2], [], lines)
    expect(afterToggle.map((s) => s.line.monthYear)).toEqual(['2026-01', '2026-02', '2026-03'])

    const uncheckFeb = toggleContiguousFeeSelection(lines[1], afterToggle, lines)
    expect(uncheckFeb.map((s) => s.line.monthYear)).toEqual(['2026-01'])
  })

  it('selectAllRemainingMonths selects every open month', () => {
    const lines = [
      line({ monthYear: '2026-01', status: 'PAID' }),
      line({ monthYear: '2026-02', status: 'DUE' }),
      line({ monthYear: '2026-03', status: 'UPCOMING' }),
    ]
    const all = selectAllRemainingMonths(1, [], lines)
    expect(all.map((s) => s.line.monthYear)).toEqual(['2026-02', '2026-03'])
  })

  it('uses remaining amount when available', () => {
    expect(lineRemainingAmount(line({ amount: 50, amountRemaining: 15 }))).toBe(15)
    expect(lineRemainingAmount(line({ amount: 50 }))).toBe(50)
  })

  it('builds payment fee lines payload', () => {
    const l = line({ feeStructureId: 3, monthYear: '2026-02' })
    expect(buildPaymentFeeLines([{ line: l, amount: 25 }])).toEqual([
      { feeStructureId: 3, monthYear: '2026-02', amount: 25 },
    ])
  })
})
