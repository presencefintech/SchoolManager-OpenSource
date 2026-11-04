'use client'

import type { ReactNode } from 'react'
import { EmpireRealtimeProvider } from '@/lib/realtime/empire-realtime-provider'

export function AdminRealtimeShell({ children }: { children: ReactNode }) {
  return <EmpireRealtimeProvider>{children}</EmpireRealtimeProvider>
}

export const EmpireRealtimeShell = AdminRealtimeShell
