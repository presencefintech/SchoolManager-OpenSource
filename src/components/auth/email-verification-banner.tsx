'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, Mail, RefreshCw } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { resolveApiErrorMessage } from '@/lib/auth/security-errors'
import { cn } from '@/lib/utils'

const STAFF_ROLES = new Set(['ADMIN', 'FINANCE', 'SUPER_ADMIN'])

export function EmailVerificationBanner() {
  const { user, refreshUser } = useAuth()
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)
  const [feedback, setFeedback] = useState<string | null>(null)

  if (!user || user.isEmailConfirmed !== false || !STAFF_ROLES.has(user.role)) {
    return null
  }

  async function handleResend() {
    setSending(true)
    setFeedback(null)
    try {
      const res = await fetch('/api/auth/resend-verification-email', {
        method: 'POST',
        credentials: 'include',
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        throw new Error(resolveApiErrorMessage(data, 'Envoi impossible.'))
      }
      setFeedback('Email de vérification renvoyé. Consultez votre boîte de réception.')
    } catch (err) {
      setFeedback(err instanceof Error ? err.message : 'Envoi impossible.')
    } finally {
      setSending(false)
    }
  }

  async function handleRefreshStatus() {
    setChecking(true)
    setFeedback(null)
    await refreshUser()
    setChecking(false)
    setFeedback('Statut actualisé. Si votre email est confirmé, le bandeau disparaîtra.')
  }

  return (
    <div
      role="status"
      className={cn(
        'mx-6 mt-4 rounded-2xl border border-amber-200/80 bg-amber-50/90 px-4 py-3',
        'flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between',
      )}
    >
      <div className="flex items-start gap-3">
        <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-medium text-amber-900">Email non vérifié</p>
          <p className="text-xs text-amber-800/80 mt-0.5">
            Les actions financières (paiements, validations, remboursements) sont bloquées jusqu&apos;à confirmation de
            votre adresse email.
          </p>
          {feedback && <p className="text-xs text-amber-900 mt-1.5">{feedback}</p>}
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => void handleRefreshStatus()}
          disabled={checking}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'rounded-xl px-3 py-2 text-xs font-medium',
            'border border-amber-300 bg-white text-amber-900 hover:bg-amber-100/80 disabled:opacity-60',
          )}
        >
          {checking ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
          J&apos;ai confirmé
        </button>
        <button
          type="button"
          onClick={() => void handleResend()}
          disabled={sending}
          className={cn(
            'inline-flex items-center justify-center gap-2',
            'rounded-xl px-3 py-2 text-xs font-medium',
            'bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60',
          )}
        >
          {sending ? <Loader2 size={14} className="animate-spin" /> : <Mail size={14} />}
          Renvoyer l&apos;email
        </button>
        <button
          type="button"
          onClick={() => void refreshUser()}
          disabled={checking}
          title="Actualiser le statut"
          className="inline-flex items-center justify-center rounded-xl p-2 text-amber-700 hover:bg-amber-100/80 disabled:opacity-60"
        >
          <RefreshCw size={14} className={checking ? 'animate-spin' : undefined} />
        </button>
      </div>
    </div>
  )
}
