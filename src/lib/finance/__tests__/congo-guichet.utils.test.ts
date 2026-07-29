import {
  cdfToUsd,
  formatDualMoney,
  normalizeCongoPhone,
  sanitizeOperatorReference,
  isRetriablePaymentError,
  usdToCdf,
  CDF_DENOMINATIONS,
  USD_DENOMINATIONS,
} from '@/lib/finance/congo-money.utils'
import {
  findRecentSimilarPayment,
  formatMinutesAgo,
  getAutoPrintThermalPreference,
  setAutoPrintThermalPreference,
  __resetAutoPrintPreferenceForTests,
  availableDrawerCashUsd,
  changeExceedsDrawer,
  saveGuichetPaymentDraft,
  loadGuichetPaymentDraft,
  clearGuichetPaymentDraft,
} from '@/lib/finance/guichet-ops.utils'

describe('congo-money.utils', () => {
  it('convertit USD → CDF avec arrondi', () => {
    expect(usdToCdf(10, 2850)).toBe(28_500)
    expect(usdToCdf(45.5, 2850)).toBe(129_675)
  })

  it('convertit CDF → USD', () => {
    expect(cdfToUsd(2850, 2850)).toBe(1)
    expect(cdfToUsd(10_000, 2850)).toBe(3.51)
  })

  it('formatDualMoney affiche FC quand taux présent', () => {
    const dual = formatDualMoney(20, 2850, 'USD')
    expect(dual.primary).toContain('20')
    expect(dual.secondary).toBeTruthy()
    expect(dual.rateLabel).toMatch(/2\s?850/)
  })

  it('normalise les téléphones RDC', () => {
    expect(normalizeCongoPhone('0812345678')).toBe('+243812345678')
    expect(normalizeCongoPhone('+243 81 234 5678')).toBe('+243812345678')
    expect(normalizeCongoPhone('243812345678')).toBe('+243812345678')
    expect(normalizeCongoPhone('812345678')).toBe('+243812345678')
  })

  it('expose les dénominations guichet', () => {
    expect(CDF_DENOMINATIONS).toContain(20_000)
    expect(USD_DENOMINATIONS).toContain(100)
  })

  it('extrait la référence depuis un SMS Mobile Money', () => {
    expect(
      sanitizeOperatorReference('Votre transaction MP240125.1234.A est reussie'),
    ).toBe('MP240125.1234.A')
    expect(sanitizeOperatorReference('Réf: OM99887766')).toMatch(/OM99887766/i)
    expect(sanitizeOperatorReference('  txn-abc-001  ')).toBe('TXN-ABC-001')
  })

  it('détecte les erreurs réseau retriables (garder idempotency)', () => {
    expect(isRetriablePaymentError({ code: 'ERR_NETWORK' })).toBe(true)
    expect(isRetriablePaymentError({ code: 'ECONNABORTED' })).toBe(true)
    expect(isRetriablePaymentError({ response: { status: 503 } })).toBe(true)
    expect(isRetriablePaymentError({ response: { status: 429 } })).toBe(true)
    expect(isRetriablePaymentError({ response: { status: 400 } })).toBe(false)
    expect(isRetriablePaymentError({ response: { status: 409 } })).toBe(false)
  })
})

describe('guichet-ops.utils', () => {
  const base = [
    {
      id: 11,
      amount: 50,
      method: 'CASH',
      createdAt: new Date(Date.now() - 5 * 60_000).toISOString(),
    },
    {
      id: 12,
      amount: 50,
      method: 'ORANGE_MONEY',
      createdAt: new Date(Date.now() - 2 * 60_000).toISOString(),
    },
  ]

  it('détecte un doublon montant+méthode récent', () => {
    const hit = findRecentSimilarPayment(base, { amount: 50, method: 'CASH' })
    expect(hit?.id).toBe(11)
  })

  it('ignore un montant différent', () => {
    expect(findRecentSimilarPayment(base, { amount: 51, method: 'CASH' })).toBeNull()
  })

  it('ignore hors fenêtre', () => {
    const old = [
      {
        id: 1,
        amount: 50,
        method: 'CASH',
        createdAt: new Date(Date.now() - 60 * 60_000).toISOString(),
      },
    ]
    expect(findRecentSimilarPayment(old, { amount: 50, method: 'CASH' })).toBeNull()
  })

  it('formate minutes écoulées', () => {
    const iso = new Date(Date.now() - 3 * 60_000).toISOString()
    expect(formatMinutesAgo(iso)).toBe('il y a 3 min')
  })

  it('persiste la préférence auto-print', () => {
    __resetAutoPrintPreferenceForTests()
    setAutoPrintThermalPreference(false)
    expect(getAutoPrintThermalPreference()).toBe(false)
    setAutoPrintThermalPreference(true)
    expect(getAutoPrintThermalPreference()).toBe(true)
    __resetAutoPrintPreferenceForTests()
  })

  it('détecte un rendu supérieur au fond caisse', () => {
    expect(availableDrawerCashUsd(100, 50)).toBe(150)
    expect(changeExceedsDrawer(80, 50)).toBe(true)
    expect(changeExceedsDrawer(20, 50)).toBe(false)
  })

  it('persiste et restaure un brouillon guichet', () => {
    const store: Record<string, string> = {}
    const ls = {
      getItem: (k: string) => store[k] ?? null,
      setItem: (k: string, v: string) => {
        store[k] = v
      },
      removeItem: (k: string) => {
        delete store[k]
      },
    }
    Object.defineProperty(globalThis, 'window', {
      value: { localStorage: ls },
      configurable: true,
      writable: true,
    })

    clearGuichetPaymentDraft(99)
    saveGuichetPaymentDraft({
      studentId: 99,
      method: 'MPESA',
      reference: 'MP123',
      payerName: 'Maman',
      savedAt: new Date().toISOString(),
    })
    const loaded = loadGuichetPaymentDraft(99)
    expect(loaded?.method).toBe('MPESA')
    expect(loaded?.reference).toBe('MP123')
    expect(loaded?.payerName).toBe('Maman')
    clearGuichetPaymentDraft(99)
    expect(loadGuichetPaymentDraft(99)).toBeNull()
  })
})
