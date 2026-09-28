import { describe, expect, it } from '@jest/globals'
import { presentStudentPaymentStatus } from '../student-payment-status'

describe('presentStudentPaymentStatus', () => {
  it('calcule le pourcentage d’élèves en ordre', () => {
    const view = presentStudentPaymentStatus({ total: 100, paid: 75, debtors: 25 })
    expect(view.solvencyPct).toBe(75)
    expect(view.sentence).toBe('75 % des élèves en ordre')
    expect(view.inOrder).toBe(75)
    expect(view.debtors).toBe(25)
  })

  it('n’invente pas de pourcentage sans élèves', () => {
    const view = presentStudentPaymentStatus({ total: 0, paid: 0, debtors: 0 })
    expect(view.solvencyPct).toBeNull()
    expect(view.sentence).toBeNull()
  })
})
