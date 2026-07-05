import { apiClient } from '@/lib/api/client'
import axios from 'axios'
import {
  normalizePendingVerification,
  normalizePaymentProfile,
  normalizeSessionEnrollment,
  normalizeStudentListItem,
  normalizeMoratorium,
  normalizeMoratoriumRecoveryRate,
} from '@/lib/admin/normalizers'
import {
  mapEnterpriseDashboardToKpi,
  normalizeFraudAlertsResponse,
  normalizeCollectionEfficiencyLevels,
  normalizeEndOfDayClosing,
  normalizePaymentMethodsBreakdown,
  normalizeFeeTypesBreakdown,
  normalizeIntegrityScan,
} from '@/lib/admin/finance-dashboard.utils'
import type {
  FinanceKpi, PendingVerificationItem, FinanceFraudAlert, AuditLogEntry, TopPayer,
  ManualPaymentPayload, MobilePendingItem, Moratorium, CreateMoratoriumPayload,
  BulkMoratoriumPayload, FeeStructurePayload, LinkOrphanPayload, AdvancedSearchParams,
  PaymentProfile, UpsertPaymentProfilePayload, SessionEnrollment, MoratoriumPolicy,
  MoratoriumRecoveryRate, AdminRefundRequest, ConfirmPaymentProofPayload,
  UpdateMoratoriumPolicyPayload,
  FinancialSealBatch, FinancialSealBatchListResponse, CreateSealBatchPayload, CreateSealBatchResult,
  FinancialSealBatchDetail, FinancialSealBatchVerifyResult,
} from '@/types/admin'
import { parseContentDispositionFilename, isExportContentType, readBlobErrorMessage } from '@/lib/download-blob'

function asItemList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  return []
}

function normalizeMobilePending(row: Record<string, unknown>): MobilePendingItem {
  const student = row.student as Record<string, unknown> | undefined
  const studentName = student
    ? [student.firstName, student.lastName].filter(Boolean).join(' ').trim() || '—'
    : (row.studentName as string | undefined) ?? '—'

  return {
    id: Number(row.id),
    studentName,
    amount: Number(row.amount ?? 0),
    method: String(row.method ?? row.operator ?? ''),
    phone: (row.payerPhone ?? row.phone) as string | undefined,
    operator: String(row.method ?? row.operator ?? 'MOBILE'),
    reference: (row.reference ?? row.providerRef) as string | undefined,
    createdAt: String(row.createdAt ?? ''),
  }
}

function normalizeSealBatch(raw: unknown): FinancialSealBatch | null {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  const sealedBy = row.sealedBy as Record<string, unknown> | null | undefined
  return {
    id: Number(row.id),
    batchReference: String(row.batchReference ?? ''),
    status: String(row.status ?? 'SEALED') as FinancialSealBatch['status'],
    paymentCount: Number(row.paymentCount ?? 0),
    linkedPaymentCount: row.linkedPaymentCount != null ? Number(row.linkedPaymentCount) : undefined,
    totalAmount: Number(row.totalAmount ?? 0),
    currency: String(row.currency ?? 'USD'),
    sealHmac: row.sealHmac as string | null | undefined,
    sealedAt: row.sealedAt as string | null | undefined,
    sealedBy: sealedBy
      ? { id: Number(sealedBy.id), name: String(sealedBy.name ?? '') }
      : null,
    createdAt: String(row.createdAt ?? ''),
  }
}

function normalizeSealBatchList(raw: unknown): FinancialSealBatchListResponse {
  if (!raw || typeof raw !== 'object') {
    return { items: [], total: 0, page: 1, limit: 20 }
  }
  const row = raw as Record<string, unknown>
  const items = Array.isArray(row.items) ? row.items : []
  return {
    items: items.map(normalizeSealBatch).filter((item): item is FinancialSealBatch => item != null),
    total: Number(row.total ?? items.length),
    page: Number(row.page ?? 1),
    limit: Number(row.limit ?? 20),
  }
}

function normalizeCreateSealBatchResult(raw: unknown): CreateSealBatchResult {
  const batch = normalizeSealBatch(raw)
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  return {
    id: batch?.id ?? Number(row.id ?? 0),
    batchReference: batch?.batchReference ?? String(row.batchReference ?? ''),
    status: (batch?.status ?? row.status ?? 'SEALED') as CreateSealBatchResult['status'],
    paymentCount: batch?.paymentCount ?? Number(row.paymentCount ?? 0),
    totalAmount: batch?.totalAmount ?? Number(row.totalAmount ?? 0),
    currency: batch?.currency ?? String(row.currency ?? 'USD'),
    sealHmac: String(row.sealHmac ?? batch?.sealHmac ?? ''),
    sealedAt: String(row.sealedAt ?? batch?.sealedAt ?? new Date().toISOString()),
    paymentIds: Array.isArray(row.paymentIds) ? row.paymentIds.map(Number) : [],
  }
}

function normalizeSealBatchPaymentLine(raw: unknown) {
  if (!raw || typeof raw !== 'object') return null
  const row = raw as Record<string, unknown>
  return {
    id: Number(row.id),
    amount: Number(row.amount ?? 0),
    currency: String(row.currency ?? 'USD'),
    method: String(row.method ?? ''),
    reference: String(row.reference ?? ''),
    status: String(row.status ?? ''),
    confirmedAt: row.confirmedAt as string | null | undefined,
    studentId: Number(row.studentId ?? 0),
    studentName: String(row.studentName ?? '—'),
    studentMatricule: row.studentMatricule as string | null | undefined,
  }
}

function normalizeSealBatchDetail(raw: unknown): FinancialSealBatchDetail | null {
  const batch = normalizeSealBatch(raw)
  if (!batch) return null
  const row = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const payments = Array.isArray(row.payments) ? row.payments : []
  return {
    ...batch,
    payments: payments
      .map(normalizeSealBatchPaymentLine)
      .filter((line): line is NonNullable<ReturnType<typeof normalizeSealBatchPaymentLine>> => line != null),
    paymentIds: Array.isArray(row.paymentIds) ? row.paymentIds.map(Number) : [],
    metadata: (row.metadata as Record<string, unknown> | null | undefined) ?? null,
  }
}

export const financeApi = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getStrategicDashboard: () =>
    apiClient
      .get('/admin/finance/dashboard/strategic')
      .then((r) => mapEnterpriseDashboardToKpi(r.data.data)),


  getDetailedReport: () =>
    apiClient.get('/admin/finance/reports/detailed').then(r => r.data.data),

  getHealthCheck: () =>
    apiClient.get('/admin/finance/analytics/health-check').then(r => r.data.data),

  getTopPayers: () =>
    apiClient.get('/admin/finance/analytics/top-payers').then(r => (r.data.data ?? []) as TopPayer[]),

  getInsights: () =>
    apiClient.get('/admin/finance/dashboard/insights').then(r => r.data.data),

  getComparativeDashboard: () =>
    apiClient
      .get('/admin/finance/dashboard/comparative')
      .then((r) => normalizeCollectionEfficiencyLevels(r.data.data)),

  getEfficiency: () =>
    apiClient
      .get('/admin/finance/dashboard/efficiency')
      .then((r) => normalizeCollectionEfficiencyLevels(r.data.data)),

  getEndOfDay: () =>
    apiClient
      .get('/admin/finance/closing/end-of-day')
      .then((r) => normalizeEndOfDayClosing(r.data.data)),

  getPaymentMethods: (period: 'day' | 'month' = 'month') =>
    apiClient
      .get('/admin/finance/dashboard/payment-methods', { params: { period } })
      .then((r) => normalizePaymentMethodsBreakdown(r.data.data)),

  getFeeTypes: (period: 'day' | 'month' = 'month') =>
    apiClient
      .get('/admin/finance/dashboard/fee-types', { params: { period } })
      .then((r) => normalizeFeeTypesBreakdown(r.data.data)),

  // ── Audit & Fraude ─────────────────────────────────────────────────────────
  getFraudAlerts: () =>
    apiClient
      .get('/admin/finance/audit/fraud-alerts')
      .then((r) => normalizeFraudAlertsResponse(r.data.data)),

  getAuditLogs: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/finance/audit/logs', { params }).then(r => (r.data.data ?? []) as AuditLogEntry[]),

  checkIntegrity: () =>
    apiClient
      .get('/admin/finance/audit/integrity-scan')
      .then((r) => normalizeIntegrityScan(r.data.data)),

  getRiskProfiles: () =>
    apiClient.get('/admin/finance/audit/risk-profiles').then(r => r.data.data),

  getDuplicates: () =>
    apiClient.get('/admin/finance/audit/duplicates').then(r => (r.data.data ?? []) as unknown[]),

  triggerManualAudit: () =>
    apiClient.post('/admin/finance/audit/trigger-manual').then(r => r.data.data),

  getPresenceSecurity: () =>
    apiClient.get('/admin/finance/audit/presence-security').then(r => r.data.data),

  fraudRiskAnalysis: (payload: Record<string, unknown>) =>
    apiClient.post('/admin/finance/audit/fraud-risk-analysis', payload).then(r => r.data.data),

  getCashierAudit: (cashierId: number) =>
    apiClient.get(`/admin/finance/audit/cashier/${cashierId}`).then(r => r.data.data),

  getLedger: () =>
    apiClient.get('/admin/finance/audit/ledger').then(r => r.data.data),

  // ── Paiements ──────────────────────────────────────────────────────────────
  getPendingVerifications: () =>
    apiClient
      .get('/admin/finance/payments/pending-verifications')
      .then((r) => asItemList<Record<string, unknown>>(r.data.data).map(normalizePendingVerification)),

  getMobilePending: () =>
    apiClient
      .get('/admin/finance/payments/mobile/pending')
      .then((r) => asItemList<Record<string, unknown>>(r.data.data).map(normalizeMobilePending)),

  processManualPayment: (payload: ManualPaymentPayload) =>
    apiClient.post('/admin/finance/payments/manual', payload).then(r => r.data.data),

  verifyPaymentStep: (payload: { verificationId: number; action: 'ADMIN' | 'FINANCE' | 'REJECT'; notes?: string }) =>
    apiClient.post('/admin/finance/payments/verify-step', payload).then(r => r.data.data),

  confirmBankTransaction: (paymentId: number, proof?: ConfirmPaymentProofPayload) =>
    apiClient.post(`/admin/finance/payments/bank-confirm/${paymentId}`, proof ?? {}).then(r => r.data.data),

  confirmMobileTransaction: (paymentId: number, proof?: ConfirmPaymentProofPayload) =>
    apiClient.post(`/admin/finance/payments/mobile-confirm/${paymentId}`, proof ?? {}).then(r => r.data.data),

  resendReceipt: (paymentId: number) =>
    apiClient.post(`/admin/finance/payments/${paymentId}/resend-receipt`).then(r => r.data.data),

  linkOrphanTransaction: (payload: { transactionRef: string; studentId: number }) =>
    apiClient.post('/admin/finance/payments/link-orphan', payload).then(r => r.data.data),

  advancedSearch: (params: Record<string, string | number | undefined>) =>
    apiClient.get('/admin/finance/transactions/advanced-search', { params }).then(r => r.data.data),

  // ── Factures & Frais ───────────────────────────────────────────────────────
  getStudentInvoices: (studentId: number) =>
    apiClient.get(`/admin/finance/invoices/student/${studentId}`).then(r => (r.data.data ?? []) as unknown[]),

  generateInvoice: (payload: { studentId: number; feeStructureId: number; dueDate?: string }) =>
    apiClient.post('/admin/finance/invoices/generate', payload).then(r => r.data.data),

  applyDiscount: (payload: { invoiceId: number; discountAmount: number; reason?: string }) =>
    apiClient.post('/admin/finance/invoices/apply-discount', payload).then(r => r.data.data),

  listFeeStructures: (params?: { classId?: number; sessionId?: number }) =>
    apiClient.get('/admin/finance/fee-structures', { params }).then(r => r.data.data as { id: number; label: string; amount: number; description?: string }[]),

  setupFeeStructure: (payload: FeeStructurePayload) =>
    apiClient.post('/admin/finance/fee-structure', payload).then(r => r.data.data),

  bulkApplyFees: (feeStructureId: number, payload: { studentIds?: number[] }) =>
    apiClient.post(`/admin/finance/fee-structure/${feeStructureId}/apply-bulk`, payload).then(r => r.data.data),

  deleteFeeStructure: (feeId: number) =>
    apiClient.delete(`/admin/finance/fee-structure/${feeId}`).then(r => r.data),

  syncBalance: (enrollmentId: number) =>
    apiClient.post(`/admin/finance/enrollments/${enrollmentId}/sync-balance`)
      .then((r) => normalizeSessionEnrollment(r.data.data as Record<string, unknown>)),

  getPaymentProfile: () =>
    apiClient.get('/admin/finance/payment-profile')
      .then((r) => normalizePaymentProfile((r.data.data ?? {}) as Record<string, unknown>)),

  upsertPaymentProfile: (payload: UpsertPaymentProfilePayload) =>
    apiClient.put('/admin/finance/payment-profile', payload)
      .then((r) => normalizePaymentProfile((r.data.data ?? {}) as Record<string, unknown>)),

  markVerificationProcessed: (verificationId: number, notes?: string) =>
    apiClient.post(`/admin/finance/payments/verifications/${verificationId}/mark-processed`, { notes })
      .then((r) => r.data.data),

  exportPendingVerifications: async (format: 'csv' | 'json' = 'csv') => {
    const res = await apiClient.get('/admin/finance/payments/pending-verifications/export', {
      params: { format },
      responseType: format === 'csv' ? 'blob' : 'json',
    })
    return res.data
  },

  // ── Moratoires ─────────────────────────────────────────────────────────────
  getMoratoriumPolicy: () =>
    apiClient.get('/admin/finance/moratoriums/policy').then(r => r.data.data as MoratoriumPolicy),

  updateMoratoriumPolicy: (payload: UpdateMoratoriumPolicyPayload) =>
    apiClient.patch('/admin/finance/moratoriums/policy', payload).then(r => r.data.data as MoratoriumPolicy),

  getMoratoriumRecoveryRate: () =>
    apiClient.get('/admin/finance/moratoriums/recovery-rate').then(r =>
      normalizeMoratoriumRecoveryRate(r.data.data as Record<string, unknown>),
    ),

  listMoratoriums: (params?: { studentId?: number; status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/finance/moratoriums', { params }).then(r =>
      asItemList<Record<string, unknown>>(r.data.data).map(normalizeMoratorium),
    ),

  getMoratorium: (id: number) =>
    apiClient.get(`/admin/finance/moratoriums/${id}`).then(r =>
      normalizeMoratorium(r.data.data as Record<string, unknown>),
    ),

  createMoratorium: (payload: CreateMoratoriumPayload) =>
    apiClient.post('/admin/finance/moratoriums', payload).then(r =>
      normalizeMoratorium(r.data.data as Record<string, unknown>),
    ),

  createBulkMoratoriums: (payload: BulkMoratoriumPayload) =>
    apiClient.post('/admin/finance/moratoriums/bulk', payload).then(r => r.data.data),

  updateMoratorium: (id: number, payload: Partial<CreateMoratoriumPayload>) =>
    apiClient.patch(`/admin/finance/moratoriums/${id}`, payload).then(r => r.data.data as Moratorium),

  revokeMoratorium: (id: number) =>
    apiClient.delete(`/admin/finance/moratoriums/${id}`).then(r => r.data),

  approveMoratorium: (id: number, payload?: { internalNote?: string }) =>
    apiClient.post(`/admin/finance/moratoriums/${id}/approve`, payload ?? {}).then(r =>
      normalizeMoratorium(r.data.data as Record<string, unknown>),
    ),

  rejectMoratorium: (id: number, reason?: string) =>
    apiClient.post(`/admin/finance/moratoriums/${id}/reject`, { reason }).then(r =>
      normalizeMoratorium(r.data.data as Record<string, unknown>),
    ),

  listRefundRequests: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/admin/finance/refunds', { params }).then(r => r.data.data as { items: AdminRefundRequest[]; total: number; page: number; limit: number }),

  getRefundRequest: (id: number) =>
    apiClient.get(`/admin/finance/refunds/${id}`).then(r => r.data.data as AdminRefundRequest),

  reviewRefund: (id: number, payload: { action: 'approve' | 'reject'; reviewNotes?: string }) =>
    apiClient.post(`/admin/finance/refunds/${id}/review`, payload).then(r => r.data.data),

  listSealBatches: (params?: {
    status?: string
    page?: number
    limit?: number
    fromDate?: string
    toDate?: string
  }) =>
    apiClient
      .get('/admin/finance/seal-batches', { params })
      .then((r) => normalizeSealBatchList(r.data.data)),

  getSealBatch: (batchId: number) =>
    apiClient
      .get(`/admin/finance/seal-batches/${batchId}`)
      .then((r) => normalizeSealBatchDetail(r.data.data)),

  verifySealBatch: (batchId: number) =>
    apiClient
      .get(`/admin/finance/seal-batches/${batchId}/verify`)
      .then((r) => r.data.data as FinancialSealBatchVerifyResult),

  exportSealBatchPdf: async (batchId: number) => {
    try {
      const res = await apiClient.get<Blob>(`/admin/finance/seal-batches/${batchId}/export`, {
        responseType: 'blob',
        timeout: 90_000,
      })
      const contentType = res.headers['content-type'] as string | undefined
      if (!isExportContentType(contentType, 'pdf')) {
        throw new Error(await readBlobErrorMessage(res.data))
      }
      const filename = parseContentDispositionFilename(
        res.headers['content-disposition'] as string | undefined,
        `seal-batch-${batchId}.pdf`,
      )
      return { blob: res.data, filename }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        throw new Error(await readBlobErrorMessage(error.response.data))
      }
      throw error
    }
  },

  createSealBatch: (payload: CreateSealBatchPayload) =>
    apiClient
      .post('/admin/finance/seal-batches', payload)
      .then((r) => normalizeCreateSealBatchResult(r.data.data)),
}
