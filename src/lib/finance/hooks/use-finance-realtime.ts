'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { getSocketOrigin } from '@/lib/finance/socket-origin'

export type FinanceRealtimeStatus = 'connecting' | 'live' | 'polling' | 'offline'

const FINANCE_EVENTS = [
  'payment.confirmed.finance',
  'refund.requested.finance',
  'refund.approved.finance',
  'refund.processed.finance',
  'guichet.dashboard.refresh',
] as const

export function useFinanceRealtime() {
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<FinanceRealtimeStatus>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const refreshFinance = useCallback(() => {
    void qc.invalidateQueries({ queryKey: ['finance'] })
    setLastUpdate(new Date())
  }, [qc])

  useEffect(() => {
    let cancelled = false
    const origin = getSocketOrigin()

    if (!origin) {
      setStatus('polling')
      return
    }

    async function connect() {
      try {
        const res = await fetch('/api/auth/socket-token', { credentials: 'include' })
        if (!res.ok) throw new Error('socket-token')
        const { token } = (await res.json()) as { token?: string }
        if (!token || cancelled) return

        const socket = io(origin, {
          auth: { token },
          transports: ['websocket'],
          reconnection: true,
          reconnectionAttempts: 8,
        })
        socketRef.current = socket

        socket.on('connect', () => {
          if (!cancelled) setStatus('live')
        })

        socket.on('disconnect', () => {
          if (!cancelled) setStatus('polling')
        })

        socket.on('connect_error', () => {
          if (!cancelled) setStatus('polling')
        })

        for (const event of FINANCE_EVENTS) {
          socket.on(event, () => refreshFinance())
        }
      } catch {
        if (!cancelled) setStatus('polling')
      }
    }

    void connect()

    return () => {
      cancelled = true
      socketRef.current?.removeAllListeners()
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [refreshFinance])

  return { status, lastUpdate, refreshFinance }
}
