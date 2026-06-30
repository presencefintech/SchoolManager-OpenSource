import { apiClient } from '@/lib/api/client'

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: unknown[] }).items
  }
  return []
}

export const adminNotificationsApi = {
  broadcastGroup: (payload: { title: string; message: string; roles: string[] }) =>
    apiClient
      .post<{ success: boolean; data: { sent: number } }>('/admin/notifications/broadcast-group', payload)
      .then((r) => r.data.data),

  sendDirect: (payload: { targetUserId: number; title: string; message: string }) =>
    apiClient
      .post<{ success: boolean; data: { sent: boolean } }>('/admin/notifications/direct', payload)
      .then((r) => r.data.data),

  getHistory: (params?: { limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: unknown }>('/admin/notifications/history', { params })
      .then((r) => extractList(r.data.data)),
}
