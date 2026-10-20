import { describe, expect, it } from '@jest/globals'
import { previewCashTender } from '../mixed-tender'

describe('previewCashTender — école USD (inchangé)', () => {
  it('USD puis francs pour le reliquat', () => {
    const p = previewCashTender(40, 20, 65000, 2850)
    expect(p.short).toBe(false)
    expect(p.requiredCdf).toBe(57000)
    expect(p.changeCdf).toBe(8000)
  })

  it('francs insuffisants', () => {
    const p = previewCashTender(10, 0, 20000, 2850)
    expect(p.short).toBe(true)
  })
})

describe('previewCashTender — école CDF (dû en francs)', () => {
  it('75 000 FC remis pour 75 000 FC dus : accepté, sans rendu', () => {
    const p = previewCashTender(75000, 0, 75000, 2850, 'CDF')
    expect(p.short).toBe(false)
    expect(p.changeCdf).toBe(0)
    expect(p.changeUsd).toBe(0)
  })

  it('accepté même sans taux quand tout est payé en francs', () => {
    expect(previewCashTender(75000, 0, 75000, null, 'CDF').short).toBe(false)
  })

  it('rendu en francs', () => {
    expect(previewCashTender(75000, 0, 80000, 2850, 'CDF').changeCdf).toBe(5000)
  })

  it('manque en francs : message en FC et en $, jamais dû × taux', () => {
    const p = previewCashTender(75000, 0, 50000, 2850, 'CDF')
    expect(p.short).toBe(true)
    expect(p.message).toContain('25')
    expect(p.message).not.toContain('213')
  })

  it('complément en dollars et rendu en dollars', () => {
    const p = previewCashTender(75000, 10, 50000, 2850, 'CDF')
    expect(p.short).toBe(false)
    expect(p.changeUsd).toBeCloseTo(1.23, 2)
  })

  it('dollars sans taux : refusé', () => {
    expect(previewCashTender(75000, 30, 0, null, 'CDF').short).toBe(true)
  })
})
