export type RefundHistorySource = {
  status: string
  createdAt: string
  reviewedAt?: string | null
  processedAt?: string | null
  reviewNotes?: string | null
  gateway?: {
    provider?: string | null
    refundRef?: string | null
    status?: string | null
  } | null
  requestedBy?: { id: number; name: string } | null
  reviewedBy?: { id: number; name: string } | null
}

export type RefundHistoryEvent = {
  key: string
  label: string
  date?: string
  actor?: string
  detail?: string
  tone: 'neutral' | 'success' | 'danger' | 'warning' | 'info'
}

export function parseRefundReviewNotes(notes?: string | null) {
  if (!notes?.trim()) {
    return { admin: null as string | null, guichet: null as string | null, gateway: null as string | null }
  }

  const parts = notes.split(/\n(?=\[(?:Gateway|Guichet)\])/)
  const admin = parts[0]?.trim() || null
  let guichet: string | null = null
  let gateway: string | null = null

  for (const part of parts.slice(1)) {
    if (part.startsWith('[Guichet]')) {
      guichet = part.replace(/^\[Guichet\]\s*/, '').trim() || null
    }
    if (part.startsWith('[Gateway]')) {
      gateway = part.replace(/^\[Gateway\]\s*/, '').trim() || null
    }
  }

  return { admin, guichet, gateway }
}

export function buildRefundHistoryEvents(refund: RefundHistorySource): RefundHistoryEvent[] {
  const events: RefundHistoryEvent[] = []
  const notes = parseRefundReviewNotes(refund.reviewNotes)

  events.push({
    key: 'created',
    label: 'Demande créée',
    date: refund.createdAt,
    actor: refund.requestedBy?.name,
    tone: 'neutral',
  })

  if (refund.reviewedAt) {
    const rejected = refund.status === 'REJECTED'
    events.push({
      key: 'review',
      label: rejected ? 'Rejetée par l\'admin' : 'Approuvée par l\'admin',
      date: refund.reviewedAt,
      actor: refund.reviewedBy?.name,
      detail: notes.admin || undefined,
      tone: rejected ? 'danger' : 'success',
    })
  }

  if (refund.processedAt) {
    events.push({
      key: 'processed',
      label: 'Exécutée au guichet',
      date: refund.processedAt,
      detail: notes.guichet || undefined,
      tone: 'info',
    })
  } else if (notes.guichet && ['PROCESSING', 'FAILED', 'PROCESSED', 'SYNCED'].includes(refund.status)) {
    events.push({
      key: 'guichet-note',
      label: 'Note guichet',
      detail: notes.guichet,
      tone: 'info',
    })
  }

  const providerLabel =
    refund.gateway?.provider === 'FLUTTERWAVE'
      ? 'Opérateur'
      : refund.gateway?.provider ?? null
  const gatewayDetail = [
    providerLabel ? `Canal : ${providerLabel}` : null,
    refund.gateway?.status ? `Statut : ${refund.gateway.status}` : null,
    refund.gateway?.refundRef ? `Réf. : ${refund.gateway.refundRef}` : null,
    notes.gateway,
  ]
    .filter(Boolean)
    .join(' · ')

  if (gatewayDetail) {
    events.push({
      key: 'gateway',
      label: refund.status === 'FAILED' ? 'Échec opérateur' : 'Opérateur',
      date: refund.processedAt ?? refund.reviewedAt ?? undefined,
      detail: gatewayDetail,
      tone: refund.status === 'FAILED' ? 'danger' : 'neutral',
    })
  }

  return events
}
