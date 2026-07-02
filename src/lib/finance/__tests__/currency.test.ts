import { describe, expect, it } from '@jest/globals'
import { formatMoney, formatInsightValue, DEFAULT_FINANCE_CURRENCY } from '../currency'

describe('finance/currency', () => {
  it('formate en USD par défaut', () => {
    expect(DEFAULT_FINANCE_CURRENCY).toBe('USD')
    expect(formatMoney(330)).toContain('330')
    expect(formatMoney(330)).toMatch(/\$|USD/)
  })

  it('formate les insights monétaires en USD', () => {
    expect(formatInsightValue('totalCollecte', 330)).toMatch(/\$|USD/)
    expect(formatInsightValue('efficaciteRecouvrement', 2.7)).toBe('2,7%')
    expect(formatInsightValue('nombreEleves', 69)).toBe('69')
  })
})
