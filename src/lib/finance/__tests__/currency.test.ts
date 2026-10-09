import { describe, expect, it } from '@jest/globals'
import { formatMoney, formatInsightValue, DEFAULT_FINANCE_CURRENCY } from '../currency'

describe('finance/currency', () => {
  it('formate en USD par défaut', () => {
    expect(DEFAULT_FINANCE_CURRENCY).toBe('USD')
    expect(formatMoney(330)).toContain('330')
    expect(formatMoney(330)).toMatch(/\$US|USD/)
  })

  it('formate CDF en FC (symbole local, jamais le code ISO ni $US)', () => {
    expect(formatMoney(50000, 'CDF')).toBe('50.000 FC')
    expect(formatMoney(50000, 'FC')).toBe('50.000 FC')
    expect(formatMoney(50000, 'CDF')).not.toMatch(/CDF|\$US|USD/)
    expect(formatMoney(25, 'usd')).toMatch(/\$US/)
  })

  it('formate les insights monétaires en USD', () => {
    expect(formatInsightValue('totalCollecte', 330)).toMatch(/\$US|USD/)
    expect(formatInsightValue('efficaciteRecouvrement', 2.7)).toBe('2,7%')
    expect(formatInsightValue('nombreEleves', 69)).toBe('69')
  })

  it('plafonne le taux de recouvrement à 100%', () => {
    expect(formatInsightValue('efficiency', 866.27)).toBe('100%')
    expect(formatInsightValue('efficaciteRecouvrement', 866.27)).toBe('100%')
  })

  it('formate le seuil d\'équilibre comme un effectif, pas de l\'argent', () => {
    expect(formatInsightValue('seuilEquilibreEleves', 1155)).toBe('1 155')
    expect(formatInsightValue('breakEvenThreshold', 1155)).not.toMatch(/\$|USD/)
  })

  it('formate les booléens et dates ISO', () => {
    expect(formatInsightValue('isHealthy', true)).toBe('Oui')
    expect(formatInsightValue('generatedAt', '2026-07-23T21:57:22.262Z')).toMatch(/2026/)
  })
})
