/**
 * Contrats Zod — Inscription (aligné sur backend/src/schemas/enrollment.validation.ts)
 * Source de vérité partagée frontend ↔ backend.
 */
import { z } from 'zod';

const BiometricVectorSchema = z
  .array(z.number())
  .length(512, 'Vecteur IA invalide (512 dimensions requises)');

const StudentMatriculeSchema = z.string().min(10, 'Matricule invalide (format)');

const genderInputSchema = z.enum(['M', 'F', 'MALE', 'FEMALE']);

const baseStudentSchema = {
  firstName: z.string().min(2).max(50),
  lastName: z.string().min(2).max(50),
  gender: genderInputSchema,
  dateOfBirth: z.coerce
    .date({ errorMap: () => ({ message: 'Date de naissance invalide' }) })
    .optional(),
  birthDate: z.string().min(1).optional(),
  placeOfBirth: z.string().min(2).optional(),
  nationality: z.string().min(2).optional(),
  classId: z.coerce.number().int().positive(),
};

const adminEnrollmentExtensions = {
  matricule: StudentMatriculeSchema.optional(),
  fingerprintTemplate: z.string().min(100).optional(),
  fingerEmbedding: BiometricVectorSchema.optional(),
  faceTemplate: z.record(z.any()).optional(),
  faceEmbedding: BiometricVectorSchema.optional(),
  livenessScore: z.number().min(0).max(1).optional(),
  sharpnessScore: z.number().min(0).optional(),
  brightnessScore: z.number().min(0).max(255).optional(),
  faceImageBase64: z.string().min(32).optional(),
  nfcTagId: z.string().min(8).optional(),
  sectionId: z.coerce.number().int().optional(),
  optionId: z.coerce.number().int().optional(),
  academicYear: z
    .string()
    .regex(/^\d{4}-\d{4}$/, 'Format requis: 2024-2025')
    .optional(),
  status: z
    .enum(['ACTIVE', 'INACTIVE', 'PENDING_ENROLLMENT', 'SUSPENDED'])
    .default('ACTIVE'),
  scholarshipPercent: z.coerce.number().min(0).max(100).optional(),
  totalFees: z.coerce.number().min(0).optional(),
  feesPaid: z.coerce.number().min(0).default(0),
};

const requireBirthDate = <T extends z.ZodTypeAny>(schema: T) =>
  schema.refine(
    (data: { dateOfBirth?: Date; birthDate?: string }) =>
      Boolean(data.dateOfBirth || data.birthDate),
    { message: 'La date de naissance est requise', path: ['birthDate'] }
  );

export const AdminEnrollmentBaseSchema = z.object({
  ...baseStudentSchema,
  ...adminEnrollmentExtensions,
});

/** Inscription admin école — schoolId imposé par JWT côté API */
export const AdminEnrollmentSchema = requireBirthDate(AdminEnrollmentBaseSchema);

export const AdminEnrollmentUpdateSchema = AdminEnrollmentBaseSchema.partial();

/**
 * Corps POST /superadmin/enrollment
 * multipart/form-data : champs ci-dessous + fichier `photo` (optionnel, max 5 Mo)
 */
export const SuperAdminCreateStudentBodySchema = requireBirthDate(
  z.object({
    ...baseStudentSchema,
    ...adminEnrollmentExtensions,
    schoolId: z.coerce.number().int().positive('schoolId est requis'),
    email: z.string().email('Email invalide').optional().nullable(),
    overrideReason: z
      .string()
      .min(10, 'Motif recommandé (min. 10 caractères)')
      .optional(),
  })
);

export type AdminEnrollmentInput = z.infer<typeof AdminEnrollmentSchema>;
export type SuperAdminEnrollmentInput = z.infer<typeof SuperAdminCreateStudentBodySchema>;

/** Champs minimum pour le formulaire super-admin actuel (rétrocompatible) */
export type SuperAdminEnrollmentMinimalInput = Pick<
  SuperAdminEnrollmentInput,
  'firstName' | 'lastName' | 'birthDate' | 'gender' | 'schoolId' | 'classId'
>;

/** Inscrire un élève existant à une session académique — POST /admin/enrollments/{studentId}/sessions */
export const EnrollSessionSchema = z.object({
  sessionId: z.coerce.number().int().positive('Session académique requise'),
  classId: z.coerce.number().int().positive().optional(),
  type: z.enum(['NEW', 'RE_ENROLLMENT', 'TRANSFER']).default('RE_ENROLLMENT'),
});

/** Profil administratif / médical — PATCH /admin/enrollments/{studentId}/admin-profile */
export const AdminAdministrativeProfileSchema = z.object({
  placeOfBirth: z.string().min(2).max(120).optional(),
  nationality: z.string().min(2).max(80).optional(),
  emergencyContactName: z.string().min(2).max(120).optional(),
  emergencyContactPhone: z.string().min(6).max(20).optional(),
  bloodGroup: z.string().max(10).optional(),
  allergies: z.string().max(500).optional(),
  medicalNotes: z.string().max(1000).optional(),
  paymentNotes: z.string().max(500).optional(),
  scholarshipPercent: z.coerce.number().min(0).max(100).optional(),
});

/** Clôture vérification — POST …/verifications/{verificationId}/mark-processed */
export const MarkVerificationProcessedSchema = z.object({
  notes: z.string().max(500).optional(),
});

/** Alertes présence */
export const DismissSecurityAlertSchema = z.object({
  note: z.string().max(500).optional(),
});

export const NotifySecurityAlertSchema = z.object({
  message: z.string().max(1000).optional(),
});

export type EnrollSessionInput = z.infer<typeof EnrollSessionSchema>;
export type AdminAdministrativeProfileInput = z.infer<typeof AdminAdministrativeProfileSchema>;
export type MarkVerificationProcessedInput = z.infer<typeof MarkVerificationProcessedSchema>;
