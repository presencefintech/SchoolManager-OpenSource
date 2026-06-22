import { apiClient } from '@/lib/api/client'
import type { SchoolInvitationsStatus } from '@/types/super-admin'

export const invitationsApi = {
  inviteStaff: (data: {
    email: string
    role: 'ADMIN' | 'FINANCE' | 'TEACHER'
    schoolId: number
    firstName: string
    lastName: string
  }) =>
    apiClient
      .post<{ success: boolean; message: string; data: unknown }>('/superadmin/invitations/staff', data)
      .then((r) => r.data),

  generateParentCode: (data: { studentId: number; schoolId: number; email?: string }) =>
    apiClient
      .post<{ success: boolean; message: string; data: { code?: string; expiresAt?: string } }>(
        '/superadmin/invitations/parent-code',
        data
      )
      .then((r) => r.data),

  getSchoolInvitations: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolInvitationsStatus }>(
        `/superadmin/invitations/school/${schoolId}`
      )
      .then((r) => r.data.data),

  revokeStaff: (data: { targetUserId: number; schoolId: number }) =>
    apiClient
      .delete<{ success: boolean; message: string }>('/superadmin/invitations/staff/revoke', { data })
      .then((r) => r.data),

  createAdmin: (data: { email: string; password: string; schoolId: number }) =>
    apiClient
      .post<{ success: boolean; message: string; data: unknown }>('/superadmin/users/create-admin', data)
      .then((r) => r.data),
}
