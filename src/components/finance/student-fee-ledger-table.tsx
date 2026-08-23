'use client'

import {
  BadgeCheck,
  CalendarClock,
  CircleAlert,
  FileBadge,
  Landmark,
  Receipt,
  Scale,
  Wallet,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/currency'

export type StudentFeeLedgerLine = {
  id: string
  name: string
  billingPeriod?: string
  periodLabel?: string
  expected: number
  paid: number
  remaining: number
}

const PERIOD_META: Record<string, { label: string; icon: typeof CalendarClock }> = {
  MONTHLY: { label: 'Mensuel', icon: CalendarClock },
  ANNUAL: { label: 'Annuel', icon: Landmark },
  ONE_TIME: { label: 'Une fois', icon: FileBadge },
}

function periodMeta(period?: string) {
  return PERIOD_META[period ?? ''] ?? { label: period || '—', icon: Receipt }
}

function statusOf(remaining: number, expected: number) {
  if (remaining <= 0.01) return { label: 'Soldé', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100', Icon: BadgeCheck }
  if (expected > 0 && remaining < expected) {
    return { label: 'Partiel', tone: 'bg-amber-50 text-amber-800 ring-amber-100', Icon: CircleAlert }
  }
  return { label: 'À recouvrer', tone: 'bg-rose-50 text-rose-700 ring-rose-100', Icon: Wallet }
}

export function StudentFeeLedgerTable({
  lines,
  currency,
  totals,
}: {
  lines: StudentFeeLedgerLine[]
  currency: string
  totals?: { expected: number; paid: number; remaining: number }
}) {
  const footer = totals ?? {
    expected: lines.reduce((s, l) => s + l.expected, 0),
    paid: lines.reduce((s, l) => s + l.paid, 0),
    remaining: lines.reduce((s, l) => s + l.remaining, 0),
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_1px_8px_rgba(15,23,42,0.04)]">
      <table className="min-w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-100 bg-zinc-50/90 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">
            <th className="px-4 py-3 text-left">
              <span className="inline-flex items-center gap-1.5">
                <Receipt size={13} className="text-zinc-400" />
                Frais
              </span>
            </th>
            <th className="px-3 py-3 text-left">Période</th>
            <th className="px-3 py-3 text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                <Scale size={13} className="text-slate-400" />
                Dû
              </span>
            </th>
            <th className="px-3 py-3 text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                <BadgeCheck size={13} className="text-emerald-500" />
                Payé
              </span>
            </th>
            <th className="px-3 py-3 text-right">
              <span className="inline-flex items-center justify-end gap-1.5">
                <Wallet size={13} className="text-rose-400" />
                Reste à payer
              </span>
            </th>
            <th className="px-4 py-3 text-right">État</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-100">
          {lines.map((line) => {
            const period = periodMeta(line.billingPeriod)
            const PeriodIcon = period.icon
            const periodLabel = line.periodLabel ?? period.label
            const status = statusOf(line.remaining, line.expected)
            const StatusIcon = status.Icon
            const pct = line.expected > 0 ? Math.min(100, (line.paid / line.expected) * 100) : 0
            return (
              <tr key={line.id} className="align-top">
                <td className="px-4 py-3">
                  <p className="font-semibold text-zinc-900">{line.name}</p>
                  <div className="mt-1.5 h-1.5 w-28 overflow-hidden rounded-full bg-zinc-100">
                    <div
                      className={cn(
                        'h-full rounded-full',
                        pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-zinc-200',
                      )}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                    <PeriodIcon size={13} className="text-zinc-400" />
                    {periodLabel}
                  </span>
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-medium text-slate-800">
                  {formatMoney(line.expected, currency)}
                </td>
                <td className="px-3 py-3 text-right tabular-nums font-semibold text-emerald-700">
                  {formatMoney(line.paid, currency)}
                </td>
                <td
                  className={cn(
                    'px-3 py-3 text-right tabular-nums font-semibold',
                    line.remaining > 0.01 ? 'text-rose-700' : 'text-zinc-400',
                  )}
                >
                  {formatMoney(line.remaining, currency)}
                </td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                      status.tone,
                    )}
                  >
                    <StatusIcon size={11} />
                    {status.label}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
        <tfoot>
          <tr className="border-t border-zinc-200 bg-zinc-50/80 text-sm font-semibold">
            <td className="px-4 py-3 text-zinc-700" colSpan={2}>
              Total élève
            </td>
            <td className="px-3 py-3 text-right tabular-nums text-slate-900">
              {formatMoney(footer.expected, currency)}
            </td>
            <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
              {formatMoney(footer.paid, currency)}
            </td>
            <td
              className={cn(
                'px-3 py-3 text-right tabular-nums',
                footer.remaining > 0.01 ? 'text-rose-700' : 'text-zinc-500',
              )}
            >
              {formatMoney(footer.remaining, currency)}
            </td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  )
}
