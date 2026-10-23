'use client'

import { useMemo, useState } from 'react'
import { useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AlertTriangle, CalendarRange, Loader2, Plus, Trash2, X } from 'lucide-react'
import { useClasses, useCreateFee, useOptions, useSections, useStudentProfileCategories } from '@/lib/hooks/use-admin'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { formatMoney } from '@/lib/finance/currency'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import {
  EMPTY_FEE_FORM,
  feeCreationSchema,
  previewFeeLines,
  quarterlyInstallments,
  toCreateFeePayload,
  type FeeCreationFormValues,
  type FeeScope,
} from '@/lib/finance/fee-creation-form'
import type { FeeScheduleType } from '@/types/finance'
import { cn } from '@/lib/utils'

export interface CreateFeeAcademicYear {
  id: number
  label: string
  status: string
}

const SCHEDULES: Array<{ value: FeeScheduleType; label: string; hint: string }> = [
  { value: 'ONE_TIME', label: 'Paiement unique', hint: 'Une seule échéance (inscription, uniforme…)' },
  { value: 'INSTALLMENT', label: 'En tranches', hint: '2 à 12 tranches, chacune avec son montant et sa date' },
  { value: 'MONTHLY', label: 'Mensuel', hint: 'Même montant chaque mois de la période de facturation' },
]

const SCOPES: Array<{ value: FeeScope; label: string }> = [
  { value: 'ALL', label: 'Toute l’école' },
  { value: 'SECTIONS', label: 'Sections' },
  { value: 'OPTIONS', label: 'Options' },
  { value: 'CLASSES', label: 'Classes' },
]

const INPUT =
  'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400'

function startYearOf(label: string): number {
  const match = /(\d{4})/.exec(label)
  return match ? Number(match[1]) : new Date().getFullYear()
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="mt-1 text-[11px] text-red-600">{message}</p> : null
}

/**
 * « Créer un frais » sur le moteur V2 (POST /finance/fees) : une seule saisie crée les lignes
 * (une par échéance), la grille par périmètre et catégorie d'élève, et les dettes des élèves.
 */
export function CreateFeeDialog({
  academicYear,
  onClose,
}: {
  academicYear: CreateFeeAcademicYear
  onClose: () => void
}) {
  const toast = useToast()
  const { config: currencyConfig, isFetched: currencyLoaded } = useSchoolMoney()
  const createFee = useCreateFee()
  const { data: classes = [] } = useClasses({ isActive: true })
  const { data: sections = [] } = useSections()
  const { data: options = [] } = useOptions()
  const categoriesQuery = useStudentProfileCategories()
  const [serverError, setServerError] = useState('')

  const {
    register,
    control,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FeeCreationFormValues>({
    resolver: zodResolver(feeCreationSchema),
    defaultValues: EMPTY_FEE_FORM,
  })
  const installments = useFieldArray({ control, name: 'installments' })
  const values = useWatch({ control }) as FeeCreationFormValues

  // Le backend refuse toute autre devise que celle du compte élève de l'école.
  const baseCurrency = currencyConfig?.baseCurrency?.toUpperCase()
  const currency = baseCurrency === 'USD' || baseCurrency === 'CDF' ? baseCurrency : null
  const yearOpen = academicYear.status === 'OPEN'

  const scopeChoices = useMemo(() => {
    if (values.scope === 'SECTIONS') return sections.map((s) => ({ id: s.id, name: s.name }))
    if (values.scope === 'OPTIONS') return options.map((o) => ({ id: o.id, name: o.name }))
    if (values.scope === 'CLASSES') return classes.map((c) => ({ id: c.id, name: c.name }))
    return []
  }, [values.scope, sections, options, classes])

  const preview = previewFeeLines(values)

  function changeSchedule(next: FeeScheduleType) {
    setValue('scheduleType', next)
    if (next === 'INSTALLMENT' && installments.fields.length === 0) {
      installments.replace(quarterlyInstallments(startYearOf(academicYear.label)))
    }
  }

  function changeScope(next: FeeScope) {
    setValue('scope', next)
    setValue('scopeIds', [])
  }

  function toggle(field: 'scopeIds', id: number): void
  function toggle(field: 'studentCategories', id: string): void
  function toggle(field: 'scopeIds' | 'studentCategories', id: number | string) {
    const current = (values[field] ?? []) as Array<number | string>
    const next = current.includes(id) ? current.filter((x) => x !== id) : [...current, id]
    setValue(field, next as never, { shouldValidate: true })
  }

  async function onSubmit(v: FeeCreationFormValues) {
    if (!currency) return
    setServerError('')
    try {
      const result = await createFee.mutateAsync(
        toCreateFeePayload(v, { academicYearId: academicYear.id, currency }),
      )
      const ob = result.obligations
      toast.success(
        `Frais « ${v.name.trim()} » créé`,
        ob
          ? `${result.lines.length} échéance(s) · ${ob.processed}/${ob.eligibleStudents} élève(s) facturé(s)` +
              (ob.failed.length ? ` · ${ob.failed.length} en échec` : '')
          : `${result.lines.length} échéance(s), sans facturation des élèves`,
      )
      onClose()
    } catch (err) {
      setServerError(getApiErrorMessage(err))
    }
  }

  const blocked = !yearOpen || (currencyLoaded && !currency)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[92vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-zinc-100">
          <div>
            <h2 className="text-lg font-semibold text-zinc-900">Créer un frais</h2>
            <p className="text-xs text-zinc-500">
              Année {academicYear.label}
              {currency ? ` · ${currency}` : ''}
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100" aria-label="Fermer">
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {!yearOpen && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Cette année académique est clôturée : impossible d’y créer un frais.
            </p>
          )}
          {currencyLoaded && !currency && (
            <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <AlertTriangle size={14} className="mt-0.5 shrink-0" />
              Devise de l’école inconnue : configurez-la avant de créer un frais.
            </p>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-xs font-medium text-zinc-500">
              Nom du frais *
              <input {...register('name')} placeholder="Ex. Minerval" className={cn(INPUT, 'mt-1')} />
              <FieldError message={errors.name?.message} />
            </label>
            <label className="block text-xs font-medium text-zinc-500">
              Description
              <input {...register('description')} placeholder="Facultatif" className={cn(INPUT, 'mt-1')} />
            </label>
          </div>

          <fieldset>
            <legend className="text-xs font-medium text-zinc-500 mb-2">Échéancier *</legend>
            <div className="grid gap-2 sm:grid-cols-3">
              {SCHEDULES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => changeSchedule(s.value)}
                  aria-pressed={values.scheduleType === s.value}
                  className={cn(
                    'rounded-xl border px-3 py-2 text-left transition-colors',
                    values.scheduleType === s.value
                      ? 'border-emerald-500 bg-emerald-50 ring-1 ring-emerald-500'
                      : 'border-zinc-200 hover:bg-zinc-50',
                  )}
                >
                  <p className="text-sm font-medium text-zinc-900">{s.label}</p>
                  <p className="text-[11px] text-zinc-500">{s.hint}</p>
                </button>
              ))}
            </div>
          </fieldset>

          {values.scheduleType === 'ONE_TIME' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-500">
                Montant *
                <input {...register('amount')} inputMode="decimal" placeholder="0,00" className={cn(INPUT, 'mt-1')} />
                <FieldError message={errors.amount?.message} />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                Échéance
                <input {...register('dueDate')} type="date" className={cn(INPUT, 'mt-1')} />
              </label>
            </div>
          )}

          {values.scheduleType === 'MONTHLY' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-xs font-medium text-zinc-500">
                Montant par mois *
                <input {...register('amount')} inputMode="decimal" placeholder="0,00" className={cn(INPUT, 'mt-1')} />
                <FieldError message={errors.amount?.message} />
              </label>
              <label className="block text-xs font-medium text-zinc-500">
                Jour d’échéance (1–28) *
                <input {...register('dueDayOfMonth')} inputMode="numeric" className={cn(INPUT, 'mt-1')} />
                <FieldError message={errors.dueDayOfMonth?.message} />
              </label>
            </div>
          )}

          {values.scheduleType === 'INSTALLMENT' && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-zinc-500">Tranches ({installments.fields.length}/12)</p>
                <button
                  type="button"
                  onClick={() => installments.replace(quarterlyInstallments(startYearOf(academicYear.label)))}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700 hover:underline"
                >
                  <CalendarRange size={12} /> Trimestriel T1/T2/T3
                </button>
              </div>
              {installments.fields.map((field, index) => (
                <div key={field.id} className="grid grid-cols-[1fr_1fr_1.2fr_auto] items-start gap-2">
                  <div>
                    <input {...register(`installments.${index}.label`)} placeholder="T1" aria-label="Libellé" className={INPUT} />
                    <FieldError message={errors.installments?.[index]?.label?.message} />
                  </div>
                  <div>
                    <input
                      {...register(`installments.${index}.amount`)}
                      inputMode="decimal"
                      placeholder="Montant"
                      aria-label="Montant"
                      className={INPUT}
                    />
                    <FieldError message={errors.installments?.[index]?.amount?.message} />
                  </div>
                  <div>
                    <input {...register(`installments.${index}.dueDate`)} type="date" aria-label="Échéance" className={INPUT} />
                    <FieldError message={errors.installments?.[index]?.dueDate?.message} />
                  </div>
                  <button
                    type="button"
                    onClick={() => installments.remove(index)}
                    className="mt-1.5 rounded-lg p-1.5 text-zinc-400 hover:bg-red-50 hover:text-red-600"
                    aria-label={`Retirer la tranche ${index + 1}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
              {installments.fields.length < 12 && (
                <button
                  type="button"
                  onClick={() => installments.append({ label: `T${installments.fields.length + 1}`, amount: '', dueDate: '' })}
                  className="inline-flex items-center gap-1 text-xs font-medium text-zinc-600 hover:text-zinc-900"
                >
                  <Plus size={12} /> Ajouter une tranche
                </button>
              )}
              <FieldError message={errors.installments?.message ?? errors.installments?.root?.message} />
            </div>
          )}

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-500 mb-2">Qui paie ? *</legend>
            <div className="flex flex-wrap gap-1 rounded-xl bg-zinc-100 p-1">
              {SCOPES.map((s) => (
                <button
                  key={s.value}
                  type="button"
                  onClick={() => changeScope(s.value)}
                  aria-pressed={values.scope === s.value}
                  className={cn(
                    'rounded-lg px-3 py-1.5 text-xs font-medium',
                    values.scope === s.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-600',
                  )}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {values.scope !== 'ALL' && (
              <div className="max-h-36 overflow-y-auto rounded-lg border border-zinc-200 p-2 grid gap-1 sm:grid-cols-2">
                {scopeChoices.length === 0 ? (
                  <p className="text-xs text-zinc-400 p-1">Aucun élément.</p>
                ) : (
                  scopeChoices.map((c) => (
                    <label key={c.id} className="flex items-center gap-2 text-xs text-zinc-700">
                      <input type="checkbox" checked={values.scopeIds.includes(c.id)} onChange={() => toggle('scopeIds', c.id)} />
                      {c.name}
                    </label>
                  ))
                )}
              </div>
            )}
            <FieldError message={errors.scopeIds?.message} />
          </fieldset>

          <fieldset className="space-y-2">
            <legend className="text-xs font-medium text-zinc-500">Catégories d’élèves (facultatif)</legend>
            <p className="text-[11px] text-zinc-400">
              Sans choix : tous les élèves du périmètre. Pour un prix différent par catégorie (ex. enfant du personnel),
              créez le frais une fois par catégorie : la même ligne est réutilisée.
            </p>
            {categoriesQuery.isError ? (
              <p className="text-[11px] text-red-600">
                Catégories indisponibles : {getApiErrorMessage(categoriesQuery.error)}
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {(categoriesQuery.data ?? []).map((cat) => (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => toggle('studentCategories', cat.code)}
                    aria-pressed={values.studentCategories.includes(cat.code)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                      values.studentCategories.includes(cat.code)
                        ? 'border-emerald-500 bg-emerald-50 text-emerald-800'
                        : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            )}
            <FieldError message={errors.studentCategories?.message} />
          </fieldset>

          <label className="flex items-start gap-2 text-xs text-zinc-700">
            <input type="checkbox" {...register('generateObligations')} className="mt-0.5" />
            <span>
              Facturer tout de suite les élèves inscrits du périmètre
              <span className="block text-[11px] text-zinc-400">Sinon, seul le barème est créé.</span>
            </span>
          </label>

          <div className="rounded-xl border border-zinc-100 bg-zinc-50/70 p-3">
            <p className="text-xs font-semibold text-zinc-700 mb-1.5">Aperçu : {preview.length} échéance(s)</p>
            <ul className="space-y-1">
              {preview.map((line, i) => (
                <li key={i} className="flex justify-between gap-3 text-xs text-zinc-600">
                  <span className="truncate">{line.name}</span>
                  <span className="shrink-0 tabular-nums">
                    {line.amount != null && currency ? formatMoney(line.amount, currency) : '—'} · {line.due}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {serverError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{serverError}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={createFee.isPending || blocked || !currency}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium disabled:opacity-50"
            >
              {createFee.isPending && <Loader2 size={14} className="animate-spin" />}
              {createFee.isPending ? 'Création…' : 'Créer le frais'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
