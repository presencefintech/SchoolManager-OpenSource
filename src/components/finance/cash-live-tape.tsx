'use client'

import Link from 'next/link'
import {
  ArrowDownRight,
  ArrowUpRight,
  Banknote,
  Radio,
  Smartphone,
  Undo2,
  Wallet,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import type { CashActivityKind, CashActivityRealtimeItem } from '@/types/admin'
import { cn } from '@/lib/utils'

const KIND_LABEL: Record<CashActivityKind, string> = {
  SESSION_OPEN: 'Ouverture',
  SESSION_CLOSE: 'Clôture',
  CASH_PAYMENT: 'Espèces',
  MOBILE_PAYMENT: 'Mobile',
  LEDGER_MOVEMENT: 'Mouvement',
  SMS_PENDING: 'SMS à valider',
  SMS_DECLARATION: 'SMS validé',
  SMS_REJECTED: 'SMS rejeté',
  REFUND: 'Remboursement',
}

function kindHref(kind: CashActivityKind): string | null {
  if (kind === 'SMS_PENDING' || kind === 'SMS_DECLARATION' || kind === 'SMS_REJECTED') {
    return '/finances/declarations'
  }
  if (kind === 'CASH_PAYMENT' || kind === 'MOBILE_PAYMENT') return '/finances/paiements'
  if (kind === 'REFUND') return '/finances/remboursements'
  return null
}

function fmtTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

export function CashLiveTape({
  items,
  live,
  showSchool = false,
  hrefBase = 'finance',
  emptyHint = 'Les encaissements, SMS et mouvements apparaissent ici tout de suite.',
}: {
  items: CashActivityRealtimeItem[]
  live?: boolean
  showSchool?: boolean
  hrefBase?: 'finance' | 'admin'
  emptyHint?: string
}) {
  const cashIn = items
    .filter((m) => m.kind === 'CASH_PAYMENT' && m.affectsCashDrawer !== false)
    .reduce((sum, m) => sum + (m.amount ?? 0), 0)
  const pendingSms = items.filter((m) => m.kind === 'SMS_PENDING').length

  function hrefFor(kind: CashActivityKind): string | null {
    const raw = kindHref(kind)
    if (!raw || hrefBase === 'finance') return raw
    return raw.replace('/finances/', '/admin/finance/')
  }

  return (
    <section className="rounded-2xl border border-emerald-100 bg-white overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-emerald-50 bg-emerald-50/40">
        <div className="flex items-center gap-2">
          <Radio size={14} className={live ? 'text-emerald-600' : 'text-zinc-400'} />
          <p className="text-sm font-semibold text-zinc-900">Mouvements en direct</p>
          {live ? (
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-800">
              Live
            </span>
          ) : null}
        </div>
        <p className="text-[11px] text-zinc-500">
          Espèces reçues (session) {formatMoney(cashIn)}
          {pendingSms > 0 ? ` · ${pendingSms} SMS à valider` : ''}
        </p>
      </div>

      {items.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-zinc-400">{emptyHint}</p>
      ) : (
        <ul className="divide-y divide-zinc-50 max-h-80 overflow-y-auto">
          {items.map((m) => {
            const href = hrefFor(m.kind)
            const out = m.direction === 'OUT'
            const pending = m.kind === 'SMS_PENDING' || m.kind === 'SMS_REJECTED'
            const row = (
              <div className="flex items-start gap-2.5 px-4 py-2.5">
                <KindIcon kind={m.kind} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-900 truncate">
                    {showSchool && m.schoolName ? `${m.schoolName} · ` : ''}
                    {m.studentName ?? m.label}
                  </p>
                  <p className="text-[11px] text-zinc-500 truncate">
                    {KIND_LABEL[m.kind]}
                    {m.method ? ` · ${m.method}` : ''}
                    {m.reference ? ` · ${m.reference}` : ''}
                    {m.affectsCashDrawer === false && m.kind !== 'SESSION_OPEN' && m.kind !== 'SESSION_CLOSE'
                      ? ' · hors tiroir espèces'
                      : ''}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p
                    className={cn(
                      'text-sm font-semibold tabular-nums',
                      out ? 'text-red-700' : pending ? 'text-amber-800' : 'text-emerald-800',
                    )}
                  >
                    {m.amount != null
                      ? `${out ? '−' : pending ? '' : '+'}${formatMoney(m.amount, m.currency ?? 'USD')}`
                      : '—'}
                  </p>
                  <p className="text-[10px] tabular-nums text-zinc-400">{fmtTime(m.timestamp)}</p>
                </div>
              </div>
            )
            return (
              <li key={m.id}>
                {href ? (
                  <Link href={href} className="block hover:bg-emerald-50/50">
                    {row}
                  </Link>
                ) : (
                  row
                )}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function KindIcon({ kind }: { kind: CashActivityKind }) {
  const cls = 'mt-0.5 shrink-0'
  if (kind === 'CASH_PAYMENT') return <Banknote size={14} className={cn(cls, 'text-emerald-700')} />
  if (kind === 'MOBILE_PAYMENT' || kind.startsWith('SMS')) {
    return <Smartphone size={14} className={cn(cls, kind === 'SMS_PENDING' ? 'text-amber-600' : 'text-sky-600')} />
  }
  if (kind === 'REFUND' || kind === 'LEDGER_MOVEMENT') {
    return kind === 'REFUND' ? (
      <Undo2 size={14} className={cn(cls, 'text-red-600')} />
    ) : (
      <ArrowDownRight size={14} className={cn(cls, 'text-violet-600')} />
    )
  }
  if (kind === 'SESSION_OPEN') return <ArrowUpRight size={14} className={cn(cls, 'text-emerald-600')} />
  if (kind === 'SESSION_CLOSE') return <Wallet size={14} className={cn(cls, 'text-zinc-500')} />
  return <Wallet size={14} className={cn(cls, 'text-zinc-400')} />
}
