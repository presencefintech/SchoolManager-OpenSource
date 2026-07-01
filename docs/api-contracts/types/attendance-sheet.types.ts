/**
 * Contrats API — Cahier d'appel numérique (Phase B)
 * Aligné sur backend/src/types/attendance-sheet.types.ts
 */
import type { AttendanceSheetStatus } from './presence.validation';

export type {
  AttendanceSheetStatus,
  AttendanceSheetLineView,
  AttendanceSheetDraft,
  PendingAttendanceSheetSummary,
} from './presence.validation';

export interface SealedAttendanceSheetResult {
  sheetId: number;
  status: AttendanceSheetStatus;
  sealedAt: string;
  sheetAuditSeal: string;
  lineCount: number;
  presenceCount: number;
}

/** Réponse POST /bulk et /record groupé — étend le résultat bulk */
export interface SubmitAttendanceSheetResult {
  succeeded: Array<{
    studentId: number;
    presenceId: number;
    status: string;
    studentName: string;
    idempotentReplay?: boolean;
    isSameDayDuplicate?: boolean;
  }>;
  failed: Array<{ studentId: number; error: string; code?: string }>;
  duplicates: Array<{
    studentId: number;
    presenceId: number;
    status: string;
    studentName: string;
  }>;
  sheetId: number;
  sheetStatus: AttendanceSheetStatus;
}
