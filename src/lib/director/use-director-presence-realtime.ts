'use client'

import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { getSocketOrigin } from '@/lib/finance/socket-origin'

/**
 * DIRECTOR — écoute `attendance.sheet.submitted` / recorded / activity
 * pour rafraîchir le dashboard sans attendre le polling.
 */
export function useDirectorPresenceRealtime(): void {
  const qc = useQueryClient()

  useEffect(() => {
    let cancelled = false
    let socket: Socket | null = null
    const origin = getSocketOrigin()
    if (!origin) return

    async function connect() {
      try {
        const res = await fetch('/api/auth/socket-token', { credentials: 'include' })
        if (!res.ok) return
        const data = (await res.json().catch(() => ({}))) as { token?: string }
        if (!data.token || cancelled) return

        socket = io(origin, {
          auth: { token: data.token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 8,
        })
        if (cancelled) {
          socket.disconnect()
          return
        }

        const refresh = () => {
          void qc.invalidateQueries({ queryKey: ['director'] })
        }

        socket.on('attendance.sheet.submitted', refresh)
        socket.on('attendance.sheet.draft-updated', refresh)
        socket.on('attendance.recorded', refresh)
        socket.on('attendance.activity', refresh)
      } catch {
        /* polling du dashboard reste en secours */
      }
    }

    void connect()

    return () => {
      cancelled = true
      socket?.removeAllListeners()
      socket?.disconnect()
    }
  }, [qc])
}
