import { apiClient } from '@/lib/api/client'
import type { NotificationLog, BroadcastResult, QueueStatus } from '@/types/super-admin'

export const notificationsApi = {
  broadcast: (payload: { title: string; message: string; schoolIds?: number[] }) =>
    apiClient
      .post<{ success: boolean; data: BroadcastResult }>('/superadmin/notifications/broadcast', payload)
      .then((r) => r.data.data),

  getLogs: (params?: { page?: number; limit?: number; schoolId?: number }) =>
    apiClient
      .get<{ success: boolean; data: NotificationLog[] }>('/superadmin/notifications/logs', { params })
      .then((r) => r.data.data),

  cleanup: () =>
    apiClient
      .post<{ success: boolean; data: { deleted: number } }>('/superadmin/notifications/cleanup')
      .then((r) => r.data.data),

  getQueueStatus: () =>
    apiClient
      .get<{ success: boolean; data: QueueStatus }>('/superadmin/notifications/queue-status')
      .then((r) => r.data.data),
}
