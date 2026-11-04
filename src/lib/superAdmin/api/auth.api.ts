import { apiClient } from '@/lib/api/client'
import type { ActiveSessionItem, RegeneratePasswordResult } from '@/types/super-admin'

export const authApi = {
  getActiveSessions: (params?: { schoolId?: number; limit?: number; offset?: number }) =>
    apiClient
      .get<{ success: boolean; data: ActiveSessionItem[] }>('/superadmin/auth/sessions/active', { params })
      .then((r) => r.data.data),

  forceLogout: (userId: number) =>
    apiClient
      .post<{ success: boolean; message: string }>(`/superadmin/auth/force-logout/${userId}`)
      .then((r) => r.data),

  resetMFA: (userId: number) =>
    apiClient
      .post<{ success: boolean; data: { qrCode?: string; secret?: string } }>(`/superadmin/auth/reset-mfa/${userId}`)
      .then((r) => r.data),

  cleanupSessions: (days = 30) =>
    apiClient
      .delete<{ success: boolean; data: { count: number } }>('/superadmin/auth/sessions/cleanup', { params: { days } })
      .then((r) => r.data),

  triggerPasswordReset: (email: string) =>
    apiClient
      .post<{ success: boolean; message: string }>(
        '/superadmin/auth/trigger-reset',
        { email },
        { timeout: 90_000 },
      )
      .then((r) => r.data),

  regeneratePassword: (userId: number) =>
    apiClient
      .post<{ success: boolean; message: string; data: RegeneratePasswordResult }>(
        `/superadmin/auth/regenerate-password/${userId}`,
      )
      .then((r) => r.data.data),

  generateInvite: (studentId: number, schoolId: number) =>
    apiClient
      .post<{ success: boolean; data: { code: string; expiresAt: string } }>('/superadmin/auth/generate-invite', { studentId, schoolId })
      .then((r) => r.data.data),
}
