import { describe, expect, it } from '@jest/globals'
import { formatLedgerAmount, normalizeMoneyCurrency } from '../ledger-money'

describe('formatLedgerAmount', () => {
  it('reste en USD si la devise d’affichage est USD', () => {
    const out = formatLedgerAmount(50, 'USD', { displayCurrency: 'USD', legacyRate: 2850 })
    expect(out).toMatch(/\$|USD/)
    expect(out).toContain('50')
  })

  it('convertit USD → FC quand l’école affiche le franc', () => {
    const out = formatLedgerAmount(50, 'USD', { displayCurrency: 'CDF', legacyRate: 2850 })
    expect(out).toMatch(/CDF|FC/)
    expect(out).not.toMatch(/\$|USD/)
  })

  it('ne fabrique pas de francs sans taux (évite 50 $ → 50 FC)', () => {
    const out = formatLedgerAmount(50, 'USD', { displayCurrency: 'CDF', legacyRate: 0 })
    expect(out).toMatch(/\$|USD/)
  })

  it('ignore une devise inconnue et retombe sur USD', () => {
    expect(normalizeMoneyCurrency('FC')).toBe('USD')
    expect(normalizeMoneyCurrency(undefined)).toBe('USD')
    expect(normalizeMoneyCurrency('cdf')).toBe('CDF')
  })
})
