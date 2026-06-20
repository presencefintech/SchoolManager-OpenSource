'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LogOut, LayoutDashboard, Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { label: 'Établissements', href: '/super-admin/schools', icon: Building2 },
]

export function SuperAdminNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'SA'

  return (
    <nav className="fixed top-0 inset-x-0 z-50 h-14 bg-zinc-950 border-b border-zinc-800 flex items-center px-6 gap-6">
      {/* Logo */}
      <Link href="/super-admin/dashboard" className="flex items-center gap-2.5 flex-shrink-0">
        <div className="w-6 h-6 rounded bg-indigo-500 flex items-center justify-center">
          <span className="text-[10px] font-bold text-white tracking-tight">PC</span>
        </div>
        <span className="text-sm font-semibold text-white hidden sm:block">PresenceCollab</span>
        <span className="text-xs font-medium text-zinc-500 hidden sm:block">/ SuperAdmin</span>
      </Link>

      <div className="w-px h-4 bg-zinc-800 hidden sm:block" />

      {/* Nav links */}
      <div className="flex items-center gap-1 flex-1">
        {NAV_LINKS.map(({ label, href, icon: Icon }) => {
          const active = pathname.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all',
                active
                  ? 'bg-zinc-800 text-white'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900',
              )}
            >
              <Icon size={13} />
              {label}
            </Link>
          )
        })}
      </div>

      {/* User */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center">
            <span className="text-[10px] font-bold text-white">{initials}</span>
          </div>
          <span className="text-xs text-zinc-400 hidden md:block">
            {user?.firstName} {user?.lastName}
          </span>
        </div>
        <button
          onClick={logout}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <LogOut size={13} />
          <span className="hidden sm:block">Déconnexion</span>
        </button>
      </div>
    </nav>
  )
}
