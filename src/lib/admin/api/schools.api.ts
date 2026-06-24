import { apiClient } from '@/lib/api/client'
import type { AttendanceSettings } from '@/types/admin'

export const schoolsApi = {
  getAttendanceSettings: () =>
    apiClient.get('/admin/schools/attendance-settings').then(r => r.data.data as AttendanceSettings),

  updateAttendanceSettings: (payload: Partial<AttendanceSettings>) =>
    apiClient.put('/admin/schools/attendance-settings', payload).then(r => r.data.data as AttendanceSettings),
}
