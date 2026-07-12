'use client'

import { type ReactNode } from 'react'
import {
  EmpireRealtimeProvider,
  useEmpireRealtimeStatus,
} from '@/lib/realtime/empire-realtime-provider'

/** @deprecated Préférer EmpireRealtimeProvider — alias rétrocompatible admin. */
export function AdminRealtimeProvider({ children }: { children: ReactNode }) {
  return <EmpireRealtimeProvider>{children}</EmpireRealtimeProvider>
}

export function useAdminRealtimeStatus() {
  const empire = useEmpireRealtimeStatus()
  return {
    status: empire.status,
    lastUpdate: empire.lastUpdate,
    recentActivity: empire.recentActivity,
    recentPayments: empire.recentPayments,
    recentEnrollments: empire.recentEnrollments,
    refreshAttendance: empire.refreshAttendance,
  }
}

export type { EmpireRealtimeStatus as AdminRealtimeStatus } from '@/lib/realtime/use-empire-realtime'
