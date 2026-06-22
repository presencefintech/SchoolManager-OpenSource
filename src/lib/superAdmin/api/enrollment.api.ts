import { apiClient } from '@/lib/api/client'
import type { WorkerHealth, FinanceAuditResult } from '@/types/super-admin'

export const enrollmentApi = {
  getWorkerHealth: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: WorkerHealth }>(`/superadmin/enrollment/audit/worker/${schoolId}`)
      .then((r) => r.data.data),

  getFinanceAudit: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: FinanceAuditResult }>(`/superadmin/enrollment/audit/finance/${schoolId}`)
      .then((r) => r.data.data),

  getStudentIntegrity: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: unknown }>(`/superadmin/enrollment/${studentId}/integrity`)
      .then((r) => r.data.data),

  toggleStudentLock: (studentId: number, isLocked: boolean) =>
    apiClient
      .patch<{ success: boolean; message: string }>(`/superadmin/enrollment/${studentId}/lock`, { isLocked })
      .then((r) => r.data),

  setStudentGracePeriod: (studentId: number, until: string | null) =>
    apiClient
      .patch<{ success: boolean; message: string }>(`/superadmin/enrollment/${studentId}/grace-period`, { until })
      .then((r) => r.data),

  purgeStudent: (studentId: number) =>
    apiClient
      .delete<{ success: boolean; message: string }>(`/superadmin/enrollment/${studentId}/purge`)
      .then((r) => r.data),
}
