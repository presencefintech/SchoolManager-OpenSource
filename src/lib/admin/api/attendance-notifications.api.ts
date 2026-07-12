import { apiClient } from '@/lib/api/client'
import type { AttendanceNotificationDelivery } from '@/types/admin'

export type AttendanceDeliveryListParams = {
  status?: string
  studentId?: number
  limit?: number
  cursor?: number
}

export const attendanceNotificationsApi = {
  list: (schoolId: number, params?: AttendanceDeliveryListParams) =>
    apiClient
      .get<{ success: boolean; data: { deliveries: AttendanceNotificationDelivery[]; schoolId: number } }>(
        `/admin/schools/${schoolId}/attendance-notifications`,
        { params },
      )
      .then((r) => r.data.data),
}
