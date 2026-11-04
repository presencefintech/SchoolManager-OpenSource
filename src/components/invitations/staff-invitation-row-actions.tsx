'use client'

import { Loader2, PauseCircle, PlayCircle, RefreshCw, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  canDeleteStaffInvitation,
  canReactivateStaffAccount,
  canResendStaffInvitation,
  canSuspendStaffAccount,
  type StaffInvitationRow,
} from '@/lib/invitations/staff-invitation.utils'

type Props = {
  inv: StaffInvitationRow
  resendPending?: boolean
  revokePending?: boolean
  suspendPending?: boolean
  reactivatePending?: boolean
  onResend?: () => void
  onDelete?: () => void
  onSuspend?: () => void
  onReactivate?: () => void
  size?: 'sm' | 'md'
}

export function StaffInvitationRowActions({
  inv,
  resendPending,
  revokePending,
  suspendPending,
  reactivatePending,
  onResend,
  onDelete,
  onSuspend,
  onReactivate,
  size = 'sm',
}: Props) {
  const btn = size === 'md'
    ? 'inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-lg transition-colors disabled:opacity-40'
    : 'inline-flex items-center gap-1 px-1.5 py-1 text-[10px] font-medium rounded-md transition-colors disabled:opacity-40'

  return (
    <div className="flex flex-wrap items-center justify-end gap-1">
      {canResendStaffInvitation(inv) && onResend && (
        <button
          type="button"
          onClick={onResend}
          disabled={resendPending}
          className={cn(btn, 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100')}
          title="Renvoyer email + SMS"
        >
          {resendPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          Renvoyer
        </button>
      )}
      {canSuspendStaffAccount(inv) && onSuspend && (
        <button
          type="button"
          onClick={onSuspend}
          disabled={suspendPending}
          className={cn(btn, 'text-amber-700 bg-amber-50 hover:bg-amber-100')}
          title="Suspendre le compte"
        >
          {suspendPending ? <Loader2 size={12} className="animate-spin" /> : <PauseCircle size={12} />}
          Suspendre
        </button>
      )}
      {canReactivateStaffAccount(inv) && onReactivate && (
        <button
          type="button"
          onClick={onReactivate}
          disabled={reactivatePending}
          className={cn(btn, 'text-blue-700 bg-blue-50 hover:bg-blue-100')}
          title="Réactiver le compte"
        >
          {reactivatePending ? <Loader2 size={12} className="animate-spin" /> : <PlayCircle size={12} />}
          Réactiver
        </button>
      )}
      {canDeleteStaffInvitation(inv) && onDelete && (
        <button
          type="button"
          onClick={onDelete}
          disabled={revokePending}
          className={cn(btn, 'text-red-600 bg-red-50 hover:bg-red-100')}
          title="Supprimer l'invitation"
        >
          {revokePending ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
          Supprimer
        </button>
      )}
    </div>
  )
}
