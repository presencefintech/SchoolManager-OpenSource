import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getAuthToken } from '@/lib/api/auth-storage'
import { superAdminApi } from '@/lib/superAdmin/api'
import { financeApi } from '@/lib/superAdmin/api/finance.api'
import { feesApi } from '@/lib/superAdmin/api/fees.api'
import { invitationsApi } from '@/lib/superAdmin/api/invitations.api'
import { usersApi } from '@/lib/superAdmin/api/users.api'
import { notificationsApi } from '@/lib/superAdmin/api/notifications.api'
import { fraudApi } from '@/lib/superAdmin/api/fraud.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'
import { queryKeys } from '@/lib/query/keys'
import type {
  InviteStaffPayload,
  RevokeStaffInvitationPayload,
  ResendStaffInvitationPayload,
} from '@/types/super-admin'

export function useCoreUsers(params?: { page?: number; take?: number; role?: string }) {
  return useQuery({
    queryKey: queryKeys.superadmin.core.users(params),
    queryFn: () => {
      const { page = 1, take = 15, ...rest } = params ?? {}
      return superAdminApi.listCoreUsers({ ...rest, page, take })
    },
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCoreStudents(params?: { page?: number; take?: number; schoolId?: number }) {
  return useQuery({
    queryKey: queryKeys.superadmin.core.students(params),
    queryFn: () => {
      const { page = 1, take = 15, ...rest } = params ?? {}
      return superAdminApi.listCoreStudents({ ...rest, page, take })
    },
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCorePresences(params?: { page?: number; take?: number; schoolId?: number }) {
  return useQuery({
    queryKey: queryKeys.superadmin.core.presences(params),
    queryFn: () => {
      const { page = 1, take = 15, ...rest } = params ?? {}
      return superAdminApi.listCorePresences({ ...rest, page, take })
    },
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceReport(
  params: { schoolId: number; startDate: string; endDate: string } | null
) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.report(params),
    queryFn: () => superAdminApi.getFinanceReport(params!),
    staleTime: 300_000,
    enabled: !!getAuthToken() && !!params?.schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useCoreAuditLogs(params?: { page?: number; take?: number }) {
  return useQuery({
    queryKey: queryKeys.superadmin.core.auditLogs(params),
    queryFn: () => superAdminApi.getCoreAuditLogs(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: queryKeys.superadmin.stats(),
    queryFn: superAdminApi.getStats,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useGodModeDashboardStats(days = 30) {
  return useQuery({
    queryKey: ['superadmin', 'dashboard-stats', days],
    queryFn: () => superAdminApi.getDashboardStats({ days }),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export type SchoolsListParams = {
  q?: string
  page?: number
  take?: number
  status?: string
}

export function useSchools() {
  return useQuery({
    queryKey: queryKeys.superadmin.schools({ list: 'all' }),
    queryFn: async () => {
      const { rows } = await superAdminApi.getSchools({ take: 250, page: 1 })
      return rows
    },
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useSchoolsPaginated(params: SchoolsListParams) {
  const { page = 1, take = 12, q, status = 'all' } = params
  return useQuery({
    queryKey: queryKeys.superadmin.schools({ page, take, q: q?.trim() || undefined, status }),
    queryFn: () =>
      superAdminApi.getSchools({
        page,
        take,
        q: q?.trim() || undefined,
        status: status === 'all' ? undefined : status,
      }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.school(id),
    queryFn: () => superAdminApi.getSchool(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useUpdateSchoolSaas(schoolId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: import('@/types/super-admin').SchoolSaasUpdatePayload) =>
      superAdminApi.updateSchoolSaas(schoolId, body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.superadmin.school(schoolId) })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'schools'] })
    },
  })
}

export function useOnboardSchool() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: Parameters<typeof superAdminApi.onboardSchool>[0]) =>
      superAdminApi.onboardSchool(body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['superadmin', 'schools'] })
    },
  })
}

export function useSchoolPrintLogs(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'school-print-logs', schoolId],
    queryFn: () => superAdminApi.getSchoolPrintLogs(schoolId, 25),
    enabled: !!getAuthToken() && !!schoolId,
    staleTime: 15_000,
  })
}

export function useSchoolPerformance(id: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.performance(id),
    queryFn: () => financeApi.getFinancePerformance(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useSchoolPaymentDashboard(id: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.schoolPaymentDashboard(id),
    queryFn: () => superAdminApi.getSchoolPaymentDashboard(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useSchoolAnomalies(id: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.anomalies(id),
    queryFn: () => financeApi.getFinanceAnomalies(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useReconciliationHealth() {
  return useQuery({
    queryKey: queryKeys.superadmin.monitoring.reconciliation(),
    queryFn: () => superAdminApi.getReconciliationHealth(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useProviderStats() {
  return useQuery({
    queryKey: queryKeys.superadmin.monitoring.providers(),
    queryFn: () => superAdminApi.getProviderStats(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useSecurityAlerts() {
  return useQuery({
    queryKey: queryKeys.superadmin.monitoring.alerts(),
    queryFn: () => superAdminApi.getSecurityAlerts(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function usePlatformHealth() {
  return useQuery({
    queryKey: queryKeys.superadmin.monitoring.platformHealth(),
    queryFn: () => superAdminApi.getPlatformHealth(),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useAnomalyDashboard() {
  return useQuery({
    queryKey: queryKeys.superadmin.anomalies.dashboard(),
    queryFn: () => superAdminApi.getAnomalyDashboard(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useMobileMoneyMetrics() {
  return useQuery({
    queryKey: queryKeys.superadmin.mm.metrics(),
    queryFn: () => superAdminApi.getMobileMoneyMetrics(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useFraudRadar() {
  return useQuery({
    queryKey: queryKeys.superadmin.mm.fraudRadar(),
    queryFn: () => superAdminApi.getFraudRadar(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useQueueStatus() {
  return useQuery({
    queryKey: queryKeys.superadmin.notifications.queueStatus(),
    queryFn: () => notificationsApi.getQueueStatus(),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
  })
}

export function useActiveSessions() {
  return useQuery({
    queryKey: queryKeys.superadmin.auth.sessions(),
    queryFn: () => superAdminApi.getActiveSessions(),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useAuditSnapshot() {
  return useQuery({
    queryKey: queryKeys.superadmin.audit.snapshot(),
    queryFn: () => superAdminApi.getAuditSnapshot(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useStorageStats() {
  return useQuery({
    queryKey: queryKeys.superadmin.storage.stats(),
    queryFn: () => superAdminApi.getStorageStats(),
    enabled: !!getAuthToken(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useAuditTrail() {
  return useQuery({
    queryKey: queryKeys.superadmin.audit.trail(),
    queryFn: () => superAdminApi.getAuditTrail({ limit: 15 }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useClasses(schoolId: number, params?: { page?: number; limit?: number; name?: string }) {
  return useQuery({
    queryKey: queryKeys.superadmin.classes.list(schoolId, params),
    queryFn: () => superAdminApi.getClasses(schoolId, { limit: 30, ...params }),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useCapacityAlerts(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.classes.capacity(schoolId),
    queryFn: () => superAdminApi.getCapacityAlerts(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useClassSetup(classId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.classes.setup(classId),
    queryFn: () => superAdminApi.validateSetup(classId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useClassPerformance(classId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.classes.performance(classId),
    queryFn: () => superAdminApi.getPerformanceStats(classId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useClassAuditTrail(classId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.classes.auditTrail(classId),
    queryFn: () => superAdminApi.getClassAuditTrail(classId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useWorkerHealth(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.enrollment.worker(schoolId),
    queryFn: () => superAdminApi.getWorkerHealth(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinancePerformance(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.performance(schoolId),
    queryFn: () => superAdminApi.getFinancePerformance(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceEfficiency(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.efficiency(schoolId),
    queryFn: () => superAdminApi.getFinanceEfficiency(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useTopPayers(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.topPayers(schoolId),
    queryFn: () => superAdminApi.getTopPayers(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceAnomalies(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.anomalies(schoolId),
    queryFn: () => superAdminApi.getFinanceAnomalies(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceAuditFull(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.auditFull(schoolId),
    queryFn: () => superAdminApi.getFinanceAuditFull(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useEndOfDaySnapshot(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.snapshot(schoolId),
    queryFn: () => superAdminApi.getEndOfDaySnapshot(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useGroupFinanceDashboard(params?: { schoolIds?: string; startDate?: string; endDate?: string }) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.groupDashboard(params),
    queryFn: () => superAdminApi.getGroupDashboard(params),
    staleTime: 60_000,
    enabled: !!getAuthToken(),
    refetchOnWindowFocus: false,
  })
}

export function useCollectionBenchmarks(
  schoolId: number,
  params?: { startDate?: string; endDate?: string },
) {
  return useQuery({
    queryKey: queryKeys.superadmin.finance.benchmarks(schoolId, params),
    queryFn: () => superAdminApi.getBenchmarks(schoolId, params),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useCloneFeeCatalog() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: superAdminApi.cloneFeeCatalog,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['superadmin', 'fees'] })
    },
  })
}

export function useFinanceAudit(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.enrollment.financeAudit(schoolId),
    queryFn: () => superAdminApi.getFinanceAudit(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceDashboard(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.presence.dashboard(schoolId),
    queryFn: () => superAdminApi.getPresenceDashboard(schoolId),
    staleTime: 15_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  })
}

export function useStudentSchoolStats(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.stats(schoolId),
    queryFn: () => superAdminApi.getSchoolStats(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentList(
  schoolId: number,
  params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string }
) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.list(schoolId, params),
    queryFn: () => superAdminApi.listStudents(schoolId, params),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDebtors(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.debtors(schoolId),
    queryFn: () => superAdminApi.getDebtors(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDashboard(studentId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.dashboard(studentId),
    queryFn: () => superAdminApi.getStudentDashboard(studentId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentActivity(studentId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.activity(studentId),
    queryFn: () => superAdminApi.getStudentActivity(studentId, 15),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDossier(studentId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.students.dossier(studentId),
    queryFn: () => superAdminApi.getStudentDossier(studentId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useFeeSchoolStructures(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.fees.structures(schoolId),
    queryFn: () => feesApi.getSchoolStructures(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFeeHistory(feeId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.fees.history(feeId),
    queryFn: () => feesApi.getFeeHistory(feeId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!feeId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentInvoiceAudit(schoolId: number, studentId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.fees.invoices(schoolId, studentId),
    queryFn: () => feesApi.getStudentInvoiceAudit(schoolId, studentId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolInvitations(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.invitations.school(schoolId),
    queryFn: () => invitationsApi.getSchoolInvitations(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useInviteStaffSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteStaffPayload) => invitationsApi.inviteStaff(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.superadmin.invitations.school(vars.schoolId) })
    },
  })
}

export function useRevokeStaffInvitationSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RevokeStaffInvitationPayload) => invitationsApi.revokeStaff(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.superadmin.invitations.school(vars.schoolId) })
    },
  })
}

export function useResendStaffInvitationSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: ResendStaffInvitationPayload) => invitationsApi.resendStaffInvitation(payload),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.superadmin.invitations.school(vars.schoolId) })
    },
  })
}

export function useSuspendUserSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: number; schoolId?: number; reason?: string }) =>
      usersApi.suspendAccount(payload),
    onSuccess: (_data, vars) => {
      if (vars.schoolId) {
        qc.invalidateQueries({ queryKey: queryKeys.superadmin.invitations.school(vars.schoolId) })
      }
    },
  })
}

export function useReactivateUserSuperAdmin() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { userId: number; schoolId?: number }) =>
      usersApi.reactivateAccount(payload),
    onSuccess: (_data, vars) => {
      if (vars.schoolId) {
        qc.invalidateQueries({ queryKey: queryKeys.superadmin.invitations.school(vars.schoolId) })
      }
    },
  })
}

export function useCoreUsersSuperAdmin(params?: { page?: number; take?: number; role?: string; q?: string }) {
  return useQuery({
    queryKey: queryKeys.superadmin.core.users(params),
    queryFn: () => superAdminApi.listCoreUsers(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    placeholderData: (prev) => prev,
  })
}

export function useRegeneratePasswordSuperAdmin() {
  return useMutation({
    mutationFn: (userId: number) => superAdminApi.regeneratePassword(userId),
  })
}

export function useNotificationLogs(params?: { page?: number; limit?: number; schoolId?: number }) {
  return useQuery({
    queryKey: queryKeys.superadmin.notifications.logs(params),
    queryFn: () => notificationsApi.getLogs(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudFlags(params?: { schoolId?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.superadmin.fraud.flags(params),
    queryFn: () => fraudApi.getFlags(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function usePaymentSecurityAudit(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.paymentStats.securityAudit(schoolId),
    queryFn: () => superAdminApi.getPaymentSecurityAudit(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useHighRiskProfiles(schoolId: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.paymentStats.highRisk(schoolId),
    queryFn: () => superAdminApi.getHighRiskProfiles(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useAnomalyThresholds(schoolId?: number) {
  return useQuery({
    queryKey: queryKeys.superadmin.anomalies.thresholds(schoolId),
    queryFn: () => anomaliesApi.getThresholds(schoolId!),
    enabled: !!getAuthToken() && !!schoolId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}
