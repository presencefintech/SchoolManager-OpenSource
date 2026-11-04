import { z } from 'zod'
import type { CreateFeePayload, FeeScheduleType } from '@/types/finance'

/**
 * Formulaire « Créer un frais » (POST /finance/fees). Mêmes règles que createFeeSchema côté
 * backend, pour ne jamais envoyer une requête qu'il refuserait.
 */

export type FeeScope = 'ALL' | 'SECTIONS' | 'OPTIONS' | 'CLASSES'

const AMOUNT_HINT = 'Montant positif, 2 décimales maximum'

function isValidAmount(raw: string): boolean {
  const value = Number(raw.replace(',', '.'))
  return Number.isFinite(value) && value > 0 && value <= 1_000_000_000 && Math.round(value * 100) === value * 100
}

const amountField = z.string().trim().refine(isValidAmount, AMOUNT_HINT)
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date requise')

export const feeCreationSchema = z
  .object({
    name: z.string().trim().min(2, 'Nom requis (2 caractères minimum)').max(120),
    description: z.string().trim().max(500),
    scheduleType: z.enum(['ONE_TIME', 'INSTALLMENT', 'MONTHLY']),
    amount: z.string().trim(),
    dueDate: z.string(),
    dueDayOfMonth: z.string().trim(),
    installments: z.array(
      z.object({
        label: z.string().trim().min(1, 'Libellé requis').max(60),
        amount: amountField,
        dueDate: dateField,
      }),
    ),
    scope: z.enum(['ALL', 'SECTIONS', 'OPTIONS', 'CLASSES']),
    scopeIds: z.array(z.number().int().positive()),
    studentCategories: z.array(z.string()).max(10, '10 catégories maximum'),
    generateObligations: z.boolean(),
  })
  .superRefine((v, ctx) => {
    const issue = (path: (string | number)[], message: string) =>
      ctx.addIssue({ code: z.ZodIssueCode.custom, path, message })

    if (v.scheduleType === 'INSTALLMENT') {
      if (v.installments.length < 2 || v.installments.length > 12) {
        issue(['installments'], 'Entre 2 et 12 tranches')
      }
    } else if (!isValidAmount(v.amount)) {
      issue(['amount'], AMOUNT_HINT)
    }
    if (v.scheduleType === 'MONTHLY') {
      const day = Number(v.dueDayOfMonth)
      if (!Number.isInteger(day) || day < 1 || day > 28) {
        issue(['dueDayOfMonth'], 'Jour entre 1 et 28 (valable pour tous les mois)')
      }
    }
    if (v.scope !== 'ALL' && v.scopeIds.length === 0) {
      issue(['scopeIds'], 'Choisissez au moins un élément du périmètre')
    }
  })

export type FeeCreationFormValues = z.infer<typeof feeCreationSchema>

export const EMPTY_FEE_FORM: FeeCreationFormValues = {
  name: '',
  description: '',
  scheduleType: 'ONE_TIME',
  amount: '',
  dueDate: '',
  dueDayOfMonth: '5',
  installments: [],
  scope: 'ALL',
  scopeIds: [],
  studentCategories: [],
  generateObligations: true,
}

/** Préremplissage « Trimestriel » : T1/T2/T3 aux trois trimestres de l'année scolaire. */
export function quarterlyInstallments(schoolYearStart: number): FeeCreationFormValues['installments'] {
  return [
    { label: 'T1', amount: '', dueDate: `${schoolYearStart}-10-15` },
    { label: 'T2', amount: '', dueDate: `${schoolYearStart + 1}-01-15` },
    { label: 'T3', amount: '', dueDate: `${schoolYearStart + 1}-04-15` },
  ]
}

const toAmount = (raw: string) => Number(raw.replace(',', '.'))

export function toCreateFeePayload(
  v: FeeCreationFormValues,
  ctx: { academicYearId: number; currency: 'USD' | 'CDF' },
): CreateFeePayload {
  const schedule: Pick<CreateFeePayload, 'amount' | 'dueDate' | 'dueDayOfMonth' | 'installments'> =
    v.scheduleType === 'INSTALLMENT'
      ? {
          installments: v.installments.map((i) => ({
            label: i.label.trim(),
            amount: toAmount(i.amount),
            dueDate: i.dueDate,
          })),
        }
      : v.scheduleType === 'MONTHLY'
        ? { amount: toAmount(v.amount), dueDayOfMonth: Number(v.dueDayOfMonth) }
        : { amount: toAmount(v.amount), ...(v.dueDate ? { dueDate: v.dueDate } : {}) }

  const categories = v.studentCategories.length ? { studentCategories: v.studentCategories } : {}
  // Le backend exclut appliesToAll + studentCategories : « toute l'école, catégories X » s'exprime
  // par les seules catégories.
  const scope: Pick<CreateFeePayload, 'appliesToAll' | 'classIds' | 'optionIds' | 'sectionIds' | 'studentCategories'> =
    v.scope === 'ALL'
      ? v.studentCategories.length
        ? categories
        : { appliesToAll: true }
      : {
          ...(v.scope === 'CLASSES' ? { classIds: v.scopeIds } : {}),
          ...(v.scope === 'OPTIONS' ? { optionIds: v.scopeIds } : {}),
          ...(v.scope === 'SECTIONS' ? { sectionIds: v.scopeIds } : {}),
          ...categories,
        }

  return {
    academicYearId: ctx.academicYearId,
    name: v.name.trim(),
    ...(v.description.trim() ? { description: v.description.trim() } : {}),
    scheduleType: v.scheduleType,
    currency: ctx.currency,
    ...schedule,
    ...scope,
    generateObligations: v.generateObligations,
  }
}

export type FeeLinePreview = { name: string; amount: number | null; due: string }

/** Lignes que le serveur créera (une par échéance) — même nommage que planFeeLines. */
export function previewFeeLines(v: FeeCreationFormValues): FeeLinePreview[] {
  const name = v.name.trim() || 'Frais'
  const amount = isValidAmount(v.amount) ? toAmount(v.amount) : null
  const schedules: Record<FeeScheduleType, () => FeeLinePreview[]> = {
    ONE_TIME: () => [{ name, amount, due: v.dueDate || 'sans échéance' }],
    INSTALLMENT: () =>
      v.installments.map((i) => ({
        name: `${name} — ${i.label.trim() || '…'}`,
        amount: isValidAmount(i.amount) ? toAmount(i.amount) : null,
        due: i.dueDate || '…',
      })),
    MONTHLY: () => [
      {
        name: `${name} — chaque mois`,
        amount,
        due: `le ${v.dueDayOfMonth || '…'} de chaque mois de la période de facturation de l’année`,
      },
    ],
  }
  return schedules[v.scheduleType]()
}
