import { apiClient } from '@/lib/api/client'
import type { ParentInvitationCode, StaffInvitation, InvitationStatusSummary, GenerateParentCodePayload, InviteStaffPayload } from '@/types/admin'

export const invitationsApi = {
  getStatus: () =>
    apiClient.get('/admin/invitations/status').then(r => r.data.data as InvitationStatusSummary),

  generateParentCode: (payload: GenerateParentCodePayload) =>
    apiClient.post('/admin/invitations/parent-code', payload).then(r => r.data.data as ParentInvitationCode),

  revokeParentCode: (codeId: number) =>
    apiClient.delete(`/admin/invitations/parent-code/${codeId}`).then(r => r.data),

  inviteStaff: (payload: InviteStaffPayload) =>
    apiClient.post('/admin/invitations/staff', payload).then(r => r.data.data as StaffInvitation),

  revokeStaffInvitation: (email: string) =>
    apiClient.delete('/admin/invitations/staff/revoke', { data: { email } }).then(r => r.data),
}
