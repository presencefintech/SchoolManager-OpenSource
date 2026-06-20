'use client'

import { useAuth } from '@/providers/auth-provider'

export default function FinancesDashboardPage() {
  const { user, logout } = useAuth()

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center">
      <div className="text-center space-y-4">
        <h1 className="text-2xl font-bold text-slate-900">Dashboard Finances</h1>
        <p className="text-slate-500">
          Bienvenue, {user?.firstName} {user?.lastName}
        </p>
        <button
          onClick={logout}
          className="px-4 py-2 bg-red-500 text-white rounded-lg text-sm hover:bg-red-600 transition-colors"
        >
          Se déconnecter
        </button>
      </div>
    </div>
  )
}
