import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { invitationsApi, parentsApi } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'
import type { GenerateParentCodePayload, InviteStaffPayload, RevokeStaffInvitationPayload } from '@/types/admin'

// ── Invitations ────────────────────────────────────────────────────

export function useInvitationStatus() {
  return useQuery({
    queryKey: ['admin', 'invitations', 'status'],
    queryFn: invitationsApi.getStatus,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useGenerateParentCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: GenerateParentCodePayload) => invitationsApi.generateParentCode(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

/** Lookup parent / contact connu par mobile (réutilisation frères-sœurs). */
export function useParentLookupByPhone(phone: string | undefined, isValid = true) {
  const normalized = phone?.trim() ?? ''
  const enabled = !!getAuthToken() && isValid && normalized.startsWith('+') && normalized.length >= 10

  return useQuery({
    queryKey: ['admin', 'parents', 'lookup', normalized],
    queryFn: () => parentsApi.lookupByPhone(normalized),
    enabled,
    staleTime: 30_000,
    retry: false,
  })
}

export function useRevokeParentCode() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (codeId: number) => invitationsApi.revokeParentCode(codeId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useInviteStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: InviteStaffPayload) => invitationsApi.inviteStaff(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useRevokeStaffInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RevokeStaffInvitationPayload) => invitationsApi.revokeStaffInvitation(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}

export function useResendStaffInvitation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (targetUserId: number) => invitationsApi.resendStaffInvitation(targetUserId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })
}
