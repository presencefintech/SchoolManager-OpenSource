'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { io, type Socket } from 'socket.io-client'
import { getSocketOrigin } from '@/lib/finance/socket-origin'
import {
  parseAttendanceActivity,
  parseAttendanceStatisticsUpdated,
  type AttendanceStatisticsUpdatedPayload,
} from '@/lib/admin/attendance-realtime.types'

export type GateRealtimeStatus = 'connecting' | 'live' | 'polling' | 'offline'

export type LiveGatePassage = {
  id: string
  presenceId: number
  studentName: string
  classId: number | null
  status: string
  method: string
  scannedAt: string
}

const MAX_PASSAGES = 40

export function useTeacherGateRealtime() {
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<GateRealtimeStatus>('connecting')
  const [passages, setPassages] = useState<LiveGatePassage[]>([])
  const [stats, setStats] = useState<AttendanceStatisticsUpdatedPayload | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const pushPassage = useCallback((raw: unknown) => {
    const payload = parseAttendanceActivity(raw)
    if (!payload) return
    const item: LiveGatePassage = {
      id: `${payload.presenceId}-${payload.scannedAt}`,
      presenceId: payload.presenceId,
      studentName: payload.studentName,
      classId: payload.classId ?? null,
      status: payload.status,
      method: payload.method,
      scannedAt: payload.scannedAt,
    }
    setPassages((prev) => [item, ...prev.filter((x) => x.id !== item.id)].slice(0, MAX_PASSAGES))
    setLastUpdate(new Date())
  }, [])

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
        const data = (await res.json().catch(() => ({}))) as { token?: string }
        if (!data.token || cancelled) return

        const socket = io(origin, {
          auth: { token: data.token },
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
        socket.on('attendance.recorded', pushPassage)
        socket.on('attendance.activity', pushPassage)
        socket.on('attendance.statistics.updated', (raw: unknown) => {
          const parsed = parseAttendanceStatisticsUpdated(raw)
          if (parsed) {
            setStats(parsed)
            setLastUpdate(new Date())
          }
        })
      } catch {
        if (!cancelled) setStatus('offline')
      }
    }

    void connect()
    return () => {
      cancelled = true
      socketRef.current?.removeAllListeners()
      socketRef.current?.disconnect()
      socketRef.current = null
    }
  }, [pushPassage])

  const byClass = useMemo(() => {
    const map = new Map<number, number>()
    for (const p of passages) {
      if (p.classId == null || !Number.isFinite(p.classId)) continue
      map.set(p.classId, (map.get(p.classId) ?? 0) + 1)
    }
    return Array.from(map.entries())
      .map(([classId, count]) => ({ classId, count }))
      .sort((a, b) => b.count - a.count)
  }, [passages])

  const sessionPresent = useMemo(
    () => passages.filter((p) => p.status !== 'ABSENT').length,
    [passages],
  )
  const sessionLate = useMemo(
    () => passages.filter((p) => p.status === 'LATE').length,
    [passages],
  )

  return {
    status,
    lastUpdate,
    passages,
    stats,
    byClass,
    sessionPresent,
    sessionLate,
  }
}
