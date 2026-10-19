import { apiClient } from '@/lib/api/client'
import axios from 'axios'
import { idempotencyHeaders, newIdempotencyKey } from '@/lib/idempotency'
import {
  normalizePendingVerification,
  normalizePaymentProfile,
  normalizePaymentOnboarding,
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
  normalizeFinanceHealth,
  normalizeDetailedReport,
} from '@/lib/admin/finance-dashboard.utils'
import { normalizeFinanceAiInsights } from '@/lib/admin/finance-ai.utils'
import type {
  FinanceKpi, PendingVerificationItem, FinanceFraudAlert, AuditLogEntry, TopPayer,
  ManualPaymentPayload, MobilePendingItem, Moratorium, CreateMoratoriumPayload,
  BulkMoratoriumPayload, FeeStructurePayload, CreateFeeStructurePayload, UpdateFeeStructurePayload,
  CreateFeeCategoryPayload, UpdateFeeCategoryPayload, FeeCategoryItem, LinkOrphanPayload, AdvancedSearchParams,
  UpsertFeeCatalogV2Payload, FeeCatalogV2, AssignStudentCategoryPayload, AssignStudentCategoryResult,
  ApplyObligationManualDiscountPayload, ApplyObligationManualDiscountResult,
  BulkApplyFeeStructurePayload, BulkApplyFeeStructureResult,
  PaymentProfile, UpsertPaymentProfilePayload, SessionEnrollment, MoratoriumPolicy,
  PaymentOnboardingChecklist,
  MoratoriumRecoveryRate, AdminRefundRequest, ConfirmPaymentProofPayload,
  UpdateMoratoriumPolicyPayload,
  FinancialSealBatch, FinancialSealBatchListResponse, CreateSealBatchPayload, CreateSealBatchResult,
  FinancialSealBatchDetail, FinancialSealBatchVerifyResult,
  AdvancedSearchResult, AdvancedSearchPaymentItem,
} from '@/types/admin'
import { parseContentDispositionFilename, isExportContentType, readBlobErrorMessage } from '@/lib/download-blob'
import { asFeeStructureList, normalizeFeeStructureListItem, type FeeStructureListItem } from '@/lib/finance/fee-structure.utils'
import { asStudentPaymentsDetailedPage } from '@/lib/finance/payment-history.utils'
import { formatRdcFullName, type StudentIdentityFields } from '@/lib/utils/student-name.util'
import type { ClassYearFeeDashboard } from '@/types/finance'

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
    ? formatRdcFullName(student as StudentIdentityFields) || '—'
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

function resolvePaymentStudentName(row: Record<string, unknown>): string {
  if (typeof row.studentName === 'string' && row.studentName.trim()) {
    return row.studentName.trim()
  }
  const student = row.student as Record<string, unknown> | undefined
  if (student) {
    const formatted = formatRdcFullName(student as StudentIdentityFields)
    if (formatted) return formatted
    if (student.id != null) return `Élève #${student.id}`
  }
  if (row.studentId != null) return `Élève #${row.studentId}`
  return '—'
}

function normalizeAdvancedSearchPayment(row: Record<string, unknown>): AdvancedSearchPaymentItem {
  const student = row.student as Record<string, unknown> | undefined
  const classObj = student?.class as Record<string, unknown> | undefined
  const sectionObj = classObj?.section as Record<string, unknown> | undefined
  const optionObj = classObj?.option as Record<string, unknown> | undefined
  const feeLabels = Array.isArray(row.feeLabels)
    ? (row.feeLabels as unknown[]).map(String)
    : undefined
  return {
    id: Number(row.id),
    studentId: row.studentId != null ? Number(row.studentId) : undefined,
    studentName: resolvePaymentStudentName(row),
    matricule:
      (row.matricule as string | null | undefined) ??
      (student?.matricule as string | null | undefined) ??
      null,
    className:
      (row.className as string | null | undefined) ??
      (classObj?.name as string | null | undefined) ??
      null,
    sectionName:
      (row.sectionName as string | null | undefined) ??
      (sectionObj?.name as string | null | undefined) ??
      null,
    optionName:
      (row.optionName as string | null | undefined) ??
      (optionObj?.name as string | null | undefined) ??
      null,
    cashierName: (row.cashierName as string | null | undefined) ?? null,
    feeLabels,
    amount: Number(row.amount ?? 0),
    currency: row.currency != null ? String(row.currency) : undefined,
    method: String(row.method ?? ''),
    status: String(row.status ?? ''),
    reference: (row.reference as string | null | undefined) ?? null,
    receiptNumber: (row.receiptNumber as string | null | undefined) ?? null,
    phone: (row.phone as string | null | undefined) ?? null,
    isFlagged: Boolean(row.isFlagged),
    createdAt: String(row.createdAt ?? ''),
  }
}

function normalizeAdvancedSearchResult(raw: unknown): AdvancedSearchResult {
  if (Array.isArray(raw)) {
    return {
      data: raw.map((row) => normalizeAdvancedSearchPayment((row ?? {}) as Record<string, unknown>)),
      total: raw.length,
      page: 1,
      lastPage: 1,
      totalAmount: raw.reduce((acc, row) => acc + Number((row as Record<string, unknown>)?.amount ?? 0), 0),
    }
  }
  const payload = (raw ?? {}) as Record<string, unknown>
  const rows = Array.isArray(payload.data) ? payload.data : []
  return {
    data: rows.map((row) => normalizeAdvancedSearchPayment((row ?? {}) as Record<string, unknown>)),
    total: Number(payload.total ?? rows.length),
    page: Number(payload.page ?? 1),
    lastPage: Number(payload.lastPage ?? 1),
    totalAmount: payload.totalAmount != null ? Number(payload.totalAmount) : undefined,
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

  getClassYearFees: (params?: { sessionId?: number; classId?: number }) =>
    apiClient
      .get('/admin/finance/dashboard/class-year-fees', { params })
      .then((r) => r.data.data as ClassYearFeeDashboard),


  getDetailedReport: () =>
    apiClient
      .get('/admin/finance/reports/detailed')
      .then((r) => normalizeDetailedReport(r.data.data)),

  getHealthCheck: () =>
    apiClient
      .get('/admin/finance/analytics/health-check')
      .then((r) => normalizeFinanceHealth(r.data.data)),

  getAiInsights: (horizonDays: 7 | 30 | 90 = 30) =>
    apiClient
      .get('/admin/finance/ai/insights', { params: { horizonDays } })
      .then((r) => {
        const normalized = normalizeFinanceAiInsights(r.data?.data ?? r.data)
        if (!normalized) {
          throw new Error('Réponse intelligence financière invalide')
        }
        return normalized
      }),

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

  advancedSearch: (params: Record<string, string | number | boolean | undefined>) =>
    apiClient
      .get('/admin/finance/transactions/advanced-search', { params })
      .then((r) => normalizeAdvancedSearchResult(r.data.data)),

  // ── Factures & Frais ───────────────────────────────────────────────────────
  getStudentInvoices: (studentId: number) =>
    apiClient.get(`/admin/finance/invoices/student/${studentId}`).then(r => (r.data.data ?? []) as unknown[]),

  getStudentPaymentsDetailed: (studentId: number, params?: {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
  }) =>
    apiClient
      .get(`/admin/finance/students/${studentId}/payments/details`, { params })
      .then((r) => asStudentPaymentsDetailedPage(r.data?.data ?? r.data)),

  getStudentFeeSchedule: (studentId: number, sessionId?: number) =>
    apiClient
      .get(`/admin/finance/students/${studentId}/fee-schedule`, {
        params: sessionId ? { sessionId } : undefined,
      })
      .then(r => r.data.data as import('@/types/finance').StudentFeeScheduleDto),

  listStudentFeeAssignments: (
    studentId: number,
    params?: { sessionId?: number; includeRevoked?: boolean },
  ) =>
    apiClient
      .get(`/admin/finance/students/${studentId}/fee-assignments`, { params })
      .then(r => (r.data.data ?? []) as import('@/types/finance').StudentFeeAssignmentDto[]),

  createStudentFeeAssignment: (
    studentId: number,
    payload: import('@/types/finance').CreateStudentFeeAssignmentPayload,
    options?: { idempotencyKey?: string },
  ) => {
    const key = options?.idempotencyKey?.trim() || newIdempotencyKey('fee-assign')
    return apiClient
      .post(`/admin/finance/students/${studentId}/fee-assignments`, payload, {
        headers: idempotencyHeaders(key),
      })
      .then((r) => r.data.data as import('@/types/finance').StudentFeeAssignmentDto)
  },

  updateStudentFeeAssignment: (
    studentId: number,
    assignmentId: number,
    payload: import('@/types/finance').UpdateStudentFeeAssignmentPayload,
    options?: { idempotencyKey?: string },
  ) => {
    const key = options?.idempotencyKey?.trim() || newIdempotencyKey('fee-assign-upd')
    return apiClient
      .patch(`/admin/finance/students/${studentId}/fee-assignments/${assignmentId}`, payload, {
        headers: idempotencyHeaders(key),
      })
      .then((r) => r.data.data as import('@/types/finance').StudentFeeAssignmentDto)
  },

  revokeStudentFeeAssignment: (
    studentId: number,
    assignmentId: number,
    options?: { idempotencyKey?: string },
  ) => {
    const key = options?.idempotencyKey?.trim() || newIdempotencyKey('fee-assign-rev')
    return apiClient
      .post(`/admin/finance/students/${studentId}/fee-assignments/${assignmentId}/revoke`, null, {
        headers: idempotencyHeaders(key),
      })
      .then((r) => r.data.data as import('@/types/finance').StudentFeeAssignmentDto)
  },

  getStudentFeePeriodStatus: (studentId: number, feeStructureId: number) =>
    apiClient
      .get(`/admin/finance/students/${studentId}/fee-periods`, { params: { feeStructureId } })
      .then(r => r.data.data as import('@/types/finance').StudentFeePeriodStatusDto),

  generateInvoice: (payload: { studentId: number; feeStructureId: number; dueDate?: string }) =>
    apiClient.post('/admin/finance/invoices/generate', payload).then(r => r.data.data),

  applyDiscount: (payload: { invoiceId: number; discountAmount: number; reason?: string }) =>
    apiClient.post('/admin/finance/invoices/apply-discount', payload).then(r => r.data.data),

  listFeeStructures: (params?: { classId?: number; sessionId?: number; isActive?: boolean }) =>
    apiClient
      .get('/admin/finance/fee-structures', { params })
      .then((r) => asFeeStructureList(r.data.data) as FeeStructureListItem[]),

  getFeeStructureById: (feeId: number) =>
    apiClient
      .get(`/admin/finance/fee-structures/${feeId}`)
      .then((r) => normalizeFeeStructureListItem(r.data.data) as FeeStructureListItem | null),

  listFeeCategories: (params?: { isActive?: boolean; billingPeriod?: string }) =>
    apiClient
      .get('/admin/finance/fee-categories', { params: { limit: 100, ...params } })
      .then((r) => asItemList<FeeCategoryItem>(r.data.data)),

  createFeeCategory: (payload: CreateFeeCategoryPayload) =>
    apiClient.post('/admin/finance/fee-categories', payload).then((r) => r.data.data as FeeCategoryItem),

  updateFeeCategory: (categoryId: number, payload: UpdateFeeCategoryPayload) =>
    apiClient
      .patch(`/admin/finance/fee-categories/${categoryId}`, payload)
      .then((r) => r.data.data as FeeCategoryItem),

  softDeleteFeeCategory: (categoryId: number) =>
    apiClient.delete(`/admin/finance/fee-categories/${categoryId}`).then((r) => r.data),

  createFeeStructure: (payload: CreateFeeStructurePayload) =>
    apiClient.post('/admin/finance/fee-structures', payload).then((r) => r.data.data),

  previewFeeStructure: (payload: CreateFeeStructurePayload) =>
    apiClient
      .post('/admin/finance/fee-structures/preview', payload)
      .then((r) => r.data.data as import('@/types/admin').FeeStructurePreviewDto),

  updateFeeStructure: (feeId: number, payload: UpdateFeeStructurePayload) =>
    apiClient
      .patch(`/admin/finance/fee-structures/${feeId}`, payload)
      .then((r) => r.data.data),

  cloneFeeCatalog: (payload: {
    sourceSessionId: number
    targetSessionId: number
    targetSchoolId?: number
    overwriteExisting?: boolean
  }) =>
    apiClient
      .post('/admin/finance/fee-structures/clone-catalog', payload)
      .then((r) => r.data.data as {
        categoriesCloned: number
        structuresCloned: number
        targetSchoolId: number
      }),

  softDeleteFeeStructure: (feeId: number) =>
    apiClient.delete(`/admin/finance/fee-structures/${feeId}`).then((r) => r.data),

  /** Category Fee Engine V2 — GET /finance/fee-structures?engine=category */
  listFeeStructuresV2: () =>
    apiClient
      .get('/finance/fee-structures', { params: { engine: 'category' } })
      .then((r) => {
        const d = (r.data?.data ?? r.data ?? {}) as FeeCatalogV2
        return {
          categories: Array.isArray(d.categories) ? d.categories : [],
          gridRules: Array.isArray(d.gridRules) ? d.gridRules : [],
          discountPolicies: Array.isArray(d.discountPolicies) ? d.discountPolicies : [],
        } satisfies FeeCatalogV2
      }),

  /** Category Fee Engine V2 — upsert grille + exonérations */
  upsertFeeCatalogV2: (payload: UpsertFeeCatalogV2Payload) =>
    apiClient
      .post('/finance/fee-structures', payload)
      .then((r) => r.data.data as FeeCatalogV2),

  /** Affecte la catégorie tarifaire et recalcule les obligations */
  assignStudentCategory: (studentId: number, payload: AssignStudentCategoryPayload) =>
    apiClient
      .post(`/finance/students/${studentId}/assign-category`, payload)
      .then((r) => r.data.data as AssignStudentCategoryResult),

  /** Ristourne manuelle V2 sur une obligation (sans toucher PaymentFee) */
  applyObligationManualDiscount: (
    studentId: number,
    obligationId: number,
    payload: ApplyObligationManualDiscountPayload,
  ) =>
    apiClient
      .post(
        `/finance/students/${studentId}/obligations/${obligationId}/manual-discount`,
        payload,
      )
      .then((r) => r.data.data as ApplyObligationManualDiscountResult),

  /** Recalcule les obligations en masse (classe / option / élèves) */
  bulkApplyFeeStructure: (payload: BulkApplyFeeStructurePayload) =>
    apiClient
      .post('/finance/fee-structures/apply-bulk', payload)
      .then((r) => r.data.data as BulkApplyFeeStructureResult),

  /** @deprecated Utiliser createFeeStructure */
  setupFeeStructure: (payload: FeeStructurePayload) =>
    apiClient.post('/admin/finance/fee-structure', payload).then(r => r.data.data),

  bulkApplyFees: (feeStructureId: number, payload: { studentIds?: number[] }) =>
    apiClient.post(`/admin/finance/fee-structure/${feeStructureId}/apply-bulk`, payload).then(r => r.data.data),

  /** @deprecated Utiliser softDeleteFeeStructure */
  deleteFeeStructure: (feeId: number) =>
    apiClient.delete(`/admin/finance/fee-structure/${feeId}`).then(r => r.data),

  syncBalance: (enrollmentId: number) =>
    apiClient.post(`/admin/finance/enrollments/${enrollmentId}/sync-balance`)
      .then((r) => normalizeSessionEnrollment(r.data.data as Record<string, unknown>)),

  getPaymentProfile: () =>
    apiClient.get('/admin/finance/payment-profile')
      .then((r) => normalizePaymentProfile((r.data.data ?? {}) as Record<string, unknown>)),

  getPaymentOnboarding: (): Promise<PaymentOnboardingChecklist> =>
    apiClient.get('/admin/finance/payment-profile/onboarding')
      .then((r) => normalizePaymentOnboarding((r.data.data ?? {}) as Record<string, unknown>)),

  upsertPaymentProfile: (payload: UpsertPaymentProfilePayload) =>
    apiClient.put('/admin/finance/payment-profile', payload)
      .then((r) => {
        const data = (r.data.data ?? {}) as Record<string, unknown>
        return {
          profile: normalizePaymentProfile(data),
          onboarding: data.onboarding
            ? normalizePaymentOnboarding(data.onboarding as Record<string, unknown>)
            : null,
        }
      }),

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

  getAggregateReport: (params: {
    period?: string
    anchor?: string
    persist?: boolean
    forceRecompute?: boolean
  }) =>
    apiClient
      .get('/admin/finance/reports/aggregate', {
        params: {
          ...params,
          persist: params.persist ? 'true' : undefined,
          forceRecompute: params.forceRecompute ? 'true' : undefined,
        },
      })
      .then((r) => r.data.data as import('@/types/finance-reporting').FinanceAggregateReport),

  getCurrencyConfig: () =>
    apiClient
      .get('/admin/finance/currency-config')
      .then((r) => r.data.data as import('@/types/finance-reporting').SchoolCurrencyConfig),

  getCashFloatPolicy: () =>
    apiClient
      .get('/admin/finance/cash-float-policy')
      .then((r) => r.data.data as import('@/types/finance').CashFloatPolicy),

  updateCashFloatPolicy: (payload: Partial<import('@/types/finance').CashFloatPolicy>) =>
    apiClient
      .patch('/admin/finance/cash-float-policy', payload)
      .then((r) => r.data.data as import('@/types/finance').CashFloatPolicy),

  getCashDesks: () =>
    apiClient
      .get('/admin/finance/cash-desks')
      .then((r) => (r.data.data ?? []) as import('@/types/finance').CashDesk[]),

  getCashOps: () =>
    apiClient
      .get('/admin/finance/cash-ops')
      .then((r) => r.data.data as import('@/types/finance').SchoolCashOps),

  updateCashOps: (payload: {
    multiCounterEnabled?: boolean
    channels?: Partial<import('@/types/finance').SchoolCashOps['channels']>
  }) =>
    apiClient
      .patch('/admin/finance/cash-ops', payload)
      .then((r) => r.data.data as import('@/types/finance').SchoolCashOps),

  createCashDesk: (payload: {
    name: string
    code?: string
    specialty?: import('@/types/finance').CashDeskSpecialty
    sortOrder?: number
    isActive?: boolean
    printerHint?: string | null
    locationHint?: string | null
    notes?: string | null
    allowedChannels?: import('@/types/finance').SchoolPaymentChannelKey[] | null
    assignedUserIds?: number[]
  }) =>
    apiClient
      .post('/admin/finance/cash-desks', payload)
      .then((r) => r.data.data as import('@/types/finance').CashDesk),

  updateCashDesk: (
    id: number,
    payload: {
      name?: string
      code?: string
      specialty?: import('@/types/finance').CashDeskSpecialty
      sortOrder?: number
      isActive?: boolean
      printerHint?: string | null
      locationHint?: string | null
      notes?: string | null
      allowedChannels?: import('@/types/finance').SchoolPaymentChannelKey[] | null
      assignedUserIds?: number[]
    },
  ) =>
    apiClient
      .patch(`/admin/finance/cash-desks/${id}`, payload)
      .then((r) => r.data.data as import('@/types/finance').CashDesk),

  getCashDesksLive: (date?: string) =>
    apiClient
      .get('/admin/finance/cash-desks/live', { params: date ? { date } : undefined })
      .then((r) => r.data.data as import('@/types/finance').CashDeskLiveSnapshot),

  forceCloseCashSession: (
    sessionId: number,
    payload: { reason: string; closingCounted?: number; closeNotes?: string },
  ) =>
    apiClient
      .post(`/admin/finance/cash-sessions/${sessionId}/force-close`, payload)
      .then((r) => r.data.data),

  unlockCashSessionCorrections: (
    sessionId: number,
    payload?: { hours?: number; notes?: string },
  ) =>
    apiClient
      .post(`/admin/finance/cash-sessions/${sessionId}/unlock-corrections`, payload ?? {})
      .then((r) => r.data.data),

  reviewCashSession: (sessionId: number, notes?: string) =>
    apiClient
      .post(`/admin/finance/cash-sessions/${sessionId}/review`, notes ? { notes } : {})
      .then((r) => r.data.data),

  getCashFundTraceability: (params?: {
    varianceDays?: number
    varianceOnly?: boolean
    limit?: number
  }) =>
    apiClient
      .get('/admin/finance/cash-fund-traceability', { params })
      .then((r) => r.data.data as import('@/types/finance').CashFundTraceability),

  downloadCashSessionReport: async (sessionId: number): Promise<Blob> => {
    const res = await apiClient.get(`/admin/finance/cash-sessions/${sessionId}/report`, {
      responseType: 'blob',
    })
    return res.data as Blob
  },

  acknowledgeCashSessionReport: (sessionId: number) =>
    apiClient
      .post(`/admin/finance/cash-sessions/${sessionId}/acknowledge`)
      .then((r) => r.data.data),

  getSchoolDayDigest: (date?: string) =>
    apiClient
      .get('/admin/finance/day-digest', { params: date ? { date } : undefined })
      .then((r) => r.data.data as import('@/types/finance').SchoolDayDigest),

  downloadSchoolDayDigestPdf: async (date?: string): Promise<Blob> => {
    const res = await apiClient.get('/admin/finance/day-digest.pdf', {
      params: date ? { date } : undefined,
      responseType: 'blob',
    })
    return res.data as Blob
  },

  getDemoValuePanel: () =>
    apiClient
      .get('/admin/finance/demo-value-panel')
      .then((r) => r.data.data as import('@/types/finance').DemoValuePanel),

  getGoLiveReadiness: () =>
    apiClient
      .get('/admin/finance/go-live-readiness')
      .then((r) => r.data.data as import('@/types/finance').GoLiveReadiness),

  getWeeklyPromoterDigest: () =>
    apiClient
      .get('/admin/finance/week-digest')
      .then((r) => r.data.data as import('@/types/finance').WeeklyPromoterDigest),

  sendWeeklyPromoterDigest: () =>
    apiClient
      .post('/admin/finance/week-digest/send')
      .then((r) => r.data.data as { status: 'sent' | 'skipped' }),

  updateCurrencyConfig: (payload: {
    displayCurrency?: 'USD' | 'CDF'
    exchangeToleranceBps?: number
  }) =>
    apiClient
      .patch('/admin/finance/currency-config', payload)
      .then((r) => r.data.data as import('@/types/finance-reporting').SchoolCurrencyConfig),

  listExchangeRates: (limit = 50) =>
    apiClient
      .get('/admin/finance/exchange-rates', { params: { limit } })
      .then((r) => (r.data.data as { items: import('@/types/finance-reporting').ExchangeRateRow[] }).items),

  createExchangeRate: (payload: {
    rate: number
    toCurrency?: string
    notes?: string
    syncLegacyField?: boolean
  }) =>
    apiClient
      .post('/admin/finance/exchange-rates', payload)
      .then((r) => r.data.data),

  exportAiDataset: (params: { from: string; to: string; granularity?: string }) =>
    apiClient
      .get('/admin/finance/reports/ai-export', { params })
      .then((r) => r.data.data),

  // ── Secours / supervision (ADMIN) ─────────────────────────────────────────
  /**
   * Correction admin de lignes (espèces) — même contre-passation que le guichet
   * (avoir + reçu rectificatif), sans exiger une session de caisse ouverte.
   * Mois : on annule toujours le(s) plus récent(s) d’abord.
   */
  adminCorrectPaymentLines: (paymentId: number, body: { paymentFeeIds: number[]; reason: string }) =>
    apiClient
      .post(`/admin/finance/payments/${paymentId}/admin-correct-lines`, body)
      .then((r) => r.data.data as AdminPaymentLineCorrectionResult),

  listPaymentVoids: (params?: { status?: 'PENDING' | 'APPROVED' | 'REJECTED' }) =>
    apiClient
      .get('/admin/finance/payment-voids', { params })
      .then((r) => (r.data.data ?? []) as PaymentVoidRequestRow[]),

  reviewPaymentVoid: (
    id: number,
    body: { action: 'approve' | 'reject'; notes: string },
  ) =>
    apiClient
      .post(`/admin/finance/payment-voids/${id}/review`, body)
      .then((r) => r.data.data as PaymentVoidRequestRow),

  syncStudentLedger: (studentId: number, body?: { sessionId?: number }) =>
    apiClient
      .post(`/admin/finance/students/${studentId}/sync-ledger`, body ?? {})
      .then(
        (r) =>
          r.data.data as {
            totalFees: number
            feesPaid: number
            feesBalance: number
            lineCount: number
            sessionId: number | null
          },
      ),

  repairSchoolLedgers: (body?: { sessionId?: number }) =>
    apiClient.post('/admin/finance/audit/repair-ledgers', body ?? {}).then(
      (r) =>
        r.data.data as {
          scanned: number
          drifted: number
          repaired: number
          failed: number
          samples: Array<{
            studentId: number
            before: { totalFees: number; feesPaid: number; tuitionBalance: number }
            after?: { totalFees: number; feesPaid: number; feesBalance: number }
            error?: string
          }>
        },
    ),
}

/** Réponse de POST /admin/finance/payments/:id/admin-correct-lines (PaymentLineCorrectionService). */
export type AdminPaymentLineCorrectionResult = {
  paymentId: number
  correctionKey: string
  amountReversed: number
  remainingActiveLines: number
  status?: string
  avoirPaymentId: number | null
  receiptNumber: string | null
  originalReceiptNumber: string
  rectificationLabel: string
  pdfBase64: string | null
  pdfFilename: string | null
  feeLines: Array<{
    id: number
    feeStructureId: number
    monthYear: string | null
    amount: number
    reversedAt: string | null
    reversalReason: string | null
  }>
}

export type PaymentVoidStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type PaymentVoidRequestRow = {
  id: number
  schoolId: number
  paymentId: number
  status: PaymentVoidStatus
  reason: string
  requestedAt: string
  reviewedAt?: string | null
  reviewNotes?: string | null
  payment?: {
    id: number
    amount: number | string
    method: string
    reference?: string | null
    receiptNumber?: string | null
    status: string
    createdAt: string
    student?: {
      id: number
      firstName?: string | null
      lastName?: string | null
      matricule?: string | null
    } | null
  } | null
  requestedBy?: { id: number; firstName?: string | null; lastName?: string | null } | null
  reviewedBy?: { id: number; firstName?: string | null; lastName?: string | null } | null
  cashDesk?: { id: number; code?: string | null; name?: string | null } | null
}
