import { describe, expect, it } from '@jest/globals'
import { cashPaceTrend, presentCashPace } from '../cash-pace'

describe('cashPaceTrend', () => {
  it('monte, descend ou reste plat', () => {
    expect(cashPaceTrend(80, 50)).toBe('up')
    expect(cashPaceTrend(40, 50)).toBe('down')
    expect(cashPaceTrend(50, 50)).toBe('flat')
    expect(cashPaceTrend(50.01, 50)).toBe('flat')
  })
})

describe('presentCashPace', () => {
  it('écrit la ligne Aujourd’hui / hier / semaine', () => {
    const view = presentCashPace({ todayUsd: 80, yesterdayUsd: 50, weekUsd: 420 })
    expect(view.sentence).toMatch(/^Aujourd'hui /)
    expect(view.sentence).toContain('hier')
    expect(view.sentence).toContain('cette semaine')
    expect(view.today).toMatch(/80/)
    expect(view.today).toMatch(/\$US/)
    expect(view.yesterday).toMatch(/50/)
    expect(view.week).toMatch(/420/)
    expect(view.trend).toBe('up')
  })
})
