import { apiClient } from '@/lib/api/client'

export type NotificationDeliveryChannel = 'WEBSOCKET' | 'SMS' | 'EMAIL' | 'PUSH'

/** Entrée DLQ — `GET /admin/notifications/dlq` */
export type PresenceNotifDlqItem = {
  jobId: string | number | null
  name?: string
  timestamp?: number
  presenceId?: number
  studentId?: number
  schoolId?: number
  attemptsMade?: number
  deadAt?: string
  errorCode?: string
  errorMessage?: string
  originalJobId?: string
  data?: {
    schoolId?: number
    studentId?: number
    presenceId?: number
    failedReason?: string
  }
}

export type NotificationDlqItem = {
  deliveryId: string
  outboxId: string
  channel: NotificationDeliveryChannel
  userId: number
  userName: string | null
  title: string
  message: string
  correlationId: string | null
  lastError: string | null
  attempts: number
  createdAt: string
  dlqAlertedAt: string | null
  notificationType?: string | null
}

function extractList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)) {
    return (data as { items: unknown[] }).items
  }
  return []
}

function normalizeDlqItem(raw: unknown): NotificationDlqItem {
  const r = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
  const channel = String(r.channel ?? 'WEBSOCKET') as NotificationDeliveryChannel
  return {
    deliveryId: String(r.deliveryId ?? ''),
    outboxId: String(r.outboxId ?? ''),
    channel: ['WEBSOCKET', 'SMS', 'EMAIL', 'PUSH'].includes(channel) ? channel : 'WEBSOCKET',
    userId: Number(r.userId) || 0,
    userName: typeof r.userName === 'string' ? r.userName : null,
    title: String(r.title ?? ''),
    message: String(r.message ?? ''),
    correlationId: typeof r.correlationId === 'string' ? r.correlationId : null,
    lastError: typeof r.lastError === 'string' ? r.lastError : null,
    attempts: Number(r.attempts) || 0,
    createdAt:
      r.createdAt instanceof Date
        ? r.createdAt.toISOString()
        : String(r.createdAt ?? new Date().toISOString()),
    dlqAlertedAt: r.dlqAlertedAt
      ? r.dlqAlertedAt instanceof Date
        ? r.dlqAlertedAt.toISOString()
        : String(r.dlqAlertedAt)
      : null,
    notificationType: typeof r.notificationType === 'string' ? r.notificationType : null,
  }
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

  getDlq: (params?: { limit?: number; type?: string }) =>
    apiClient
      .get<{ success: boolean; data: unknown }>('/admin/notifications/dlq', { params })
      .then((r) => extractList(r.data.data).map(normalizeDlqItem)),

  retryDlq: (deliveryId: string) =>
    apiClient
      .post<{ success: boolean; message?: string }>(`/admin/notifications/dlq/${deliveryId}/retry`)
      .then((r) => r.data),

  getDeliverabilitySummary: (params?: { studentId?: number; classId?: number }) =>
    apiClient
      .get<{
        success: boolean
        data: {
          outbox: { pending: number; processing: number; completed: number; failed: number }
          deliveries: {
            pending: number
            sent: number
            failed: number
            dead: number
            skipped: number
          }
        }
      }>('/admin/notifications/deliverability/summary', { params })
      .then((r) => r.data.data),

  getPresenceDlq: (params?: { limit?: number }) =>
    apiClient
      .get<{
        success: boolean
        data: { redis?: boolean; items: PresenceNotifDlqItem[] }
      }>('/admin/notifications/presence-dlq', { params })
      .then((r) => r.data.data),

  replayPresenceDlq: (jobId: string) =>
    apiClient
      .post<{ success: boolean; message?: string }>(
        `/admin/notifications/presence-dlq/${encodeURIComponent(jobId)}/replay`,
      )
      .then((r) => r.data),

  discardPresenceDlq: (jobId: string) =>
    apiClient
      .delete<{ success: boolean; message?: string }>(
        `/admin/notifications/presence-dlq/${encodeURIComponent(jobId)}`,
      )
      .then((r) => r.data),

  getDeliverability: (params?: {
    status?: string
    channel?: string
    type?: string
    studentId?: number
    classId?: number
    limit?: number
    offset?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: unknown }>('/admin/notifications/deliverability', { params })
      .then((r) => r.data.data),
}
