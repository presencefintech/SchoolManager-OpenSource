import { apiClient } from '@/lib/api/client'
import type { StaffMember, CreateStaffPayload } from '@/types/admin'

export const staffApi = {
  list: () =>
    apiClient.get<{ success: boolean; data: StaffMember[] }>('/admin/staff')
      .then(r => r.data.data),

  create: (payload: CreateStaffPayload) =>
    apiClient.post<{ success: boolean; data: StaffMember }>('/admin/staff', payload)
      .then(r => r.data.data),

  disable: (id: number) =>
    apiClient.delete<{ success: boolean }>(`/admin/staff/${id}`)
      .then(r => r.data),

  createStaffUser: (payload: CreateStaffPayload) =>
    apiClient.post<{ success: boolean; data: StaffMember }>('/admin/users/staff', payload)
      .then(r => r.data.data),
}
