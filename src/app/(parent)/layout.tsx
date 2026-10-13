'use client'

import { Suspense } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Bell, CircleUser, GraduationCap, Home, LogOut, Megaphone, Users, Wallet } from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ThemePicker } from '@/components/theme/theme-picker'
import { useAuth } from '@/providers/auth-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { PwaInstallPrompt } from '@/components/pwa/install-prompt'
import { SelectedStudentProvider, StudentParamSync } from '@/lib/parent/hooks'
import { ParentPushRegistrar } from '@/components/parent/push-registrar'
import { ParentRealtimeBridge } from '@/components/parent/realtime-bridge'

const TABS = [
  { label: 'Accueil', href: '/parent/dashboard', icon: Home },
  { label: 'Enfants', href: '/parent/students', icon: Users },
  { label: 'Scolarité', href: '/parent/school', icon: GraduationCap },
  { label: 'Finance', href: '/parent/finance', icon: Wallet },
  { label: 'Messages', href: '/parent/messages', icon: Megaphone },
  { label: 'Profil', href: '/parent/profile', icon: CircleUser },
]

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

function ParentShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()

  return (
    <div className="min-h-screen bg-canvas text-zinc-900 dark:text-slate-50">
      <header className="sticky top-0 z-30 border-b border-line bg-surface/90 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <Link href="/parent/dashboard" className="flex items-center gap-2 font-semibold">
            <GraduationCap className="h-5 w-5 text-teal-600" />
            SchoolManager
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/parent/notifications"
              aria-label="Notifications"
              className="rounded-full p-2 text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <Bell className="h-5 w-5" />
            </Link>
            <ThemePicker compact />
            <button
              type="button"
              aria-label="Se déconnecter"
              title={user ? `${user.firstName} ${user.lastName}` : 'Se déconnecter'}
              onClick={() => {
                queryClient.clear()
                void logout()
              }}
              className="hidden rounded-full p-2 text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-900 md:block"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav className="mx-auto hidden max-w-5xl gap-1 px-4 pb-2 md:flex" aria-label="Navigation principale">
          {TABS.map(({ label, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              aria-current={isActive(pathname, href) ? 'page' : undefined}
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium',
                isActive(pathname, href)
                  ? 'bg-teal-600 text-white'
                  : 'text-zinc-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-4 md:pb-10">
        <ErrorBoundary>{children}</ErrorBoundary>
      </main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
        aria-label="Navigation principale"
      >
        <ul className="mx-auto grid max-w-lg grid-cols-6">
          {TABS.map(({ label, href, icon: Icon }) => {
            const active = isActive(pathname, href)
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium',
                    active ? 'text-teal-600' : 'text-zinc-500',
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {label}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>
      <Suspense fallback={null}>
        <StudentParamSync />
      </Suspense>
      <PwaInstallPrompt />
      <ParentPushRegistrar />
      <ParentRealtimeBridge />
    </div>
  )
}

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  return (
    <SelectedStudentProvider>
      <ParentShell>{children}</ParentShell>
    </SelectedStudentProvider>
  )
}
