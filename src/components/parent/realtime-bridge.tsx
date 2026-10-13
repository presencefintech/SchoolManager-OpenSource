'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io } from 'socket.io-client'
import { apiClient } from '@/lib/api/client'
import { getSocketOrigin } from '@/lib/finance/socket-origin'
import { parentKeys } from '@/lib/parent/hooks'

/**
 * Temps réel parent (miroir de `socket_service.dart`) :
 * `notification`, `payment.settled`, `attendance.recorded` → invalidation ciblée du cache,
 * et notification système si l'onglet est en arrière-plan et la permission accordée.
 */
export function ParentRealtimeBridge() {
  const queryClient = useQueryClient()

  useEffect(() => {
    let cancelled = false
    let disconnect: (() => void) | undefined

    async function connect() {
      try {
        const tokenRes = await fetch('/api/auth/socket-token', { credentials: 'include' })
        if (!tokenRes.ok) return
        const { token } = (await tokenRes.json()) as { token?: string }
        if (!token || cancelled) return

        // ADR-002 : le room tenant exige l'UUID du Control Plane.
        let tenantId: string | undefined
        try {
          const cfg = await apiClient.get('/mobile/parents/control-plane/tenant/config')
          tenantId = cfg.data?.data?.tenant?.id ?? cfg.data?.tenant?.id
        } catch {
          /* sans tenant : la room utilisateur reste active */
        }
        if (cancelled) return

        const socket = io(getSocketOrigin(), {
          auth: { token, tenantId },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 8,
        })

        const refreshNotifications = () => {
          void queryClient.invalidateQueries({ queryKey: parentKeys.notifications })
          void queryClient.invalidateQueries({ queryKey: parentKeys.dashboard })
        }

        socket.on('notification', (payload: { title?: string; message?: string; body?: string }) => {
          refreshNotifications()
          void showSystemNotification(payload.title ?? 'SchoolManager', payload.message ?? payload.body)
        })
        socket.on('payment.settled', () => {
          void queryClient.invalidateQueries({ queryKey: ['parent', 'finances'] })
          void queryClient.invalidateQueries({ queryKey: ['parent', 'payment'] })
          void queryClient.invalidateQueries({ queryKey: parentKeys.dashboard })
          void showSystemNotification('Paiement confirmé', 'Votre paiement a été validé.')
        })
        socket.on('attendance.recorded', () => {
          void queryClient.invalidateQueries({ queryKey: ['parent', 'attendance'] })
          void queryClient.invalidateQueries({ queryKey: parentKeys.dashboard })
        })

        disconnect = () => socket.disconnect()
      } catch {
        /* temps réel best-effort : les écrans se rafraîchissent aussi au rechargement */
      }
    }

    void connect()
    return () => {
      cancelled = true
      disconnect?.()
    }
  }, [queryClient])

  return null
}

async function showSystemNotification(title: string, body?: string) {
  if (typeof window === 'undefined' || !('Notification' in window)) return
  if (Notification.permission !== 'granted' || document.visibilityState === 'visible') return
  try {
    const reg = await navigator.serviceWorker?.ready
    if (reg) await reg.showNotification(title, { body, icon: '/icons/icon-192.png', badge: '/icons/icon-192.png' })
    else new Notification(title, { body })
  } catch {
    /* ignoré */
  }
}
