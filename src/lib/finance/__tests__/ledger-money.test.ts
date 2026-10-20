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
    // 50 USD → 142 500 CDF (jamais $US)
    expect(out).toMatch(/CDF|FC/)
    expect(out).not.toMatch(/\$|USD/)
  })

  it('ne fabrique pas de francs sans taux (évite 50 $ → 50 FC)', () => {
    const out = formatLedgerAmount(50, 'USD', { displayCurrency: 'CDF', legacyRate: 0 })
    expect(out).toMatch(/\$|USD/)
  })

  it('école CDF : un montant sans devise est en francs, affiché tel quel', () => {
    const cdfSchool = { baseCurrency: 'CDF', displayCurrency: 'CDF', legacyRate: 2850 }
    const out = formatLedgerAmount(75000, undefined, cdfSchool)
    expect(out).toMatch(/CDF|FC/)
    expect(out.replace(/\D/g, '')).toBe('75000')
  })

  it('école USD : un montant sans devise est en dollars, affiché tel quel', () => {
    const usdSchool = { baseCurrency: 'USD', displayCurrency: 'USD', legacyRate: 2850 }
    const out = formatLedgerAmount(150, undefined, usdSchool)
    expect(out).toMatch(/\$|USD/)
    expect(out).toContain('150')
  })

  it('école USD affichée en francs : conversion par le taux', () => {
    const out = formatLedgerAmount(50, undefined, { baseCurrency: 'USD', displayCurrency: 'CDF', legacyRate: 2850 })
    expect(out.replace(/\D/g, '')).toBe('142500')
  })

  it('école CDF affichée en dollars : conversion inverse', () => {
    const out = formatLedgerAmount(142500, undefined, { baseCurrency: 'CDF', displayCurrency: 'USD', legacyRate: 2850 })
    expect(out).toMatch(/\$|USD/)
    expect(out).toContain('50')
  })

  it('devise d’affichage absente : on affiche dans la devise de l’école', () => {
    const out = formatLedgerAmount(75000, undefined, { baseCurrency: 'CDF', legacyRate: 2850 })
    expect(out.replace(/\D/g, '')).toBe('75000')
  })

  it('normalise FC → CDF et ignore les devises inconnues', () => {
    expect(normalizeMoneyCurrency('FC')).toBe('CDF')
    expect(normalizeMoneyCurrency(undefined)).toBe('USD')
    expect(normalizeMoneyCurrency('cdf')).toBe('CDF')
    expect(normalizeMoneyCurrency('XYZ')).toBe('USD')
  })
})
