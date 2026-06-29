/**
 * Contrats Zod — Présences admin (aligné sur backend/src/schemas/admin.presence.validation.ts)
 */
import { z } from 'zod';

export const PRESENCE_STATUS_VALUES = ['PRESENT', 'LATE', 'ABSENT'] as const;
export type PresenceStatusValue = (typeof PRESENCE_STATUS_VALUES)[number];

export const PresenceStatusSchema = z.enum(PRESENCE_STATUS_VALUES);

export const PresenceIdempotencyKeySchema = z.string().min(10).max(128);

const MAX_RETROACTIVE_DAYS = 30;
const MAX_FUTURE_SKEW_MS = 60_000;

export const AdminSessionDateSchema = z
  .union([z.string(), z.date()])
  .optional()
  .refine(
    (val) => {
      if (val === undefined || val === null || val === '') return true;
      const d = val instanceof Date ? val : new Date(String(val));
      return !Number.isNaN(d.getTime());
    },
    { message: 'Date de session invalide' }
  )
  .refine(
    (val) => {
      if (val === undefined || val === null || val === '') return true;
      const d = val instanceof Date ? val : new Date(String(val));
      return Date.now() - d.getTime() >= -MAX_FUTURE_SKEW_MS;
    },
    { message: 'Date de session dans le futur' }
  )
  .refine(
    (val) => {
      if (val === undefined || val === null || val === '') return true;
      const d = val instanceof Date ? val : new Date(String(val));
      return Date.now() - d.getTime() <= MAX_RETROACTIVE_DAYS * 24 * 60 * 60 * 1000;
    },
    { message: `Date de session trop ancienne (max ${MAX_RETROACTIVE_DAYS} jours)` }
  )
  .transform((val) => {
    if (val === undefined || val === null || val === '') return undefined;
    return val instanceof Date ? val : new Date(String(val));
  });

export const RecordPresenceRequestSchema = z
  .object({
    studentId: z.coerce.number().int().positive(),
    classId: z.coerce.number().int().positive(),
    status: PresenceStatusSchema.default('PRESENT'),
    sessionDate: AdminSessionDateSchema,
    idempotencyKey: PresenceIdempotencyKeySchema.optional(),
    note: z.string().max(500).optional(),
  })
  .strict();

export const BulkPresenceEntrySchema = z.object({
  studentId: z.coerce.number().int().positive(),
  status: PresenceStatusSchema,
});

export const BulkRecordPresenceRequestSchema = z
  .object({
    classId: z.coerce.number().int().positive(),
    sessionDate: AdminSessionDateSchema,
    idempotencyKey: PresenceIdempotencyKeySchema.optional(),
    entries: z.array(BulkPresenceEntrySchema).min(1).max(200),
  })
  .strict();

export type RecordPresenceRequest = z.infer<typeof RecordPresenceRequestSchema>;
export type BulkRecordPresenceRequest = z.infer<typeof BulkRecordPresenceRequestSchema>;
export type BulkPresenceEntry = z.infer<typeof BulkPresenceEntrySchema>;

export interface AdminPresenceRecordResult {
  id: number
  status: PresenceStatusValue
  studentName: string
  fraudScore?: number
  idempotentReplay?: boolean
  isSameDayDuplicate?: boolean
}

export interface BulkPresenceRecordItem {
  studentId: number
  presenceId: number
  status: PresenceStatusValue
  studentName: string
  idempotentReplay?: boolean
  isSameDayDuplicate?: boolean
}

export interface BulkPresenceRecordFailure {
  studentId: number
  error: string
  code?: string
}

export interface BulkPresenceRecordResult {
  succeeded: BulkPresenceRecordItem[]
  failed: BulkPresenceRecordFailure[]
  duplicates: BulkPresenceRecordItem[]
}
