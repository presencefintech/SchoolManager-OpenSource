'use client'

import { useCallback, useEffect, useState } from 'react'
import { Eye, Loader2, LogOut } from 'lucide-react'
import {
  AUTH_COOKIE,
  decodeImpersonationCookie,
  type ImpersonationCookiePayload,
} from '@/lib/auth/session-cookies'
import { cn } from '@/lib/utils'

function readImpersonationFromDocument(): ImpersonationCookiePayload | null {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${AUTH_COOKIE.impersonation}=`))
  if (!match) return null
  const raw = match.slice(AUTH_COOKIE.impersonation.length + 1)
  return decodeImpersonationCookie(raw)
}

/**
 * Bannière fixe — visible dès qu'une impersonation Superadmin → école est active.
 */
export function ImpersonationBanner() {
  const [info, setInfo] = useState<ImpersonationCookiePayload | null>(null)
  const [exiting, setExiting] = useState(false)

  useEffect(() => {
    const payload = readImpersonationFromDocument()
    setInfo(payload)
    if (payload) {
      document.documentElement.style.setProperty('--impersonation-banner-h', '2.75rem')
      document.documentElement.dataset.impersonating = '1'
    } else {
      document.documentElement.style.removeProperty('--impersonation-banner-h')
      delete document.documentElement.dataset.impersonating
    }
    return () => {
      document.documentElement.style.removeProperty('--impersonation-banner-h')
      delete document.documentElement.dataset.impersonating
    }
  }, [])

  const exit = useCallback(async () => {
    setExiting(true)
    try {
      const res = await fetch('/api/superadmin/auth/impersonate/exit', {
        method: 'POST',
        credentials: 'include',
      })
      const data = (await res.json().catch(() => ({}))) as {
        success?: boolean
        redirectTo?: string
        message?: string
      }
      if (!res.ok) {
        window.alert(data.message || 'Impossible de quitter l’impersonation.')
        setExiting(false)
        return
      }
      window.location.assign(data.redirectTo || '/super-admin/schools')
    } catch {
      window.alert('Impossible de quitter l’impersonation.')
      setExiting(false)
    }
  }, [])

  if (!info) return null

  return (
    <div
      role="status"
      className={cn(
        'fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-3',
        'bg-amber-400 text-amber-950 shadow-md shadow-amber-900/15',
        'px-4 py-2.5 text-sm font-medium',
      )}
    >
      <Eye size={16} className="shrink-0 opacity-80" />
      <p className="text-center leading-snug">
        Mode Impersonation actif : vous visualisez l&apos;espace de l&apos;école{' '}
        <span className="font-bold">{info.schoolName}</span>.
      </p>
      <button
        type="button"
        disabled={exiting}
        onClick={() => void exit()}
        className="ml-1 inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 hover:bg-black disabled:opacity-60 transition-colors"
      >
        {exiting ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
        Quitter l&apos;impersonation
      </button>
    </div>
  )
}

/** Hauteur réservée sous la bannière (spacer pour layouts). */
export function ImpersonationBannerSpacer() {
  const [active, setActive] = useState(false)
  useEffect(() => {
    setActive(Boolean(readImpersonationFromDocument()))
  }, [])
  if (!active) return null
  return <div aria-hidden className="h-11 shrink-0" />
}
