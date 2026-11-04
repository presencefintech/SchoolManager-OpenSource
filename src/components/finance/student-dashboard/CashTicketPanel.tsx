'use client'

import { CheckCircle2, Receipt, X } from 'lucide-react'
import { PrintReceiptButton } from '@/components/finance/student-dashboard/receipts/PrintReceiptButton'
import {
  FinanceCatalogFeePanel,
  type FinanceCatalogSelection,
} from '@/components/finance/finance-catalog-fee-panel'
import { feeScheduleLineKey, formatFeePeriodLabel, type FeeLineSelection } from '@/lib/finance/fee-schedule.utils'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import { cn } from '@/lib/utils'

const MONEY = 'font-mono tabular-nums tracking-tight'

interface CashTicketPanelProps {
  studentId: number
  currency: FinanceCurrencyCode
  selection: FeeLineSelection[]
  totalAmount: number
  onClear: () => void
  onCollect: () => void
  /** Bascule « hors échéancier » (null : non proposée, ex. vue admin). */
  catalogMode: boolean | null
  onCatalogModeChange: (on: boolean) => void
  catalog: FinanceCatalogSelection
  onCatalogChange: (next: FinanceCatalogSelection) => void
  catalogError: string | null
  onCollectCatalog: () => void
  lastPaymentId: number | null
  className?: string
}

/** Ticket de caisse : lignes retenues, sous-total et action « Encaisser ». */
export function CashTicketPanel({
  studentId,
  currency,
  selection,
  totalAmount,
  onClear,
  onCollect,
  catalogMode,
  onCatalogModeChange,
  catalog,
  onCatalogChange,
  catalogError,
  onCollectCatalog,
  lastPaymentId,
  className,
}: CashTicketPanelProps) {
  const inCatalog = catalogMode === true
  const amount = inCatalog ? catalog.amount : totalAmount
  const canCollect = amount > 0

  return (
    <aside className={cn('space-y-3', className)}>
      {lastPaymentId ? (
        <div className="rounded-xl border border-emerald-200/70 bg-emerald-50/60 p-4">
          <div className="flex items-start gap-2">
            <CheckCircle2 size={16} strokeWidth={1.75} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
            <div className="min-w-0">
              <p className="text-sm font-normal text-emerald-900">Paiement enregistré · #{lastPaymentId}</p>
              <p className="mt-0.5 text-[11px] font-light text-emerald-700/80">Ticket caisse ou reçu A4</p>
            </div>
          </div>
          <div className="mt-3">
            <PrintReceiptButton paymentId={lastPaymentId} />
          </div>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-xl border border-zinc-200/70 bg-white shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
        <div className="flex items-center justify-between border-b border-dashed border-zinc-200 px-5 py-4">
          <div className="flex items-center gap-2">
            <Receipt size={16} strokeWidth={1.75} className="text-zinc-400" aria-hidden />
            <h3 className="text-sm font-normal text-zinc-900">Ticket de caisse</h3>
          </div>
          {!inCatalog && selection.length > 0 && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 text-[11px] font-light text-zinc-400 hover:text-zinc-700"
            >
              <X size={12} aria-hidden />
              Vider
            </button>
          )}
        </div>

        <div className="px-5 py-4">
          {inCatalog ? (
            <div className="space-y-3">
              <FinanceCatalogFeePanel studentId={studentId} value={catalog} onChange={onCatalogChange} />
              {catalogError ? (
                <p className="rounded-lg border border-rose-100 bg-rose-50 px-3 py-2 text-xs text-rose-700">
                  {catalogError}
                </p>
              ) : null}
            </div>
          ) : selection.length === 0 ? (
            <p className="py-6 text-center text-xs font-light text-zinc-400">
              Cochez une ou plusieurs lignes de l’échéancier.
            </p>
          ) : (
            <ul className="max-h-72 space-y-2.5 overflow-y-auto pr-1">
              {selection.map(({ line, amount: lineAmount }) => (
                <li key={feeScheduleLineKey(line)} className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-xs font-normal text-zinc-800">{formatFeePeriodLabel(line)}</p>
                    <p className="truncate text-[11px] font-light text-zinc-400">{line.categoryName}</p>
                  </div>
                  <span className={cn('shrink-0 text-xs text-zinc-800', MONEY)}>{formatMoney(lineAmount, currency)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3 border-t border-dashed border-zinc-200 bg-zinc-50/50 px-5 py-4">
          <div className="flex items-baseline justify-between">
            <span className="text-xs font-light text-zinc-500">
              Sous-total
              {!inCatalog && selection.length > 0 ? ` · ${selection.length} ligne${selection.length > 1 ? 's' : ''}` : ''}
            </span>
            <span className={cn('text-xl text-zinc-900', MONEY)}>{formatMoney(amount, currency)}</span>
          </div>
          <button
            type="button"
            disabled={!canCollect}
            onClick={inCatalog ? onCollectCatalog : onCollect}
            className="w-full rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-400 disabled:shadow-none"
          >
            Encaisser
          </button>
          {catalogMode !== null && (
            <label className="flex cursor-pointer select-none items-center gap-2 text-[11px] font-light text-zinc-500">
              <input
                type="checkbox"
                checked={inCatalog}
                onChange={(e) => onCatalogModeChange(e.target.checked)}
                className="rounded border-zinc-300 text-emerald-600 focus:ring-emerald-400"
              />
              Paiement hors échéancier (catalogue ou montant libre)
            </label>
          )}
        </div>
      </div>
    </aside>
  )
}
