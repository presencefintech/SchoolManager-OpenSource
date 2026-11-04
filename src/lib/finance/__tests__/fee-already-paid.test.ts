import { parseFeeAlreadyPaidDetails, formatFeeAlreadyPaidMessage } from '../fee-already-paid'

describe('fee-already-paid (UI)', () => {
  it('affiche guichet + agent depuis le payload 409', () => {
    const details = parseFeeAlreadyPaidDetails({
      studentId: 4,
      feeStructureId: 9,
      monthYear: '2026-01',
      categoryName: 'Minerval',
      paidAt: '16/09/2026 10:12',
      paymentId: 77,
      reference: 'PAY-77',
      cashDesk: { id: 2, name: 'Hall' },
      cashier: { id: 5, name: 'Jean Mbala' },
    })
    expect(details).not.toBeNull()
    expect(formatFeeAlreadyPaidMessage(details!)).toContain('Hall')
    expect(formatFeeAlreadyPaidMessage(details!)).toContain('Jean Mbala')
    expect(formatFeeAlreadyPaidMessage(details!)).toContain('PAY-77')
  })
})
