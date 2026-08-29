import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEmpirePollingInterval } from '@/lib/realtime/empire-realtime-provider'
import { dashboardApi, staffApi, studentsApi, enrollmentsApi, preEnrollmentApi, schoolAcademicApi, presencesApi, classesApi, classPeriodsApi, structureApi, financeApi, invitationsApi, parentsApi, teachersApi, schoolsApi, importApi, adminFraudApi, adminCloudinaryApi, attendanceNotificationsApi } from '@/lib/admin/api'
import type { ImportType, ImportJobResult } from '@/lib/admin/api'
import { getAuthToken, getAuthSchoolId } from '@/lib/api/auth-storage'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type {
  CreateStaffPayload,
  CreateClassPeriodPayload,
  UpdateClassPeriodPayload,
  CreateEnrollmentPayload, RecordPresencePayload, BulkPresencePayload,
  CreateClassPayload, RolloverPayload, ManualPaymentPayload, CreateMoratoriumPayload,
  GenerateParentCodePayload, InviteStaffPayload, RevokeStaffInvitationPayload, AttendanceSettings, PatchAttendanceSettingsPayload, SchoolBranding, BulkMoratoriumPayload,
  FeeStructurePayload, CreateFeeStructurePayload, UpdateFeeStructurePayload, CreateFeeCategoryPayload, UpdateFeeCategoryPayload,
  LinkOrphanPayload, AdvancedSearchParams, MoratoriumType,
  StudentSecurityAction, ConfirmPaymentProofPayload, UpdateMoratoriumPolicyPayload,
  StudentApplication, StudentDetail, StudentListItem, PaginatedResponse, PresenceLiveFeedEntry,
  PresenceSecurityAlert, FinanceFraudAlert,
  FinanceCollectionEfficiencyLevel,
  FinanceEndOfDayClosing,
  FinanceIntegrityScan,
} from '@/types/admin'
import type {
  CreatePreEnrollmentPayload,
  PreEnrollmentStatus,
} from '@/types/pre-enrollment'

// ── Dashboard ──────────────────────────────────────────────────────
export function useAdminStats() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: dashboardApi.getStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval,
  })
}

const LIVE_FEED_DEFAULT_PARAMS = { limit: 25 }

export function useLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  const resolved = params ?? LIVE_FEED_DEFAULT_PARAMS
  const refetchInterval = useEmpirePollingInterval(15_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'live-feed', resolved],
    queryFn: () => dashboardApi.getLiveFeed(resolved),
    enabled: !!getAuthToken(),
    staleTime: 10_000,
    refetchInterval,
    refetchOnWindowFocus: false,
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
  const refetchInterval = useEmpirePollingInterval(30_000)
  return useQuery({
    queryKey: ['admin', 'control-stats'],
    queryFn: dashboardApi.getControlStats,
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchInterval,
    retry: 1,
  })
}

export function useTriggerWeeklyReport() {
  return useMutation({
    mutationFn: dashboardApi.triggerWeeklyReport,
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

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: (id: number) => staffApi.resetPassword(id),
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

export function useStudents(
  params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'students', 'list', params],
    queryFn: () => studentsApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  })
}

export function useIncompleteDossiers(params?: { page?: number; limit?: number; gap?: string }) {
  return useQuery({
    queryKey: ['admin', 'students', 'desk-incomplete', params],
    queryFn: () => studentsApi.listIncompleteDossiers(params),
    staleTime: 20_000,
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
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'applications'] })
      const snapshots = qc.getQueriesData<PaginatedResponse<StudentApplication>>({
        queryKey: ['admin', 'students', 'applications'],
      })
      snapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((a) => (a.id === id ? { ...a, status: 'APPROVED' as const } : a)),
        })
      })
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] })
    },
  })
}

export function useRejectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => studentsApi.rejectApplication(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'applications'] })
      const snapshots = qc.getQueriesData<PaginatedResponse<StudentApplication>>({
        queryKey: ['admin', 'students', 'applications'],
      })
      snapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((a) => (a.id === id ? { ...a, status: 'REJECTED' as const } : a)),
        })
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] })
    },
  })
}

export function useSecurityAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: StudentSecurityAction; reason?: string }) =>
      studentsApi.securityAction(id, action, reason),
    onMutate: async ({ id, action }) => {
      const locked = action === 'BLOCK'
      const detailKey = ['admin', 'students', id] as const
      await qc.cancelQueries({ queryKey: detailKey })
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'list'] })

      const previousDetail = qc.getQueryData<StudentDetail>(detailKey)
      if (previousDetail) {
        qc.setQueryData<StudentDetail>(detailKey, {
          ...previousDetail,
          isPaymentLocked: locked,
        })
      }

      const listSnapshots = qc.getQueriesData<PaginatedResponse<StudentListItem>>({
        queryKey: ['admin', 'students', 'list'],
      })
      listSnapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((s) =>
            s.id === id ? { ...s, isPaymentLocked: locked } : s,
          ),
        })
      })

      return { previousDetail, listSnapshots }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.previousDetail) qc.setQueryData(['admin', 'students', id], ctx.previousDetail)
      ctx?.listSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: (_data, _err, { id }) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', id] })
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'list'] })
    },
  })
}

export function useLogPiiAccess() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => studentsApi.logPiiAccess(id, reason),
  })
}

export function useUploadStudentPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, file, description }: { studentId: number; file: File; description?: string }) =>
      adminCloudinaryApi.uploadPhoto(studentId, file, description),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
  })
}

export function useUploadStudentDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, documentType, file, description }: {
      studentId: number; documentType: 'certificates' | 'reports'; file: File; description?: string
    }) => adminCloudinaryApi.uploadDocument(studentId, documentType, file, description),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
  })
}

export function useDeleteCloudinaryFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, publicId }: { studentId: number; publicId: string }) =>
      adminCloudinaryApi.deleteFile(studentId, publicId),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
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

export function useEnrollmentsByClass(classId: number) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'class', classId],
    queryFn: () => enrollmentsApi.listByClass(classId),
    enabled: !!classId,
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
    mutationFn: (payload: CreateEnrollmentPayload & { idempotencyKey?: string }) =>
      enrollmentsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useApproveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.approve(studentId),
    onSuccess: (_data, studentId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
    },
  })
}

export function useRejectEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, reason }: { studentId: number; reason: string }) =>
      enrollmentsApi.reject(studentId, reason),
    onSuccess: (_data, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
    },
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
    mutationFn: ({ studentId, isLocked }: { studentId: number; isLocked: boolean }) =>
      enrollmentsApi.toggleLock(studentId, isLocked),
    onSuccess: (_, { studentId }) => {
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

export function useEnrollmentFeePreview(
  classId?: number,
  options?: {
    sessionId?: number
    studentId?: number
    explicitFeeStructureIds?: number[]
  },
) {
  const explicitKey = (options?.explicitFeeStructureIds ?? []).slice().sort((a, b) => a - b).join(',')
  return useQuery({
    queryKey: [
      'admin',
      'enrollments',
      'fee-preview',
      classId,
      options?.sessionId ?? null,
      options?.studentId ?? null,
      explicitKey,
    ],
    queryFn: () =>
      enrollmentsApi.getFeePreview({
        classId: classId!,
        sessionId: options?.sessionId,
        studentId: options?.studentId,
        explicitFeeStructureIds: options?.explicitFeeStructureIds,
      }),
    enabled: !!classId && classId > 0,
    staleTime: 60_000,
  })
}

export function useIntakeInbox(params?: { kind?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'inbox', params],
    queryFn: () => enrollmentsApi.getIntakeInbox(params),
    staleTime: 20_000,
  })
}

export function useRentreePack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      ...payload
    }: {
      studentId: number
      sessionId?: number
      classId?: number
      feesPaid?: number
      collectDeposit?: boolean
      paymentNotes?: string
      type?: string
      explicitFeeStructureIds?: number[]
      autoAssignExplicitFees?: boolean
      idempotencyKey?: string
    }) => enrollmentsApi.applyRentreePack(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useEnrollInSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      ...payload
    }: {
      studentId: number
      sessionId: number
      classId?: number
      type?: string
      autoAssignExplicitFees?: boolean
      explicitFeeStructureIds?: number[]
    }) => enrollmentsApi.enrollInSession(studentId, payload),
    onSuccess: (_data, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
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

export function useUpdateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: Partial<CreateEnrollmentPayload> }) =>
      enrollmentsApi.update(studentId, payload),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
    },
  })
}

export function useTransferEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, targetSchoolId, newClassId }: { studentId: number; targetSchoolId: number; newClassId?: number }) =>
      enrollmentsApi.transfer(studentId, targetSchoolId, newClassId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useSetReminderPause() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, paused }: { studentId: number; paused: boolean }) =>
      enrollmentsApi.setReminderPause(studentId, paused),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function usePurgeEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, confirmationToken }: { studentId: number; confirmationToken: string }) =>
      enrollmentsApi.purge(studentId, confirmationToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useUpdateBiometrics() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, photo }: { studentId: number; photo: File }) => {
      const fd = new FormData()
      fd.append('photo', photo)
      return enrollmentsApi.updateBiometrics(studentId, fd)
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] })
    },
  })
}

// ── Presences ─────────────────────────────────────────────────────

export function usePresenceLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(15_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'live', params],
    queryFn: () => presencesApi.getLiveFeed(params),
    staleTime: 0,
    refetchInterval,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceStats() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'stats'],
    queryFn: presencesApi.getStats,
    staleTime: 30_000,
    refetchInterval,
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

export function usePresenceAlerts(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'presences', 'alerts'],
    queryFn: presencesApi.getAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled,
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
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'presences'] })
      const feedSnapshots = qc.getQueriesData<{ entries: PresenceLiveFeedEntry[]; total: number }>({
        queryKey: ['admin', 'presences', 'live'],
      })
      feedSnapshots.forEach(([key, data]) => {
        if (!data?.entries) return
        qc.setQueryData(key, {
          ...data,
          entries: data.entries.map((e) =>
            e.id === id ? { ...e, status: e.status ?? 'PRESENT' } : e,
          ),
        })
      })
      return { feedSnapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.feedSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useDeletePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => presencesApi.remove(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'presences'] })
      const feedSnapshots = qc.getQueriesData<{ entries: PresenceLiveFeedEntry[]; total: number }>({
        queryKey: ['admin', 'presences', 'live'],
      })
      feedSnapshots.forEach(([key, data]) => {
        if (!data?.entries) return
        qc.setQueryData(key, {
          ...data,
          entries: data.entries.filter((e) => e.id !== id),
          total: Math.max(0, (data.total ?? data.entries.length) - 1),
        })
      })
      return { feedSnapshots }
    },
    onError: (err: any, _vars, ctx) => {
      ctx?.feedSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
      const msg = err?.response?.data?.message ?? err?.message ?? 'Erreur lors de la suppression'
      console.error('[useDeletePresence]', msg, err?.response?.status)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useDismissSecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, note }: { eventId: number; note?: string }) =>
      presencesApi.dismissSecurityAlert(eventId, note),
    onMutate: async ({ eventId }) => {
      const key = ['admin', 'presences', 'alerts'] as const
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<PresenceSecurityAlert[]>(key)
      if (previous) {
        qc.setQueryData(
          key,
          previous.filter((a) => a.id !== eventId),
        )
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['admin', 'presences', 'alerts'], ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] })
    },
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

export function useActiveScanSessions(params?: { classId?: number; limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(30_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'scan-sessions', params],
    queryFn: () => presencesApi.listActiveScanSessions(params),
    staleTime: 15_000,
    refetchInterval,
  })
}

export function useRevokeScanSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => presencesApi.revokeScanSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences', 'scan-sessions'] }),
  })
}

export function useSyncBatches(params?: { limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(60_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'sync-batches', params],
    queryFn: () => presencesApi.listSyncBatches(params),
    staleTime: 30_000,
    refetchInterval,
  })
}

export function useSyncBatchDetail(batchId: string | null) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sync-batches', 'detail', batchId],
    queryFn: () => presencesApi.getSyncBatch(batchId!),
    enabled: !!batchId,
    staleTime: 60_000,
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

export function useClassPeriods(params?: {
  teacherId?: number
  classId?: number
  academicYear?: string
  dayOfWeek?: number
  activeOnly?: boolean
}) {
  return useQuery({
    queryKey: ['admin', 'class-periods', params],
    queryFn: () => classPeriodsApi.list(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClassPeriodPayload) => classPeriodsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
  })
}

export function useUpdateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClassPeriodPayload }) =>
      classPeriodsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
  })
}

export function useDeactivateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => classPeriodsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
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

export function useClassStats(id: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'stats'],
    queryFn: () => classesApi.getStats(id),
    staleTime: 60_000,
    enabled: !!id && enabled,
    refetchOnWindowFocus: false,
  })
}

export function useClassAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'audit'],
    queryFn: () => classesApi.getAudit(id),
    staleTime: 120_000,
    enabled: !!id && enabled,
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

export function useClassConflicts(teacherId: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'classes', 'conflicts', teacherId],
    queryFn: () => classesApi.getConflicts(teacherId!),
    enabled: !!teacherId,
    staleTime: 30_000,
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

// ── Pré-inscriptions web ───────────────────────────────────────────────────

export function usePreEnrollments(params?: { status?: string; page?: number; limit?: number; schoolId?: number }) {
  return useQuery({
    queryKey: ['admin', 'pre-enrollments', params],
    queryFn: () => preEnrollmentApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolSections(schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'sections', schoolId],
    queryFn: () => schoolAcademicApi.listSections(schoolId),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolOptions(sectionId: number, schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'options', sectionId, schoolId],
    queryFn: () => schoolAcademicApi.listOptions(sectionId, schoolId),
    staleTime: 120_000,
    enabled: sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolClasses(sectionId: number, optionId?: number, academicYear?: string, schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'classes', sectionId, optionId ?? 0, academicYear, schoolId],
    queryFn: () => schoolAcademicApi.listClasses(sectionId, optionId, academicYear, schoolId),
    staleTime: 120_000,
    enabled: sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useCreatePreEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePreEnrollmentPayload) => preEnrollmentApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pre-enrollments'] }),
  })
}

export function useUpdatePreEnrollmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: PreEnrollmentStatus; comment?: string }) =>
      preEnrollmentApi.updateStatus(id, { status, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pre-enrollments'] }),
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

export function usePaymentProfile(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-profile'],
    queryFn: () => financeApi.getPaymentProfile(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function usePaymentOnboarding() {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-profile', 'onboarding'],
    queryFn: () => financeApi.getPaymentOnboarding(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpsertPaymentProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.upsertPaymentProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'payment-profile'] })
    },
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

export function useMoratoriums(params?: { studentId?: number; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', params],
    queryFn: () => financeApi.listMoratoriums(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateMoratoriumPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateMoratoriumPolicyPayload) => financeApi.updateMoratoriumPolicy(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums', 'policy'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] })
    },
  })
}

export function useApproveMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, internalNote }: { id: number; internalNote?: string }) =>
      financeApi.approveMoratorium(id, { internalNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useRejectMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      financeApi.rejectMoratorium(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
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

export function useAdminRefundRequest(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'finance', 'refunds', 'detail', id],
    queryFn: () => financeApi.getRefundRequest(id!),
    enabled: id != null && id > 0,
    staleTime: 15_000,
  })
}

export function useAdminStudentFeePeriodStatus(studentId: number, feeStructureId?: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-periods', studentId, feeStructureId],
    queryFn: () => financeApi.getStudentFeePeriodStatus(studentId, feeStructureId!),
    enabled: studentId > 0 && !!feeStructureId,
    staleTime: 30_000,
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
      qc.invalidateQueries({ queryKey: ['finance', 'refunds'] })
    },
  })
}

/** Alias guide F-12 */
export const useReviewRefund = useReviewRefundRequest

export function useFinancialSealBatches(params?: {
  status?: string
  page?: number
  limit?: number
  fromDate?: string
  toDate?: string
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'seal-batches', params],
    queryFn: () => financeApi.listSealBatches(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinancialSealBatchDetail(batchId: number | null) {
  return useQuery({
    queryKey: ['admin', 'finance', 'seal-batch', batchId],
    queryFn: () => financeApi.getSealBatch(batchId!),
    enabled: batchId != null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useVerifySealBatch() {
  return useMutation({
    mutationFn: (batchId: number) => financeApi.verifySealBatch(batchId),
  })
}

export function useCreateSealBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.createSealBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'seal-batches'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'seal-batch'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'advanced-search'] })
    },
  })
}

// ── Finance — hooks manquants ──────────────────────────────────────

export function useFinanceDetailedReport(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'detailed-report'],
    queryFn: financeApi.getDetailedReport,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceAggregateReport(params: {
  period: string
  anchor?: string
  persist?: boolean
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'aggregate-report', params],
    queryFn: () => financeApi.getAggregateReport(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceCurrencyConfig() {
  return useQuery({
    queryKey: ['admin', 'finance', 'currency-config'],
    queryFn: financeApi.getCurrencyConfig,
    staleTime: 300_000,
  })
}

export function useCashFloatPolicy() {
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-float-policy'],
    queryFn: financeApi.getCashFloatPolicy,
    staleTime: 60_000,
  })
}

export function useUpdateCashFloatPolicy() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.updateCashFloatPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-float-policy'] })
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session', 'opening-suggestion'] })
      toast.success('Politique caisse', 'Fond d’ouverture mis à jour pour cet établissement.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useCashFundTraceability(params?: {
  varianceDays?: number
  varianceOnly?: boolean
  limit?: number
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-fund-traceability', params],
    queryFn: () => financeApi.getCashFundTraceability(params),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })
}

export function useDownloadAdminCashSessionReport() {
  return useMutation({
    mutationFn: (sessionId: number) => financeApi.downloadCashSessionReport(sessionId),
  })
}

export function useAcknowledgeCashSessionReport() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (sessionId: number) => financeApi.acknowledgeCashSessionReport(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
      toast.success('Rapport visé', 'Le visa de la direction a été enregistré.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useSchoolDayDigest(date?: string) {
  return useQuery({
    queryKey: ['admin', 'finance', 'day-digest', date ?? 'today'],
    queryFn: () => financeApi.getSchoolDayDigest(date),
    staleTime: 30_000,
  })
}

export function useDownloadSchoolDayDigestPdf() {
  return useMutation({
    mutationFn: (date?: string) => financeApi.downloadSchoolDayDigestPdf(date),
  })
}

export function useDemoValuePanel() {
  return useQuery({
    queryKey: ['admin', 'finance', 'demo-value-panel'],
    queryFn: () => financeApi.getDemoValuePanel(),
    staleTime: 60_000,
  })
}

export function useGoLiveReadiness() {
  return useQuery({
    queryKey: ['admin', 'finance', 'go-live-readiness'],
    queryFn: () => financeApi.getGoLiveReadiness(),
    staleTime: 60_000,
  })
}

export function useWeeklyPromoterDigest() {
  return useQuery({
    queryKey: ['admin', 'finance', 'week-digest'],
    queryFn: () => financeApi.getWeeklyPromoterDigest(),
    staleTime: 60_000,
  })
}

export function useSendWeeklyPromoterDigest() {
  const toast = useToast()
  return useMutation({
    mutationFn: () => financeApi.sendWeeklyPromoterDigest(),
    onSuccess: (data) => {
      toast.success(
        data.status === 'sent'
          ? 'Bilan hebdo envoyé à ADMIN et FINANCE'
          : 'Aucune activité cette semaine — non envoyé',
      )
    },
    onError: () => toast.error("Impossible d'envoyer le bilan hebdo"),
  })
}

export function useFinanceExchangeRates() {
  return useQuery({
    queryKey: ['admin', 'finance', 'exchange-rates'],
    queryFn: () => financeApi.listExchangeRates(30),
    staleTime: 120_000,
  })
}

export function useCreateExchangeRate() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.createExchangeRate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'exchange-rates'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'aggregate-report'] })
      toast.success('Taux enregistré', 'Historique immuable mis à jour.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useUpdateCurrencyConfig() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.updateCurrencyConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'aggregate-report'] })
      toast.success('Devise mise à jour', 'Paramètres d\'affichage enregistrés.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useFinanceInsights(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'insights'],
    queryFn: financeApi.getInsights,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceComparativeDashboard(opts?: { enabled?: boolean }) {
  return useQuery<FinanceCollectionEfficiencyLevel[]>({
    queryKey: ['admin', 'finance', 'comparative'],
    queryFn: financeApi.getComparativeDashboard,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceEfficiency(opts?: { enabled?: boolean }) {
  return useQuery<FinanceCollectionEfficiencyLevel[]>({
    queryKey: ['admin', 'finance', 'efficiency'],
    queryFn: financeApi.getEfficiency,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceEndOfDay(opts?: { enabled?: boolean }) {
  return useQuery<FinanceEndOfDayClosing | null>({
    queryKey: ['admin', 'finance', 'end-of-day'],
    queryFn: financeApi.getEndOfDay,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinancePaymentMethods(period: 'day' | 'month' = 'month', opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-methods', period],
    queryFn: () => financeApi.getPaymentMethods(period),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceFeeTypes(period: 'day' | 'month' = 'month', opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-types', period],
    queryFn: () => financeApi.getFeeTypes(period),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
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
  return useQuery<FinanceIntegrityScan>({
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

export function useAdvancedSearch(params: AdvancedSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'advanced-search', params],
    queryFn: () => financeApi.advancedSearch(params as Record<string, string | number | boolean | undefined>),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
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
    mutationFn: ({ paymentId, proof }: { paymentId: number; proof?: ConfirmPaymentProofPayload }) =>
      financeApi.confirmBankTransaction(paymentId, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'mobile-pending'] })
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

/** Lookup parent / contact connu par mobile (réutilisation frères-sœurs). */
export function useParentLookupByPhone(phone: string | undefined, isValid = true) {
  const normalized = phone?.trim() ?? ''
  const enabled = !!getAuthToken() && isValid && normalized.startsWith('+') && normalized.length >= 10

  return useQuery({
    queryKey: ['admin', 'parents', 'lookup', normalized],
    queryFn: () => parentsApi.lookupByPhone(normalized),
    enabled,
    staleTime: 30_000,
    retry: false,
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
    mutationFn: (payload: RevokeStaffInvitationPayload) => invitationsApi.revokeStaffInvitation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useResendStaffInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (targetUserId: number) => invitationsApi.resendStaffInvitation(targetUserId),
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
    mutationFn: (payload: PatchAttendanceSettingsPayload) => schoolsApi.updateAttendanceSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  })
}

export function useAttendanceNotificationDeliveries(params?: { status?: string; limit?: number }) {
  const schoolId = getAuthSchoolId()
  return useQuery({
    queryKey: ['admin', 'attendance-notifications', schoolId, params],
    queryFn: () => attendanceNotificationsApi.list(Number(schoolId), params),
    enabled: !!schoolId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useAttendanceReadiness() {
  return useQuery({
    queryKey: ['admin', 'schools', 'attendance-readiness'],
    queryFn: schoolsApi.getAttendanceReadiness,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useProvisionAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schoolsApi.provisionAttendanceSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools'] })
    },
  })
}

export function useSchoolBranding() {
  return useQuery({
    queryKey: ['admin', 'schools', 'branding'],
    queryFn: schoolsApi.getBranding,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateSchoolBranding() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (
      payload: Partial<
        Pick<
          SchoolBranding,
          'address' | 'phone' | 'email' | 'city' | 'logoUrl' | 'slogan' | 'devise' | 'legalFooter' | 'cardTheme'
        > & { documentAccentColor?: string | null }
      >,
    ) => schoolsApi.updateBranding(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'branding'] })
      toast.success('Identité enregistrée', 'Logo et adresse mis à jour pour les reçus.')
    },
    onError: (err) => {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    },
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

// ── Fraud ───────────────────────────────────────────────────────────

export function useFraudAlertsTop() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts-list'],
    queryFn: adminFraudApi.getAlerts,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useCheckFraud() {
  return useMutation({
    mutationFn: (payload: { studentId: number; amount?: number; method?: string }) => adminFraudApi.check(payload),
  })
}
