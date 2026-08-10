'use client'

import Link from 'next/link'
import { AlertTriangle, Ban, Building2, ChevronRight, CreditCard, ShieldAlert } from 'lucide-react'
import type { School } from '@/types/super-admin'
import { cn } from '@/lib/utils'

type ActionItem = {
  id: string
  tone: 'red' | 'amber'
  title: string
  detail: string
  href: string
}

export function OwnerActionQueue({ schools }: { schools?: School[] }) {
  const items: ActionItem[] = []

  for (const s of (schools ?? []).filter((x) => x.active === false).slice(0, 4)) {
    items.push({
      id: `suspend-${s.id}`,
      tone: 'red',
      title: s.name,
      detail: s.operationalSuspension?.reason ?? 'Suspendu — contrat / insolvabilité',
      href: `/super-admin/schools/${s.id}`,
    })
  }

  for (const s of (schools ?? [])
    .filter((x) => x.active !== false && x.health.level === 'CRITICAL')
    .slice(0, 4)) {
    items.push({
      id: `crit-${s.id}`,
      tone: 'amber',
      title: s.name,
      detail: `Santé critique (${s.health.score}%)`,
      href: `/super-admin/schools/${s.id}`,
    })
  }

  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 px-5 py-4 flex items-center gap-3">
        <ShieldAlert size={18} className="text-emerald-600 shrink-0" />
        <div>
          <p className="text-sm font-medium text-emerald-900">Aucune alerte propriétaire</p>
          <p className="text-xs text-emerald-700/80 mt-0.5">Tous les établissements sont opérationnels.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Actions requises</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Suspensions et établissements à risque</p>
        </div>
        <Link
          href="/super-admin/billing"
          className="text-xs font-medium text-indigo-600 hover:underline inline-flex items-center gap-1"
        >
          <CreditCard size={12} /> Abonnements SaaS
        </Link>
      </div>
      <ul className="divide-y divide-zinc-100">
        {items.map((item) => {
          const Icon = item.tone === 'red' ? Ban : item.tone === 'amber' ? AlertTriangle : Building2
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-5 py-3 transition-colors border-l-4',
                  item.tone === 'red' && 'border-l-red-400 bg-red-50/30 hover:bg-red-50/50',
                  item.tone === 'amber' && 'border-l-amber-400 bg-amber-50/30 hover:bg-amber-50/50',
                )}
              >
                <Icon size={16} className="shrink-0 text-zinc-500" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">{item.title}</p>
                  <p className="text-xs text-zinc-500 truncate mt-0.5">{item.detail}</p>
                </div>
                <ChevronRight size={14} className="text-zinc-300 shrink-0" />
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
