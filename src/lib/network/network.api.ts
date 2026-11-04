import { apiClient } from '@/lib/api/client'

export type NetworkCampus = {
  id: number
  name: string
  city: string | null
  isPaymentHub: boolean
}

export type NetworkCampusesResponse = {
  networkId: number
  networkName: string
  networkCode: string | null
  campuses: NetworkCampus[]
}

export type CampusRevenueBreakdown = {
  schoolId: number
  schoolName: string
  isPaymentHub: boolean
  revenueUsd: number
  collectionRate: number
  feesPaid: number
  feesBalance: number
  activeEnrollment: number
  attendanceRate: number
  presentToday: number
}

export type NetworkConsolidatedAnalytics = {
  networkId: number
  networkName: string
  networkCode: string | null
  generatedAt: string
  campuses: CampusRevenueBreakdown[]
  totals: {
    revenueUsd: number
    collectionRate: number
    activeEnrollment: number
    attendanceRate: number
  }
  cashFlowByMonth: Array<{ month: string; usd: number; cdf: number }>
  attendanceComparison: Array<{
    schoolId: number
    schoolName: string
    attendanceRate: number
    presentToday: number
    activeEnrollment: number
  }>
}

export type ClearingSettlementPosition = {
  fromSchoolId: number
  fromSchoolName: string
  toSchoolId: number
  toSchoolName: string
  grossCollected: number
  settledAmount: number
  outstanding: number
  paymentCount: number
  currency: string
  direction: 'HUB_OWES_CAMPUS'
}

export type ClearingPositionsResponse = {
  networkId: number
  networkName: string
  hubSchoolId: number | null
  hubSchoolName: string | null
  period: { from: string; to: string }
  currency: string
  positions: ClearingSettlementPosition[]
  totals: {
    grossCollected: number
    settledAmount: number
    outstanding: number
  }
  recentSettlements: Array<{
    id: number
    fromSchoolId: number
    fromSchoolName: string
    toSchoolId: number
    toSchoolName: string
    amount: number
    currency: string
    status: 'PENDING' | 'SETTLED' | 'CANCELLED'
    settledAt: string | null
    notes: string | null
    proofUrl: string | null
  }>
  summaryLabel: string
}

export type NetworkTransferRow = {
  id: number
  transferredAt: string
  studentId: number
  matricule: string
  studentName: string
  sourceSchoolId: number
  sourceSchoolName: string
  targetSchoolId: number
  targetSchoolName: string
  sourceClassId: number | null
  targetClassId: number
  reason: string | null
  authorizedById: number
  authorizedByName: string | null
  meta: unknown
}

export type NetworkCfoSummary = {
  networkId: number
  generatedAt: string
  analytics: NetworkConsolidatedAnalytics
  clearing: ClearingPositionsResponse
  treasury: {
    groupId: number | null
    groupName: string | null
    generatedAt: string
    totals: {
      collectedToday: number
      collectedMonth: number
      cashToday: number
      mobileToday: number
      sitesOpen: number
      siteCount: number
      feesPaid: number
      feesBalance: number
      collectionRate: number
    }
    sites: Array<{
      id: number
      name: string
      isPaymentHub: boolean
      cashInDrawer: number
      drawerCurrency: string
      collectedToday: number
      sessionOpen: boolean
    }>
  } | null
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const networkApi = {
  getAnalytics: (networkId?: number) =>
    apiClient
      .get<{ success: boolean; data: NetworkConsolidatedAnalytics }>('/network/analytics', {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  listCampuses: (networkId?: number) =>
    apiClient
      .get<{ success: boolean; data: NetworkCampusesResponse }>('/network/campuses', {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  listCampusClasses: (schoolId: number, networkId?: number) =>
    apiClient
      .get<{
        success: boolean
        data: {
          schoolId: number
          schoolName: string
          classes: Array<{ id: number; name: string; level?: string | null }>
        }
      }>(`/network/campuses/${schoolId}/classes`, {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  transferStudent: (
    studentId: number,
    body: {
      targetSchoolId: number
      targetClassId: number
      reason?: string
      idempotencyKey: string
    },
  ) =>
    apiClient
      .post<{
        success: boolean
        data: {
          studentId: number
          matricule: string
          sourceSchoolName: string
          targetSchoolName: string
          targetClassName: string
          transferLogId: number
          note: string
          replayed?: boolean
          feeRemap?: {
            previous: { totalFees: number; feesPaid: number; feesBalance: number }
            next: { totalFees: number; feesPaid: number; feesBalance: number }
          }
        }
        message?: string
      }>(
        `/network/students/${studentId}/transfer`,
        {
          targetSchoolId: body.targetSchoolId,
          targetClassId: body.targetClassId,
          reason: body.reason,
          idempotencyKey: body.idempotencyKey,
        },
        {
          headers: {
            'Idempotency-Key': body.idempotencyKey,
            'X-Idempotency-Key': body.idempotencyKey,
          },
        },
      )
      .then((r) => r.data),

  getClearingPositions: (params?: { from?: string; to?: string; networkId?: number }) =>
    apiClient
      .get<{ success: boolean; data: ClearingPositionsResponse }>('/network/clearing/positions', {
        params,
      })
      .then((r) => r.data.data),

  settleClearing: (body: {
    fromSchoolId: number
    toSchoolId: number
    amount: number
    currency?: string
    notes?: string
    proofUrl?: string
    periodFrom?: string
    periodTo?: string
    markSettled?: boolean
    idempotencyKey: string
  }) =>
    apiClient
      .post<{
        success: boolean
        data: {
          id: number
          status: string
          amount: number
          currency: string
          fromSchoolId: number
          toSchoolId: number
          settledAt: string | null
          replayed?: boolean
        }
      }>(
        '/network/clearing/settle',
        {
          fromSchoolId: body.fromSchoolId,
          toSchoolId: body.toSchoolId,
          amount: body.amount,
          currency: body.currency,
          notes: body.notes,
          proofUrl: body.proofUrl,
          periodFrom: body.periodFrom,
          periodTo: body.periodTo,
          markSettled: body.markSettled,
          idempotencyKey: body.idempotencyKey,
        },
        {
          headers: {
            'Idempotency-Key': body.idempotencyKey,
            'X-Idempotency-Key': body.idempotencyKey,
          },
        },
      )
      .then((r) => r.data.data),

  downloadSettlementReceipt: async (settlementId: number) => {
    const res = await apiClient.get(`/network/clearing/settlements/${settlementId}/receipt.pdf`, {
      responseType: 'blob',
    })
    downloadBlob(res.data as Blob, `bordereau-reglement-inter-sites-${settlementId}.pdf`)
  },

  listTransfers: (params?: {
    sourceSchoolId?: number
    targetSchoolId?: number
    from?: string
    to?: string
    q?: string
    take?: number
    skip?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: { items: NetworkTransferRow[]; total: number } }>(
        '/network/transfers',
        { params },
      )
      .then((r) => r.data.data),

  downloadTransferCertificate: async (transferId: number) => {
    const res = await apiClient.get(`/network/transfers/${transferId}/certificate.pdf`, {
      responseType: 'blob',
    })
    downloadBlob(res.data as Blob, `attestation-transfert-${transferId}.pdf`)
  },

  getCfoSummary: (params?: { from?: string; to?: string; networkId?: number }) =>
    apiClient
      .get<{ success: boolean; data: NetworkCfoSummary }>('/network/cfo/summary', { params })
      .then((r) => r.data.data),
}

/** Export CSV comptable (positions + totaux) — côté client. */
export function exportClearingCsv(clearing: ClearingPositionsResponse) {
  const rows = [
    ['from', 'to', 'gross', 'settled', 'outstanding', 'currency', 'payments'].join(';'),
    ...clearing.positions.map((p) =>
      [
        p.fromSchoolName,
        p.toSchoolName,
        p.grossCollected,
        p.settledAmount,
        p.outstanding,
        p.currency,
        p.paymentCount,
      ].join(';'),
    ),
    '',
    ['TOTAL_GROSS', clearing.totals.grossCollected].join(';'),
    ['TOTAL_SETTLED', clearing.totals.settledAmount].join(';'),
    ['TOTAL_OUTSTANDING', clearing.totals.outstanding].join(';'),
  ]
  const blob = new Blob([rows.join('\n')], { type: 'text/csv;charset=utf-8' })
  downloadBlob(blob, `clearing-reseau-${clearing.networkId}.csv`)
}
