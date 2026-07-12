'use client'

/**
 * @deprecated Utiliser EmpireRealtimeProvider + useFinanceRealtimeStatus.
 */
export { useFinanceRealtimeStatus as useFinanceRealtime } from '@/lib/finance/hooks/finance-realtime-provider'
export type { EmpireRealtimeStatus as FinanceRealtimeStatus } from '@/lib/realtime/use-empire-realtime'
