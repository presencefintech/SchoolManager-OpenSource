'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/currency'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import type { FeeScheduleLineDto, StudentFinancialRow } from '@/types/finance'

const STATUS_LABEL: Record<string, string> = {
  PAID: 'Payé',
  PARTIALLY_PAID: 'Partiel',
  DUE: 'Dû',
  UPCOMING: 'À venir',
  OVERDUE: 'En retard',
}

function FeeLinesMiniTable({ lines }: { lines: FeeScheduleLineDto[] }) {
  if (lines.length === 0) {
    return <p className="text-xs text-zinc-400 py-2">Aucun frais sur l&apos;échéancier</p>
  }

  const missing = lines.filter((l) => !l.paid && (l.amountRemaining ?? l.amount) > 0)

  return (
    <div className="space-y-2">
      {missing.length > 0 && (
        <p className="text-[11px] text-amber-700">
          {missing.length} ligne{missing.length > 1 ? 's' : ''} en attente ·{' '}
          {missing.map((l) => l.categoryName).filter(Boolean).slice(0, 4).join(', ')}
          {missing.length > 4 ? '…' : ''}
        </p>
      )}
      <div className="overflow-x-auto rounded-lg border border-zinc-200 bg-white">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-zinc-100 bg-zinc-50/80 text-left text-[10px] uppercase tracking-wide text-zinc-400">
              <th className="px-3 py-2">Frais</th>
              <th className="px-3 py-2">Période</th>
              <th className="px-3 py-2 text-right">Dû</th>
              <th className="px-3 py-2 text-right">Payé</th>
              <th className="px-3 py-2 text-right">Reste</th>
              <th className="px-3 py-2">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-50">
            {lines.map((line) => (
              <tr key={`${line.feeStructureId}-${line.monthYear ?? 'once'}-${line.categoryId}`}>
                <td className="px-3 py-2 font-medium text-zinc-800">{line.categoryName}</td>
                <td className="px-3 py-2 text-zinc-500">{line.monthYear ?? '—'}</td>
                <td className="px-3 py-2 text-right tabular-nums">{formatMoney(line.amount)}</td>
                <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                  {formatMoney(line.amountPaid ?? 0)}
                </td>
                <td
                  className={cn(
                    'px-3 py-2 text-right tabular-nums font-medium',
                    (line.amountRemaining ?? 0) > 0 ? 'text-red-600' : 'text-zinc-600',
                  )}
                >
                  {formatMoney(line.amountRemaining ?? Math.max(0, line.amount - (line.amountPaid ?? 0)))}
                </td>
                <td className="px-3 py-2">
                  <span
                    className={cn(
                      'rounded-full px-1.5 py-0.5 text-[10px] font-medium',
                      line.paid
                        ? 'bg-emerald-50 text-emerald-700'
                        : line.status === 'OVERDUE'
                          ? 'bg-red-50 text-red-700'
                          : 'bg-amber-50 text-amber-800',
                    )}
                  >
                    {STATUS_LABEL[line.status] ?? line.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ExpandedFeeSchedule({
  studentId,
  scheduleHref,
}: {
  studentId: number
  scheduleHref?: string
}) {
  const { data, isLoading, isError } = useStudentFeeSchedule(studentId, undefined, {
    enabled: true,
  })

  if (isLoading) {
    return <p className="text-xs text-zinc-400 py-3">Chargement de l&apos;échéancier…</p>
  }
  if (isError) {
    return <p className="text-xs text-red-600 py-3">Impossible de charger les frais</p>
  }

  const lines = data?.lines ?? []
  return (
    <div className="px-5 pb-4 pt-1 bg-zinc-50/60 border-t border-zinc-100">
      <div className="flex items-center justify-between gap-2 mb-2">
        <p className="text-xs font-semibold text-zinc-600">Détail — qui a payé quoi / qui manque</p>
        <StudentFeeScheduleLink studentId={studentId} variant="inline" href={scheduleHref} />
      </div>
      <FeeLinesMiniTable lines={lines} />
    </div>
  )
}

export function StudentFinancialControlRows({
  rows,
  studentHref,
  scheduleHref,
}: {
  rows: StudentFinancialRow[]
  studentHref: (id: number) => string
  scheduleHref?: (id: number) => string
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <table className="w-full">
      <thead>
        <tr className="border-b border-zinc-100 bg-zinc-50/80">
          <th className="w-8 px-2 py-3" />
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Élève
          </th>
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Classe
          </th>
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Frais
          </th>
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Payé
          </th>
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Solde
          </th>
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Statut
          </th>
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Actions
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-50">
        {rows.map((row) => {
          const open = expandedId === row.id
          return (
            <Fragment key={row.id}>
              <tr className="hover:bg-zinc-50/80 transition-colors">
                <td className="px-2 py-3">
                  <button
                    type="button"
                    aria-label={open ? 'Replier' : 'Déplier le détail des frais'}
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                </td>
                <td className="px-5 py-3">
                  <Link href={studentHref(row.id)} className="block group">
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-emerald-700">
                      {row.fullName}
                    </p>
                    <p className="text-xs text-zinc-400">{row.matricule}</p>
                  </Link>
                </td>
                <td className="px-5 py-3 text-sm text-zinc-600">
                  {row.className ?? '—'}
                  {(row.sectionName || row.optionName) && (
                    <p className="text-[10px] text-zinc-400">
                      {[row.sectionName, row.optionName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-700">
                  {formatMoney(row.totalFees)}
                </td>
                <td className="px-5 py-3 text-sm text-right tabular-nums text-emerald-700">
                  {formatMoney(row.feesPaid)}
                </td>
                <td
                  className={cn(
                    'px-5 py-3 text-sm text-right font-semibold tabular-nums',
                    row.balance > 0 ? 'text-red-600' : 'text-zinc-700',
                  )}
                >
                  {formatMoney(row.balance)}
                </td>
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      row.financialStatus === 'DEBTOR'
                        ? 'bg-red-50 text-red-700'
                        : 'bg-emerald-50 text-emerald-700',
                    )}
                  >
                    {row.financialStatus === 'DEBTOR' ? 'Débiteur' : 'En ordre'}
                  </span>
                </td>
                <td className="px-5 py-3 text-right">
                  <StudentFeeScheduleLink
                    studentId={row.id}
                    href={scheduleHref?.(row.id)}
                  />
                </td>
              </tr>
              {open && (
                <tr>
                  <td colSpan={8} className="p-0">
                    <ExpandedFeeSchedule
                      studentId={row.id}
                      scheduleHref={scheduleHref?.(row.id)}
                    />
                  </td>
                </tr>
              )}
            </Fragment>
          )
        })}
      </tbody>
    </table>
  )
}
