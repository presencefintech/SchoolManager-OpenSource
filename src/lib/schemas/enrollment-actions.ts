import { z } from 'zod'

export const enrollSessionSchema = z.object({
  sessionId: z.coerce.number({ invalid_type_error: 'Session requise' }).positive('Session requise'),
  classId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  type: z.enum(['NEW', 'RE_ENROLLMENT', 'TRANSFER']).default('RE_ENROLLMENT'),
  autoAssignExplicitFees: z.boolean().default(false),
  explicitFeeStructureIds: z.array(z.number().int().positive()).max(50).default([]),
})

export type EnrollSessionForm = z.infer<typeof enrollSessionSchema>

export const rentreePackSchema = z.object({
  sessionId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  classId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  feesPaid: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().min(0).optional(),
  ),
  collectDeposit: z.boolean().default(true),
  paymentNotes: z.string().max(500).optional().or(z.literal('')),
  type: z.enum(['NEW', 'RE_ENROLLMENT', 'TRANSFER']).default('RE_ENROLLMENT'),
  autoAssignExplicitFees: z.boolean().default(false),
  explicitFeeStructureIds: z.array(z.number().int().positive()).max(50).default([]),
})

export type RentreePackForm = z.infer<typeof rentreePackSchema>

export const moratoriumDrawerSchema = z.object({
  type: z.enum(['MONTHLY', 'QUARTERLY', 'EXCEPTIONAL', 'SCHOLARSHIP_REVIEW']).default('EXCEPTIONAL'),
  endDate: z.string().min(1, 'Date de fin requise'),
  amount: z.coerce.number().min(0, 'Montant invalide').optional(),
  note: z.string().min(3, 'Note requise (min. 3 caractères)').max(500),
})

export type MoratoriumDrawerForm = z.infer<typeof moratoriumDrawerSchema>

const BLOOD_GROUPS = ['', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'] as const

const optionalText = (max: number, min = 0) =>
  z
    .string()
    .max(max)
    .refine(
      (v) => v.trim() === '' || v.trim().length >= min,
      min > 0 ? { message: `Minimum ${min} caractères` } : undefined,
    )
    .optional()
    .or(z.literal(''))

/** Formulaire complet profil administratif RDC (PATCH admin-profile). */
export const adminProfileSchema = z.object({
  lastName: z.string().min(2, 'Nom requis').max(80),
  postnom: optionalText(80, 2),
  /** Prénom optionnel (Nom + Postnom suffisent). */
  firstName: optionalText(80, 2),
  prenom: optionalText(80, 2),
  gender: z.enum(['', 'M', 'F', 'MALE', 'FEMALE']).optional(),
  dateOfBirth: z.string().optional().or(z.literal('')),
  placeOfBirth: z.preprocess((v) => (v == null ? '' : v), optionalText(120, 2)),
  nationality: z.preprocess((v) => (v == null ? '' : v), optionalText(80, 2)),
  address: z.preprocess((v) => (v == null ? '' : v), optionalText(250)),
  email: z
    .string()
    .max(120)
    .refine((v) => v.trim() === '' || z.string().email().safeParse(v.trim()).success, {
      message: 'Email élève invalide',
    })
    .optional()
    .or(z.literal('')),
  phone: optionalText(20, 6),
  academicYear: z
    .string()
    .refine((v) => v.trim() === '' || /^\d{4}-\d{4}$/.test(v.trim()), {
      message: 'Format requis: 2026-2027',
    })
    .optional()
    .or(z.literal('')),
  classId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().int().positive().optional(),
  ),
  emergencyContactName: optionalText(120, 2),
  emergencyContactPhone: optionalText(20, 6),
  parentEmail: z
    .string()
    .max(120)
    .refine((v) => v.trim() === '' || z.string().email().safeParse(v.trim()).success, {
      message: 'Email parent invalide',
    })
    .optional()
    .or(z.literal('')),
  bloodGroup: z.preprocess(
    (v) => (v == null ? '' : v),
    z.union([z.enum(BLOOD_GROUPS), z.literal('')]).optional(),
  ),
  allergies: z.preprocess((v) => (v == null ? '' : v), optionalText(500)),
  medicalNotes: z.preprocess((v) => (v == null ? '' : v), optionalText(1000)),
})

export type AdminProfileForm = z.infer<typeof adminProfileSchema>

/**
 * Convertit le formulaire en payload PATCH.
 * Chaînes vides → null (effacer côté API). Les champs santé vides sont omis
 * s’ils n’avaient pas de valeur à effacer — évite `Expected string, received null`
 * sur les schémas Zod `.optional()` sans `.nullable()`.
 */
export function adminProfileToPayload(
  data: AdminProfileForm,
  opts?: { clearMedical?: boolean },
): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const put = (key: string, value: unknown, emptyAsNull = true) => {
    if (value === undefined) return
    if (typeof value === 'string') {
      const t = value.trim()
      out[key] = t === '' ? (emptyAsNull ? null : undefined) : t
      if (out[key] === undefined) delete out[key]
      return
    }
    out[key] = value
  }

  put('lastName', data.lastName, false)
  put('postnom', data.postnom)
  // Prénom optionnel : chaîne vide autorisée (pas d’omission forcée)
  if (typeof data.firstName === 'string') out.firstName = data.firstName.trim()
  put('prenom', data.prenom)
  put('gender', data.gender)
  put('dateOfBirth', data.dateOfBirth)
  put('placeOfBirth', data.placeOfBirth)
  put('nationality', data.nationality)
  put('address', data.address)
  put('email', data.email)
  put('phone', data.phone)
  put('academicYear', data.academicYear)
  if (data.classId != null && Number.isFinite(data.classId)) out.classId = data.classId
  put('emergencyContactName', data.emergencyContactName)
  put('emergencyContactPhone', data.emergencyContactPhone)
  put('parentEmail', data.parentEmail)

  // Santé : n’envoyer que des valeurs non vides (null cassait la validation Zod backend)
  const blood = typeof data.bloodGroup === 'string' ? data.bloodGroup.trim() : ''
  if (blood) out.bloodGroup = blood
  else if (opts?.clearMedical) out.bloodGroup = null

  const allergies = typeof data.allergies === 'string' ? data.allergies.trim() : ''
  if (allergies) out.allergies = allergies
  else if (opts?.clearMedical) out.allergies = null

  const medicalNotes = typeof data.medicalNotes === 'string' ? data.medicalNotes.trim() : ''
  if (medicalNotes) out.medicalNotes = medicalNotes
  else if (opts?.clearMedical) out.medicalNotes = null

  return out
}
