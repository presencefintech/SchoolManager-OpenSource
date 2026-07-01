'use client'

import Link from 'next/link'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LayoutDashboard, DollarSign, Users, Search, BookOpen, LogOut, Banknote, CalendarCheck, RotateCcw, ClipboardCheck } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const NAV_LINKS = [
  { label: 'Dashboard',        href: '/finances/dashboard',       icon: LayoutDashboard },
  { label: 'Caisse',           href: '/finances/caisse',          icon: Banknote },
  { label: 'Paiements',        href: '/finances/paiements',       icon: DollarSign },
  { label: 'Vérifications',   href: '/finances/verifications',   icon: ClipboardCheck },
  { label: 'Débiteurs',        href: '/finances/debiteurs',       icon: Users },
  { label: 'Remboursements',   href: '/finances/remboursements',  icon: RotateCcw },
  { label: 'Transactions',     href: '/finances/transactions',    icon: Search },
  { label: 'Classes',          href: '/finances/classes',         icon: BookOpen },
  { label: 'Clôture',          href: '/finances/cloture',         icon: CalendarCheck },
]

function FinanceNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const hasAnimated = useRef(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'FI'

  function handleLogout() {
    queryClient.clear()
    logout()
  }

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col',
      'bg-white/92 backdrop-blur-md',
      'border-r border-zinc-200/80',
      'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
    )}>
      <Link href="/finances/dashboard" className="flex items-center gap-3.5 px-6 py-4 flex-shrink-0 group">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
          <span className="text-xs font-bold text-white tracking-tight">PC</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">presenceFintech</p>
          <p className="text-[11px] text-zinc-400 leading-tight">Finance</p>
        </div>
      </Link>

      <div className="mx-5 h-px bg-zinc-100" />

      <nav className="flex-1 px-3 py-2 space-y-0.5">
        {NAV_LINKS.map(({ label, href, icon: Icon }, i) => {
          const active = pathname.startsWith(href)
          const shouldAnimate = mounted && !hasAnimated.current
          if (i === NAV_LINKS.length - 1) hasAnimated.current = true
          return (
            <motion.div
              key={href}
              initial={shouldAnimate ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: shouldAnimate ? 0.04 + i * 0.03 : 0, duration: 0.2 }}
            >
              <Link
                href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  active
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
                )}
              >
                <Icon size={16} className={cn('flex-shrink-0 transition-colors', active ? 'text-emerald-600' : 'text-zinc-400')} />
                {label}
              </Link>
            </motion.div>
          )
        })}
      </nav>

      <div className="mx-5 h-px bg-zinc-100" />

      <div className="px-4 py-4 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200/80 flex-shrink-0">
            <span className="text-xs font-bold text-emerald-700">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-700 truncate leading-tight">{user?.firstName} {user?.lastName}</p>
            <p className="text-[11px] text-zinc-400 truncate leading-tight">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}

export default function FinancesLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen">
      <FinanceNav />
      <main className="flex-1 ml-64 min-h-screen bg-zinc-50">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
