import { z } from 'zod'

export const enrollSessionSchema = z.object({
  sessionId: z.coerce.number({ invalid_type_error: 'Session requise' }).positive('Session requise'),
  classId: z.preprocess(
    (v) => (v === '' || v == null ? undefined : Number(v)),
    z.number().positive().optional(),
  ),
  type: z.enum(['NEW', 'RE_ENROLLMENT', 'TRANSFER']).default('RE_ENROLLMENT'),
})

export type EnrollSessionForm = z.infer<typeof enrollSessionSchema>

export const moratoriumDrawerSchema = z.object({
  type: z.enum(['MONTHLY', 'QUARTERLY', 'EXCEPTIONAL', 'SCHOLARSHIP_REVIEW']).default('EXCEPTIONAL'),
  endDate: z.string().min(1, 'Date de fin requise'),
  amount: z.coerce.number().min(0, 'Montant invalide').optional(),
  note: z.string().min(3, 'Note requise (min. 3 caractères)').max(500),
})

export type MoratoriumDrawerForm = z.infer<typeof moratoriumDrawerSchema>

export const adminProfileSchema = z.object({
  nationality: z.string().min(2, 'Nationalité requise').max(80).optional().or(z.literal('')),
  placeOfBirth: z.string().min(2, 'Lieu requis').max(120).optional().or(z.literal('')),
  bloodGroup: z.string().max(10).optional().or(z.literal('')),
  allergies: z.string().max(500).optional().or(z.literal('')),
  medicalNotes: z.string().max(1000).optional().or(z.literal('')),
  emergencyContactName: z.string().max(120).optional().or(z.literal('')),
  emergencyContactPhone: z.string().max(20).optional().or(z.literal('')),
})

export type AdminProfileForm = z.infer<typeof adminProfileSchema>
