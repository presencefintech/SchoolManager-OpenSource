import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, staffApi, studentsApi, enrollmentsApi, presencesApi, classesApi, structureApi, financeApi, invitationsApi, teachersApi, schoolsApi, importApi } from '@/lib/admin/api'
import type { ImportType, ImportJobResult } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { CreateStaffPayload, CreateEnrollmentPayload, RecordPresencePayload, BulkPresencePayload, CreateClassPayload, RolloverPayload, ManualPaymentPayload, CreateMoratoriumPayload, GenerateParentCodePayload, InviteStaffPayload, AttendanceSettings, BulkMoratoriumPayload, FeeStructurePayload, LinkOrphanPayload, AdvancedSearchParams, MoratoriumType, StudentSecurityAction } from '@/types/admin'

// ── Dashboard ──────────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: dashboardApi.getStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval: 60_000,
    refetchOnMount: 'always',
  })
}

const LIVE_FEED_DEFAULT_PARAMS = { limit: 25 }

export function useLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  const resolved = params ?? LIVE_FEED_DEFAULT_PARAMS
  return useQuery({
    queryKey: ['admin', 'live-feed', resolved],
    queryFn: () => dashboardApi.getLiveFeed(resolved),
    enabled: !!getAuthToken(),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
    refetchOnMount: 'always',
  })
}

export function useHeatmap(classId?: number) {
  return useQuery({
    queryKey: ['admin', 'heatmap', classId],
    queryFn: () => dashboardApi.getHeatmap(classId),
    enabled: !!getAuthToken(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudAlerts() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts'],
    queryFn: dashboardApi.getFraudAlerts,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useControlStats() {
  return useQuery({
    queryKey: ['admin', 'control-stats'],
    queryFn: dashboardApi.getControlStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval: 30_000,
    retry: 1,
    refetchOnMount: 'always',
  })
}

// ── Staff ──────────────────────────────────────────────────────────
export function useStaff() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: staffApi.list,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffApi.createStaffUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  })
}

export function useDisableStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => staffApi.disable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  })
}

// ── Students ───────────────────────────────────────────────────────
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['admin', 'students', 'dashboard'],
    queryFn: studentsApi.getMainDashboard,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudents(params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'students', 'list', params],
    queryFn: () => studentsApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDetail(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'detail'],
    queryFn: () => studentsApi.getDetail(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useStudentActivity(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'activity'],
    queryFn: () => studentsApi.getActivity(id),
    staleTime: 30_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useDossierStatus(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'dossier'],
    queryFn: () => studentsApi.getDossierStatus(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useDebtors() {
  return useQuery({
    queryKey: ['admin', 'students', 'debtors'],
    queryFn: studentsApi.getDebtors,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudentApplications(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'students', 'applications', params],
    queryFn: () => studentsApi.listApplications(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useApproveApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => studentsApi.approveApplication(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] }),
  })
}

export function useRejectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => studentsApi.rejectApplication(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] }),
  })
}

export function useSecurityAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: StudentSecurityAction; reason?: string }) =>
      studentsApi.securityAction(id, action, reason),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'students', id] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', 'list'] })
    },
  })
}

// ── Enrollments ─────────────────────────────────────────────────────
export function useEnrollments(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'list', params],
    queryFn: () => enrollmentsApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useEnrollmentDetail(studentId: number) {
  return useQuery({
    queryKey: ['admin', 'enrollments', studentId],
    queryFn: () => enrollmentsApi.getDetail(studentId),
    staleTime: 60_000,
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useCreateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEnrollmentPayload) => enrollmentsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useApproveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.approve(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useFinalizeEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.finalize(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useToggleLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.toggleLock(studentId),
    onSuccess: (_, studentId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', 'list'] })
    },
  })
}

export function useAcademicSessions() {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'sessions'],
    queryFn: () => enrollmentsApi.listSessions(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useEnrollInSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, ...payload }: { studentId: number; sessionId: number; classId?: number; type?: string }) =>
      enrollmentsApi.enrollInSession(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useUpdateAdministrativeProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: Record<string, unknown> }) =>
      enrollmentsApi.updateAdministrativeProfile(studentId, payload),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] })
    },
  })
}

export function usePromoteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, newClassId }: { studentId: number; newClassId: number }) =>
      enrollmentsApi.promote(studentId, newClassId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

// ── Presences ─────────────────────────────────────────────────────

export function usePresenceLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'presences', 'live', params],
    queryFn: () => presencesApi.getLiveFeed(params),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceStats() {
  return useQuery({
    queryKey: ['admin', 'presences', 'stats'],
    queryFn: presencesApi.getStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function usePresenceHeatmap(classId?: number) {
  return useQuery({
    queryKey: ['admin', 'presences', 'heatmap', classId],
    queryFn: () => presencesApi.getHeatmap(classId),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceAlerts() {
  return useQuery({
    queryKey: ['admin', 'presences', 'alerts'],
    queryFn: presencesApi.getAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useGenerateSessionQR() {
  return useMutation({
    mutationFn: (classId: number) => presencesApi.generateSessionQR(classId),
  })
}

export function useRecordPresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecordPresencePayload) => presencesApi.record(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useBulkRecordPresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkPresencePayload) => presencesApi.bulkRecord(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useValidatePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => presencesApi.validate(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences'] }),
  })
}

export function useDeletePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => presencesApi.remove(id, reason),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erreur lors de la suppression'
      console.error('[useDeletePresence]', msg, err?.response?.status)
    },
  })
}

export function useDismissSecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, note }: { eventId: number; note?: string }) =>
      presencesApi.dismissSecurityAlert(eventId, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] }),
  })
}

export function useValidateSecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: number) => presencesApi.validateSecurityAlert(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useNotifySecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, message }: { eventId: number; message?: string }) =>
      presencesApi.notifySecurityAlert(eventId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] }),
  })
}

export function usePresenceReasonCodes() {
  return useQuery({
    queryKey: ['admin', 'presences', 'reason-codes'],
    queryFn: presencesApi.getReasonCodes,
    staleTime: 3600_000,
  })
}

export function useAttendanceSheetDraft(classId: number, sessionDate?: string) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sheet-draft', classId, sessionDate ?? ''],
    queryFn: () => presencesApi.getSheetDraft(classId, sessionDate),
    enabled: classId > 0,
    staleTime: 0,
  })
}

export function usePendingAttendanceSheets(params?: {
  sessionDate?: string
  classId?: number
  status?: import('@/types/admin').AttendanceSheetStatus
}) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sheets-pending', params],
    queryFn: () => presencesApi.listPendingSheets(params),
    staleTime: 30_000,
    refetchInterval: params?.status === 'SEALED' ? false : 60_000,
  })
}

export function useExportAttendanceSheet() {
  const toast = useToast()
  return useMutation({
    mutationFn: ({ sheetId, format }: { sheetId: number; format: 'pdf' | 'csv' }) =>
      presencesApi.exportSheetRegister(sheetId, format),
    onSuccess: (filename) => {
      toast.success('Téléchargement prêt', filename)
    },
    onError: (err) => {
      toast.error('Export impossible', getApiErrorMessage(err))
    },
  })
}

export function useSubmitAttendanceSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sheetId: number) => presencesApi.submitSheet(sheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useSealAttendanceSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sheetId: number) => presencesApi.sealSheet(sheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

// ── Classes ────────────────────────────────────────────────────────

export function useClasses(params?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'classes', 'list', params],
    queryFn: () => classesApi.list(params),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useClassDetail(id: number) {
  return useQuery({
    queryKey: ['admin', 'classes', id],
    queryFn: () => classesApi.getById(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useClassStats(id: number) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'stats'],
    queryFn: () => classesApi.getStats(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useClassAudit(id: number) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'audit'],
    queryFn: () => classesApi.getAudit(id),
    staleTime: 120_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClassPayload) => classesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'structure'] })
    },
  })
}

// ── Structure scolaire (sections / options) ───────────────────────

export function useSections() {
  return useQuery({
    queryKey: ['admin', 'structure', 'sections'],
    queryFn: () => structureApi.listSections(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useOptions(sectionId?: number) {
  return useQuery({
    queryKey: ['admin', 'structure', 'options', sectionId],
    queryFn: () => structureApi.listOptions(sectionId),
    staleTime: 120_000,
    enabled: sectionId != null && sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; code?: string }) => structureApi.createSection(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'structure', 'sections'] }),
  })
}

export function useCreateOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { sectionId: number; name: string; code?: string }) =>
      structureApi.createOption(payload),
    onSuccess: (_, { sectionId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'structure', 'options'] })
      qc.invalidateQueries({ queryKey: ['admin', 'structure', 'options', sectionId] })
    },
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateClassPayload> }) =>
      classesApi.update(id, payload),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['admin', 'classes', id] }),
  })
}

export function useToggleClassStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => classesApi.toggleStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}

export function useAssignStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentIds }: { classId: number; studentIds: number[] }) =>
      classesApi.assignStudents(classId, studentIds),
    onSuccess: (_, { classId }) => qc.invalidateQueries({ queryKey: ['admin', 'classes', classId] }),
  })
}

export function useTransferStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentIds, targetClassId }: { classId: number; studentIds: number[]; targetClassId: number }) =>
      classesApi.transfer(classId, { studentIds, targetClassId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}

export function useRollover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RolloverPayload) => classesApi.rollover(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}

// ── Finance ────────────────────────────────────────────────────────

export function useFinanceDashboard() {
  return useQuery({
    queryKey: ['admin', 'finance', 'dashboard'],
    queryFn: financeApi.getStrategicDashboard,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceTopPayers() {
  return useQuery({
    queryKey: ['admin', 'finance', 'top-payers'],
    queryFn: financeApi.getTopPayers,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceHealthCheck() {
  return useQuery({
    queryKey: ['admin', 'finance', 'health'],
    queryFn: financeApi.getHealthCheck,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceFraudAlerts() {
  return useQuery({
    queryKey: ['admin', 'finance', 'fraud-alerts'],
    queryFn: financeApi.getFraudAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
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

export function usePendingVerifications() {
  return useQuery({
    queryKey: ['admin', 'finance', 'pending'],
    queryFn: financeApi.getPendingVerifications,
    staleTime: 30_000,
    refetchInterval: 60_000,
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

export function useProcessManualPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ManualPaymentPayload) => financeApi.processManualPayment(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
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
    mutationFn: (paymentId: number) => financeApi.confirmMobileTransaction(paymentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'mobile-pending'] }),
  })
}

export function useTriggerManualAudit() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.triggerManualAudit,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'audit-logs'] }),
  })
}

export function useFeeStructures(params?: { classId?: number; sessionId?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-structures', params],
    queryFn: () => financeApi.listFeeStructures(params),
    staleTime: 60_000,
  })
}

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
    mutationFn: (feeId: number) => financeApi.deleteFeeStructure(feeId),
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

export function useSyncBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: number) => financeApi.syncBalance(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function usePaymentProfile() {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-profile'],
    queryFn: () => financeApi.getPaymentProfile(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpsertPaymentProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.upsertPaymentProfile,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'payment-profile'] }),
  })
}

export function useMarkVerificationProcessed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ verificationId, notes }: { verificationId: number; notes?: string }) =>
      financeApi.markVerificationProcessed(verificationId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] }),
  })
}

export function useExportPendingVerifications() {
  return useMutation({
    mutationFn: (format: 'csv' | 'json' = 'csv') => financeApi.exportPendingVerifications(format),
  })
}

// ── Moratoriums ────────────────────────────────────────────────────

export function useMoratoriumPolicy(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', 'policy'],
    queryFn: () => financeApi.getMoratoriumPolicy(),
    staleTime: 600_000,
    gcTime: 1_800_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 429) return false
      return failureCount < 1
    },
    enabled: options?.enabled ?? true,
  })
}

export function useAllowedMoratoriumTypes(options?: { enabled?: boolean }) {
  const { data: policy, isLoading, isError, error } = useMoratoriumPolicy(options)
  const ALL: MoratoriumType[] = ['MONTHLY', 'QUARTERLY', 'EXCEPTIONAL', 'SCHOLARSHIP_REVIEW']
  const allowedTypes: MoratoriumType[] = policy?.allowedTypes?.length
    ? policy.allowedTypes.filter((t): t is MoratoriumType => ALL.includes(t as MoratoriumType))
    : ['EXCEPTIONAL', 'MONTHLY']
  const defaultType: MoratoriumType = allowedTypes.includes('EXCEPTIONAL')
    ? 'EXCEPTIONAL'
    : allowedTypes[0] ?? 'EXCEPTIONAL'
  return { allowedTypes, defaultType, isLoading, isError, error, policy }
}

export function useMoratoriums(params?: { studentId?: number; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', params],
    queryFn: () => financeApi.listMoratoriums(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useMoratoriumRecoveryRate() {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', 'recovery-rate'],
    queryFn: financeApi.getMoratoriumRecoveryRate,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMoratoriumPayload) => financeApi.createMoratorium(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useUpdateMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateMoratoriumPayload> }) =>
      financeApi.updateMoratorium(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useRevokeMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.revokeMoratorium(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useAdminRefundRequests(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'refunds', params],
    queryFn: () => financeApi.listRefundRequests(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useReviewRefundRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reviewNotes }: { id: number; action: 'approve' | 'reject'; reviewNotes?: string }) =>
      financeApi.reviewRefund(id, { action, reviewNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'refunds'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

// ── Finance — hooks manquants ──────────────────────────────────────

export function useFinanceDetailedReport() {
  return useQuery({
    queryKey: ['admin', 'finance', 'detailed-report'],
    queryFn: financeApi.getDetailedReport,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceInsights() {
  return useQuery({
    queryKey: ['admin', 'finance', 'insights'],
    queryFn: financeApi.getInsights,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceComparativeDashboard() {
  return useQuery({
    queryKey: ['admin', 'finance', 'comparative'],
    queryFn: financeApi.getComparativeDashboard,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceEfficiency() {
  return useQuery({
    queryKey: ['admin', 'finance', 'efficiency'],
    queryFn: financeApi.getEfficiency,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceEndOfDay() {
  return useQuery({
    queryKey: ['admin', 'finance', 'end-of-day'],
    queryFn: financeApi.getEndOfDay,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinancePresenceSecurity() {
  return useQuery({
    queryKey: ['admin', 'finance', 'presence-security'],
    queryFn: financeApi.getPresenceSecurity,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceIntegrityScan() {
  return useQuery({
    queryKey: ['admin', 'finance', 'integrity-scan'],
    queryFn: financeApi.checkIntegrity,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceRiskProfiles() {
  return useQuery({
    queryKey: ['admin', 'finance', 'risk-profiles'],
    queryFn: financeApi.getRiskProfiles,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceDuplicates() {
  return useQuery({
    queryKey: ['admin', 'finance', 'duplicates'],
    queryFn: financeApi.getDuplicates,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceLedger() {
  return useQuery({
    queryKey: ['admin', 'finance', 'ledger'],
    queryFn: financeApi.getLedger,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceCashierAudit(cashierId: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'cashier-audit', cashierId],
    queryFn: () => financeApi.getCashierAudit(cashierId),
    staleTime: 60_000,
    enabled: !!cashierId,
    refetchOnWindowFocus: false,
  })
}

export function useAdvancedSearch(params: AdvancedSearchParams) {
  return useQuery({
    queryKey: ['admin', 'finance', 'advanced-search', params],
    queryFn: () => financeApi.advancedSearch(params as Record<string, string | number | undefined>),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudRiskAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => financeApi.fraudRiskAnalysis(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fraud-alerts'] }),
  })
}

export function useConfirmBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (paymentId: number) => financeApi.confirmBankTransaction(paymentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useResendReceipt() {
  return useMutation({
    mutationFn: (paymentId: number) => financeApi.resendReceipt(paymentId),
  })
}

export function useLinkOrphanTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: LinkOrphanPayload) => financeApi.linkOrphanTransaction(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useGetMoratorium(id: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', id],
    queryFn: () => financeApi.getMoratorium(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useCreateBulkMoratoriums() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkMoratoriumPayload) =>
      financeApi.createBulkMoratoriums(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

// ── Invitations ────────────────────────────────────────────────────

export function useInvitationStatus() {
  return useQuery({
    queryKey: ['admin', 'invitations', 'status'],
    queryFn: invitationsApi.getStatus,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useGenerateParentCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateParentCodePayload) => invitationsApi.generateParentCode(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useRevokeParentCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (codeId: number) => invitationsApi.revokeParentCode(codeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useInviteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteStaffPayload) => invitationsApi.inviteStaff(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useRevokeStaffInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (targetUserId: number) => invitationsApi.revokeStaffInvitation(targetUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

// ── Teachers ───────────────────────────────────────────────────────

export function useTeacherDashboard(teacherId: number) {
  return useQuery({
    queryKey: ['admin', 'teachers', teacherId, 'dashboard'],
    queryFn: () => teachersApi.getDashboard(teacherId),
    staleTime: 60_000,
    enabled: !!teacherId,
    refetchOnWindowFocus: false,
  })
}

export function useTeacherScans(teacherId: number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'teachers', teacherId, 'scans', params],
    queryFn: () => teachersApi.getScans(teacherId, params),
    staleTime: 30_000,
    enabled: !!teacherId,
    refetchOnWindowFocus: false,
  })
}

export function useForceValidatePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ presenceId, status, reason }: { presenceId: number; status: string; reason?: string }) =>
      teachersApi.forceValidatePresence(presenceId, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useUpdateTeacherClasses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teacherId, classIds }: { teacherId: number; classIds: number[] }) =>
      teachersApi.updateTeacherClasses(teacherId, classIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }),
  })
}

// ── School Settings ────────────────────────────────────────────────

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ['admin', 'schools', 'attendance-settings'],
    queryFn: schoolsApi.getAttendanceSettings,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Partial<AttendanceSettings>) => schoolsApi.updateAttendanceSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  })
}

// ── Import ──────────────────────────────────────────────────────────

export function useImportUpload() {
  return useMutation({
    mutationFn: ({ type, file, schoolId }: { type: ImportType; file: File; schoolId?: number }) =>
      importApi.upload(type, file, schoolId),
  })
}

export function useImportStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['admin', 'import', jobId],
    queryFn: () => importApi.getStatus(jobId!),
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = (query.state.data as ImportJobResult | undefined)?.status
      if (!status || ['COMPLETED', 'PARTIAL', 'FAILED'].includes(status)) return false
      return 2000
    },
  })
}
