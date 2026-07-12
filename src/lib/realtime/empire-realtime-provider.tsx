'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useEmpireRealtime, type EmpireRealtimeStatus } from '@/lib/realtime/use-empire-realtime'
import type {
  AdminEnrollmentRealtimeItem,
  AdminPaymentRealtimeItem,
  AttendanceActivityItem,
} from '@/types/admin'

export type EmpireRealtimeContextValue = {
  status: EmpireRealtimeStatus
  lastUpdate: Date | null
  recentActivity: AttendanceActivityItem[]
  recentPayments: AdminPaymentRealtimeItem[]
  recentEnrollments: AdminEnrollmentRealtimeItem[]
  refreshAttendance: () => void
  refreshFinance: () => void
}

const EmpireRealtimeContext = createContext<EmpireRealtimeContextValue | null>(null)

export function EmpireRealtimeProvider({ children }: { children: ReactNode }) {
  const value = useEmpireRealtime()
  return <EmpireRealtimeContext.Provider value={value}>{children}</EmpireRealtimeContext.Provider>
}

export function useEmpireRealtimeContext(): EmpireRealtimeContextValue | null {
  return useContext(EmpireRealtimeContext)
}

const OFFLINE: EmpireRealtimeContextValue = {
  status: 'offline',
  lastUpdate: null,
  recentActivity: [],
  recentPayments: [],
  recentEnrollments: [],
  refreshAttendance: () => {},
  refreshFinance: () => {},
}

export function useEmpireRealtimeStatus(): EmpireRealtimeContextValue {
  return useContext(EmpireRealtimeContext) ?? OFFLINE
}

/** Intervalle adaptatif : pas de polling agressif quand le socket est live. */
export function useEmpirePollingInterval(
  pollMs: number,
  liveFallbackMs?: number | false,
): number | false {
  const { status } = useEmpireRealtimeStatus()
  if (status === 'live') {
    return liveFallbackMs === undefined ? false : liveFallbackMs
  }
  return pollMs
}
