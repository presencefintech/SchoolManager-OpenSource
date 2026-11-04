'use client'

import { Loader2 } from 'lucide-react'
import type { EnrollmentFeePreview } from '@/types/admin'

function fmtMoney(amount: number, currency?: string) {
  const n = amount.toLocaleString('fr-FR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
  return currency ? `${n} ${currency}` : n
}

type Props = {
  preview?: EnrollmentFeePreview | null
  loading?: boolean
  /** Message si aucune ligne (classe absente / barème manquant). */
  emptyHint?: string
  className?: string
}

/**
 * LOT 3 — carte quotation net V2 (classe + add-ons + remises + net payable).
 */
export function EnrollmentFeePreviewCard({
  preview,
  loading,
  emptyHint = 'Aucun barème pour cette classe — configurez la grille tarifaire V2.',
  className,
}: Props) {
  const currency = preview?.currency
  const bd = preview?.breakdown
  const baseLines =
    preview?.feeLines?.filter(
      (l) => l.source !== 'PROPOSED' && l.assignmentMode !== 'EXPLICIT',
    ) ?? []
  const addOnLines =
    preview?.feeLines?.filter(
      (l) => l.source === 'PROPOSED' || l.assignmentMode === 'EXPLICIT',
    ) ?? []
  const discountLines =
    preview?.feeLines?.filter((l) => (l.discountAmount ?? 0) > 0) ?? []

  return (
    <div
      className={
        className ??
        'rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-2.5 space-y-2'
      }
    >
      <div className="flex items-center justify-between gap-2">
        <p className="text-[11px] font-medium text-zinc-600">
          Quote {preview?.academicYear ?? '—'}
          {currency ? ` · ${currency}` : ''}
          {preview?.mode === 'category_v2' ? ' · net V2' : preview?.mode ? ` · ${preview.mode}` : ''}
          {preview?.studentCategory ? ` · ${preview.studentCategory}` : ''}
        </p>
        {loading && <Loader2 size={12} className="animate-spin text-zinc-400" />}
      </div>

      {preview?.feeLines?.length ? (
        <div className="space-y-2">
          {baseLines.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">
                Frais de classe (automatiques)
              </p>
              <ul className="space-y-1">
                {baseLines.map((line) => (
                  <li
                    key={`base-${line.feeStructureId}-${line.categoryId}`}
                    className="flex items-center justify-between gap-2 text-[11px] text-zinc-700"
                  >
                    <span>
                      {line.categoryName}
                      <span className="text-zinc-400"> · {line.billingPeriod}</span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {fmtMoney(line.grossAmount ?? line.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {addOnLines.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-amber-800">
                Packs optionnels
              </p>
              <ul className="space-y-1">
                {addOnLines.map((line) => (
                  <li
                    key={`addon-${line.feeStructureId}-${line.categoryId}`}
                    className="flex items-center justify-between gap-2 text-[11px] text-zinc-700"
                  >
                    <span>
                      {line.categoryName}
                      <span className="ml-1 rounded bg-amber-50 px-1 text-[9px] font-medium uppercase text-amber-700">
                        optionnel
                      </span>
                    </span>
                    <span className="tabular-nums font-medium">
                      {fmtMoney(line.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {discountLines.length > 0 && (
            <div className="space-y-1">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-800">
                Remises catégorie / grille
              </p>
              <ul className="space-y-1">
                {discountLines.map((line) => (
                  <li
                    key={`disc-${line.feeStructureId}-${line.categoryId}`}
                    className="flex items-center justify-between gap-2 text-[11px] text-violet-900"
                  >
                    <span className="truncate">
                      {line.discountLabel || line.categoryName}
                    </span>
                    <span className="tabular-nums font-medium shrink-0">
                      −{fmtMoney(line.discountAmount ?? 0, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {bd && (
            <div className="rounded-lg border border-zinc-200/80 bg-white/70 px-2.5 py-2 space-y-1 text-[11px]">
              <div className="flex justify-between text-zinc-600">
                <span>Base classe (net)</span>
                <span className="tabular-nums">{fmtMoney(bd.baseClassFees, currency)}</span>
              </div>
              <div className="flex justify-between text-zinc-600">
                <span>Add-ons</span>
                <span className="tabular-nums">{fmtMoney(bd.addOns, currency)}</span>
              </div>
              <div className="flex justify-between text-violet-800">
                <span>Remises</span>
                <span className="tabular-nums">−{fmtMoney(bd.discounts, currency)}</span>
              </div>
              <div className="flex justify-between text-sm font-semibold text-emerald-900 border-t border-zinc-100 pt-1.5 mt-1">
                <span>Net payable</span>
                <span className="tabular-nums">{fmtMoney(bd.netPayable, currency)}</span>
              </div>
            </div>
          )}

          {!bd && (
            <div className="flex justify-between text-xs font-semibold text-zinc-900 border-t border-zinc-200 pt-1.5">
              <span>Net payable</span>
              <span className="tabular-nums">{fmtMoney(preview.totalFees, currency)}</span>
            </div>
          )}
        </div>
      ) : (
        !loading && <p className="text-[11px] text-amber-700">{emptyHint}</p>
      )}
    </div>
  )
}
