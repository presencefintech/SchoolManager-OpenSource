'use client'

import { createContext, useContext, type ReactNode } from 'react'
import { useFinanceRealtime, type FinanceRealtimeStatus } from '@/lib/finance/hooks/use-finance-realtime'

type FinanceRealtimeContextValue = {
  status: FinanceRealtimeStatus
  lastUpdate: Date | null
  refreshFinance: () => void
}

const FinanceRealtimeContext = createContext<FinanceRealtimeContextValue | null>(null)

export function FinanceRealtimeProvider({ children }: { children: ReactNode }) {
  const value = useFinanceRealtime()
  return (
    <FinanceRealtimeContext.Provider value={value}>
      {children}
    </FinanceRealtimeContext.Provider>
  )
}

export function useFinanceRealtimeStatus() {
  const ctx = useContext(FinanceRealtimeContext)
  return ctx ?? { status: 'offline' as const, lastUpdate: null, refreshFinance: () => {} }
}
