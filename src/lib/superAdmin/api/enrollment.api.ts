import { apiClient } from '@/lib/api/client'
import type {
  WorkerHealth,
  FinanceAuditResult,
  EnrollmentCreateResult,
  SuperAdminCreateStudentInput,
} from '@/types/super-admin'

const ENROLLMENT_TIMEOUT_MS = 90_000

function appendFormFields(fd: FormData, payload: SuperAdminCreateStudentInput) {
  Object.entries(payload).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    fd.append(key, String(value))
  })
}

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

  /**
   * Inscription forcée super-admin (JSON ou multipart si photo).
   * @see docs/api-contracts/enrollment-architecture.md
   */
  createStudent: (payload: SuperAdminCreateStudentInput, photo?: File | null) => {
    const config = { timeout: ENROLLMENT_TIMEOUT_MS }

    if (photo) {
      const fd = new FormData()
      appendFormFields(fd, payload)
      fd.append('photo', photo)
      return apiClient
        .post<{ success: boolean; data: EnrollmentCreateResult }>('/superadmin/enrollment', fd, {
          ...config,
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        .then((r) => r.data.data)
    }

    return apiClient
      .post<{ success: boolean; data: EnrollmentCreateResult }>('/superadmin/enrollment', payload, config)
      .then((r) => r.data.data)
  },

  testFaceId: (studentId: number, imageBase64: string) =>
    apiClient
      .post<{ success: boolean; data: { match: boolean; score: number } }>(
        '/superadmin/enrollment/audit/test-face-id',
        { studentId, imageBase64 },
      )
      .then((r) => r.data.data),

  injectBiometrics: (studentId: number, payload: { faceVector: number[] }) =>
    apiClient
      .put<{ success: boolean; data: { updated: boolean }; message?: string }>(
        `/superadmin/enrollment/${studentId}/biometrics`,
        payload,
      )
      .then((r) => r.data),
}
