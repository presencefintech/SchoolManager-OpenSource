'use client'

import Link from 'next/link'
import Image from 'next/image'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  LayoutDashboard,
  Layers,
  Activity,
  Megaphone,
  LogOut,
  UserCircle,
  UserX,
  Menu,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ThemePicker } from '@/components/theme/theme-picker'
import { useAuth } from '@/providers/auth-provider'
import { EmailVerificationBanner } from '@/components/auth/email-verification-banner'
import { useDirectorPresenceRealtime } from '@/lib/director/use-director-presence-realtime'

const NAV_LINKS = [
  { label: 'Dashboard', href: '/director/dashboard', icon: LayoutDashboard },
  { label: 'Mes sections', href: '/director/sections', icon: Layers },
  { label: 'Présences', href: '/director/presences', icon: Activity },
  { label: 'Absences', href: '/director/absences', icon: UserX },
  { label: 'Communiqués', href: '/director/announcements', icon: Megaphone },
  { label: 'Profil & sécurité', href: '/director/profil-securite', icon: UserCircle },
]

function DirectorNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    if (!mobileOpen) return
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [mobileOpen])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'DI'

  function handleLogout() {
    queryClient.clear()
    logout()
  }

  return (
    <>
      {/* Barre mobile — hamburger + logo, masquée en desktop */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 flex items-center gap-3 px-4 h-14 bg-white border-b border-zinc-200/80">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg text-zinc-600 hover:bg-zinc-50 active:bg-zinc-100 transition-colors"
          aria-label="Ouvrir le menu"
        >
          <Menu size={20} />
        </button>
        <Link href="/director/dashboard" className="flex items-center gap-2 min-w-0">
          <div className="w-6 h-6 flex-shrink-0">
            <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={24} height={24} className="h-full w-full object-contain" />
          </div>
          <p className="text-sm font-semibold text-zinc-900 truncate">SchoolManager</p>
        </Link>
      </div>

      {/* Fond assombri derrière le tiroir mobile */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/40"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <aside
        className={cn(
          'fixed top-0 left-0 h-screen w-64 z-50 flex flex-col overflow-hidden',
          'bg-white lg:bg-white/92 lg:backdrop-blur-md',
          'border-r border-zinc-200/80',
          'shadow-[1px_0_16px_rgba(0,0,0,0.05)]',
          'transition-transform duration-200 ease-out lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-center justify-between gap-2 px-6 py-4 flex-shrink-0">
          <Link
            href="/director/dashboard"
            className="flex items-center gap-3.5 min-w-0 group"
          >
            <div className="w-8 h-8 flex-shrink-0">
              <Image src="/logo-icon-transparent.png" alt="SchoolManager" width={32} height={32} className="h-full w-full object-contain" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-zinc-900 leading-tight truncate">
                SchoolManager
              </p>
              <p className="text-[11px] text-zinc-400 leading-tight mt-0.5">Espace Directeur</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="lg:hidden flex-shrink-0 p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 transition-colors"
            aria-label="Fermer le menu"
          >
            <X size={18} />
          </button>
        </div>

        <div className="mx-5 h-px bg-zinc-100" />

        <nav className="flex-1 min-h-0 px-3 py-2 space-y-0.5 overflow-y-auto overscroll-contain [scrollbar-gutter:stable] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-zinc-300 hover:[&::-webkit-scrollbar-thumb]:bg-zinc-400 [&::-webkit-scrollbar-track]:bg-transparent">
          {NAV_LINKS.map(({ label, href, icon: Icon }) => {
            const active = pathname.startsWith(href)
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  'relative flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-colors',
                  active
                    ? 'bg-emerald-50 text-emerald-700 shadow-sm ring-1 ring-emerald-100'
                    : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
                )}
              >
                <Icon
                  size={16}
                  className={cn(
                    'flex-shrink-0 transition-colors',
                    active ? 'text-emerald-600' : 'text-zinc-400',
                  )}
                />
                {label}
              </Link>
            )
          })}
        </nav>

        <div className="mx-5 h-px bg-zinc-100" />

        <div className="px-4 py-4 flex-shrink-0">
          <div className="flex items-center justify-between px-1 mb-2">
            <span className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400">Thème</span>
            <ThemePicker compact />
          </div>
          <Link
            href="/director/profil-securite"
            className="flex items-center gap-3 mb-3 rounded-xl px-1 py-1 hover:bg-zinc-50 transition-colors group"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center ring-1 ring-emerald-200/80 flex-shrink-0">
              <span className="text-xs font-bold text-emerald-700">{initials}</span>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-zinc-700 truncate leading-tight group-hover:text-emerald-700">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[11px] text-zinc-400 truncate leading-tight">Directeur</p>
            </div>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut size={15} />
            Déconnexion
          </button>
        </div>
      </aside>
    </>
  )
}

export default function DirectorLayout({ children }: { children: React.ReactNode }) {
  useDirectorPresenceRealtime()
  return (
    <div className="flex min-h-screen">
      <DirectorNav />
      <main className="flex-1 min-w-0 pt-14 lg:pt-0 lg:ml-64 min-h-screen bg-canvas">
        <EmailVerificationBanner />
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>
    </div>
  )
}
