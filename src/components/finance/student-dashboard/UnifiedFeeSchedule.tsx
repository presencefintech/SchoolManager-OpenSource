'use client'

import { useMemo } from 'react'
import { CalendarRange } from 'lucide-react'
import {
  feeScheduleLineKey,
  formatFeePeriodLabel,
  getSelectableFeeLines,
  getStructureMonthlyLines,
  type FeeLineSelection,
} from '@/lib/finance/fee-schedule.utils'
import { displayedRemaining, scheduleTotals } from '@/lib/finance/fee-schedule-view'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'
import type { FeeScheduleLineDto } from '@/types/finance'
import { FeeAttributionSourceBadge, FeeScheduleStatusBadge } from './schedule-badges'

interface UnifiedFeeScheduleProps {
  lines: FeeScheduleLineDto[]
  currency: FinanceCurrencyCode
  /** null : tableau en lecture seule (pas de colonne de sélection). */
  selection: FeeLineSelection[] | null
  onToggle?: (line: FeeScheduleLineDto) => void
  onAmountChange?: (line: FeeScheduleLineDto, raw: string) => void
  onSelectYear?: (feeStructureId: number) => void
}

const MONEY = 'font-mono tabular-nums tracking-tight'

/**
 * Échéancier unifié : sélection, mois et catégorie, total, payé, reste, statut.
 * La sélection suit la règle séquentielle de fee-schedule.utils (pas de mois sauté).
 */
export function UnifiedFeeSchedule({
  lines,
  currency,
  selection,
  onToggle,
  onAmountChange,
  onSelectYear,
}: UnifiedFeeScheduleProps) {
  const selectable = useMemo(
    () => new Set(getSelectableFeeLines(lines).map(feeScheduleLineKey)),
    [lines],
  )
  const selected = useMemo(
    () => new Map((selection ?? []).map((s) => [feeScheduleLineKey(s.line), s.amount])),
    [selection],
  )
  const totals = useMemo(() => scheduleTotals(lines), [lines])

  // Raccourcis « toute l'année » des barèmes mensuels qui ont encore des mois à payer.
  const yearShortcuts = useMemo(() => {
    if (!selection || !onSelectYear) return []
    const byStructure = new Map<number, { label: string; count: number }>()
    for (const line of getSelectableFeeLines(lines)) {
      if (line.billingPeriod !== 'MONTHLY') continue
      const entry = byStructure.get(line.feeStructureId) ?? {
        label: getStructureMonthlyLines(lines, line.feeStructureId)[0]?.categoryName ?? line.categoryName,
        count: 0,
      }
      entry.count += 1
      byStructure.set(line.feeStructureId, entry)
    }
    return Array.from(byStructure, ([feeStructureId, v]) => ({ feeStructureId, ...v }))
  }, [lines, selection, onSelectYear])

  const interactive = selection !== null

  if (lines.length === 0) {
    return (
      <div className="rounded-xl border border-zinc-200/70 bg-white px-6 py-12 text-center">
        <p className="text-sm font-light text-zinc-500">Aucune ligne d’échéancier pour cette session.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {interactive && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs font-light text-zinc-500">
            Cocher un mois inclut les mois précédents impayés. Avance autorisée.
          </p>
          {yearShortcuts.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {yearShortcuts.map((s) => (
                <button
                  key={s.feeStructureId}
                  type="button"
                  onClick={() => onSelectYear?.(s.feeStructureId)}
                  className="inline-flex items-center gap-1 rounded-full border border-zinc-200 bg-white px-2.5 py-1 text-[11px] font-normal text-zinc-600 hover:border-emerald-300 hover:text-emerald-700"
                >
                  <CalendarRange size={12} strokeWidth={1.75} aria-hidden />
                  Toute l’année · {s.label} ({s.count} mois)
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-zinc-200/70 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-sm">
            <thead>
              <tr className="border-b border-zinc-100 text-[11px] font-normal uppercase tracking-wider text-zinc-400">
                {interactive && (
                  <th className="w-10 px-4 py-3">
                    <span className="sr-only">Sélection</span>
                  </th>
                )}
                <th className="px-4 py-3 text-left font-normal">Mois &amp; catégorie</th>
                <th className="px-4 py-3 text-right font-normal">Montant total</th>
                <th className="px-4 py-3 text-right font-normal">Payé</th>
                <th className="px-4 py-3 text-right font-normal">Reste à payer</th>
                <th className="px-4 py-3 text-left font-normal">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100/80">
              {lines.map((line) => {
                const key = feeScheduleLineKey(line)
                const canSelect = interactive && selectable.has(key)
                const isSelected = selected.has(key)
                const remaining = displayedRemaining(line)
                const paid = Number(line.amountPaid ?? 0)
                const cur = (line.currency || currency) as FinanceCurrencyCode
                return (
                  <tr
                    key={key}
                    onClick={canSelect ? () => onToggle?.(line) : undefined}
                    className={cn(
                      'transition-colors',
                      canSelect && 'cursor-pointer',
                      isSelected ? 'bg-emerald-50/50' : canSelect && 'hover:bg-zinc-50/70',
                    )}
                  >
                    {interactive && (
                      <td className="px-4 py-3 align-middle" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          disabled={!canSelect}
                          onChange={() => onToggle?.(line)}
                          aria-label={`Sélectionner ${line.categoryName} · ${formatFeePeriodLabel(line)}`}
                          className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-400 disabled:opacity-30"
                        />
                      </td>
                    )}
                    <td className="px-4 py-3 align-middle">
                      <p className="text-sm font-normal text-zinc-900">{formatFeePeriodLabel(line)}</p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        <span className="text-xs font-light text-zinc-500">{line.categoryName}</span>
                        <FeeAttributionSourceBadge source={line.attributionSource} reason={line.attributionReason} />
                      </div>
                    </td>
                    <td className={cn('px-4 py-3 text-right align-middle text-zinc-700', MONEY)}>
                      {formatMoney(line.amount, cur)}
                    </td>
                    <td className={cn('px-4 py-3 text-right align-middle', MONEY, paid > 0 ? 'text-emerald-700' : 'text-zinc-300')}>
                      {formatMoney(paid, cur)}
                    </td>
                    <td className="px-4 py-3 text-right align-middle" onClick={(e) => isSelected && e.stopPropagation()}>
                      <span className={cn(MONEY, remaining > 0.01 ? 'text-zinc-900' : 'text-zinc-300')}>
                        {formatMoney(remaining, cur)}
                      </span>
                      {isSelected && onAmountChange && (
                        <label className="mt-1 flex items-center justify-end gap-1.5 text-[10px] font-light text-zinc-400">
                          à encaisser
                          <input
                            type="number"
                            min={0.01}
                            max={remaining}
                            step="0.01"
                            value={selected.get(key)}
                            onChange={(e) => onAmountChange(line, e.target.value)}
                            className={cn(
                              'w-24 rounded-md border border-zinc-200 bg-white px-2 py-0.5 text-right text-xs text-zinc-900 focus:outline-none focus:ring-2 focus:ring-emerald-400/40',
                              MONEY,
                            )}
                          />
                        </label>
                      )}
                    </td>
                    <td className="px-4 py-3 align-middle">
                      <FeeScheduleStatusBadge status={line.status} />
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-zinc-200/80 bg-zinc-50/60 text-xs">
                {interactive && <td />}
                <td className="px-4 py-3 font-light text-zinc-500">
                  {lines.length} ligne{lines.length > 1 ? 's' : ''}
                </td>
                <td className={cn('px-4 py-3 text-right text-zinc-700', MONEY)}>{formatMoney(totals.billed, currency)}</td>
                <td className={cn('px-4 py-3 text-right text-emerald-700', MONEY)}>{formatMoney(totals.paid, currency)}</td>
                <td className={cn('px-4 py-3 text-right font-medium text-zinc-900', MONEY)}>
                  {formatMoney(totals.remaining, currency)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  )
}
