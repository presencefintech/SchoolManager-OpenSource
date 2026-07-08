import { apiClient } from '@/lib/api/client'
import type {
  SchoolInvitationsStatus,
  StaffInvitation,
  ParentInvitation,
  InviteStaffPayload,
  RevokeStaffInvitationPayload,
  ResendStaffInvitationPayload,
} from '@/types/super-admin'

function normalizeSchoolInvitations(raw: unknown): SchoolInvitationsStatus {
  const outer = raw as { data?: { staff?: unknown[]; parents?: unknown[] }; staff?: unknown[]; parents?: unknown[] } | null
  const inner = outer?.data ?? outer
  const staffRaw: any[] = inner?.staff ?? []
  const parentsRaw: any[] = inner?.parents ?? []

  return {
    staff: staffRaw.map((s): StaffInvitation => ({
      id: s.id,
      email: s.email ?? s.user?.email ?? '',
      role: s.role ?? s.user?.role ?? '',
      firstName: s.user?.firstName ?? s.firstName ?? '',
      lastName: s.user?.lastName ?? s.lastName ?? '',
      status: s.status,
      verificationStep: s.verificationStep,
      verificationLabel: s.verificationLabel,
      createdAt: s.createdAt,
          userId: s.userId ?? s.user?.id ?? null,
          userStatus: s.user?.status ?? null,
    })),
    parents: parentsRaw.map((p): ParentInvitation => ({
      id: p.id,
      code: p.code,
      studentId: p.studentId,
      status: p.status ?? (p.usedById ? 'ACCEPTED' : 'PENDING'),
      createdAt: p.createdAt,
      email: p.email ?? p.student?.email,
    })),
  }
}

export const invitationsApi = {
  inviteStaff: (data: InviteStaffPayload) =>
    apiClient
      .post<{ success: boolean; message: string; data: unknown }>('/superadmin/invitations/staff', data)
      .then((r) => r.data),

  resendStaffInvitation: (data: ResendStaffInvitationPayload) =>
    apiClient
      .post<{ success: boolean; message: string }>('/superadmin/invitations/staff/resend', data)
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
      .get<{ success: boolean; data: unknown }>(`/superadmin/invitations/school/${schoolId}`)
      .then((r) => normalizeSchoolInvitations(r.data.data)),

  revokeStaff: (data: RevokeStaffInvitationPayload) =>
    apiClient
      .delete<{ success: boolean; message: string }>('/superadmin/invitations/staff/revoke', { data })
      .then((r) => r.data),

  createAdmin: (data: { email: string; password: string; schoolId: number }) =>
    apiClient
      .post<{ success: boolean; message: string; data: unknown }>('/superadmin/users/create-admin', data)
      .then((r) => r.data),
}
