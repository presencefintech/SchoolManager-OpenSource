import {
  asStudentPaymentsDetailedPage,
  normalizeStudentPaymentDetail,
  type StudentPaymentDetail,
  type StudentPaymentsDetailedPage,
} from '@/lib/finance/payment-history.utils'

describe('payment-history.utils', () => {
  it('normalizes a payment with fee lines', () => {
    const item = normalizeStudentPaymentDetail({
      id: 42,
      studentId: 7,
      studentName: 'Jean Dupont',
      studentFirstName: 'Jean',
      studentLastName: 'Dupont',
      amount: 150,
      currency: 'USD',
      status: 'CONFIRMED',
      method: 'CASH',
      methodLabel: 'Espèces',
      channel: null,
      reference: 'REF-42',
      createdAt: '2026-07-01T10:00:00.000Z',
      confirmedAt: '2026-07-01T10:05:00.000Z',
      receiptNumber: 'R-42',
      feeSummary: 'Scolarité · Transport',
      isMonthlyPayment: true,
      fees: [
        {
          feeStructureId: 3,
          feeLabel: 'Scolarité — juillet 2026',
          categoryName: 'Scolarité',
          categoryCode: 'TUITION',
          billingPeriod: 'MONTHLY',
          monthYear: '2026-07',
          amount: 100,
          isMonthly: true,
        },
      ],
    })

    expect(item).toMatchObject({
      id: 42,
      feeSummary: 'Scolarité · Transport',
      fees: [{ feeStructureId: 3, amount: 100 }],
    })
  })

  it('parses paginated API payload', () => {
    const page = asStudentPaymentsDetailedPage({
      data: [{ id: 1, studentId: 2, amount: 50, status: 'PENDING' }],
      total: 1,
      page: 1,
      lastPage: 1,
    })

    expect(page.data).toHaveLength(1)
    expect(page.total).toBe(1)
  })

  it('returns empty page for invalid payload', () => {
    expect(asStudentPaymentsDetailedPage(null)).toEqual({
      data: [],
      total: 0,
      page: 1,
      lastPage: 1,
    })
  })
})

export type { StudentPaymentDetail, StudentPaymentsDetailedPage }
