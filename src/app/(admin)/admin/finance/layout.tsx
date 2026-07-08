'use client'

import { FinanceRealtimeProvider } from '@/lib/finance/hooks/finance-realtime-provider'

export default function AdminFinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <FinanceRealtimeProvider>
      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
        {children}
      </div>
    </FinanceRealtimeProvider>
  )
}
