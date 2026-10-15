'use client'

import type { ReactNode } from 'react'
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

const PERIOD_META: Record<string, { label: string; icon: typeof CalendarClock; tile: string }> = {
  MONTHLY: { label: 'Mensuel', icon: CalendarClock, tile: 'bg-sky-50 text-sky-700' },
  ANNUAL: { label: 'Annuel', icon: Landmark, tile: 'bg-violet-50 text-violet-700' },
  ONE_TIME: { label: 'Une fois', icon: FileBadge, tile: 'bg-slate-100 text-slate-700' },
}

function periodMeta(period?: string) {
  return PERIOD_META[period ?? ''] ?? { label: period || 'Frais', icon: Receipt, tile: 'bg-zinc-100 text-zinc-600' }
}

function statusOf(remaining: number, expected: number) {
  if (remaining <= 0.01) {
    return { label: 'Soldé', tone: 'bg-emerald-50 text-emerald-700 ring-emerald-100', Icon: BadgeCheck }
  }
  if (expected > 0 && remaining < expected) {
    return { label: 'Partiel', tone: 'bg-amber-50 text-amber-800 ring-amber-100', Icon: CircleAlert }
  }
  return { label: 'À recouvrer', tone: 'bg-rose-50 text-rose-700 ring-rose-100', Icon: Wallet }
}

function collectionPct(expected: number, paid: number) {
  if (expected <= 0) return paid > 0 ? 100 : 0
  return Math.min(100, (paid / expected) * 100)
}

export function StudentFeeLedgerTable({
  lines,
  currency,
  totals,
  footerLabel = 'Total',
  heading,
  subtitle,
  extra,
}: {
  lines: StudentFeeLedgerLine[]
  currency: string
  totals?: { expected: number; paid: number; remaining: number }
  footerLabel?: string
  heading?: string
  subtitle?: string
  extra?: ReactNode
}) {
  const footer = totals ?? {
    expected: lines.reduce((s, l) => s + l.expected, 0),
    paid: lines.reduce((s, l) => s + l.paid, 0),
    remaining: lines.reduce((s, l) => s + l.remaining, 0),
  }
  const rate = collectionPct(footer.expected, footer.paid)
  const cleared = footer.remaining <= 0.01

  return (
    <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_8px_28px_rgba(15,23,42,0.06)]">
      {(heading || subtitle || extra) && (
        <div className="flex flex-wrap items-start justify-between gap-4 border-b border-zinc-100 bg-[linear-gradient(180deg,#f8fafc_0%,#ffffff_100%)] px-5 py-4">
          <div className="min-w-0">
            {heading && (
              <h3 className="text-[15px] font-semibold tracking-tight text-zinc-900">{heading}</h3>
            )}
            {subtitle && <p className="mt-0.5 text-xs text-zinc-500">{subtitle}</p>}
          </div>
          {extra}
        </div>
      )}

      <div className="grid grid-cols-3 divide-x divide-zinc-100 border-b border-zinc-100">
        <Metric
          icon={Scale}
          iconClass="bg-slate-100 text-slate-600"
          label="Dû"
          value={formatMoney(footer.expected, currency)}
        />
        <Metric
          icon={BadgeCheck}
          iconClass="bg-emerald-50 text-emerald-600"
          label="Payé"
          value={formatMoney(footer.paid, currency)}
          valueClass="text-emerald-700"
        />
        <Metric
          icon={Wallet}
          iconClass={cleared ? 'bg-zinc-100 text-zinc-500' : 'bg-rose-50 text-rose-600'}
          label="Reste à payer"
          value={formatMoney(footer.remaining, currency)}
          valueClass={cleared ? 'text-zinc-500' : 'text-rose-700'}
        />
      </div>

      <div className="flex items-center gap-3 border-b border-zinc-100 px-5 py-2.5">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-zinc-100">
          <div
            className={cn(
              'h-full rounded-full',
              rate >= 100 ? 'bg-emerald-500' : rate > 0 ? 'bg-gradient-to-r from-emerald-500 to-teal-500' : 'bg-zinc-200',
            )}
            style={{ width: `${rate}%` }}
          />
        </div>
        <p className="text-[11px] font-semibold tabular-nums text-zinc-500">
          {rate.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} % recouvré
        </p>
      </div>

      <div className="w-full overflow-x-auto">
        <table className="min-w-[640px] w-full text-sm">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
              <th className="px-5 py-3 text-left">Nature du frais</th>
              <th className="px-4 py-3 text-left">Périodicité</th>
              <th className="px-4 py-3 text-right">Dû</th>
              <th className="px-4 py-3 text-right">Payé</th>
              <th className="px-4 py-3 text-right">Reste</th>
              <th className="px-5 py-3 text-right">Situation</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {lines.map((line) => {
              const period = periodMeta(line.billingPeriod)
              const PeriodIcon = period.icon
              const periodLabel = line.periodLabel ?? period.label
              const status = statusOf(line.remaining, line.expected)
              const StatusIcon = status.Icon
              const pct = collectionPct(line.expected, line.paid)
              return (
                <tr key={line.id} className="align-middle hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <span
                        className={cn(
                          'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl',
                          period.tile,
                        )}
                      >
                        <PeriodIcon size={15} />
                      </span>
                      <div className="min-w-0">
                        <p className="font-semibold text-zinc-900">{line.name}</p>
                        <div className="mt-1.5 h-1 w-24 overflow-hidden rounded-full bg-zinc-100">
                          <div
                            className={cn(
                              'h-full rounded-full',
                              pct >= 100 ? 'bg-emerald-500' : pct > 0 ? 'bg-amber-400' : 'bg-zinc-200',
                            )}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-xs font-medium text-zinc-500">{periodLabel}</span>
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-medium text-slate-800">
                    {formatMoney(line.expected, currency)}
                  </td>
                  <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700">
                    {formatMoney(line.paid, currency)}
                  </td>
                  <td
                    className={cn(
                      'px-4 py-3.5 text-right tabular-nums font-semibold',
                      line.remaining > 0.01 ? 'text-rose-700' : 'text-zinc-400',
                    )}
                  >
                    {formatMoney(line.remaining, currency)}
                  </td>
                  <td className="px-5 py-3.5 text-right">
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
            <tr className="border-t border-zinc-200 bg-slate-50 text-sm">
              <td className="px-5 py-3.5 font-semibold text-slate-800" colSpan={2}>
                {footerLabel}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-900">
                {formatMoney(footer.expected, currency)}
              </td>
              <td className="px-4 py-3.5 text-right tabular-nums font-semibold text-emerald-700">
                {formatMoney(footer.paid, currency)}
              </td>
              <td
                className={cn(
                  'px-4 py-3.5 text-right tabular-nums font-semibold',
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
    </div>
  )
}

function Metric({
  icon: Icon,
  iconClass,
  label,
  value,
  valueClass,
}: {
  icon: typeof Scale
  iconClass: string
  label: string
  value: string
  valueClass?: string
}) {
  return (
    <div className="flex items-center gap-3 px-5 py-4">
      <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-xl', iconClass)}>
        <Icon size={16} />
      </span>
      <div className="min-w-0">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">{label}</p>
        <p className={cn('truncate text-lg font-semibold tabular-nums tracking-tight text-zinc-900', valueClass)}>
          {value}
        </p>
      </div>
    </div>
  )
}
