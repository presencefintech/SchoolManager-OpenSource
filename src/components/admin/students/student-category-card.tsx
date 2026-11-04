'use client'

import { useEffect, useMemo, useState } from 'react'
import { Loader2, Percent, Tag } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import {
  useApplyObligationManualDiscount,
  useAssignStudentCategory,
  useFeeStructuresV2,
} from '@/lib/hooks/use-admin'
import { formatMoney, type FinanceCurrencyCode } from '@/lib/finance/currency'
import {
  CUSTOM_CATEGORY_LABEL_SUGGESTIONS,
  STUDENT_CATEGORY_OPTIONS,
  formatDiscountPolicyHint,
  labelStudentCategory,
  normalizeCustomCategoryLabel,
  policyMatchesStudentPreview,
  toMoneyNumber,
} from '@/lib/finance/student-category-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import type {
  FeeCatalogV2,
  FeeDiscountType,
  StudentCategory,
  StudentFeeObligationLine,
} from '@/types/admin'
import { cn } from '@/lib/utils'

type PreviewLine = {
  feeCategoryId: number
  label: string
  gross: number
  discount: number
  net: number
  currency: string
}

function previewObligations(
  catalog: FeeCatalogV2 | undefined,
  category: StudentCategory,
  customLabel: string | null,
  sessionId?: number,
): PreviewLine[] {
  if (!catalog) return []
  const byFee = new Map<number, PreviewLine & { spec: number }>()

  for (const rule of catalog.gridRules ?? []) {
    if (!rule.isActive) continue
    if (rule.studentCategory !== category) continue
    if (sessionId && rule.sessionId != null && rule.sessionId !== sessionId) continue

    const feeCat = catalog.categories.find((c) => c.id === rule.feeCategoryId)
    const gross = toMoneyNumber(rule.amount)
    const policies = (catalog.discountPolicies ?? []).filter(
      (p) =>
        p.isActive !== false &&
        policyMatchesStudentPreview(p, category, customLabel) &&
        (p.feeCategoryId == null || p.feeCategoryId === rule.feeCategoryId),
    )
    let remaining = gross
    let discount = 0
    for (const p of policies) {
      const value = toMoneyNumber(p.value)
      const cut =
        p.discountType === 'PERCENTAGE'
          ? Number(((remaining * value) / 100).toFixed(2))
          : Math.min(remaining, value)
      discount += cut
      remaining = Math.max(0, Number((remaining - cut).toFixed(2)))
    }

    const existing = byFee.get(rule.feeCategoryId)
    const specificity =
      (rule.classId != null ? 4 : 0) + (rule.optionId != null ? 2 : 0) + (rule.sectionId != null ? 1 : 0)
    if (!existing || specificity >= existing.spec) {
      byFee.set(rule.feeCategoryId, {
        feeCategoryId: rule.feeCategoryId,
        label: feeCat?.name ?? `Frais #${rule.feeCategoryId}`,
        gross,
        discount,
        net: remaining,
        currency: rule.currency || 'USD',
        spec: specificity,
      })
    }
  }

  return [...byFee.values()].map(({ feeCategoryId, label, gross, discount, net, currency }) => ({
    feeCategoryId,
    label,
    gross,
    discount,
    net,
    currency,
  }))
}

export function StudentCategoryCard({
  studentId,
  currentCategory = 'STANDARD',
  currentCustomLabel = null,
  scholarshipPercent,
  sessionId,
  className,
  readOnly = false,
}: {
  studentId: number
  currentCategory?: StudentCategory | string | null
  currentCustomLabel?: string | null
  scholarshipPercent?: number | null
  sessionId?: number
  className?: string
  readOnly?: boolean
}) {
  const initial = (currentCategory as StudentCategory) || 'STANDARD'
  const initialLabel = normalizeCustomCategoryLabel(currentCustomLabel)
  const [selected, setSelected] = useState<StudentCategory>(initial)
  const [customLabel, setCustomLabel] = useState(initialLabel ?? '')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [obligations, setObligations] = useState<StudentFeeObligationLine[]>([])
  const [manualObligationId, setManualObligationId] = useState<number | ''>('')
  const [manualType, setManualType] = useState<FeeDiscountType>('PERCENTAGE')
  const [manualValue, setManualValue] = useState('30')
  const [manualReason, setManualReason] = useState('')

  useEffect(() => {
    setSelected((currentCategory as StudentCategory) || 'STANDARD')
  }, [currentCategory])

  useEffect(() => {
    setCustomLabel(normalizeCustomCategoryLabel(currentCustomLabel) ?? '')
  }, [currentCustomLabel])

  const { data: catalog } = useFeeStructuresV2()
  const assign = useAssignStudentCategory(studentId)
  const manualDiscount = useApplyObligationManualDiscount(studentId)

  const normalizedDraftLabel = normalizeCustomCategoryLabel(customLabel)

  const policyHint = useMemo(() => {
    const policy = (catalog?.discountPolicies ?? []).find(
      (p) =>
        p.isActive !== false &&
        policyMatchesStudentPreview(p, selected, normalizedDraftLabel),
    )
    return formatDiscountPolicyHint(policy)
  }, [catalog, selected, normalizedDraftLabel])

  const preview = useMemo(
    () => previewObligations(catalog, selected, normalizedDraftLabel, sessionId),
    [catalog, selected, normalizedDraftLabel, sessionId],
  )

  const dirty =
    selected !== initial ||
    (normalizedDraftLabel ?? null) !== (initialLabel ?? null)

  async function handleConfirm() {
    setError(null)
    try {
      const result = await assign.mutateAsync({
        studentCategory: selected,
        customCategoryLabel: normalizedDraftLabel,
        ...(sessionId ? { sessionId, academicYearId: sessionId } : {}),
      })
      const lines = result.obligations?.obligations ?? []
      setObligations(lines)
      if (lines[0]) setManualObligationId(lines[0].id)
      setConfirmOpen(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleManualDiscount() {
    if (!manualObligationId || !manualReason.trim()) {
      setError('Sélectionnez une obligation et un motif (min. 3 caractères).')
      return
    }
    setError(null)
    try {
      const result = await manualDiscount.mutateAsync({
        obligationId: Number(manualObligationId),
        payload: {
          discountType: manualType,
          value: Number(manualValue) || 0,
          reason: manualReason.trim(),
        },
      })
      setObligations(result.obligations ?? [])
      setManualReason('')
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const impact = preview.map((line) => {
    const cur = (line.currency === 'CDF' ? 'CDF' : 'USD') as FinanceCurrencyCode
    return `${line.label} : ${formatMoney(line.gross, cur)} − ${formatMoney(line.discount, cur)} = ${formatMoney(line.net, cur)}`
  })

  if (preview.length === 0 && dirty) {
    impact.push(
      'Aucune ligne de grille V2 pour cette catégorie — les obligations existantes seront recalculées côté serveur.',
    )
  }
  if (normalizedDraftLabel) {
    impact.unshift(`Libellé dynamique : ${normalizedDraftLabel}`)
  }

  const displayLabel = labelStudentCategory(initial, initialLabel)

  return (
    <div className={cn('rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden', className)}>
      <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-2 min-w-0">
        <Tag size={14} className="text-emerald-600 shrink-0" />
        <div className="min-w-0">
          <h3 className="text-sm font-semibold text-zinc-900 truncate">
            Catégorie Financière &amp; Exonérations
          </h3>
          <p className="text-[11px] text-zinc-500">Tarification RDC selon le statut de l&apos;élève</p>
        </div>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex max-w-full items-center rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 ring-1 ring-emerald-100">
            <span className="truncate">
              {displayLabel}
              {policyHint && !dirty ? ` · ${policyHint}` : ''}
            </span>
          </span>
          {initialLabel ? (
            <span className="inline-flex items-center rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-800 ring-1 ring-sky-100">
              Dynamique
            </span>
          ) : null}
          {scholarshipPercent != null && scholarshipPercent > 0 ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-medium text-amber-800 ring-1 ring-amber-100">
              <Percent size={10} />
              Bourse {scholarshipPercent}%
            </span>
          ) : null}
        </div>

        {!readOnly && (
          <>
            <label className="block text-xs font-medium text-zinc-600">
              Catégorie de base (enum)
              <select
                value={selected}
                onChange={(e) => setSelected(e.target.value as StudentCategory)}
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                {STUDENT_CATEGORY_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>

            <label className="block text-xs font-medium text-zinc-600">
              Libellé dynamique (optionnel)
              <input
                list={`custom-cat-${studentId}`}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
                placeholder="ex. Famille Nombreuse, Orphelin…"
                className="mt-1.5 w-full px-3 py-2 rounded-xl border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
              <datalist id={`custom-cat-${studentId}`}>
                {CUSTOM_CATEGORY_LABEL_SUGGESTIONS.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
              <span className="mt-1 block text-[10px] text-zinc-400">
                Prioritaire sur l&apos;enum pour les politiques `appliesToCustomLabel`.
              </span>
            </label>

            {dirty && preview.length > 0 && (
              <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3 space-y-1.5">
                <p className="text-[11px] font-semibold text-zinc-600 uppercase tracking-wide">
                  Aperçu du recalcul
                </p>
                {preview.map((line) => {
                  const cur = (line.currency === 'CDF' ? 'CDF' : 'USD') as FinanceCurrencyCode
                  return (
                    <div key={line.feeCategoryId} className="flex justify-between gap-2 text-xs text-zinc-700 min-w-0">
                      <span className="truncate min-w-0">{line.label}</span>
                      <span className="tabular-nums shrink-0">
                        {formatMoney(line.gross, cur)}
                        {line.discount > 0 ? (
                          <span className="text-amber-700"> − {formatMoney(line.discount, cur)}</span>
                        ) : null}
                        {' = '}
                        <span className="font-semibold text-emerald-700">{formatMoney(line.net, cur)}</span>
                      </span>
                    </div>
                  )
                })}
              </div>
            )}

            {error && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>
            )}

            <button
              type="button"
              disabled={!dirty || assign.isPending}
              onClick={() => setConfirmOpen(true)}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {assign.isPending && <Loader2 size={14} className="animate-spin" />}
              Appliquer et recalculer
            </button>

            {obligations.length > 0 && (
              <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-3 space-y-2">
                <p className="text-[11px] font-semibold text-amber-900 uppercase tracking-wide">
                  Ristourne manuelle (obligation V2)
                </p>
                <p className="text-[10px] text-amber-800/80">
                  Ajuste le net dû sans modifier PaymentFee / historique d&apos;encaissement.
                </p>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase">
                  Obligation
                  <select
                    value={manualObligationId}
                    onChange={(e) =>
                      setManualObligationId(e.target.value ? Number(e.target.value) : '')
                    }
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs"
                  >
                    {obligations.map((o) => {
                      const cat = catalog?.categories.find((c) => c.id === o.feeCategoryId)
                      return (
                        <option key={o.id} value={o.id}>
                          {cat?.name ?? `Frais #${o.feeCategoryId}`} · net {o.netAmount}
                        </option>
                      )
                    })}
                  </select>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase">
                    Type
                    <select
                      value={manualType}
                      onChange={(e) => setManualType(e.target.value as FeeDiscountType)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs"
                    >
                      <option value="PERCENTAGE">%</option>
                      <option value="FIXED_AMOUNT">Montant fixe</option>
                    </select>
                  </label>
                  <label className="block text-[10px] font-medium text-zinc-500 uppercase">
                    Valeur
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={manualValue}
                      onChange={(e) => setManualValue(e.target.value)}
                      className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs tabular-nums"
                    />
                  </label>
                </div>
                <label className="block text-[10px] font-medium text-zinc-500 uppercase">
                  Motif
                  <input
                    value={manualReason}
                    onChange={(e) => setManualReason(e.target.value)}
                    placeholder="Ristourne Famille Nombreuse"
                    className="mt-1 w-full px-2 py-1.5 rounded-lg border border-zinc-200 text-xs"
                  />
                </label>
                <button
                  type="button"
                  disabled={manualDiscount.isPending || !manualReason.trim()}
                  onClick={() => void handleManualDiscount()}
                  className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-amber-600 text-xs font-medium text-white hover:bg-amber-700 disabled:opacity-50"
                >
                  {manualDiscount.isPending && <Loader2 size={12} className="animate-spin" />}
                  Appliquer la ristourne
                </button>
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Confirmer le changement de catégorie"
        description={`Passer à « ${labelStudentCategory(selected, normalizedDraftLabel)} » recalcule les tranches restantes de l’élève.`}
        impact={impact.slice(0, 8)}
        confirmLabel="Confirmer"
        loading={assign.isPending}
        onConfirm={() => void handleConfirm()}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  )
}
