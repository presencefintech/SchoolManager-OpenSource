'use client'

import { cn } from '@/lib/utils'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import type { FeeScheduleLineDto, FeeScheduleLineStatus } from '@/types/finance'
import type { ColumnDef } from '@tanstack/react-table'

const STATUS_CFG: Record<
  FeeScheduleLineStatus,
  { label: string; className: string }
> = {
  PAID: { label: 'Payé', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  PARTIALLY_PAID: { label: 'Partiel', className: 'bg-amber-50 text-amber-800 ring-amber-600/20' },
  DUE: { label: 'Dû', className: 'bg-red-50 text-red-700 ring-red-600/20' },
  OVERDUE: { label: 'En retard', className: 'bg-red-100 text-red-800 ring-red-700/25' },
  UPCOMING: { label: 'À venir', className: 'bg-sky-50 text-sky-700 ring-sky-600/20' },
}

export function FeeScheduleStatusBadge({
  status,
  className,
}: {
  status: FeeScheduleLineStatus
  className?: string
}) {
  const cfg = STATUS_CFG[status] ?? STATUS_CFG.DUE
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset',
        cfg.className,
        className,
      )}
    >
      {cfg.label}
    </span>
  )
}

function formatMonthYear(value: string | null): string {
  if (!value) return '—'
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(value)
  if (!match) return value
  const date = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  const label = date.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
  return label.charAt(0).toUpperCase() + label.slice(1)
}

function formatDueDate(value: string | null): string {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

export function createFeesTableColumns(currency: FinanceCurrencyCode): ColumnDef<FeeScheduleLineDto>[] {
  return [
    {
      id: 'month',
      accessorFn: (row) => row.monthYear ?? row.dueDate ?? '',
      header: 'Mois',
      cell: ({ row }) => {
        const { monthYear, billingPeriod, dueDate } = row.original
        if (billingPeriod === 'ONE_TIME') {
          return (
            <span className="text-zinc-600">
              {dueDate ? formatDueDate(dueDate) : 'Frais unique'}
            </span>
          )
        }
        return <span className="text-zinc-900">{formatMonthYear(monthYear)}</span>
      },
    },
    {
      accessorKey: 'categoryName',
      header: 'Catégorie',
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-zinc-900">{row.original.categoryName}</p>
          {row.original.categoryCode ? (
            <p className="text-xs text-zinc-400 font-mono">{row.original.categoryCode}</p>
          ) : null}
        </div>
      ),
    },
    {
      accessorKey: 'amount',
      header: () => <span className="block text-right">Montant</span>,
      cell: ({ row }) => (
        <span className="block text-right font-medium tabular-nums text-zinc-900">
          {formatMoney(row.original.amount, row.original.currency || currency)}
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Statut',
      cell: ({ row }) => <FeeScheduleStatusBadge status={row.original.status} />,
    },
  ]
}
