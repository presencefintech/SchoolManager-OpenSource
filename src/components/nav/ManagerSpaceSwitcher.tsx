'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Banknote, GraduationCap, Monitor } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { isManagerRole } from '@/types/auth'
import { cn } from '@/lib/utils'

/**
 * Les trois casquettes du Gérant (MANAGER = FINANCE + IT + DIRECTOR) : chacune ouvre
 * l'espace existant du métier, tel quel. Rendu seulement pour le Gérant.
 */
const SPACES = [
  { label: 'Caisse', href: '/finances/dashboard', match: ['/finances'], icon: Banknote },
  {
    label: 'Guichet',
    href: '/admin/desk',
    // Espace IT de /admin, hors délibérations (casquette direction).
    match: ['/admin'],
    exclude: ['/admin/deliberations'],
    icon: Monitor,
  },
  {
    label: 'Direction',
    href: '/director/dashboard',
    match: ['/director', '/admin/deliberations'],
    icon: GraduationCap,
  },
] as const

function isActive(pathname: string, space: (typeof SPACES)[number]): boolean {
  const within = (prefix: string) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  if ('exclude' in space && space.exclude.some(within)) return false
  return space.match.some(within)
}

export function ManagerSpaceSwitcher({ className }: { className?: string }) {
  const pathname = usePathname()
  const { user } = useAuth()
  if (!isManagerRole(user?.role)) return null

  return (
    <nav aria-label="Espaces du Gérant" className={cn('px-3 pt-2', className)}>
      <p className="px-1 pb-1.5 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
        Espaces du Gérant
      </p>
      <div className="grid grid-cols-3 gap-1 rounded-xl bg-zinc-100 p-1">
        {SPACES.map((space) => {
          const active = isActive(pathname, space)
          const Icon = space.icon
          return (
            <Link
              key={space.href}
              href={space.href}
              aria-current={active ? 'page' : undefined}
              className={cn(
                'flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-[11px] font-medium transition-colors',
                active ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-800',
              )}
            >
              <Icon size={14} className={active ? 'text-emerald-600' : 'text-zinc-400'} />
              {space.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
