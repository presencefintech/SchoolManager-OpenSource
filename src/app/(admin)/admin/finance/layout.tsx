'use client'

import { FinanceAdminSubNav } from '@/components/admin/finance/finance-admin-subnav'

/** Finance admin hérite du socket Empire monté dans `(admin)/layout`. */
export default function AdminFinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
      <FinanceAdminSubNav />
      {children}
    </div>
  )
}
