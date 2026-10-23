import { describe, expect, it } from '@jest/globals'
import {
  buildDayCashCollectionsView,
  formatPromoterRemittanceBanner,
  netCashToRemitUsd,
  openTillSnapshotFromSession,
  sumDayCashUsd,
} from '../day-cash-remittance'

const RATE = 2850

describe('day-cash-remittance', () => {
  it('somme les espèces du jour en USD', () => {
    expect(
      sumDayCashUsd([
        { method: 'CASH', _sum: { amount: 50.25 }, _count: { id: 1 } },
        { method: 'CASH', _sum: { amount: 29.76 }, _count: { id: 1 } },
      ]),
    ).toBe(80.01)
  })

  it('convertit 80 $US et construit la bannière promoteur', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
    })

    expect(view.collectedUsd).toBe(80)
    expect(view.remitUsd).toBe(80)
    expect(view.remitCdf).toBe(228_000)
    expect(view.total.primary).toContain('80')
    expect(view.total.primary).toMatch(/\$US/)
    // Format CDF de formatMoney : s\u00e9parateur de milliers \u00ab . \u00bb (`228.000 CDF`).
    expect(view.total.secondary).toMatch(/228[.\s\u202f]?000/)
    expect(view.total.secondary).toMatch(/CDF/)
    expect(view.banner).toBe(formatPromoterRemittanceBanner(80, RATE))
    expect(view.banner).toMatch(/À remettre au promoteur :/)
    expect(view.banner).toMatch(/\$US/)
    expect(view.banner).toMatch(/CDF/)
    expect(view.rateLabel).toMatch(/2[\s\u202f]?850/)
    expect(view.adjustmentNote).toBeNull()
    expect(view.showBanner).toBe(true)
  })

  it('déduit un versement banque du net à remettre', () => {
    const remit = netCashToRemitUsd(80, {
      ledger: { versements: 20, renflouements: 0, retraits: 0 },
    })
    expect(remit).toBe(60)

    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: { ledger: { netUsd: -20 } },
    })
    expect(view.remitUsd).toBe(60)
    expect(view.remitCdf).toBe(171_000)
    expect(view.adjustmentNote).toMatch(/déduits/)
  })

  it('reprend le net serveur quand le tiroir correspond au total du jour', () => {
    const remit = netCashToRemitUsd(80, {
      openingFloatUsd: 10,
      cashCollectedUsd: 80,
      expectedCashUsd: 70,
      ledger: { netUsd: 0 },
    })
    expect(remit).toBe(60)
  })

  it('ne mélange pas le tiroir d’un autre caissier avec le total école', () => {
    const remit = netCashToRemitUsd(80, {
      openingFloatUsd: 10,
      cashCollectedUsd: 30,
      expectedCashUsd: 40,
      ledger: { versements: 5 },
    })
    expect(remit).toBe(75)
  })

  it('n’invente pas de francs sans taux', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: null,
    })
    expect(view.total.secondary).toBeNull()
    expect(view.remitCdf).toBeNull()
    expect(view.banner).toBe(`À remettre au promoteur : ${view.total.primary}`)
    expect(view.banner).not.toMatch(/CDF/)
    expect(view.rateLabel).toBeNull()
  })

  it('reste discret quand la journée est vide', () => {
    const view = buildDayCashCollectionsView({ rows: [], rate: RATE })
    expect(view.showBanner).toBe(false)
    expect(view.remitUsd).toBe(0)
  })

  it('préfère le taux de la session au taux école', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: { fxRate: 2800 },
    })
    expect(view.remitCdf).toBe(224_000)
  })

  it('ignore un taux de session égal à 1', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: { fxRate: 1 },
    })
    expect(view.remitCdf).toBe(228_000)
  })

  it('sépare les billets reçus de l’équivalent comptable', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: {
        openingFloatUsd: 10,
        cashCollectedUsd: 80,
        expectedCashUsd: 90,
        physicalCashUsd: 50,
        physicalCashCdf: 85_500,
        physicalCashCdfInUsd: 30,
        ledger: { versements: 0, renflouements: 0, retraits: 0, netUsd: 0 },
      },
    })

    expect(view.physical?.title).toBe('Billets dans le tiroir')
    expect(view.physical?.usd).toMatch(/50/)
    expect(view.physical?.cdf).toMatch(/85[.\s\u202f]?500/)
    expect(view.physical?.cdfBookHint).toMatch(/30/)
    expect(view.totalHint).toMatch(/Équivalent/)
    expect(view.scopeNote).toBeNull()
    expect(view.floatNote).toMatch(/10/)
    expect(view.floatNote).toMatch(/tiroir/)
    expect(view.shareText).toContain(view.banner)
    expect(view.shareText).toContain('Billets dans le tiroir')
    expect(view.whatsappUrl.startsWith('https://wa.me/?text=')).toBe(true)
    expect(view.whatsappUrl).not.toMatch(/wa\.me\/\d/)
  })

  it('détaille un versement et la petite caisse du même tiroir', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: {
        openingFloatUsd: 10,
        cashCollectedUsd: 80,
        expectedCashUsd: 65,
        pettyCashUsd: 5,
        ledger: { versements: 20, renflouements: 0, retraits: 0 },
      },
    })
    expect(view.remitUsd).toBe(55)
    expect(view.breakdown.map((line) => line.label)).toEqual(['Versé en banque', 'Petite caisse'])
  })

  it('ne présente pas les billets d’un autre guichet comme ceux de l’école', () => {
    const view = buildDayCashCollectionsView({
      rows: [{ method: 'CASH', _sum: { amount: 80 }, _count: { id: 1 } }],
      rate: RATE,
      till: {
        openingFloatUsd: 10,
        cashCollectedUsd: 30,
        expectedCashUsd: 40,
        physicalCashUsd: 30,
        ledger: { versements: 5 },
      },
    })
    expect(view.physical?.title).toBe('Billets de ce guichet')
    expect(view.scopeNote).toMatch(/toute l’école/)
    expect(view.breakdown.map((line) => line.label)).toEqual(['Versé en banque'])
    expect(view.remitUsd).toBe(75)
  })

  it('lit les billets sur le résumé de session', () => {
    const till = openTillSnapshotFromSession({
      openingFloat: 10,
      cashCollected: 80,
      expectedCash: 90,
      openingFloatCdf: 5_000,
      summary: {
        dualTotals: { cashUsd: 50, cashCdf: 85_500, cashCdfInUsd: 30, fxRate: 2800 },
        reconciliation: { pettyCashUsd: 0 },
      },
    })
    expect(till?.physicalCashUsd).toBe(50)
    expect(till?.physicalCashCdf).toBe(85_500)
    expect(till?.fxRate).toBe(2800)
    expect(till?.openingFloatCdf).toBe(5_000)
  })
})
