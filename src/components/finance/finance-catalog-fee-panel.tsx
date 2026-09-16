'use client'

import { useEffect } from 'react'
import { AlertCircle, Calendar, Loader2 } from 'lucide-react'
import {
  useFinanceFeeStructures,
  useStudentFeePeriodStatus,
} from '@/lib/hooks/use-finance'
import { validateManualCatalogPeriod } from '@/components/admin/finance/manual-catalog-fee-panel'
import type { FeeStructureListItem } from '@/lib/finance/fee-structure.utils'
import type { StudentFeePeriodStatusDto } from '@/types/finance'

const BILLING_PERIOD_LABEL: Record<string, string> = {
  ONE_TIME: 'Frais unique',
  ANNUAL: 'Annuel',
  MONTHLY: 'Mensuel',
  TERM: 'Trimestre',
}

function formatMonthYearLabel(monthYear: string): string {
  const match = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(monthYear)
  if (!match) return monthYear
  const d = new Date(Number(match[1]), Number(match[2]) - 1, 1)
  return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
}

function PeriodStatusBanner({ status }: { status: StudentFeePeriodStatusDto }) {
  if (status.billingPeriod === 'MONTHLY') {
    if (!status.allowedMonthYear) {
      return (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
          Tous les mois de <strong>{status.categoryName}</strong> sont soldés pour {status.sessionLabel}.
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs text-sky-900">
        <p className="font-medium flex items-center gap-1.5">
          <Calendar size={13} />
          Mois encaissable (serveur) : {formatMonthYearLabel(status.allowedMonthYear)}
        </p>
        <p className="mt-1 text-sky-700/90">
          {status.unpaidMonths.length} mois impayé{status.unpaidMonths.length > 1 ? 's' : ''} — paiement
          séquentiel obligatoire.
        </p>
      </div>
    )
  }

  if (status.oneTimePaid || status.annualPaid) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Ce barème ({BILLING_PERIOD_LABEL[status.billingPeriod] ?? status.billingPeriod}) est déjà soldé
        pour cet élève — tous les guichets voient le même état.
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-600">
      Barème {status.categoryName} — {BILLING_PERIOD_LABEL[status.billingPeriod] ?? status.billingPeriod}.
      Aucune période mensuelle requise.
    </div>
  )
}

export type FinanceCatalogSelection = {
  feeStructureId?: number
  monthYear?: string
  amount: number
}

export function FinanceCatalogFeePanel({
  studentId,
  value,
  onChange,
}: {
  studentId: number
  value: FinanceCatalogSelection
  onChange: (next: FinanceCatalogSelection) => void
}) {
  const { data: structuresRaw = [], isLoading: loadingStructures } = useFinanceFeeStructures()
  const structures = structuresRaw as FeeStructureListItem[]
  const { data: periodStatus, isLoading: loadingPeriod, isError } = useStudentFeePeriodStatus(
    studentId,
    value.feeStructureId,
  )

  const selected = structures.find((s: FeeStructureListItem) => s.id === value.feeStructureId)
  const isMonthly = periodStatus?.billingPeriod === 'MONTHLY'
  const allowed = periodStatus?.allowedMonthYear ?? null
  const monthMismatch = isMonthly && allowed && value.monthYear && value.monthYear !== allowed

  useEffect(() => {
    if (
      value.feeStructureId &&
      periodStatus?.billingPeriod === 'MONTHLY' &&
      periodStatus.allowedMonthYear &&
      !value.monthYear
    ) {
      onChange({
        feeStructureId: value.feeStructureId,
        amount: value.amount,
        monthYear: periodStatus.allowedMonthYear,
      })
    }
    // onChange volontairement omis — identité parent instable
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    value.feeStructureId,
    value.monthYear,
    value.amount,
    periodStatus?.billingPeriod,
    periodStatus?.allowedMonthYear,
  ])

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-violet-200 bg-violet-50/40 p-3">
      <p className="text-xs text-zinc-600">
        Mode hors échéancier — barème catalogue ou montant libre, période validée par le serveur.
      </p>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Barème (catalogue)</label>
        {loadingStructures ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <select
            value={value.feeStructureId ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : undefined
              const fs = structures.find((s: FeeStructureListItem) => s.id === id)
              onChange({
                feeStructureId: id,
                monthYear: undefined,
                amount: fs?.amount && fs.amount > 0 ? fs.amount : value.amount,
              })
            }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Montant libre sans barème —</option>
            {structures.map((fs: FeeStructureListItem) => (
              <option key={fs.id} value={fs.id}>
                {fs.categoryName ?? fs.label}
                {fs.billingPeriod ? ` (${fs.billingPeriod})` : ''}
                {fs.amount > 0 ? ` — ${fs.amount}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {value.feeStructureId ? (
        <>
          {loadingPeriod ? (
            <div className="flex items-center gap-2 text-xs text-zinc-400">
              <Loader2 size={12} className="animate-spin" /> Vérification période serveur…
            </div>
          ) : isError ? (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={13} className="mt-0.5 shrink-0" />
              Impossible de charger la période pour ce barème.
            </div>
          ) : periodStatus ? (
            <>
              <PeriodStatusBanner status={periodStatus} />
              {isMonthly && allowed ? (
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">
                    Période à encaisser (YYYY-MM) *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="month"
                      required
                      value={value.monthYear ?? allowed}
                      onChange={(e) =>
                        onChange({ ...value, monthYear: e.target.value || undefined })
                      }
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono"
                    />
                    {value.monthYear !== allowed && (
                      <button
                        type="button"
                        onClick={() => onChange({ ...value, monthYear: allowed })}
                        className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100"
                      >
                        Appliquer {allowed}
                      </button>
                    )}
                  </div>
                  {monthMismatch ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Écart avec le serveur — seul <strong>{allowed}</strong> sera accepté.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-700">Aligné sur le mois autorisé.</p>
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </>
      ) : null}

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Montant à encaisser *</label>
        <input
          type="number"
          min={0.01}
          step="0.01"
          value={value.amount || ''}
          onChange={(e) => onChange({ ...value, amount: Number(e.target.value) || 0 })}
          className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm tabular-nums"
          placeholder="0.00"
        />
        {selected?.amount != null && selected.amount > 0 && (
          <p className="mt-1 text-[11px] text-zinc-500">
            Montant barème : {selected.amount}
            {selected.currency ? ` ${selected.currency}` : ''} — ajustable si paiement partiel.
          </p>
        )}
      </div>
    </div>
  )
}

export { validateManualCatalogPeriod }
