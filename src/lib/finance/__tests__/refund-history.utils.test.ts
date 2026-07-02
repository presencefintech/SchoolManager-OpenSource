import { buildRefundHistoryEvents, parseRefundReviewNotes } from '../refund-history.utils'

describe('parseRefundReviewNotes', () => {
  it('splits admin, guichet and gateway sections', () => {
    const notes = 'Validé après contrôle\n[Guichet] Remboursement cash\n[Gateway] Provider timeout'
    expect(parseRefundReviewNotes(notes)).toEqual({
      admin: 'Validé après contrôle',
      guichet: 'Remboursement cash',
      gateway: 'Provider timeout',
    })
  })

  it('returns null sections for empty notes', () => {
    expect(parseRefundReviewNotes(null)).toEqual({ admin: null, guichet: null, gateway: null })
  })
})

describe('buildRefundHistoryEvents', () => {
  it('builds timeline for approved and processed refund', () => {
    const events = buildRefundHistoryEvents({
      status: 'PROCESSED',
      createdAt: '2026-07-01T10:00:00Z',
      reviewedAt: '2026-07-01T11:00:00Z',
      processedAt: '2026-07-01T12:00:00Z',
      reviewNotes: 'OK admin\n[Guichet] Traité en caisse',
      reviewedBy: { id: 2, name: 'Admin Test' },
      gateway: { provider: 'FLUTTERWAVE', status: 'SUCCESS', refundRef: 'RF-1' },
    })

    expect(events.map((e) => e.key)).toEqual(['created', 'review', 'processed', 'gateway'])
    expect(events[1]).toMatchObject({ label: 'Approuvée par l\'admin', actor: 'Admin Test', detail: 'OK admin' })
    expect(events[2]).toMatchObject({ label: 'Exécutée au guichet', detail: 'Traité en caisse' })
  })

  it('marks rejection as danger', () => {
    const events = buildRefundHistoryEvents({
      status: 'REJECTED',
      createdAt: '2026-07-01T10:00:00Z',
      reviewedAt: '2026-07-01T11:00:00Z',
      reviewNotes: 'Justificatif manquant',
    })

    expect(events[1]).toMatchObject({ label: 'Rejetée par l\'admin', tone: 'danger', detail: 'Justificatif manquant' })
  })
})
