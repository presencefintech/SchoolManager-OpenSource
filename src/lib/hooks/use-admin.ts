import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { dashboardApi, staffApi, studentsApi, enrollmentsApi, presencesApi } from '@/lib/admin/api'
import type { CreateStaffPayload, CreateEnrollmentPayload, RecordPresencePayload, BulkPresencePayload } from '@/types/admin'

// ── Dashboard ──────────────────────────────────────────────────────
export function useAdminStats() {
  return useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: dashboardApi.getStats,
    staleTime: 30_000,
    refetchInterval: 60_000,
  })
}

export function useLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'live-feed', params],
    queryFn: () => dashboardApi.getLiveFeed(params),
    staleTime: 0,
    refetchInterval: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useHeatmap(classId?: number) {
  return useQuery({
    queryKey: ['admin', 'heatmap', classId],
    queryFn: () => dashboardApi.getHeatmap(classId),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudAlerts() {
  return useQuery({
    queryKey: ['admin', 'fraud-alerts'],
    queryFn: dashboardApi.getFraudAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useControlStats() {
  return useQuery({
    queryKey: ['admin', 'control-stats'],
    queryFn: dashboardApi.getControlStats,
    staleTime: 30_000,
    refetchInterval: 30_000,
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
    mutationFn: ({ id, action, reason }: { id: number; action: string; reason?: string }) =>
      studentsApi.securityAction(id, action, reason),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['admin', 'students', id] }),
  })
}

// ── Enrollments ─────────────────────────────────────────────────────
export function useEnrollments(params?: { page?: number; limit?: number; search?: string }) {
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
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
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
  })
}
