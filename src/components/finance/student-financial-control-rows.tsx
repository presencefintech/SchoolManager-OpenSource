'use client'

import { Fragment, useState } from 'react'
import Link from 'next/link'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { StudentFeeLedgerTable } from '@/components/finance/student-fee-ledger-table'
import { cn } from '@/lib/utils'
import { formatMoney } from '@/lib/finance/currency'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { StudentFeeScheduleLink } from '@/components/finance/student-fee-schedule-link'
import type { FeeScheduleLineDto, StudentFinancialRow } from '@/types/finance'

const SITUATION_LABEL: Record<string, string> = {
  PAID: 'En ordre',
  DEBTOR: 'Débiteur',
  OVERPAID: 'Sur-payé',
  DRIFT: 'Écart ledger',
  HIGH_RISK: 'Risque élevé',
  NPL_90: 'NPL 90+ j',
  AGING_0_30: 'Retard 0–30 j',
  AGING_31_60: 'Retard 31–60 j',
  AGING_61_90: 'Retard 61–90 j',
}

function situationTone(status: string): string {
  switch (status) {
    case 'PAID':
      return 'bg-emerald-50 text-emerald-700'
    case 'OVERPAID':
      return 'bg-sky-50 text-sky-700'
    case 'DRIFT':
      return 'bg-amber-50 text-amber-800'
    case 'NPL_90':
    case 'HIGH_RISK':
      return 'bg-red-100 text-red-800'
    case 'AGING_61_90':
      return 'bg-orange-50 text-orange-800'
    case 'AGING_31_60':
      return 'bg-amber-50 text-amber-700'
    case 'DEBTOR':
    case 'AGING_0_30':
      return 'bg-red-50 text-red-700'
    default:
      return 'bg-zinc-100 text-zinc-600'
  }
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
      <StudentFeeLedgerTable
        currency="USD"
        lines={lines.map((line) => ({
          id: `${line.feeStructureId}-${line.monthYear ?? 'once'}-${line.categoryId}`,
          name: line.categoryName,
          billingPeriod: line.billingPeriod,
          periodLabel: line.monthYear ?? undefined,
          expected: line.amount,
          paid: line.amountPaid ?? 0,
          remaining: line.amountRemaining ?? Math.max(0, line.amount - (line.amountPaid ?? 0)),
        }))}
      />
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
  hideAmounts = false,
}: {
  rows: StudentFinancialRow[]
  studentHref: (id: number) => string
  scheduleHref?: (id: number) => string
  hideAmounts?: boolean
}) {
  const [expandedId, setExpandedId] = useState<number | null>(null)

  return (
    <div className="w-full overflow-x-auto">
    <table className="w-full min-w-[780px]">
      <thead>
        <tr className="border-b border-zinc-100 bg-zinc-50/80">
          <th className="w-8 px-2 py-3" />
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Élève
          </th>
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Classe
          </th>
          {!hideAmounts && (
            <>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Frais
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Payé
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Solde
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                Risque
              </th>
              <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
                DPD
              </th>
            </>
          )}
          <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Situation
          </th>
          {!hideAmounts && (
          <th className="px-5 py-3 text-right text-xs font-semibold uppercase tracking-wide text-zinc-400">
            Actions
          </th>
          )}
        </tr>
      </thead>
      <tbody className="divide-y divide-zinc-50">
        {rows.map((row) => {
          const open = expandedId === row.id
          const situation = row.situation ?? row.financialStatus
          return (
            <Fragment key={row.id}>
              <tr className="hover:bg-zinc-50/80 transition-colors">
                <td className="px-2 py-3">
                  {hideAmounts ? (
                    <span className="inline-block w-6" />
                  ) : (
                  <button
                    type="button"
                    aria-label={open ? 'Replier' : 'Déplier le détail des frais'}
                    onClick={() => setExpandedId(open ? null : row.id)}
                    className="p-1 rounded-md text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  >
                    {open ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                  </button>
                  )}
                </td>
                <td className="px-5 py-3 max-w-[220px]">
                  <Link href={studentHref(row.id)} className="block group min-w-0">
                    <p className="text-sm font-medium text-zinc-900 group-hover:text-emerald-700 truncate">
                      {row.fullName}
                    </p>
                    <p className="text-xs text-zinc-400 truncate font-mono">{row.matricule}</p>
                  </Link>
                </td>
                <td className="px-5 py-3 text-sm text-zinc-600 max-w-[160px]">
                  <span className="block truncate">{row.className ?? '—'}</span>
                  {(row.sectionName || row.optionName) && (
                    <p className="text-[10px] text-zinc-400 truncate">
                      {[row.sectionName, row.optionName].filter(Boolean).join(' · ')}
                    </p>
                  )}
                </td>
                {!hideAmounts && (
                  <>
                <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-700">
                  {formatMoney(row.totalFees ?? 0)}
                </td>
                <td className="px-5 py-3 text-sm text-right tabular-nums text-emerald-700">
                  {formatMoney(row.feesPaid ?? 0)}
                </td>
                <td
                  className={cn(
                    'px-5 py-3 text-sm text-right font-semibold tabular-nums',
                    (row.balance ?? 0) > 0.01 ? 'text-red-600' : (row.balance ?? 0) < -0.01 ? 'text-sky-700' : 'text-zinc-700',
                  )}
                >
                  {formatMoney(row.balance ?? 0)}
                  {row.ledgerCoherent === false && (
                    <p className="text-[10px] font-normal text-amber-600">écart {formatMoney(row.ledgerDrift ?? 0)}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-right tabular-nums font-semibold text-zinc-800">
                  {row.riskScore != null ? row.riskScore : '—'}
                  {row.expectedLoss != null && row.expectedLoss > 0 && (
                    <p className="text-[10px] font-normal text-zinc-400">ECL {formatMoney(row.expectedLoss)}</p>
                  )}
                </td>
                <td className="px-5 py-3 text-sm text-right tabular-nums text-zinc-600">
                  {row.daysPastDue != null && (row.balance ?? 0) > 0.01 ? `${row.daysPastDue} j` : '—'}
                </td>
                  </>
                )}
                <td className="px-5 py-3">
                  <span
                    className={cn(
                      'text-xs font-medium px-2 py-0.5 rounded-full',
                      situationTone(situation),
                    )}
                  >
                    {SITUATION_LABEL[situation] ?? situation}
                  </span>
                </td>
                {!hideAmounts && (
                <td className="px-5 py-3 text-right">
                  <StudentFeeScheduleLink
                    studentId={row.id}
                    href={scheduleHref?.(row.id)}
                  />
                </td>
                )}
              </tr>
              {!hideAmounts && open && (
                <tr>
                  <td colSpan={10} className="p-0">
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
    </div>
  )
}
