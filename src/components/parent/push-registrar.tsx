'use client'

import { useEffect, useState } from 'react'
import { Bell, X } from 'lucide-react'

const DISMISS_KEY = 'parent_notif_prompt_dismissed'

/**
 * Invitation à activer les notifications (permission navigateur).
 * Les alertes arrivent via le temps réel (voir `ParentRealtimeBridge`) tant que l'app est ouverte ;
 * le push en arrière-plan nécessite l'enregistrement d'un abonnement Web Push côté backend.
 */
export function ParentPushRegistrar() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined' || !('Notification' in window)) return
    if (Notification.permission !== 'default') return
    try {
      if (localStorage.getItem(DISMISS_KEY)) return
    } catch {
      /* ignoré */
    }
    setVisible(true)
  }, [])

  if (!visible) return null

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, '1')
    } catch {
      /* ignoré */
    }
    setVisible(false)
  }

  return (
    <div
      role="dialog"
      aria-label="Activer les notifications"
      className="fixed inset-x-4 bottom-24 z-40 mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface p-3 shadow-lg md:bottom-6"
    >
      <Bell className="h-5 w-5 shrink-0 text-teal-600" />
      <p className="flex-1 text-sm">Activez les notifications pour suivre présences et paiements en temps réel.</p>
      <button
        type="button"
        onClick={async () => {
          await Notification.requestPermission().catch(() => undefined)
          dismiss()
        }}
        className="rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white"
      >
        Activer
      </button>
      <button type="button" onClick={dismiss} aria-label="Plus tard" className="text-zinc-400">
        <X className="h-4 w-4" />
      </button>
    </div>
  )
}
