'use client'

import { AlertCircle, Calendar, Loader2 } from 'lucide-react'
import { useFeeStructures, useAdminStudentFeePeriodStatus } from '@/lib/hooks/use-admin'
import { formatMoney } from '@/lib/finance/currency'
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
          {status.unpaidMonths.length} mois impayé{status.unpaidMonths.length > 1 ? 's' : ''} — paiement séquentiel obligatoire.
        </p>
      </div>
    )
  }

  if (status.oneTimePaid || status.annualPaid) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
        Ce barème ({BILLING_PERIOD_LABEL[status.billingPeriod] ?? status.billingPeriod}) est déjà soldé
        pour cet élève (tous les guichets).
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

export function ManualCatalogFeePanel({
  studentId,
  feeStructureId,
  monthYear,
  onFeeStructureChange,
  onMonthYearChange,
}: {
  studentId: number
  feeStructureId?: number
  monthYear?: string
  onFeeStructureChange: (feeStructureId: number | undefined) => void
  onMonthYearChange: (monthYear: string | undefined) => void
}) {
  const { data: structures = [], isLoading: loadingStructures } = useFeeStructures({ isActive: true })
  const { data: periodStatus, isLoading: loadingPeriod, isError } = useAdminStudentFeePeriodStatus(
    studentId,
    feeStructureId,
  )

  const selected = structures.find((s) => s.id === feeStructureId)
  const isMonthly = periodStatus?.billingPeriod === 'MONTHLY'
  const allowed = periodStatus?.allowedMonthYear ?? null
  const monthMismatch =
    isMonthly && allowed && monthYear && monthYear !== allowed

  return (
    <div className="space-y-3 rounded-xl border border-dashed border-zinc-200 bg-zinc-50/80 p-3">
      <p className="text-xs text-zinc-500">
        Barème optionnel — le serveur indique la période encaissable avant envoi.
      </p>

      <div>
        <label className="block text-xs font-medium text-zinc-600 mb-1">Barème (catalogue)</label>
        {loadingStructures ? (
          <div className="flex items-center gap-2 text-xs text-zinc-400 py-2">
            <Loader2 size={12} className="animate-spin" /> Chargement…
          </div>
        ) : (
          <select
            value={feeStructureId ?? ''}
            onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : undefined
              onFeeStructureChange(id)
              onMonthYearChange(undefined)
            }}
            className="w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm"
          >
            <option value="">— Montant libre sans barème —</option>
            {structures.map((fs) => (
              <option key={fs.id} value={fs.id}>
                {fs.categoryName ?? fs.description ?? `Barème #${fs.id}`}
                {fs.billingPeriod ? ` (${fs.billingPeriod})` : ''}
                {fs.amount != null ? ` — ${formatMoney(fs.amount, fs.currency)}` : ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {feeStructureId ? (
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
                      value={monthYear ?? allowed}
                      onChange={(e) => onMonthYearChange(e.target.value || undefined)}
                      className="flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm font-mono"
                    />
                    {monthYear !== allowed && (
                      <button
                        type="button"
                        onClick={() => onMonthYearChange(allowed)}
                        className="shrink-0 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2 text-xs font-medium text-sky-800 hover:bg-sky-100"
                      >
                        Appliquer {allowed}
                      </button>
                    )}
                  </div>
                  {monthMismatch ? (
                    <p className="mt-1 text-xs text-amber-700">
                      Écart avec le serveur — seul <strong>{allowed}</strong> sera accepté si l&apos;enforcement est actif.
                    </p>
                  ) : (
                    <p className="mt-1 text-xs text-emerald-700">
                      Aligné sur le mois autorisé par le serveur.
                    </p>
                  )}
                </div>
              ) : null}
              {selected?.amount != null && (
                <p className="text-[11px] text-zinc-500">
                  Montant barème : {formatMoney(selected.amount, selected.currency)} — saisissez le montant réel encaissé ci-dessous.
                </p>
              )}
            </>
          ) : null}
        </>
      ) : null}
    </div>
  )
}

/** Validation client avant POST — retourne message d'erreur ou null. */
export function validateManualCatalogPeriod(
  status: StudentFeePeriodStatusDto | undefined,
  monthYear: string | undefined,
): string | null {
  if (!status) return null
  if (status.billingPeriod !== 'MONTHLY') {
    if (status.oneTimePaid || status.annualPaid) {
      return `Le barème « ${status.categoryName} » est déjà soldé.`
    }
    return null
  }
  if (!status.allowedMonthYear) {
    return `Aucun mois impayé pour « ${status.categoryName} ».`
  }
  if (!monthYear) {
    return `Indiquez la période (mois autorisé : ${status.allowedMonthYear}).`
  }
  if (monthYear !== status.allowedMonthYear) {
    return `Période invalide — le serveur n'accepte que ${formatMonthYearLabel(status.allowedMonthYear)} (${status.allowedMonthYear}).`
  }
  return null
}
