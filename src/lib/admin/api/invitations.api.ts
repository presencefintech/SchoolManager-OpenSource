import { apiClient } from '@/lib/api/client'
import type { ParentInvitationCode, StaffInvitation, InvitationStatusSummary, GenerateParentCodePayload, InviteStaffPayload, RevokeStaffInvitationPayload } from '@/types/admin'

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
          verificationStep: s.verificationStep,
          verificationLabel: s.verificationLabel,
          createdAt: s.createdAt,
          userId: s.userId ?? s.user?.id ?? null,
          userStatus: s.user?.status ?? null,
        })),
        parentCodes: parents.map(p => ({
          id: p.id,
          code: p.code,
          studentId: p.studentId,
          student: p.student,
          expiresAt: p.expiresAt,
          createdAt: p.createdAt,
        })),
      } as InvitationStatusSummary
    }),

  generateParentCode: (payload: GenerateParentCodePayload) =>
    apiClient.post('/admin/invitations/parent-code', payload).then(r => r.data.data as ParentInvitationCode),

  revokeParentCode: (codeId: number) =>
    apiClient.delete(`/admin/invitations/parent-code/${codeId}`).then(r => r.data),

  inviteStaff: (payload: InviteStaffPayload) =>
    apiClient.post<{
      success: boolean
      message?: string
      data: StaffInvitation & {
        emailSent?: boolean
        smsSent?: boolean
        emailError?: string
        whatsappDeepLink?: string | null
        whatsappReady?: boolean
        whatsappError?: string
      }
      emailSent?: boolean
      smsSent?: boolean
      emailError?: string
      whatsappDeepLink?: string | null
      whatsappReady?: boolean
      whatsappError?: string
    }>('/admin/invitations/staff', payload).then((r) => ({
      ...(r.data.data ?? {}),
      message: r.data.message,
      emailSent: r.data.emailSent ?? r.data.data?.emailSent,
      smsSent: r.data.smsSent ?? r.data.data?.smsSent,
      emailError: r.data.emailError ?? r.data.data?.emailError,
      whatsappDeepLink: r.data.whatsappDeepLink ?? r.data.data?.whatsappDeepLink,
      whatsappReady: r.data.whatsappReady ?? r.data.data?.whatsappReady,
      whatsappError: r.data.whatsappError ?? r.data.data?.whatsappError,
    })),

  revokeStaffInvitation: (payload: RevokeStaffInvitationPayload) =>
    apiClient.delete('/admin/invitations/staff/revoke', { data: payload }).then(r => r.data),

  resendStaffInvitation: (targetUserId: number) =>
    apiClient
      .post<{
        success: boolean
        message?: string
        emailSent?: boolean
        smsSent?: boolean
        emailError?: string
        whatsappDeepLink?: string | null
        whatsappReady?: boolean
        whatsappError?: string
      }>('/admin/invitations/staff/resend', { targetUserId })
      .then((r) => r.data),
}
