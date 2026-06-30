import { apiClient } from '@/lib/api/client'
import type { ParentInvitationCode, StaffInvitation, InvitationStatusSummary, GenerateParentCodePayload, InviteStaffPayload } from '@/types/admin'

export const invitationsApi = {
  getStatus: () =>
    apiClient.get('/admin/invitations/status').then(r => {
      // Le service retourne { success, message, data: { staff, parents } }
      // Le contrôleur l'enveloppe encore dans { success, data: <service_result> }
      // On navigue jusqu'aux données réelles
      const outer = r.data.data
      const inner = outer?.data ?? outer
      const staff: any[] = inner?.staff ?? inner?.staffInvitations ?? []
      const parents: any[] = inner?.parents ?? inner?.parentCodes ?? []

      return {
        staffInvitations: staff.map(s => ({
          id: s.id,
          email: s.email ?? s.user?.email ?? '',
          role: s.role ?? s.user?.role ?? '',
          firstName: s.user?.firstName ?? s.firstName ?? '',
          lastName: s.user?.lastName ?? s.lastName ?? '',
          status: s.status,
          createdAt: s.createdAt,
          userId: s.userId ?? s.user?.id ?? s.id,
        })),
        parentCodes: parents.map(p => ({
          id: p.id,
          code: p.code,
          studentId: p.studentId,
          student: p.student,
          expiresAt: p.expiresAt,
          createdAt: p.createdAt,
        })),
      } as InvitationStatusSummary & { staffInvitations: (StaffInvitation & { userId: number })[] }
    }),

  generateParentCode: (payload: GenerateParentCodePayload) =>
    apiClient.post('/admin/invitations/parent-code', payload).then(r => r.data.data as ParentInvitationCode),

  revokeParentCode: (codeId: number) =>
    apiClient.delete(`/admin/invitations/parent-code/${codeId}`).then(r => r.data),

  inviteStaff: (payload: InviteStaffPayload) =>
    apiClient.post('/admin/invitations/staff', payload).then(r => r.data.data as StaffInvitation),

  revokeStaffInvitation: (targetUserId: number) =>
    apiClient.delete('/admin/invitations/staff/revoke', { data: { targetUserId } }).then(r => r.data),
}
