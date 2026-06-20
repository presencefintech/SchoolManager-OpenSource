'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Building2, UserPlus, ScanLine, GraduationCap, BookOpen, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const NAV_LINKS = [
  { label: 'Dashboard',       href: '/super-admin/dashboard',  icon: LayoutDashboard },
  { label: 'Établissements',  href: '/super-admin/schools',    icon: Building2 },
  { label: 'Inscriptions',    href: '/super-admin/enrollment', icon: UserPlus },
  { label: 'Présence',        href: '/super-admin/presence',   icon: ScanLine },
  { label: 'Élèves',          href: '/super-admin/students',   icon: GraduationCap },
  { label: 'Classes',         href: '/super-admin/classes',    icon: BookOpen },
  { label: 'Audit',           href: '/super-admin/audit',      icon: ShieldAlert },
]

export function SuperAdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  return (
    <aside className={cn(
      'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col',
      'bg-white/92 backdrop-blur-md',
      'border-r border-zinc-200/80',
      'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
    )}>

      {/* Logo */}
      <Link
        href="/super-admin/dashboard"
        className="flex items-center gap-3.5 px-6 py-6 flex-shrink-0 group"
      >
        <div className="w-8 h-8 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm flex-shrink-0 group-hover:bg-indigo-500 transition-colors">
          <span className="text-xs font-bold text-white tracking-tight">PC</span>
        </div>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">PresenceCollab</p>
          <p className="text-[11px] text-zinc-400 leading-tight">Super Admin</p>
        </div>
      </Link>

      <div className="mx-5 h-px bg-zinc-100" />

      {/* Nav links */}
      <nav className="flex-1 px-4 py-5 space-y-1 overflow-y-auto">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3.5 py-3 rounded-xl text-sm font-medium transition-all',
                active
                  ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-100'
                  : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
              )}
            >
              <Icon
                size={16}
                className={cn('flex-shrink-0 transition-colors', active ? 'text-indigo-600' : 'text-zinc-400')}
              />
              {label}
            </Link>
          )
        })}
      </nav>

      <div className="mx-5 h-px bg-zinc-100" />

      {/* User + logout */}
      <div className="px-5 py-5 flex-shrink-0">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center ring-1 ring-indigo-200/80 flex-shrink-0">
            <span className="text-xs font-bold text-indigo-700">{initials}</span>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-zinc-700 truncate leading-tight">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-[11px] text-zinc-400 truncate leading-tight">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={logout}
          className="w-full flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-sm text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={15} />
          Déconnexion
        </button>
      </div>
    </aside>
  )
}
