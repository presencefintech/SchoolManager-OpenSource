'use client'

import { createContext, useContext, type ReactNode } from 'react'
import {
  EmpireRealtimeProvider,
  useEmpireRealtimeContext,
  useEmpireRealtimeStatus,
} from '@/lib/realtime/empire-realtime-provider'
import type { EmpireRealtimeStatus } from '@/lib/realtime/use-empire-realtime'

type FinanceRealtimeContextValue = {
  status: EmpireRealtimeStatus
  lastUpdate: Date | null
  refreshFinance: () => void
}

const FinanceRealtimeContext = createContext<FinanceRealtimeContextValue | null>(null)

const OFFLINE_FINANCE: FinanceRealtimeContextValue = {
  status: 'offline',
  lastUpdate: null,
  refreshFinance: () => {},
}

function FinanceRealtimeBridge({ children }: { children: ReactNode }) {
  const empire = useEmpireRealtimeStatus()
  const value: FinanceRealtimeContextValue = {
    status: empire.status,
    lastUpdate: empire.lastUpdate,
    refreshFinance: empire.refreshFinance,
  }
  return (
    <FinanceRealtimeContext.Provider value={value}>{children}</FinanceRealtimeContext.Provider>
  )
}

/** Utilise EmpireRealtimeProvider existant ou en crée un (layout finance standalone). */
export function FinanceRealtimeProvider({ children }: { children: ReactNode }) {
  const existing = useEmpireRealtimeContext()
  if (existing) {
    return <FinanceRealtimeBridge>{children}</FinanceRealtimeBridge>
  }
  return (
    <EmpireRealtimeProvider>
      <FinanceRealtimeBridge>{children}</FinanceRealtimeBridge>
    </EmpireRealtimeProvider>
  )
}

export function useFinanceRealtimeStatus() {
  const ctx = useContext(FinanceRealtimeContext)
  if (ctx) return ctx
  const empire = useEmpireRealtimeContext()
  if (empire) {
    return {
      status: empire.status,
      lastUpdate: empire.lastUpdate,
      refreshFinance: empire.refreshFinance,
    }
  }
  return OFFLINE_FINANCE
}
