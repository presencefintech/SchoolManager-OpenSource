'use client'

import { useCallback } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  LogOut,
  LayoutDashboard,
  Building2,
  UserPlus,
  ScanLine,
  GraduationCap,
  BookOpen,
  ShieldAlert,
  Download,
  Banknote,
  KeyRound,
  Shield,
  Receipt,
  Bell,
  Wrench,
  UserCircle,
  Network,
  CreditCard,
  Activity,
  Upload,
  Users,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'
import { superAdminApi } from '@/lib/superAdmin/api'
import { queryKeys } from '@/lib/query/keys'

type NavItem = { label: string; href: string; icon: React.ElementType }

const NAV_SECTIONS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Vue d\'ensemble',
    items: [{ label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard }],
  },
  {
    title: 'Tenants',
    items: [
      { label: 'Établissements', href: '/super-admin/schools', icon: Building2 },
      { label: 'Réseaux', href: '/super-admin/school-networks', icon: Network },
      { label: 'Abonnements SaaS', href: '/super-admin/billing', icon: CreditCard },
    ],
  },
  {
    title: 'Pédagogie',
    items: [
      { label: 'Inscriptions', href: '/super-admin/enrollment', icon: UserPlus },
      { label: 'Présence', href: '/super-admin/presence', icon: ScanLine },
      { label: 'Élèves', href: '/super-admin/students', icon: GraduationCap },
      { label: 'Classes', href: '/super-admin/classes', icon: BookOpen },
    ],
  },
  {
    title: 'Revenus',
    items: [
      { label: 'Finance', href: '/super-admin/finance', icon: Banknote },
      { label: 'Frais', href: '/super-admin/fees', icon: Receipt },
      { label: 'Exports', href: '/super-admin/export', icon: Download },
    ],
  },
  {
    title: 'Accès & sécurité',
    items: [
      { label: 'Comptes', href: '/super-admin/accounts', icon: Users },
      { label: 'Accès', href: '/super-admin/auth-management', icon: KeyRound },
      { label: 'Sécurité', href: '/super-admin/security', icon: Shield },
      { label: 'Profil & sécurité', href: '/super-admin/profil-securite', icon: UserCircle },
    ],
  },
  {
    title: 'Opérations',
    items: [
      { label: 'Centre opérations', href: '/super-admin/operations', icon: Activity },
      { label: 'Notifications', href: '/super-admin/notifications', icon: Bell },
      { label: 'Outils SA', href: '/super-admin/outils', icon: Wrench },
      { label: 'Import', href: '/super-admin/import', icon: Upload },
    ],
  },
]

export function SuperAdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  const prefetch = useCallback(
    (href: string) => {
      if (href === '/super-admin/dashboard') {
        queryClient.prefetchQuery({
          queryKey: ['superadmin', 'stats'],
          queryFn: superAdminApi.getStats,
          staleTime: 60_000,
        })
        queryClient.prefetchQuery({
          queryKey: queryKeys.superadmin.schools({ list: 'all' }),
          queryFn: async () => {
            const { rows } = await superAdminApi.getSchools({ take: 250, page: 1 })
            return rows
          },
          staleTime: 60_000,
        })
      } else if (href === '/super-admin/schools') {
        queryClient.prefetchQuery({
          queryKey: queryKeys.superadmin.schools({ page: 1, take: 12, status: 'all' }),
          queryFn: () => superAdminApi.getSchools({ page: 1, take: 12 }),
          staleTime: 60_000,
        })
      } else if (href === '/super-admin/students') {
        queryClient.prefetchQuery({
          queryKey: ['superadmin', 'students', 'list', undefined],
          queryFn: () => superAdminApi.listStudents(0),
          staleTime: 30_000,
        })
      }
    },
    [queryClient],
  )

  return (
    <aside
      className={cn(
        'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col overflow-hidden',
        'bg-white/92 backdrop-blur-md border-r border-zinc-200/80',
        'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
      )}
    >
      <Link
        href="/super-admin/dashboard"
        className="flex items-center gap-3.5 px-6 py-4 flex-shrink-0"
      >
        <div className="w-8 h-8 flex-shrink-0">
          <Image
            src="/logo-icon-transparent.png"
            alt="SchoolManager"
            width={32}
            height={32}
            className="h-full w-full object-contain"
          />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">SchoolManager</p>
          <p className="text-[11px] text-zinc-400 leading-tight">Super Admin</p>
        </div>
      </Link>

      <div className="mx-5 h-px bg-zinc-100" />

      <nav className="flex-1 min-h-0 px-3 py-2 overflow-y-auto overscroll-contain space-y-4">
        {NAV_SECTIONS.map((section) => (
          <div key={section.title}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
              {section.title}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ label, href, icon: Icon }) => {
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
                      className={cn('flex-shrink-0', active ? 'text-indigo-600' : 'text-zinc-400')}
                    />
                    <span className="truncate">{label}</span>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="mx-5 h-px bg-zinc-100" />

      <div className="px-4 py-4 flex-shrink-0">
        <Link
          href="/super-admin/profil-securite"
          className="flex items-center gap-3 mb-3 rounded-xl px-1 py-1 hover:bg-zinc-50 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-1 ring-indigo-200/80 flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-700 truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-zinc-400 truncate leading-tight">Propriétaire</p>
          </div>
        </Link>
        <button
          type="button"
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
