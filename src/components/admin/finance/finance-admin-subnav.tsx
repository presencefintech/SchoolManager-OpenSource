'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, FileText, RotateCcw, Clock,
  Fingerprint, Building2, Shield, QrCode, BarChart3, ClipboardCheck,
} from 'lucide-react'
import { cn } from '@/lib/utils'

import type { LucideIcon } from 'lucide-react'

type FinanceAdminNavLink = {
  href: string
  label: string
  icon: LucideIcon
  exact?: boolean
  highlight?: boolean
}

const LINKS: FinanceAdminNavLink[] = [
  { href: '/admin/finance', label: 'Dashboard', icon: LayoutDashboard, exact: true },
  { href: '/admin/finance/rapports', label: 'Rapports', icon: BarChart3, highlight: true },
  { href: '/admin/finance/factures', label: 'Factures & Frais', icon: FileText, highlight: true },
  { href: '/admin/finance/paiements', label: 'Paiements', icon: CreditCard },
  { href: '/admin/finance/controle', label: 'Contrôle', icon: ClipboardCheck, highlight: true },
  { href: '/admin/finance/remboursements', label: 'Remboursements', icon: RotateCcw },
  { href: '/admin/finance/moratoriums', label: 'Moratoires', icon: Clock },
  { href: '/admin/finance/scelles', label: 'Scellés', icon: Fingerprint },
  { href: '/admin/finance/payment-profile', label: 'Profil règlement', icon: Building2 },
  { href: '/admin/finance/audit', label: 'Audit', icon: Shield },
  { href: '/verify', label: 'Vérifier reçu', icon: QrCode },
]

export function FinanceAdminSubNav() {
  const pathname = usePathname()

  return (
    <nav className="mb-6 -mx-1 overflow-x-auto pb-1">
      <div className="flex gap-1 min-w-max px-1">
        {LINKS.map(({ href, label, icon: Icon, exact, highlight }) => {
          const active = exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium whitespace-nowrap transition-colors',
                active
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : highlight
                    ? 'bg-sky-50 text-sky-800 ring-1 ring-sky-200 hover:bg-sky-100'
                    : 'text-zinc-600 hover:bg-zinc-100',
              )}
            >
              <Icon size={13} />
              {label}
              {highlight && !active && (
                <span className="rounded-full bg-sky-600 px-1.5 py-0.5 text-[9px] font-bold text-white uppercase">
                  Barèmes
                </span>
              )}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
