import { z } from 'zod'
import type { ClassListItem, CreateEnrollmentPayload, StudentCategory } from '@/types/admin'
import { formatPhoneToE164, isValidInternationalPhone } from '@/lib/phone/validation'
import { sectionRequiresOption, type SectionCycleRef } from '@/lib/academic/rdc-section-cycle'

const studentCategoryEnum = z.enum([
  'STANDARD',
  'NEW_STUDENT',
  'STAFF_CHILD',
  'SCHOLARSHIP',
  'SIBLING_DISCOUNT',
]) satisfies z.ZodType<StudentCategory>

const idField = (message: string) =>
  z.preprocess(
    (v) => (v === '' || v == null || v === 0 ? undefined : Number(v)),
    z.number({ required_error: message }).positive(message),
  )

const optionalIdField = z.preprocess(
  (v) => (v === '' || v == null || v === 0 ? undefined : Number(v)),
  z.number().positive().optional(),
)

export const enrollmentCreateSchema = z
  .object({
    lastName: z.string().min(2, 'Nom requis (min. 2 caractères)').max(80),
    postnom: z.string().min(2, 'Postnom requis (min. 2 caractères)').max(80),
    firstName: z.string().min(2, 'Prénom requis (min. 2 caractères)').max(80),
    /** Prénom administratif RDC — optionnel (repli backend sur firstName) */
    prenom: z.string().min(2).max(80).optional().or(z.literal('')),
    gender: z.enum(['M', 'F', 'MALE', 'FEMALE'], { required_error: 'Genre requis' }),
    birthDate: z.string().optional().or(z.literal('')),
    sectionId: idField('Section requise'),
    /** Optionnel en maternelle / primaire — validé dynamiquement via context */
    optionId: optionalIdField,
    classId: idField('Classe requise'),
    placeOfBirth: z.string().max(120).optional().or(z.literal('')),
    nationality: z.string().max(80).optional().or(z.literal('')),
    academicYear: z
      .string()
      .regex(/^\d{4}-\d{4}$/, 'Format : 2025-2026')
      .optional()
      .or(z.literal('')),
    matricule: z.string().min(10).optional().or(z.literal('')),
    status: z.enum(['ACTIVE', 'PENDING_ENROLLMENT']).default('ACTIVE'),
    studentCategory: studentCategoryEnum.default('STANDARD'),
    /** N° court 100–9999 — vide = auto à l’inscription */
    numeroCourt: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().int().min(100).max(9999).optional(),
    ),
    scholarshipPercent: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().min(0).max(100).optional(),
    ),
    totalFees: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().min(0).optional(),
    ),
    feesPaid: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().min(0).optional(),
    ),
    /** Encaisser l'acompte comme Payment réel (reçu + caisse) */
    collectDeposit: z.boolean().default(true),
    paymentNotes: z.string().max(500).optional().or(z.literal('')),
    emergencyContactName: z.string().min(2, 'Nom du contact requis').max(120).optional().or(z.literal('')),
    emergencyContactPhone: z
      .string()
      .max(20)
      .optional()
      .or(z.literal(''))
      .refine(
        (v) => !v?.trim() || isValidInternationalPhone(v),
        'Numéro mobile invalide ou non joignable (SMS)',
      ),
    bloodGroup: z.string().max(10).optional().or(z.literal('')),
    allergies: z.string().max(500).optional().or(z.literal('')),
    medicalNotes: z.string().max(1000).optional().or(z.literal('')),
    nfcTagId: z.string().min(8).max(64).optional().or(z.literal('')),
    autoAssignExplicitFees: z.boolean().default(false),
    explicitFeeStructureIds: z.array(z.number().int().positive()).max(50).default([]),
    /** Catégories tarifaires dynamiques de l'école (plusieurs possibles) */
    studentFeeCategoryIds: z.array(z.number().int().positive()).max(20).default([]),
  })

export type EnrollmentCreateForm = z.infer<typeof enrollmentCreateSchema>

/** Schéma avec règle RDC : option requise seulement si le cycle l'exige. */
export function buildEnrollmentCreateSchema(ctx: {
  section?: SectionCycleRef | null
  optionsCount?: number
}) {
  return enrollmentCreateSchema.superRefine((data, refineCtx) => {
    const requires = sectionRequiresOption(ctx.section, ctx.optionsCount ?? 0)
    if (requires && (data.optionId == null || data.optionId <= 0)) {
      refineCtx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Option / filière requise pour ce cycle',
        path: ['optionId'],
      })
    }
  })
}

export type StructureRef = { id: number; name: string; code?: string | null }

export function deriveSections(classes: ClassListItem[]): StructureRef[] {
  const map = new Map<number, StructureRef>()
  for (const c of classes) {
    if (c.sectionId != null && c.sectionName) {
      map.set(c.sectionId, { id: c.sectionId, name: c.sectionName })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export function deriveOptions(classes: ClassListItem[], sectionId?: number): StructureRef[] {
  const map = new Map<number, StructureRef>()
  for (const c of classes) {
    if (sectionId != null && c.sectionId !== sectionId) continue
    if (c.optionId != null && c.optionName) {
      map.set(c.optionId, { id: c.optionId, name: c.optionName })
    }
  }
  return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}

export function filterClassesByStructure(
  classes: ClassListItem[],
  sectionId?: number,
  optionId?: number,
  academicYear?: string,
): ClassListItem[] {
  return classes.filter((c) => {
    if (sectionId != null && sectionId > 0 && c.sectionId !== sectionId) return false
    if (optionId != null && optionId > 0 && c.optionId !== optionId) return false
    if (academicYear && c.academicYear && c.academicYear !== academicYear) return false
    return true
  })
}

function trimOptional(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}

/** Mappe le formulaire validé vers le payload API (sans cast unsafe). */
export function toCreateEnrollmentPayload(data: EnrollmentCreateForm): CreateEnrollmentPayload {
  return {
    firstName: data.firstName.trim(),
    lastName: data.lastName.trim(),
    postnom: data.postnom.trim(),
    ...(trimOptional(data.prenom) ? { prenom: trimOptional(data.prenom) } : {}),
    gender: data.gender,
    ...(trimOptional(data.birthDate) ? { birthDate: trimOptional(data.birthDate) } : {}),
    classId: data.classId,
    sectionId: data.sectionId,
    ...(data.optionId != null && data.optionId > 0 ? { optionId: data.optionId } : {}),
    status: data.status,
    placeOfBirth: trimOptional(data.placeOfBirth),
    nationality: trimOptional(data.nationality),
    academicYear: trimOptional(data.academicYear),
    matricule: trimOptional(data.matricule),
    studentCategory: data.studentCategory ?? 'STANDARD',
    ...(data.numeroCourt != null ? { numeroCourt: data.numeroCourt } : {}),
    scholarshipPercent: data.scholarshipPercent,
    // LOT 2 — totalFees opaque retiré du payload ; ledger = obligations V2 côté serveur
    feesPaid: data.feesPaid,
    collectDeposit: data.collectDeposit !== false,
    paymentNotes: trimOptional(data.paymentNotes),
    emergencyContactName: trimOptional(data.emergencyContactName),
    emergencyContactPhone: (() => {
      const phone = trimOptional(data.emergencyContactPhone)
      return phone ? formatPhoneToE164(phone) : undefined
    })(),
    bloodGroup: trimOptional(data.bloodGroup),
    allergies: trimOptional(data.allergies),
    medicalNotes: trimOptional(data.medicalNotes),
    nfcTagId: trimOptional(data.nfcTagId),
    ...(data.autoAssignExplicitFees ? { autoAssignExplicitFees: true } : {}),
    ...(data.studentFeeCategoryIds?.length
      ? { studentFeeCategoryIds: data.studentFeeCategoryIds }
      : {}),
    ...(data.explicitFeeStructureIds?.length
      ? { explicitFeeStructureIds: data.explicitFeeStructureIds }
      : {}),
  }
}

export const ENROLLMENT_CREATE_DEFAULTS: EnrollmentCreateForm = {
  lastName: '',
  postnom: '',
  firstName: '',
  prenom: '',
  gender: 'MALE',
  birthDate: '',
  sectionId: 0,
  optionId: 0,
  classId: 0,
  placeOfBirth: '',
  nationality: '',
  academicYear: '',
  matricule: '',
  status: 'ACTIVE',
  studentCategory: 'STANDARD',
  numeroCourt: undefined,
  scholarshipPercent: undefined,
  totalFees: undefined,
  feesPaid: undefined,
  collectDeposit: true,
  paymentNotes: '',
  emergencyContactName: '',
  emergencyContactPhone: '',
  bloodGroup: '',
  allergies: '',
  medicalNotes: '',
  nfcTagId: '',
  autoAssignExplicitFees: false,
  explicitFeeStructureIds: [],
  studentFeeCategoryIds: [],
}
