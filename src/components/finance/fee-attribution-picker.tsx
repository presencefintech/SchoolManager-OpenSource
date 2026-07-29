'use client'

import { useMemo } from 'react'
import { AlertCircle, Loader2 } from 'lucide-react'
import { useStudentFeeSchedule } from '@/lib/finance/hooks/use-student-fee-schedule'
import { useAdminStudentFeeSchedule } from '@/lib/hooks/use-admin'
import {
  feeScheduleLineKey,
  formatFeePeriodLabel,
  getSelectableFeeLines,
  getStructureMonthlyLines,
  lineRemainingAmount,
  selectAllRemainingMonths,
  selectionTotalAmount,
  toggleContiguousFeeSelection,
  type FeeLineSelection,
} from '@/lib/finance/fee-schedule.utils'
import { FeeScheduleStatusBadge } from '@/components/finance/student-dashboard/FeesTable/fees-table.columns'
import { formatMoney } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type { FeeScheduleLineDto } from '@/types/finance'

export type { FeeLineSelection }

export type FeeAttributionValue = {
  sessionId: number
  lines: FeeLineSelection[]
  totalAmount: number
}

interface FeeAttributionPanelProps {
  studentId: number
  sessionId?: number
  value: FeeAttributionValue | null
  onChange: (value: FeeAttributionValue | null) => void
  api?: 'finance' | 'admin'
  compact?: boolean
}

export function FeeAttributionPanel({
  studentId,
  sessionId,
  value,
  onChange,
  api = 'finance',
  compact = false,
}: FeeAttributionPanelProps) {
  const financeQuery = useStudentFeeSchedule(studentId, sessionId, {
    enabled: api === 'finance',
  })
  const adminQuery = useAdminStudentFeeSchedule(studentId, sessionId, {
    enabled: api === 'admin',
  })
  const { data, isLoading, isError, error } = api === 'admin' ? adminQuery : financeQuery

  const selectableLines = useMemo(
    () => getSelectableFeeLines(data?.lines ?? []),
    [data?.lines],
  )

  const monthlyStructureIds = useMemo(() => {
    const ids = new Set<number>()
    for (const line of selectableLines) {
      if (line.billingPeriod === 'MONTHLY') ids.add(line.feeStructureId)
    }
    return ids
  }, [selectableLines])

  const selectedMap = useMemo(() => {
    const map = new Map<string, number>()
    for (const sel of value?.lines ?? []) {
      map.set(feeScheduleLineKey(sel.line), sel.amount)
    }
    return map
  }, [value?.lines])

  if (!studentId) return null

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-sm text-zinc-500">
        <Loader2 size={14} className="animate-spin" />
        Chargement de l&apos;échéancier…
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex items-start gap-2 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-xs text-red-700">
        <AlertCircle size={14} className="mt-0.5 shrink-0" />
        {(error as Error)?.message ?? 'Impossible de charger l&apos;échéancier'}
      </div>
    )
  }

  if (!data) return null

  if (selectableLines.length === 0) {
    return (
      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-xs text-amber-800">
        Aucune échéance à payer pour {data.sessionLabel}. Les frais sont à jour ou non configurés.
      </div>
    )
  }

  function emit(nextLines: FeeLineSelection[]) {
    if (nextLines.length === 0) {
      onChange(null)
      return
    }
    onChange({
      sessionId: data!.sessionId,
      lines: nextLines,
      totalAmount: selectionTotalAmount(nextLines),
    })
  }

  function toggleLine(line: FeeScheduleLineDto) {
    emit(toggleContiguousFeeSelection(line, value?.lines ?? [], data!.lines))
  }

  function updateAmount(line: FeeScheduleLineDto, raw: string) {
    const key = feeScheduleLineKey(line)
    const parsed = Number(raw)
    const max = lineRemainingAmount(line)
    const amount = Number.isFinite(parsed)
      ? Math.min(Math.max(parsed, 0.01), max)
      : 0.01

    const current = value?.lines ?? []
    emit(
      current.map((sel) =>
        feeScheduleLineKey(sel.line) === key ? { ...sel, amount } : sel,
      ),
    )
  }

  function handleSelectAllYear(feeStructureId: number) {
    emit(selectAllRemainingMonths(feeStructureId, value?.lines ?? [], data!.lines))
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <label className="block text-xs font-medium text-zinc-500">
          Mois à encaisser <span className="text-red-500">*</span>
        </label>
        <span className="text-[10px] text-zinc-400">
          {data.sessionLabel} · multi-mois · avance autorisée
        </span>
      </div>

      <p className="text-[11px] text-zinc-500 rounded-lg bg-zinc-50 border border-zinc-100 px-3 py-2">
        Paiement séquentiel : impossible de sauter un mois impayé. Cocher un mois inclut
        automatiquement les mois précédents non soldés. Vous pouvez payer plusieurs mois
        d&apos;avance (ex. toute l&apos;année restante).
      </p>

      {monthlyStructureIds.size > 0 && (
        <div className="flex flex-wrap gap-2">
          {Array.from(monthlyStructureIds).map((feeStructureId) => {
            const first = getStructureMonthlyLines(data.lines, feeStructureId)[0]
            const label = first?.categoryName ?? `Barème #${feeStructureId}`
            const remaining = getSelectableFeeLines(data.lines).filter(
              (l) => l.feeStructureId === feeStructureId,
            ).length
            return (
              <button
                key={feeStructureId}
                type="button"
                onClick={() => handleSelectAllYear(feeStructureId)}
                className="text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-50"
              >
                Toute l&apos;année · {label} ({remaining} mois)
              </button>
            )
          })}
        </div>
      )}

      <div
        className={cn(
          'rounded-xl border border-zinc-200 overflow-hidden divide-y divide-zinc-100',
          compact ? 'max-h-56 overflow-y-auto' : 'max-h-72 overflow-y-auto',
        )}
      >
        {selectableLines.map((line) => {
          const key = feeScheduleLineKey(line)
          const selected = selectedMap.has(key)
          const remaining = lineRemainingAmount(line)
          const selectedAmount = selectedMap.get(key) ?? remaining

          return (
            <div
              key={key}
              className={cn(
                'px-4 py-3 transition-colors',
                selected ? 'bg-emerald-50/80' : 'hover:bg-zinc-50',
              )}
            >
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={selected}
                  onChange={() => toggleLine(line)}
                  className="mt-1 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-400"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-zinc-900">{line.categoryName}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {formatFeePeriodLabel(line)}
                        {line.categoryCode ? ` · ${line.categoryCode}` : ''}
                      </p>
                      {(line.amountPaid ?? 0) > 0 && (
                        <p className="text-[10px] text-amber-700 mt-1">
                          Déjà payé {formatMoney(line.amountPaid ?? 0, line.currency)} · reste{' '}
                          {formatMoney(remaining, line.currency)}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      <span className="text-sm font-semibold tabular-nums text-zinc-900">
                        {formatMoney(line.amount, line.currency)}
                      </span>
                      <FeeScheduleStatusBadge status={line.status} />
                    </div>
                  </div>

                  {selected && (
                    <div className="mt-3 flex items-center gap-2 flex-wrap">
                      <label className="text-[11px] text-zinc-500 shrink-0">Montant à encaisser</label>
                      <input
                        type="number"
                        min={0.01}
                        max={remaining}
                        step="0.01"
                        value={selectedAmount}
                        onChange={(e) => updateAmount(line, e.target.value)}
                        className="w-28 rounded-lg border border-zinc-200 px-2 py-1 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
                      />
                      <button
                        type="button"
                        onClick={() => updateAmount(line, String(remaining))}
                        className="text-[10px] text-emerald-700 hover:underline"
                      >
                        Solde ({formatMoney(remaining, line.currency)})
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {value && value.lines.length > 0 && (
        <div className="flex items-center justify-between rounded-xl border border-emerald-100 bg-emerald-50/50 px-4 py-2.5 text-sm">
          <span className="text-zinc-600">
            {value.lines.length} mois sélectionné{value.lines.length > 1 ? 's' : ''}
          </span>
          <span className="font-semibold tabular-nums text-emerald-800">
            Total {formatMoney(value.totalAmount)}
          </span>
        </div>
      )}
    </div>
  )
}
