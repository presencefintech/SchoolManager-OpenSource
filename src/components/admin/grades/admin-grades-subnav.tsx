'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/admin/grades/overview', label: 'Vue d’ensemble' },
  { href: '/admin/grades/gradebook', label: 'Cahier de notes' },
  { href: '/admin/grades/periods', label: 'Périodes' },
  { href: '/admin/grades/audit-logs', label: 'Journal d’audit' },
] as const

export function AdminGradesSubnav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-1 rounded-xl border border-zinc-200 bg-white p-1 shadow-sm">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'rounded-lg px-3.5 py-2 text-sm font-medium transition-colors',
              active
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900',
            )}
          >
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
