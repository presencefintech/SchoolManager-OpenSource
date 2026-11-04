'use client'

import { FinanceAdminSubNav } from '@/components/admin/finance/finance-admin-subnav'

export default function AdminFinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6">
      <FinanceAdminSubNav />
      {children}
    </div>
  )
}
