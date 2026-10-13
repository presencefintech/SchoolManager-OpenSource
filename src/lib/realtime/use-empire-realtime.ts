'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { io, type Socket } from 'socket.io-client'
import { getSocketOrigin } from '@/lib/finance/socket-origin'
import {
  activityToItem,
  parseAttendanceActivity,
  parseAttendanceStatisticsUpdated,
} from '@/lib/admin/attendance-realtime.types'
import {
  parseEnrollmentApproved,
  parseNewEnrollmentRequest,
  parsePaymentConfirmedAdmin,
  parsePaymentCorrectionAdmin,
  parsePaymentFailedAdmin,
  parseCashActivity,
} from '@/lib/admin/admin-platform-realtime.types'
import {
  applyAttendanceStatisticsPatch,
  applyControlDashboardPatch,
  invalidateAllAttendanceQueries,
  invalidateAttendanceFeedQueries,
  invalidatePlatformQueries,
  invalidatePaymentPlatformQueries,
} from '@/lib/admin/attendance-realtime-cache'
import type {
  AttendanceActivityItem,
  AdminEnrollmentRealtimeItem,
  AdminPaymentRealtimeItem,
  CashActivityRealtimeItem,
} from '@/types/admin'

export type EmpireRealtimeStatus = 'connecting' | 'live' | 'polling' | 'offline'

const MAX_ACTIVITY_ITEMS = 25
const MAX_PLATFORM_ITEMS = 12
const MAX_CASH_ITEMS = 40

const FINANCE_SOCKET_EVENTS = [
  'payment.confirmed.finance',
  'refund.requested.finance',
  'refund.approved.finance',
  'refund.processed.finance',
  'guichet.dashboard.refresh',
] as const

/** Clés finance ciblées — jamais le préfixe nu `['finance']` (évite waterfall global). */
const FINANCE_REFRESH_KEYS = [
  ['finance', 'guichet-dashboard'],
  ['finance', 'daily-cash'],
  ['finance', 'payments', 'pending'],
  ['finance', 'cash-session'],
  ['finance', 'dashboard'],
  ['finance', 'payment-declarations'],
  ['fee-schedule'],
  ['finance', 'student'],
  ['finance', 'fee-periods'],
  ['finance', 'student-payments'],
  ['student-wallet'],
  ['admin', 'finance', 'dashboard'],
  ['admin', 'finance', 'pending'],
  ['admin', 'finance', 'end-of-day'],
  ['admin', 'finance', 'cash-fund-traceability'],
  ['admin', 'finance', 'cash-desks-live'],
  ['admin', 'finance', 'day-digest'],
  ['admin', 'finance', 'demo-value-panel'],
  ['admin', 'finance', 'class-year-fees'],
  ['admin', 'finance', 'network'],
] as const

function pushUnique<T extends { id: string }>(prev: T[], item: T, max: number): T[] {
  return [item, ...prev.filter((x) => x.id !== item.id)].slice(0, max)
}

/** Connexion Socket.io unique — room `control-dashboard` + finance (admin). */
export function useEmpireRealtime() {
  const qc = useQueryClient()
  const socketRef = useRef<Socket | null>(null)
  const [status, setStatus] = useState<EmpireRealtimeStatus>('connecting')
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [recentActivity, setRecentActivity] = useState<AttendanceActivityItem[]>([])
  const [recentPayments, setRecentPayments] = useState<AdminPaymentRealtimeItem[]>([])
  const [recentEnrollments, setRecentEnrollments] = useState<AdminEnrollmentRealtimeItem[]>([])
  const [recentCashActivity, setRecentCashActivity] = useState<CashActivityRealtimeItem[]>([])

  const touch = useCallback(() => setLastUpdate(new Date()), [])

  const refreshFinance = useCallback(() => {
    for (const queryKey of FINANCE_REFRESH_KEYS) {
      void qc.invalidateQueries({ queryKey: [...queryKey] })
    }
    touch()
  }, [qc, touch])

  const refreshAttendance = useCallback(() => {
    invalidateAllAttendanceQueries(qc)
    touch()
  }, [qc, touch])

  const pushActivity = useCallback((raw: unknown) => {
    const payload = parseAttendanceActivity(raw)
    if (!payload) return
    setRecentActivity((prev) => pushUnique(prev, activityToItem(payload), MAX_ACTIVITY_ITEMS))
  }, [])

  const onActivityEvent = useCallback(
    (raw: unknown) => {
      pushActivity(raw)
      invalidateAttendanceFeedQueries(qc)
      touch()
    },
    [pushActivity, qc, touch],
  )

  const onStatisticsUpdated = useCallback(
    (raw: unknown) => {
      const payload = parseAttendanceStatisticsUpdated(raw)
      if (payload) applyAttendanceStatisticsPatch(qc, payload)
      invalidateAttendanceFeedQueries(qc)
      touch()
    },
    [qc, touch],
  )

  const onControlDashboard = useCallback(
    (raw: unknown) => {
      applyControlDashboardPatch(qc, raw)
      touch()
    },
    [qc, touch],
  )

  const onPaymentConfirmed = useCallback(
    (raw: unknown) => {
      const item = parsePaymentConfirmedAdmin(raw)
      if (item) setRecentPayments((prev) => pushUnique(prev, item, MAX_PLATFORM_ITEMS))
      invalidatePaymentPlatformQueries(qc)
      refreshFinance()
      touch()
    },
    [qc, refreshFinance, touch],
  )

  const onPaymentCorrection = useCallback(
    (raw: unknown) => {
      const item = parsePaymentCorrectionAdmin(raw)
      if (item) setRecentPayments((prev) => pushUnique(prev, item, MAX_PLATFORM_ITEMS))
      refreshFinance()
      touch()
    },
    [refreshFinance, touch],
  )

  const onPaymentFailed = useCallback(
    (raw: unknown) => {
      const item = parsePaymentFailedAdmin(raw)
      if (item) setRecentPayments((prev) => pushUnique(prev, item, MAX_PLATFORM_ITEMS))
      invalidatePaymentPlatformQueries(qc)
      refreshFinance()
      touch()
    },
    [qc, refreshFinance, touch],
  )

  const onCashActivity = useCallback(
    (raw: unknown) => {
      const item = parseCashActivity(raw)
      if (item) setRecentCashActivity((prev) => pushUnique(prev, item, MAX_CASH_ITEMS))
      refreshFinance()
    },
    [refreshFinance],
  )

  const onEnrollmentApproved = useCallback(
    (raw: unknown) => {
      const item = parseEnrollmentApproved(raw)
      if (item) setRecentEnrollments((prev) => pushUnique(prev, item, MAX_PLATFORM_ITEMS))
      invalidatePlatformQueries(qc)
      touch()
    },
    [qc, touch],
  )

  const onNewEnrollmentRequest = useCallback(
    (raw: unknown) => {
      const item = parseNewEnrollmentRequest(raw)
      if (item) setRecentEnrollments((prev) => pushUnique(prev, item, MAX_PLATFORM_ITEMS))
      invalidatePlatformQueries(qc)
      touch()
    },
    [qc, touch],
  )

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
        const token = data.token
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

        socket.on('attendance.statistics.updated', onStatisticsUpdated)
        socket.on('control_dashboard', onControlDashboard)
        socket.on('attendance.recorded', onActivityEvent)
        socket.on('attendance.activity', onActivityEvent)
        socket.on('attendance.sheet.submitted', refreshAttendance)
        socket.on('attendance.sheet.draft-updated', refreshAttendance)
        socket.on('payment.confirmed.admin', onPaymentConfirmed)
        socket.on('payment.correction.admin', onPaymentCorrection)
        socket.on('payment.failed.admin', onPaymentFailed)
        socket.on('cash.activity', onCashActivity)
        socket.on('enrollment_approved', onEnrollmentApproved)
        socket.on('new_enrollment_request', onNewEnrollmentRequest)

        for (const event of FINANCE_SOCKET_EVENTS) {
          socket.on(event, refreshFinance)
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
  }, [
    onActivityEvent,
    onControlDashboard,
    onEnrollmentApproved,
    onNewEnrollmentRequest,
    onPaymentConfirmed,
    onPaymentCorrection,
    onPaymentFailed,
    onCashActivity,
    onStatisticsUpdated,
    refreshAttendance,
    refreshFinance,
  ])

  return {
    status,
    lastUpdate,
    recentActivity,
    recentPayments,
    recentEnrollments,
    recentCashActivity,
    refreshAttendance,
    refreshFinance,
  }
}
