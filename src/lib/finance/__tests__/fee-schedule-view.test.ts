import { clampCollectAmount, displayedRemaining, scheduleTotals } from '@/lib/finance/fee-schedule-view'
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

describe('fee-schedule-view', () => {
  it('prefers the server remaining amount, else amount minus paid', () => {
    expect(displayedRemaining(line({ amountRemaining: 12.5 }))).toBe(12.5)
    expect(displayedRemaining(line({ amountPaid: 20 }))).toBe(30)
    expect(displayedRemaining(line({ amountPaid: 80 }))).toBe(0)
  })

  it('sums footer totals to the cent', () => {
    const totals = scheduleTotals([
      line({ amount: 0.1, amountPaid: 0.1, status: 'PAID' }),
      line({ amount: 0.2, amountPaid: 0, monthYear: '2026-02' }),
    ])
    expect(totals).toEqual({ billed: 0.3, paid: 0.1, remaining: 0.2 })
  })

  it('clamps partial collect amounts within the remaining balance', () => {
    expect(clampCollectAmount('25,5', 50)).toBe(25.5)
    expect(clampCollectAmount('999', 50)).toBe(50)
    expect(clampCollectAmount('0', 50)).toBe(0.01)
    expect(clampCollectAmount('abc', 50)).toBe(0.01)
  })
})
