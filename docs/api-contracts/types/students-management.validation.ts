/**
 * Contrats Zod — Gestion élèves SuperAdmin (aligné sur src/types/super-admin.ts)
 * Source de vérité partagée frontend ↔ openapi/superadmin.json
 */
import { z } from 'zod';

const StudentClassRefSchema = z.object({
  name: z.string(),
});

const StudentSchoolRefSchema = z.object({
  name: z.string(),
  baseCurrency: z.string(),
});

export const StudentGlobalStatsSchema = z.object({
  totalStudents: z.number().int().nonnegative(),
  presentToday: z.number().int().nonnegative(),
  lateToday: z.number().int().nonnegative(),
  totalClasses: z.number().int().nonnegative(),
  attendanceRate: z.number(),
  lastUpdate: z.string().datetime(),
});

export const StudentListItemSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  matricule: z.string().nullable(),
  status: z.string(),
  biometricStatus: z.string().nullable(),
  isPaymentLocked: z.boolean(),
  class: StudentClassRefSchema.nullable(),
  _count: z.object({
    payments: z.number().int().nonnegative(),
    presences: z.number().int().nonnegative(),
  }),
});

export const StudentListResponseSchema = z.object({
  total: z.number().int().nonnegative(),
  page: z.number().int().positive(),
  totalPages: z.number().int().nonnegative(),
  data: z.array(StudentListItemSchema),
});

export const StudentDebtorItemSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  matricule: z.string().nullable(),
  feesBalance: z.number(),
  class: StudentClassRefSchema.nullable(),
});

export const StudentStatsSchema = z.object({
  attendanceRate: z.number(),
  totalPaid: z.number(),
  remainingDebt: z.number(),
  tuitionDebt: z.number(),
  isUpToDate: z.boolean(),
  currency: z.string(),
});

export const StudentProfileSchema = z.object({
  id: z.number().int().positive(),
  firstName: z.string(),
  lastName: z.string(),
  matricule: z.string().nullable(),
  status: z.string(),
  photoUrl: z.string().url().nullable(),
  gender: z.string(),
  birthDate: z.string().nullable(),
  isPaymentLocked: z.boolean(),
  biometricStatus: z.string().nullable(),
  school: StudentSchoolRefSchema.nullable(),
  class: StudentClassRefSchema.nullable(),
});

export const StudentDashboardSchema = z.object({
  profile: StudentProfileSchema,
  stats: StudentStatsSchema,
  history: z.object({
    payments: z.array(
      z.object({
        id: z.number().int().positive(),
        amount: z.number(),
        currency: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
    presences: z.array(
      z.object({
        id: z.number().int().positive(),
        status: z.string().nullable(),
        scannedAt: z.string().datetime(),
        scanMethod: z.string().nullable(),
      }),
    ),
    sessions: z.array(
      z.object({
        id: z.number().int().positive(),
        createdAt: z.string().datetime(),
        session: z.object({ year: z.string() }).nullable(),
      }),
    ),
    discipline: z.array(
      z.object({
        id: z.number().int().positive(),
        type: z.string(),
        createdAt: z.string().datetime(),
      }),
    ),
  }),
});

export const StudentActivityItemSchema = z.object({
  type: z.enum(['PRESENCE', 'PAYMENT', 'DISCIPLINE']),
  date: z.string().datetime(),
  title: z.string(),
  icon: z.string(),
});

export const StudentDossierSchema = z.object({
  checks: z.object({
    photo: z.boolean(),
    biometrics: z.boolean(),
    verified: z.boolean(),
    payment: z.boolean(),
    documents: z.boolean(),
  }),
  completionRate: z.number().min(0).max(100),
  isReady: z.boolean(),
});

export type StudentGlobalStatsDto = z.infer<typeof StudentGlobalStatsSchema>;
export type StudentListResponseDto = z.infer<typeof StudentListResponseSchema>;
export type StudentDebtorItemDto = z.infer<typeof StudentDebtorItemSchema>;
export type StudentDashboardDto = z.infer<typeof StudentDashboardSchema>;
export type StudentActivityItemDto = z.infer<typeof StudentActivityItemSchema>;
export type StudentDossierDto = z.infer<typeof StudentDossierSchema>;
