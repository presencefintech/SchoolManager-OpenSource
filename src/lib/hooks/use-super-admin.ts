import { useQuery } from '@tanstack/react-query'
import { getAuthToken } from '@/lib/api/auth-storage'
import { superAdminApi } from '@/lib/superAdmin/api'
import { feesApi } from '@/lib/superAdmin/api/fees.api'
import { invitationsApi } from '@/lib/superAdmin/api/invitations.api'
import { notificationsApi } from '@/lib/superAdmin/api/notifications.api'
import { fraudApi } from '@/lib/superAdmin/api/fraud.api'
import { anomaliesApi } from '@/lib/superAdmin/api/anomalies.api'

export function useCoreUsers(params?: { page?: number; take?: number; role?: string }) {
  return useQuery({
    queryKey: ['superadmin', 'core', 'users', params],
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
    queryKey: ['superadmin', 'core', 'students', params],
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
    queryKey: ['superadmin', 'core', 'presences', params],
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
    queryKey: ['superadmin', 'finance', 'report', params],
    queryFn: () => superAdminApi.getFinanceReport(params!),
    staleTime: 300_000,
    enabled: !!getAuthToken() && !!params?.schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useCoreAuditLogs(params?: { page?: number; take?: number }) {
  return useQuery({
    queryKey: ['superadmin', 'core', 'audit-logs', params],
    queryFn: () => superAdminApi.getCoreAuditLogs(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function usePlatformStats() {
  return useQuery({
    queryKey: ['superadmin', 'stats'],
    queryFn: superAdminApi.getStats,
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useSchools() {
  return useQuery({
    queryKey: ['superadmin', 'schools'],
    queryFn: () => superAdminApi.getSchools(),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
  })
}

export function useSchool(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id],
    queryFn: () => superAdminApi.getSchool(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useSchoolPerformance(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'performance'],
    queryFn: () => superAdminApi.getSchoolPerformance(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useSchoolPaymentDashboard(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'payment-dashboard'],
    queryFn: () => superAdminApi.getSchoolPaymentDashboard(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useSchoolAnomalies(id: number) {
  return useQuery({
    queryKey: ['superadmin', 'schools', id, 'anomalies'],
    queryFn: () => superAdminApi.getSchoolAnomalies(id),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!id,
  })
}

export function useReconciliationHealth() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'reconciliation'],
    queryFn: () => superAdminApi.getReconciliationHealth(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useProviderStats() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'providers'],
    queryFn: () => superAdminApi.getProviderStats(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useSecurityAlerts() {
  return useQuery({
    queryKey: ['superadmin', 'monitoring', 'alerts'],
    queryFn: () => superAdminApi.getSecurityAlerts(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useAnomalyDashboard() {
  return useQuery({
    queryKey: ['superadmin', 'anomalies', 'dashboard'],
    queryFn: () => superAdminApi.getAnomalyDashboard(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useMobileMoneyMetrics() {
  return useQuery({
    queryKey: ['superadmin', 'mm', 'metrics'],
    queryFn: () => superAdminApi.getMobileMoneyMetrics(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useFraudRadar() {
  return useQuery({
    queryKey: ['superadmin', 'mm', 'fraud-radar'],
    queryFn: () => superAdminApi.getFraudRadar(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
  })
}

export function useQueueStatus() {
  return useQuery({
    queryKey: ['superadmin', 'notifications', 'queue-status'],
    queryFn: () => superAdminApi.getQueueStatus(),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
  })
}

export function useActiveSessions() {
  return useQuery({
    queryKey: ['superadmin', 'auth', 'sessions'],
    queryFn: () => superAdminApi.getActiveSessions(),
    enabled: !!getAuthToken(),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useAuditSnapshot() {
  return useQuery({
    queryKey: ['superadmin', 'audit', 'snapshot'],
    queryFn: () => superAdminApi.getAuditSnapshot(),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useStorageStats() {
  return useQuery({
    queryKey: ['superadmin', 'storage', 'stats'],
    queryFn: () => superAdminApi.getStorageStats(),
    enabled: !!getAuthToken(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useAuditTrail() {
  return useQuery({
    queryKey: ['superadmin', 'audit', 'trail'],
    queryFn: () => superAdminApi.getAuditTrail({ limit: 15 }),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useClasses(schoolId: number, params?: { page?: number; limit?: number; name?: string }) {
  return useQuery({
    queryKey: ['superadmin', 'classes', schoolId, params],
    queryFn: () => superAdminApi.getClasses(schoolId, { limit: 30, ...params }),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useCapacityAlerts(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'classes', 'capacity', schoolId],
    queryFn: () => superAdminApi.getCapacityAlerts(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useClassSetup(classId: number) {
  return useQuery({
    queryKey: ['superadmin', 'classes', 'setup', classId],
    queryFn: () => superAdminApi.validateSetup(classId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useClassPerformance(classId: number) {
  return useQuery({
    queryKey: ['superadmin', 'classes', 'performance', classId],
    queryFn: () => superAdminApi.getPerformanceStats(classId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useClassAuditTrail(classId: number) {
  return useQuery({
    queryKey: ['superadmin', 'classes', 'audit', classId],
    queryFn: () => superAdminApi.getClassAuditTrail(classId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!classId,
    refetchOnWindowFocus: false,
  })
}

export function useWorkerHealth(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'enrollment', 'worker', schoolId],
    queryFn: () => superAdminApi.getWorkerHealth(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinancePerformance(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'performance', schoolId],
    queryFn: () => superAdminApi.getFinancePerformance(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceEfficiency(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'efficiency', schoolId],
    queryFn: () => superAdminApi.getFinanceEfficiency(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useTopPayers(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'top-payers', schoolId],
    queryFn: () => superAdminApi.getTopPayers(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceAnomalies(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'anomalies', schoolId],
    queryFn: () => superAdminApi.getFinanceAnomalies(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceAuditFull(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'audit-full', schoolId],
    queryFn: () => superAdminApi.getFinanceAuditFull(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useEndOfDaySnapshot(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'finance', 'snapshot', schoolId],
    queryFn: () => superAdminApi.getEndOfDaySnapshot(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceAudit(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'enrollment', 'finance-audit', schoolId],
    queryFn: () => superAdminApi.getFinanceAudit(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceDashboard(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'presence', 'dashboard', schoolId],
    queryFn: () => superAdminApi.getPresenceDashboard(schoolId),
    staleTime: 15_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
    refetchInterval: 30_000,
  })
}

export function useStudentSchoolStats(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'students', 'stats', schoolId],
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
    queryKey: ['superadmin', 'students', 'list', schoolId, params],
    queryFn: () => superAdminApi.listStudents(schoolId, params),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDebtors(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'students', 'debtors', schoolId],
    queryFn: () => superAdminApi.getDebtors(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDashboard(studentId: number) {
  return useQuery({
    queryKey: ['superadmin', 'students', 'dashboard', studentId],
    queryFn: () => superAdminApi.getStudentDashboard(studentId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentActivity(studentId: number) {
  return useQuery({
    queryKey: ['superadmin', 'students', 'activity', studentId],
    queryFn: () => superAdminApi.getStudentActivity(studentId, 15),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDossier(studentId: number) {
  return useQuery({
    queryKey: ['superadmin', 'students', 'dossier', studentId],
    queryFn: () => superAdminApi.getStudentDossier(studentId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useFeeSchoolStructures(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'fees', 'structures', schoolId],
    queryFn: () => feesApi.getSchoolStructures(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useFeeHistory(feeId: number) {
  return useQuery({
    queryKey: ['superadmin', 'fees', 'history', feeId],
    queryFn: () => feesApi.getFeeHistory(feeId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!feeId,
    refetchOnWindowFocus: false,
  })
}

export function useStudentInvoiceAudit(schoolId: number, studentId: number) {
  return useQuery({
    queryKey: ['superadmin', 'fees', 'invoices', schoolId, studentId],
    queryFn: () => feesApi.getStudentInvoiceAudit(schoolId, studentId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId && !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolInvitations(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'invitations', 'school', schoolId],
    queryFn: () => invitationsApi.getSchoolInvitations(schoolId),
    staleTime: 30_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useNotificationLogs(params?: { page?: number; limit?: number; schoolId?: number }) {
  return useQuery({
    queryKey: ['superadmin', 'notifications', 'logs', params],
    queryFn: () => notificationsApi.getLogs(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFraudFlags(params?: { schoolId?: number; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['superadmin', 'fraud', 'flags', params],
    queryFn: () => fraudApi.getFlags(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function usePaymentSecurityAudit(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'payment-stats', 'security-audit', schoolId],
    queryFn: () => superAdminApi.getPaymentSecurityAudit(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useHighRiskProfiles(schoolId: number) {
  return useQuery({
    queryKey: ['superadmin', 'payment-stats', 'high-risk', schoolId],
    queryFn: () => superAdminApi.getHighRiskProfiles(schoolId),
    staleTime: 60_000,
    enabled: !!getAuthToken() && !!schoolId,
    refetchOnWindowFocus: false,
  })
}

export function useAnomalyThresholds() {
  return useQuery({
    queryKey: ['superadmin', 'anomalies', 'thresholds'],
    queryFn: () => anomaliesApi.getThresholds(),
    enabled: !!getAuthToken(),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}
