/**
 * Contrats notifications — alignés sur :
 * - `openapi/admin.json` — DLQ, broadcast, direct
 * - `openapi/superadmin.json` — queue-status, broadcast plateforme
 * - `openapi/parent-mobile.json` — PATCH /settings/notifications
 * - `openapi/admin-sockets.json` — événement socket `notification`
 *
 * Architecture backend : voir `../DETTE_NOTIFICATION.md` (copie de frontend_web/docs)
 */

/** Canal de livraison (Prisma NotificationDeliveryChannel) */
export type NotificationDeliveryChannel = 'WEBSOCKET' | 'SMS' | 'EMAIL' | 'PUSH'

/** Entrée DLQ — `GET /admin/notifications/dlq` */
export interface NotificationDlqItem {
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
}

/** Métriques file BullMQ — superadmin queue-status */
export interface NotificationQueueMetrics {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
}

/** `GET /superadmin/notifications/queue-status` → data */
export interface NotificationQueuesStatus {
  redisEnabled: boolean
  outbox: NotificationQueueMetrics
  fanout: NotificationQueueMetrics
}

/** Corps broadcast admin — `POST /admin/notifications/broadcast-group` */
export interface NotificationBroadcastBody {
  roles: Array<'ADMIN' | 'FINANCE' | 'TEACHER' | 'PARENT' | 'SUPER_ADMIN'>
  title: string
  message: string
  type?: string
}

/** Corps message direct — `POST /admin/notifications/direct` */
export interface NotificationDirectBody {
  targetUserId: number
  title: string
  message: string
}

/** Préférences parent — `PATCH /mobile/parents/settings/notifications` */
export interface ParentNotificationSettingsBody {
  email?: boolean
  push?: boolean
  /** Active SMS présence/absence (outbox + Africa's Talking) */
  sms?: boolean
}

/** Payload socket `notification` (room user_{userId}) */
export interface SocketNotificationPayload {
  id: number
  userId: number
  title: string
  message: string
  type: string
  schoolId: number
  studentId?: number | null
}
