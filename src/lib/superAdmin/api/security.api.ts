import { apiClient } from '@/lib/api/client'

export const securityApi = {
  suspendStudent: (data: { studentId: number; schoolId: number; reason: string }) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/security/suspend', data)
      .then((r) => r.data),

  unblockStudent: (schoolId: number, studentId: number) =>
    apiClient
      .patch<{ success: boolean; message: string }>(`/superadmin/security/unblock/${schoolId}/${studentId}`)
      .then((r) => r.data),

  reportFraud: (data: { studentId: number; schoolId: number; fraudScore: number; reason: string; metadata?: Record<string, unknown> }) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/security/report-fraud', data)
      .then((r) => r.data),

  auditPIIAccess: (data: { studentId: number; schoolId: number; dataType: 'BIOMETRIC' | 'PERSONAL_DOCS' | 'FINANCIAL_FULL' }) =>
    apiClient
      .post('/superadmin/security/audit-access', data)
      .then(() => null),
}
