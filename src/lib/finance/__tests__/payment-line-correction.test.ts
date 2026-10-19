import {
  activeLinesOf,
  isCorrectable,
  toggleWithSuffixRule,
  type ActiveLine,
} from '@/lib/finance/payment-line-correction'
import type { StudentPaymentDetail } from '@/lib/finance/payment-history.utils'

function line(id: number, monthYear: string | null, feeStructureId = 1, reversedAt: string | null = null): ActiveLine {
  return {
    id,
    feeStructureId,
    feeLabel: `Ligne ${id}`,
    categoryName: '',
    categoryCode: '',
    billingPeriod: monthYear ? 'MONTHLY' : 'ANNUAL',
    monthYear,
    amount: 10,
    isMonthly: monthYear != null,
    reversedAt,
  }
}

function payment(overrides: Partial<StudentPaymentDetail> = {}): StudentPaymentDetail {
  return {
    id: 1,
    studentId: 1,
    studentName: 'A',
    studentFirstName: 'A',
    studentLastName: 'B',
    amount: 30,
    currency: 'USD',
    status: 'CONFIRMED',
    method: 'CASH',
    methodLabel: 'Espèces',
    channel: null,
    reference: 'R',
    createdAt: '2026-10-01T00:00:00Z',
    confirmedAt: null,
    receiptNumber: null,
    feeSummary: '',
    fees: [line(1, '2026-09'), line(2, '2026-10')],
    isMonthlyPayment: true,
    ...overrides,
  }
}

describe('toggleWithSuffixRule', () => {
  // oct, nov, déc volontairement dans le désordre
  const lines = [line(12, '2026-12'), line(10, '2026-10'), line(11, '2026-11'), line(20, null, 2)]

  it('cocher un mois coche aussi les mois plus récents du même barème', () => {
    const next = toggleWithSuffixRule(lines, new Set(), lines[2]) // nov
    expect([...next].sort()).toEqual([11, 12])
  })

  it('cocher le mois le plus récent ne coche que lui', () => {
    expect([...toggleWithSuffixRule(lines, new Set(), lines[0])]).toEqual([12])
  })

  it('décocher un mois décoche aussi les mois plus anciens', () => {
    const next = toggleWithSuffixRule(lines, new Set([10, 11, 12]), lines[2]) // nov
    expect([...next]).toEqual([12])
  })

  it('une ligne non mensuelle se coche indépendamment', () => {
    const next = toggleWithSuffixRule(lines, new Set([12]), lines[3])
    expect([...next].sort()).toEqual([12, 20])
    expect([...toggleWithSuffixRule(lines, next, lines[3])]).toEqual([12])
  })

  it('les barèmes mensuels distincts restent indépendants', () => {
    const mixed = [line(1, '2026-10', 1), line(2, '2026-11', 1), line(3, '2026-10', 2), line(4, '2026-11', 2)]
    const next = toggleWithSuffixRule(mixed, new Set(), mixed[2])
    expect([...next].sort()).toEqual([3, 4])
  })
})

describe('isCorrectable / activeLinesOf', () => {
  it('accepte un encaissement espèces confirmé avec lignes actives', () => {
    expect(isCorrectable(payment())).toBe(true)
  })

  it('refuse les autres canaux, les avoirs et les statuts non confirmés', () => {
    expect(isCorrectable(payment({ method: 'MOBILE_MONEY' }))).toBe(false)
    expect(isCorrectable(payment({ amount: -10 }))).toBe(false)
    expect(isCorrectable(payment({ status: 'PENDING' }))).toBe(false)
  })

  it('ignore les lignes déjà contre-passées', () => {
    const p = payment({ fees: [line(1, '2026-09', 1, '2026-10-02T00:00:00Z')] })
    expect(activeLinesOf(p)).toHaveLength(0)
    expect(isCorrectable(p)).toBe(false)
  })
})
