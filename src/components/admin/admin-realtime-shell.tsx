'use client'

import type { ReactNode } from 'react'
import { EmpireRealtimeProvider } from '@/lib/realtime/empire-realtime-provider'

/** Shell admin — une seule connexion Socket.io (Empire). */
export function AdminRealtimeShell({ children }: { children: ReactNode }) {
  return <EmpireRealtimeProvider>{children}</EmpireRealtimeProvider>
}

/** Alias explicite pour la doc / imports futurs. */
export const EmpireRealtimeShell = AdminRealtimeShell
