import { apiClient } from '@/lib/api/client'
import {
  normalizePendingVerification,
  normalizePaymentProfile,
  normalizeSessionEnrollment,
  normalizeStudentListItem,
  normalizeMoratorium,
  normalizeMoratoriumRecoveryRate,
} from '@/lib/admin/normalizers'
import type {
  FinanceKpi, PendingVerificationItem, FinanceFraudAlert, AuditLogEntry, TopPayer,
  ManualPaymentPayload, MobilePendingItem, Moratorium, CreateMoratoriumPayload,
  BulkMoratoriumPayload, FeeStructurePayload, LinkOrphanPayload, AdvancedSearchParams,
  PaymentProfile, UpsertPaymentProfilePayload, SessionEnrollment, MoratoriumPolicy,
  MoratoriumRecoveryRate,
} from '@/types/admin'

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

export const financeApi = {
  // ── Dashboard ──────────────────────────────────────────────────────────────
  getStrategicDashboard: () =>
    apiClient.get('/admin/finance/dashboard/strategic').then(r => r.data.data as FinanceKpi & Record<string, unknown>),

  getDetailedReport: () =>
    apiClient.get('/admin/finance/reports/detailed').then(r => r.data.data),

  getHealthCheck: () =>
    apiClient.get('/admin/finance/analytics/health-check').then(r => r.data.data),

  getTopPayers: () =>
    apiClient.get('/admin/finance/analytics/top-payers').then(r => (r.data.data ?? []) as TopPayer[]),

  getInsights: () =>
    apiClient.get('/admin/finance/dashboard/insights').then(r => r.data.data),

  getComparativeDashboard: () =>
    apiClient.get('/admin/finance/dashboard/comparative').then(r => r.data.data),

  getEfficiency: () =>
    apiClient.get('/admin/finance/dashboard/efficiency').then(r => r.data.data),

  getEndOfDay: () =>
    apiClient.get('/admin/finance/closing/end-of-day').then(r => r.data.data),

  // ── Audit & Fraude ─────────────────────────────────────────────────────────
  getFraudAlerts: () =>
    apiClient.get('/admin/finance/audit/fraud-alerts').then(r => (r.data.data ?? []) as FinanceFraudAlert[]),

  getAuditLogs: (params?: { page?: number; limit?: number }) =>
    apiClient.get('/admin/finance/audit/logs', { params }).then(r => (r.data.data ?? []) as AuditLogEntry[]),

  checkIntegrity: () =>
    apiClient.get('/admin/finance/audit/integrity-scan').then(r => r.data.data),

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

  confirmBankTransaction: (paymentId: number) =>
    apiClient.post(`/admin/finance/payments/bank-confirm/${paymentId}`).then(r => r.data.data),

  confirmMobileTransaction: (paymentId: number) =>
    apiClient.post(`/admin/finance/payments/mobile-confirm/${paymentId}`).then(r => r.data.data),

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

  getMoratoriumRecoveryRate: () =>
    apiClient.get('/admin/finance/moratoriums/recovery-rate').then(r =>
      normalizeMoratoriumRecoveryRate(r.data.data as Record<string, unknown>),
    ),

  listMoratoriums: (params?: { studentId?: number; status?: string }) =>
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

  approveMoratorium: (id: number) =>
    apiClient.post(`/admin/finance/moratoriums/${id}/approve`).then(r => r.data.data),

  rejectMoratorium: (id: number, reason?: string) =>
    apiClient.post(`/admin/finance/moratoriums/${id}/reject`, { reason }).then(r => r.data.data),

  reviewRefund: (id: number, payload: { action: 'APPROVE' | 'REJECT'; notes?: string }) =>
    apiClient.post(`/admin/finance/refunds/${id}/review`, payload).then(r => r.data.data),
}
