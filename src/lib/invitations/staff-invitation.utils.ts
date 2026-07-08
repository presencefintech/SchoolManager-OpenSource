/** Règles d'affichage des actions sur une invitation staff. */
export type StaffInvitationRow = {
  id: number
  userId?: number | null
  status?: string
  verificationStep?: string
  userStatus?: string | null
}

export function canResendStaffInvitation(inv: StaffInvitationRow): boolean {
  if (!inv.userId) return false
  if (inv.userStatus === 'ACTIVE') return false
  if (inv.verificationStep === 'COMPLETED') return false
  return inv.status !== 'REVOKED'
}

export function canDeleteStaffInvitation(inv: StaffInvitationRow): boolean {
  if (inv.userStatus === 'ACTIVE') return false
  return inv.status !== 'ACCEPTED' || inv.verificationStep !== 'COMPLETED'
}

export function canSuspendStaffAccount(inv: StaffInvitationRow): boolean {
  return !!inv.userId && inv.userStatus === 'ACTIVE'
}

export function canReactivateStaffAccount(inv: StaffInvitationRow): boolean {
  return !!inv.userId && inv.userStatus === 'SUSPENDED'
}
