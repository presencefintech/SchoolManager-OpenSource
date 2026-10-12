'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BookOpen,
  ClipboardList,
  LayoutDashboard,
  LogOut,
  Menu,
  NotebookPen,
  PackagePlus,
  ScanBarcode,
  X,
} from 'lucide-react'
import { useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { ThemePicker } from '@/components/theme/theme-picker'
import { useAuth } from '@/providers/auth-provider'
import { ErrorBoundary } from '@/components/ui/error-boundary'

const NAV_LINKS = [
  { label: 'Tableau de bord', href: '/teacher/dashboard', icon: LayoutDashboard },
  { label: 'Pointage', href: '/teacher/attendance', icon: ScanBarcode },
  { label: 'Cahier de notes', href: '/teacher/grades', icon: ClipboardList },
  { label: 'Fiches de préparation', href: '/teacher/preparations', icon: NotebookPen },
  { label: 'Besoins matériels', href: '/teacher/needs', icon: PackagePlus },
]

function TeacherNav() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  const initials = user
    ? `${user.firstName?.[0] ?? ''}${user.lastName?.[0] ?? ''}`.toUpperCase()
    : 'EN'

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:border-slate-800 dark:bg-slate-950/90 lg:hidden">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 font-semibold">
            <BookOpen className="h-5 w-5 text-teal-600" />
            Espace enseignant
          </div>
          <button type="button" onClick={() => setMobileOpen((v) => !v)} aria-label="Menu">
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </header>

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 border-r border-slate-200 bg-white p-4 transition dark:border-slate-800 dark:bg-slate-950 lg:static lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="mb-6 hidden items-center gap-2 font-semibold lg:flex">
          <BookOpen className="h-5 w-5 text-teal-600" />
          Espace enseignant
        </div>
        <nav className="space-y-1">
          {NAV_LINKS.map((link) => {
            const Icon = link.icon
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium',
                  active
                    ? 'bg-teal-600 text-white'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-900',
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            )
          })}
        </nav>
        <div className="mt-8 border-t border-slate-100 pt-4 dark:border-slate-800">
          <div className="mb-3 flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-100 text-xs font-bold dark:bg-slate-800">
              {initials}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="truncate text-xs text-slate-500">{user?.email}</p>
            </div>
          </div>
          <div className="flex items-center justify-between gap-2">
            <ThemePicker />
            <button
              type="button"
              onClick={() => {
                queryClient.clear()
                logout()
              }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900"
            >
              <LogOut className="h-3.5 w-3.5" />
              Quitter
            </button>
          </div>
        </div>
      </aside>
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          aria-label="Fermer le menu"
          onClick={() => setMobileOpen(false)}
        />
      )}
    </>
  )
}

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-50">
      <div className="mx-auto flex min-h-screen max-w-[1600px]">
        <TeacherNav />
        <main className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <ErrorBoundary>{children}</ErrorBoundary>
        </main>
      </div>
    </div>
  )
}
