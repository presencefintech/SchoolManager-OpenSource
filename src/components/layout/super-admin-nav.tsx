'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Building2, UserPlus, ScanLine, GraduationCap, BookOpen, ShieldAlert, Download, Banknote, KeyRound, Shield, Receipt, Bell, Wrench, UserCircle } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { superAdminApi } from '@/lib/superAdmin/api'

const NAV_LINKS = [
  { label: 'Dashboard',       href: '/super-admin/dashboard',  icon: LayoutDashboard },
  { label: 'Établissements',  href: '/super-admin/schools',    icon: Building2 },
  { label: 'Inscriptions',    href: '/super-admin/enrollment', icon: UserPlus },
  { label: 'Présence',        href: '/super-admin/presence',   icon: ScanLine },
  { label: 'Élèves',          href: '/super-admin/students',   icon: GraduationCap },
  { label: 'Classes',         href: '/super-admin/classes',    icon: BookOpen },
  { label: 'Finance',         href: '/super-admin/finance',          icon: Banknote },
  { label: 'Frais',           href: '/super-admin/fees',             icon: Receipt },
  { label: 'Accès',           href: '/super-admin/auth-management',  icon: KeyRound },
  { label: 'Sécurité',        href: '/super-admin/security',         icon: Shield },
  { label: 'Audit',           href: '/super-admin/audit',            icon: ShieldAlert },
  { label: 'Exports',         href: '/super-admin/export',           icon: Download },
  { label: 'Notifications',   href: '/super-admin/notifications',    icon: Bell },
  { label: 'Outils SA',       href: '/super-admin/outils',           icon: Wrench },
  { label: 'Profil & sécurité', href: '/super-admin/profil-securite', icon: UserCircle },
]

export function SuperAdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const queryClient = useQueryClient()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  const prefetch = useCallback((href: string) => {
    if (href === '/super-admin/dashboard') {
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'stats'], queryFn: superAdminApi.getStats, staleTime: 60_000 })
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'schools'], queryFn: () => superAdminApi.getSchools(), staleTime: 60_000 })
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'auth', 'sessions'], queryFn: () => superAdminApi.getActiveSessions(), staleTime: 15_000 })
    } else if (href === '/super-admin/schools') {
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'schools'], queryFn: () => superAdminApi.getSchools(), staleTime: 60_000 })
    } else if (href === '/super-admin/students') {
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'students', 'list', undefined], queryFn: () => superAdminApi.listStudents(0), staleTime: 30_000 })
    } else if (href === '/super-admin/audit') {
      queryClient.prefetchQuery({ queryKey: ['superadmin', 'audit', 'snapshot'], queryFn: () => superAdminApi.getAuditSnapshot(), staleTime: 30_000 })
    }
  }, [queryClient])

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col overflow-hidden',
      'bg-white/92 backdrop-blur-md',
      'border-r border-zinc-200/80',
      'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
    )}>

      {/* Logo */}
      <Link
        href="/super-admin/dashboard"
        className="flex items-center gap-3.5 px-6 py-4 flex-shrink-0 group"
      >
        <div className="w-8 h-8 flex-shrink-0">
          <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={32} height={32} className="h-full w-full object-contain" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">SchoolManager</p>
          <p className="text-[11px] text-zinc-400 leading-tight">Super Admin</p>
        </div>
      </Link>

      <div className="mx-5 h-px bg-zinc-100" />

      {/* Nav links — scroll si la liste dépasse la hauteur écran */}
      <nav className="flex-1 min-h-0 px-3 py-2 space-y-0.5 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-track]:bg-transparent">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)

          return (
            <Link
              key={href}
              href={href}
              onMouseEnter={() => prefetch(href)}
              className={cn(
                'flex items-center gap-3 px-3 py-1.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap',
                active
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
              )}
            >
              <Icon
                size={16}
                className={cn('flex-shrink-0 transition-colors', active ? 'text-indigo-600' : 'text-zinc-400')}
              />
              <span className="truncate">{label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="mx-5 h-px bg-zinc-100" />

      {/* User + logout */}
      <div className="px-4 py-4 flex-shrink-0">
        <Link
          href="/super-admin/profil-securite"
          className="flex items-center gap-3 mb-3 rounded-xl px-1 py-1 hover:bg-zinc-50 transition-colors group"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-1 ring-indigo-200/80 flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-700 truncate leading-tight group-hover:text-indigo-700">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-zinc-400 truncate leading-tight">Profil &amp; sécurité</p>
          </div>
        </Link>
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
