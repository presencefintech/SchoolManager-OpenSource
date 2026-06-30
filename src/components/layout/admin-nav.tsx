'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, LayoutDashboard, GraduationCap, Users, UserPlus,
  ShieldAlert, BookOpen, Activity, Wallet, Mail, School,
  Settings, CreditCard, FileText, Clock, Shield, Building2, Upload,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import {
  dashboardApi, staffApi, studentsApi, enrollmentsApi,
  presencesApi, classesApi, financeApi, invitationsApi, schoolsApi,
} from '@/lib/admin/api'

type SubLink = { label: string; href: string; icon: React.ElementType }
type NavLink = { label: string; href: string; icon: React.ElementType; children?: SubLink[] }

const NAV_LINKS: NavLink[] = [
  { label: 'Dashboard',    href: '/admin/dashboard',   icon: LayoutDashboard },
  { label: 'Présences',    href: '/admin/presences',   icon: Activity },
  { label: 'Classes',      href: '/admin/classes',     icon: BookOpen },
  {
    label: 'Finance', href: '/admin/finance', icon: Wallet,
    children: [
      { label: 'Dashboard',        href: '/admin/finance',             icon: LayoutDashboard },
      { label: 'Paiements',        href: '/admin/finance/paiements',   icon: CreditCard },
      { label: 'Factures & Frais', href: '/admin/finance/factures',    icon: FileText },
      { label: 'Moratoires',       href: '/admin/finance/moratoriums', icon: Clock },
      { label: 'Profil règlement', href: '/admin/finance/payment-profile', icon: Building2 },
      { label: 'Audit & Fraude',   href: '/admin/finance/audit',       icon: Shield },
    ],
  },
  { label: 'Personnel',    href: '/admin/staff',       icon: Users },
  { label: 'Enseignants',  href: '/admin/teachers',    icon: School },
  { label: 'Élèves',       href: '/admin/students',    icon: GraduationCap },
  { label: 'Inscriptions', href: '/admin/enrollments', icon: UserPlus },
  { label: 'Invitations',  href: '/admin/invitations', icon: Mail },
  { label: 'Fraude',       href: '/admin/fraud',       icon: ShieldAlert },
  { label: 'Import',       href: '/admin/import',      icon: Upload },
  { label: 'Paramètres',   href: '/admin/settings',    icon: Settings },
]

export function AdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const hasAnimated = useRef(false)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const prefetch = useCallback((href: string) => {
    if (href === '/admin/dashboard') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'stats'], queryFn: dashboardApi.getStats, staleTime: 30_000 })
      queryClient.prefetchQuery({ queryKey: ['admin', 'fraud-alerts'], queryFn: dashboardApi.getFraudAlerts, staleTime: 60_000 })
    } else if (href === '/admin/staff') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'staff'], queryFn: staffApi.list, staleTime: 60_000 })
    } else if (href === '/admin/students') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'students', 'dashboard'], queryFn: studentsApi.getMainDashboard, staleTime: 60_000 })
      queryClient.prefetchQuery({ queryKey: ['admin', 'students', 'list', undefined], queryFn: () => studentsApi.list(), staleTime: 30_000 })
    } else if (href === '/admin/enrollments') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'enrollments', 'list', undefined], queryFn: () => enrollmentsApi.list(), staleTime: 30_000 })
    } else if (href === '/admin/presences') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'presences', 'stats'], queryFn: presencesApi.getStats, staleTime: 30_000 })
      queryClient.prefetchQuery({ queryKey: ['admin', 'presences', 'live', undefined], queryFn: () => presencesApi.getLiveFeed(), staleTime: 0 })
    } else if (href === '/admin/classes') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'classes', 'list', undefined], queryFn: () => classesApi.list(), staleTime: 60_000 })
    } else if (href === '/admin/finance') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'finance', 'dashboard'], queryFn: financeApi.getStrategicDashboard, staleTime: 60_000 })
      queryClient.prefetchQuery({ queryKey: ['admin', 'finance', 'pending'], queryFn: financeApi.getPendingVerifications, staleTime: 30_000 })
    } else if (href === '/admin/invitations') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'invitations', 'status'], queryFn: invitationsApi.getStatus, staleTime: 60_000 })
    } else if (href === '/admin/settings') {
      queryClient.prefetchQuery({ queryKey: ['admin', 'schools', 'attendance-settings'], queryFn: schoolsApi.getAttendanceSettings, staleTime: 300_000 })
    }
  }, [queryClient])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'AD'

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col',
      'bg-white/92 backdrop-blur-md',
      'border-r border-zinc-200/80',
      'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
    )}>
      <Link href="/admin/dashboard" className="flex items-center gap-3.5 px-6 py-4 flex-shrink-0 group">
        <div className="w-8 h-8 rounded-xl bg-emerald-600 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:bg-emerald-500 transition-colors">
          <span className="text-xs font-bold text-white tracking-tight">PC</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">presenceFintech</p>
          <p className="text-[11px] text-zinc-400 leading-tight">Administrateur</p>
        </div>
      </Link>

      <div className="mx-5 h-px bg-zinc-100" />

      <nav className="flex-1 px-3 py-2 space-y-0.5 overflow-y-auto">
        {NAV_LINKS.map(({ label, href, icon: Icon, children }, i) => {
          const expanded = !!children && pathname.startsWith(href)
          const active = !children && pathname.startsWith(href)
          const shouldAnimate = mounted && !hasAnimated.current
          if (i === NAV_LINKS.length - 1) hasAnimated.current = true

          return (
            <motion.div
              key={href}
              initial={shouldAnimate ? { opacity: 0, x: -10 } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: shouldAnimate ? 0.04 + i * 0.03 : 0, duration: 0.2 }}
            >
              {/* Parent link — always a real link */}
              <Link
                href={href}
                onMouseEnter={() => prefetch(href)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all',
                  expanded
                    ? 'text-emerald-700'
                    : active
                      ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
                )}
              >
                <Icon size={16} className={cn(
                  'flex-shrink-0 transition-colors',
                  expanded || active ? 'text-emerald-600' : 'text-zinc-400',
                )} />
                {label}
              </Link>

              {/* Sub-links (Finance) */}
              {children && (
                <AnimatePresence initial={false}>
                  {expanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.18, ease: 'easeInOut' }}
                      className="overflow-hidden"
                    >
                      <div className="ml-3 pl-3 border-l border-zinc-100 mt-0.5 mb-1 space-y-0.5">
                        {children.map(({ label: sub, href: subHref, icon: SubIcon }) => {
                          const subActive = subHref === href
                            ? pathname === subHref
                            : pathname.startsWith(subHref)
                          return (
                            <Link
                              key={subHref}
                              href={subHref}
                              className={cn(
                                'flex items-center gap-2.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                                subActive
                                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                  : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50',
                              )}
                            >
                              <SubIcon size={13} className={cn('flex-shrink-0', subActive ? 'text-emerald-600' : 'text-zinc-300')} />
                              {sub}
                            </Link>
                          )
                        })}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
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
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
