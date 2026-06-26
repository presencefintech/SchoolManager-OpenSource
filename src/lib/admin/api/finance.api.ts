import { apiClient } from '@/lib/api/client'
import type { FinanceKpi, PendingPayment, FinanceFraudAlert, AuditLogEntry, TopPayer, ManualPaymentPayload, MobilePendingItem, Moratorium, CreateMoratoriumPayload, BulkMoratoriumPayload, FeeStructurePayload, LinkOrphanPayload, AdvancedSearchParams } from '@/types/admin'

function asItemList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: T[] }).items
  }
  return []
}

function normalizePendingPayment(row: Record<string, unknown>): PendingPayment {
  const payment = (row.payment ?? {}) as Record<string, unknown>
  const student = (row.student ?? {}) as Record<string, unknown>
  const studentName =
    (student.name as string | undefined)
    ?? (row.studentName as string | undefined)
    ?? ([student.firstName, student.lastName].filter(Boolean).join(' ').trim() || '—')

  return {
    verificationId: Number(row.verificationId ?? row.id),
    id: Number(row.paymentId ?? payment.id ?? row.id),
    studentName,
    amount: Number(payment.amount ?? row.amount ?? 0),
    method: String(payment.method ?? row.method ?? ''),
    status: String(row.status ?? payment.status ?? 'PENDING'),
    createdAt: String(payment.createdAt ?? row.queuedAt ?? row.createdAt ?? ''),
    studentId: student.id != null ? Number(student.id) : undefined,
    reference: (payment.reference ?? row.reference ?? payment.providerRef) as string | undefined,
  }
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
      .then((r) => asItemList<Record<string, unknown>>(r.data.data).map(normalizePendingPayment)),

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

  setupFeeStructure: (payload: FeeStructurePayload) =>
    apiClient.post('/admin/finance/fee-structure', payload).then(r => r.data.data),

  bulkApplyFees: (feeStructureId: number, payload: { studentIds?: number[] }) =>
    apiClient.post(`/admin/finance/fee-structure/${feeStructureId}/apply-bulk`, payload).then(r => r.data.data),

  deleteFeeStructure: (feeId: number) =>
    apiClient.delete(`/admin/finance/fee-structure/${feeId}`).then(r => r.data),

  syncBalance: (enrollmentId: number) =>
    apiClient.post(`/admin/finance/enrollments/${enrollmentId}/sync-balance`).then(r => r.data.data),

  // ── Moratoires ─────────────────────────────────────────────────────────────
  getMoratoriumRecoveryRate: () =>
    apiClient.get('/admin/finance/moratoriums/recovery-rate').then(r => r.data.data),

  listMoratoriums: (params?: { studentId?: number; status?: string }) =>
    apiClient.get('/admin/finance/moratoriums', { params }).then(r => (r.data.data ?? []) as Moratorium[]),

  getMoratorium: (id: number) =>
    apiClient.get(`/admin/finance/moratoriums/${id}`).then(r => r.data.data as Moratorium),

  createMoratorium: (payload: CreateMoratoriumPayload) =>
    apiClient.post('/admin/finance/moratoriums', payload).then(r => r.data.data as Moratorium),

  createBulkMoratoriums: (payload: BulkMoratoriumPayload) =>
    apiClient.post('/admin/finance/moratoriums/bulk', payload).then(r => r.data.data),

  updateMoratorium: (id: number, payload: Partial<CreateMoratoriumPayload>) =>
    apiClient.patch(`/admin/finance/moratoriums/${id}`, payload).then(r => r.data.data as Moratorium),

  revokeMoratorium: (id: number) =>
    apiClient.delete(`/admin/finance/moratoriums/${id}`).then(r => r.data),
}
