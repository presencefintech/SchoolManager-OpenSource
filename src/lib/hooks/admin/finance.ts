import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api'
import type { ManualPaymentPayload, FeeStructurePayload, CreateFeeStructurePayload, UpdateFeeStructurePayload, CreateFeeCategoryPayload, UpdateFeeCategoryPayload, ConfirmPaymentProofPayload, FinanceFraudAlert } from '@/types/admin'

// ── Finance ────────────────────────────────────────────────────────

export function useFinanceDashboard() {
  return useQuery({
    queryKey: ['admin', 'finance', 'dashboard'],
    queryFn: financeApi.getStrategicDashboard,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useAdminClassYearFeeDashboard(params?: { sessionId?: number; classId?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'class-year-fees', params?.sessionId ?? null, params?.classId ?? null],
    queryFn: () => financeApi.getClassYearFees(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceTopPayers(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'top-payers'],
    queryFn: financeApi.getTopPayers,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceHealthCheck(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'health'],
    queryFn: financeApi.getHealthCheck,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceAiInsights(
  horizonDays: 7 | 30 | 90 = 30,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'finance', 'ai-insights', horizonDays],
    queryFn: () => financeApi.getAiInsights(horizonDays),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceFraudAlerts(opts?: { enabled?: boolean }) {
  return useQuery<FinanceFraudAlert[]>({
    queryKey: ['admin', 'finance', 'fraud-alerts'],
    queryFn: financeApi.getFraudAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceAuditLogs(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'audit-logs', params],
    queryFn: () => financeApi.getAuditLogs(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function usePendingVerifications(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'pending'],
    queryFn: financeApi.getPendingVerifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
    enabled: opts?.enabled ?? true,
  })
}

export function useMobilePending() {
  return useQuery({
    queryKey: ['admin', 'finance', 'mobile-pending'],
    queryFn: financeApi.getMobilePending,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useAdminStudentFeeSchedule(
  studentId: number,
  sessionId?: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'fee-schedule', studentId, sessionId],
    queryFn: () => financeApi.getStudentFeeSchedule(studentId, sessionId),
    enabled: (options?.enabled ?? true) && Number.isFinite(studentId) && studentId > 0,
    staleTime: 30_000,
  })
}

export function useAdminStudentFeeAssignments(
  studentId: number,
  params?: { sessionId?: number; includeRevoked?: boolean },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'fee-assignments', studentId, params],
    queryFn: () => financeApi.listStudentFeeAssignments(studentId, params),
    enabled: (options?.enabled ?? true) && Number.isFinite(studentId) && studentId > 0,
    staleTime: 30_000,
  })
}

export function useCreateStudentFeeAssignment(studentId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: import('@/types/finance').CreateStudentFeeAssignmentPayload) =>
      financeApi.createStudentFeeAssignment(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
    },
  })
}

export function useUpdateStudentFeeAssignment(studentId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      assignmentId,
      payload,
    }: {
      assignmentId: number
      payload: import('@/types/finance').UpdateStudentFeeAssignmentPayload
    }) => financeApi.updateStudentFeeAssignment(studentId, assignmentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
    },
  })
}

export function useRevokeStudentFeeAssignment(studentId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (assignmentId: number) =>
      financeApi.revokeStudentFeeAssignment(studentId, assignmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
    },
  })
}

export function useProcessManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ManualPaymentPayload) => financeApi.processManualPayment(payload),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
      if (variables.studentId) {
        qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', variables.studentId] })
        qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', variables.studentId] })
      }
    },
  })
}

export function useVerifyPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { verificationId: number; action: 'ADMIN' | 'FINANCE' | 'REJECT'; notes?: string }) =>
      financeApi.verifyPaymentStep(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] }),
  })
}

export function useConfirmMobilePayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, proof }: { paymentId: number; proof?: ConfirmPaymentProofPayload }) =>
      financeApi.confirmMobileTransaction(paymentId, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'mobile-pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] })
    },
  })
}

export function useTriggerManualAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.triggerManualAudit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'audit-logs'] }),
  })
}

export function useFeeStructures(params?: { classId?: number; sessionId?: number; isActive?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-structures', params],
    queryFn: () => financeApi.listFeeStructures(params),
    staleTime: 60_000,
  })
}

export function useFeeStructure(feeId: number | null | undefined) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-structures', 'by-id', feeId],
    queryFn: () => financeApi.getFeeStructureById(feeId!),
    enabled: feeId != null && feeId > 0,
    staleTime: 60_000,
  })
}

export function useFeeCategories(params?: { isActive?: boolean; billingPeriod?: string }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-categories', params],
    queryFn: () => financeApi.listFeeCategories(params),
    staleTime: 60_000,
  })
}

export function useCreateFeeCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFeeCategoryPayload) => financeApi.createFeeCategory(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-categories'] })
    },
  })
}

export function useUpdateFeeCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      categoryId,
      payload,
    }: {
      categoryId: number
      payload: UpdateFeeCategoryPayload
    }) => financeApi.updateFeeCategory(categoryId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-categories'] })
    },
  })
}

export function useDeleteFeeCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (categoryId: number) => financeApi.softDeleteFeeCategory(categoryId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-categories'] })
    },
  })
}

export function useCreateFeeStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateFeeStructurePayload) => financeApi.createFeeStructure(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function usePreviewFeeStructure(payload: CreateFeeStructurePayload | null) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-structures', 'preview', payload],
    queryFn: () => financeApi.previewFeeStructure(payload!),
    enabled:
      payload != null &&
      payload.sessionId > 0 &&
      payload.categoryId > 0 &&
      payload.amount > 0,
    staleTime: 15_000,
  })
}

export function useUpdateFeeStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      feeId,
      payload,
    }: {
      feeId: number
      payload: UpdateFeeStructurePayload
    }) => financeApi.updateFeeStructure(feeId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-structures'] })
    },
  })
}

export function useCloneFeeCatalogAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.cloneFeeCatalog,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-structures'] }),
  })
}

/** @deprecated Utiliser useCreateFeeStructure */
export function useSetupFeeStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: FeeStructurePayload) => financeApi.setupFeeStructure(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useBulkApplyFees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ feeStructureId, studentIds }: { feeStructureId: number; studentIds?: number[] }) =>
      financeApi.bulkApplyFees(feeStructureId, { studentIds }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useDeleteFeeStructure() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (feeId: number) => financeApi.softDeleteFeeStructure(feeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useGenerateInvoice() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { studentId: number; feeStructureId: number; dueDate?: string }) =>
      financeApi.generateInvoice(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useApplyDiscount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { invoiceId: number; discountAmount: number; reason?: string }) =>
      financeApi.applyDiscount(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useStudentInvoices(studentId: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'invoices', studentId],
    queryFn: () => financeApi.getStudentInvoices(studentId),
    staleTime: 60_000,
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useAdminStudentPaymentsDetailed(
  studentId: number,
  params?: Parameters<typeof financeApi.getStudentPaymentsDetailed>[1],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'finance', 'student-payments-detailed', studentId, params],
    queryFn: () => financeApi.getStudentPaymentsDetailed(studentId, params),
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && studentId > 0,
    refetchOnWindowFocus: false,
  })
}

/** Demandes d’annulation de reçu (caissier → admin). */
export function usePaymentVoidRequests(status?: 'PENDING' | 'APPROVED' | 'REJECTED') {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-voids', status ?? 'ALL'],
    queryFn: () => financeApi.listPaymentVoids(status ? { status } : undefined),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useReviewPaymentVoid() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { id: number; action: 'approve' | 'reject'; notes: string }) =>
      financeApi.reviewPaymentVoid(input.id, { action: input.action, notes: input.notes }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance', 'payment-voids'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useSyncStudentLedger() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { studentId: number; sessionId?: number }) =>
      financeApi.syncStudentLedger(input.studentId, {
        sessionId: input.sessionId,
      }),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'students', vars.studentId] })
    },
  })
}

export function useRepairSchoolLedgers() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input?: { sessionId?: number }) => financeApi.repairSchoolLedgers(input),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

/** Correction admin de lignes d’un encaissement espèces (avoir + reçu rectificatif). */
export function useAdminCorrectPaymentLines() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { paymentId: number; paymentFeeIds: number[]; reason: string }) =>
      financeApi.adminCorrectPaymentLines(input.paymentId, {
        paymentFeeIds: input.paymentFeeIds,
        reason: input.reason,
      }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}
