import { apiClient } from '@/lib/api/client'

export const usersApi = {
  suspendAccount: (data: { userId: number; schoolId?: number; reason?: string }) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/users/suspend', data)
      .then((r) => r.data),

  reactivateAccount: (data: { userId: number; schoolId?: number }) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/users/reactivate', data)
      .then((r) => r.data),
}
