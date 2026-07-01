'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useRef, useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  LogOut, LayoutDashboard, GraduationCap, Users, UserPlus,
  ShieldAlert, BookOpen, Activity, Wallet, Mail, School,
  Settings, CreditCard, FileText, Clock, Shield, Building2,
  Bell, Monitor, FolderOpen, Gavel, ChevronDown,
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
type NavSection = { title?: string; links: NavLink[] }

const NAV_SECTIONS: NavSection[] = [
  {
    links: [
      { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
      { label: 'Présences', href: '/admin/presences', icon: Activity },
    ],
  },
  {
    title: 'Gestion',
    links: [
      { label: 'Élèves',       href: '/admin/students',    icon: GraduationCap },
      { label: 'Inscriptions', href: '/admin/enrollments', icon: UserPlus },
      { label: 'Classes',      href: '/admin/classes',     icon: BookOpen },
      { label: 'Enseignants',  href: '/admin/teachers',    icon: School },
      { label: 'Personnel',    href: '/admin/staff',       icon: Users },
    ],
  },
  {
    title: 'Finances',
    links: [
      {
        label: 'Finance', href: '/admin/finance', icon: Wallet,
        children: [
          { label: 'Dashboard',         href: '/admin/finance',                 icon: LayoutDashboard },
          { label: 'Paiements',         href: '/admin/finance/paiements',       icon: CreditCard },
          { label: 'Factures & Frais',  href: '/admin/finance/factures',        icon: FileText },
          { label: 'Moratoires',        href: '/admin/finance/moratoriums',     icon: Clock },
          { label: 'Profil règlement',  href: '/admin/finance/payment-profile', icon: Building2 },
          { label: 'Audit & Fraude',    href: '/admin/finance/audit',           icon: Shield },
        ],
      },
    ],
  },
  {
    title: 'Outils',
    links: [
      { label: 'Invitations',   href: '/admin/invitations',   icon: Mail },
      { label: 'Emails',        href: '/admin/email',         icon: Mail },
      { label: 'Notifications', href: '/admin/notifications', icon: Bell },
      { label: 'Fraude',        href: '/admin/fraud',         icon: ShieldAlert },
      { label: 'Sanctions',     href: '/admin/sanctions',     icon: Gavel },
      { label: 'Fichiers',      href: '/admin/files',         icon: FolderOpen },
      { label: 'Monitoring',    href: '/admin/monitoring',    icon: Monitor },
      { label: 'Paramètres',    href: '/admin/settings',      icon: Settings },
    ],
  },
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

  const totalLinks = NAV_SECTIONS.flatMap(s => s.links).length
  let linkIndex = 0

  return (
    <aside className="fixed top-0 left-0 h-screen w-60 z-50 flex flex-col bg-white border-r border-zinc-100 shadow-[2px_0_24px_rgba(0,0,0,0.04)]">

      {/* Brand */}
      <Link href="/admin/dashboard" className="group flex items-center gap-3 px-4 py-3.5 flex-shrink-0">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-md shadow-emerald-200 flex-shrink-0 group-hover:scale-105 transition-transform duration-200">
          <span className="text-xs font-bold text-white tracking-tight">PC</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-zinc-900 leading-tight truncate tracking-tight">presenceFintech</p>
          <span className="inline-block text-[10px] font-medium text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full leading-none mt-0.5">
            Admin
          </span>
        </div>
      </Link>

      {/* Nav */}
      <nav className="flex-1 px-3 py-2 overflow-y-auto space-y-3 [&::-webkit-scrollbar]:hidden [scrollbar-width:none]">
        {NAV_SECTIONS.map(({ title, links }) => (
          <div key={title ?? '__root__'}>
            {title && (
              <p className="px-2 pb-1 text-[9px] font-semibold text-zinc-400 uppercase tracking-widest select-none">
                {title}
              </p>
            )}
            <div className="space-y-0.5">
              {links.map(({ label, href, icon: Icon, children }) => {
                const i = linkIndex++
                const expanded = !!children && pathname.startsWith(href)
                const active = !children && pathname.startsWith(href)
                const shouldAnimate = mounted && !hasAnimated.current
                if (i === totalLinks - 1) hasAnimated.current = true

                return (
                  <motion.div
                    key={href}
                    initial={shouldAnimate ? { opacity: 0, x: -8 } : false}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: shouldAnimate ? 0.03 + i * 0.022 : 0, duration: 0.18 }}
                  >
                    <Link
                      href={href}
                      onMouseEnter={() => prefetch(href)}
                      className={cn(
                        'group flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-150',
                        expanded
                          ? 'bg-zinc-50 text-zinc-800'
                          : active
                            ? 'bg-zinc-900 text-white shadow-sm'
                            : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-900',
                      )}
                    >
                      <Icon
                        size={15}
                        className={cn(
                          'flex-shrink-0 transition-colors',
                          active ? 'text-emerald-400' : expanded ? 'text-zinc-500' : 'text-zinc-400 group-hover:text-zinc-600',
                        )}
                      />
                      <span className="flex-1 leading-none">{label}</span>
                      {children && (
                        <ChevronDown
                          size={12}
                          className={cn('text-zinc-400 transition-transform duration-200', expanded && 'rotate-180')}
                        />
                      )}
                    </Link>

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
                            <div className="ml-4 pl-3 border-l-2 border-zinc-100 mt-1 mb-1 space-y-0.5">
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
                                        ? 'bg-zinc-900 text-white'
                                        : 'text-zinc-400 hover:text-zinc-800 hover:bg-zinc-50',
                                    )}
                                  >
                                    <SubIcon
                                      size={12}
                                      className={cn('flex-shrink-0', subActive ? 'text-emerald-400' : 'text-zinc-300')}
                                    />
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
            </div>
          </div>
        ))}
      </nav>

      {/* User footer */}
      <div className="px-3 pb-3 flex-shrink-0 border-t border-zinc-100 pt-2.5">
        <div className="flex items-center gap-2.5 px-2 py-2 rounded-xl hover:bg-zinc-50 transition-colors group">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-sm ring-2 ring-white">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-zinc-700 truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[10px] text-zinc-400 truncate leading-tight">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            title="Déconnexion"
            className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-all flex-shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
