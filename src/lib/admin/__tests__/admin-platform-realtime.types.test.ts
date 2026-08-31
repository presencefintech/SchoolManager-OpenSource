import { describe, expect, it } from '@jest/globals'
import {
  parseCashActivity,
  parseEnrollmentApproved,
  parseNewEnrollmentRequest,
  parsePaymentConfirmedAdmin,
  parsePaymentFailedAdmin,
} from '@/lib/admin/admin-platform-realtime.types'

describe('admin platform realtime parsers', () => {
  it('parses payment confirmed', () => {
    const item = parsePaymentConfirmedAdmin({
      paymentId: 42,
      schoolId: 1,
      studentId: 10,
      studentName: 'Jean Dupont',
      amount: 50000,
      currency: 'CDF',
      provider: 'FLEXPAIE',
      timestamp: '2026-07-11T08:00:00.000Z',
    })
    expect(item?.type).toBe('confirmed')
    expect(item?.studentName).toBe('Jean Dupont')
  })

  it('parses payment failed', () => {
    const item = parsePaymentFailedAdmin({
      paymentId: 7,
      schoolId: 1,
      reason: 'TIMEOUT',
      message: 'Provider timeout',
      timestamp: '2026-07-11T08:01:00.000Z',
    })
    expect(item?.type).toBe('failed')
    expect(item?.reason).toBe('TIMEOUT')
  })

  it('parses enrollment approved', () => {
    const item = parseEnrollmentApproved({
      schoolId: 1,
      studentId: 99,
      matricule: 'EXC-2026-001',
      timestamp: '2026-07-11T08:02:00.000Z',
    })
    expect(item?.type).toBe('approved')
    expect(item?.matricule).toBe('EXC-2026-001')
  })

  it('parses new enrollment request', () => {
    const item = parseNewEnrollmentRequest({
      schoolId: 1,
      studentId: 100,
      firstName: 'Marie',
      lastName: 'Kabila',
      timestamp: '2026-07-11T08:03:00.000Z',
    })
    expect(item?.type).toBe('request')
    expect(item?.fullName).toBe('Marie Kabila')
  })

  it('parses cash activity with school name (console groupe)', () => {
    const item = parseCashActivity({
      kind: 'CASH_PAYMENT',
      schoolId: 2,
      schoolName: 'Excellence 2',
      schoolGroupId: 10,
      label: 'Encaissement guichet',
      amount: 80,
      currency: 'USD',
      paymentId: 12,
      timestamp: '2026-08-31T08:00:00.000Z',
    })
    expect(item?.schoolName).toBe('Excellence 2')
    expect(item?.schoolId).toBe(2)
    expect(item?.id).toContain('2')
  })
})
