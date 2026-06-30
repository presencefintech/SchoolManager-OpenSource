import { apiClient } from '@/lib/api/client'

export const adminNotificationsApi = {
  broadcastGroup: (payload: { title: string; message: string; roles: string[] }) =>
    apiClient
      .post<{ success: boolean; data: { sent: number } }>('/admin/notifications/broadcast-group', payload)
      .then((r) => r.data.data),

  sendDirect: (payload: { recipientId: number; title: string; message: string }) =>
    apiClient
      .post<{ success: boolean; data: { sent: boolean } }>('/admin/notifications/direct', payload)
      .then((r) => r.data.data),

  getHistory: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: unknown[] }>('/admin/notifications/history', { params })
      .then((r) => r.data.data ?? []),
}
