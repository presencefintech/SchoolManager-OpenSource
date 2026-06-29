import type {
  AdminPresenceRecordResult,
  BulkPresenceRecordResult,
} from '@/types/admin'

export interface PresenceMutationResult<T> {
  data: T
  statusCode: number
  message?: string
}

export type BulkPresenceOutcomeKind =
  | 'full_success'
  | 'partial'
  | 'all_duplicates'
  | 'all_failed'

export interface BulkPresenceOutcome {
  kind: BulkPresenceOutcomeKind
  title: string
  detail: string
  failedStudentIds: number[]
  duplicateStudentIds: number[]
  succeededStudentIds: number[]
}

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'Retard',
}

export function presenceStatusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status
}

export function isPartialHttpStatus(statusCode: number): boolean {
  return statusCode === 202
}

export function isSingleDuplicateResult(result: AdminPresenceRecordResult): boolean {
  return Boolean(result.isSameDayDuplicate || result.idempotentReplay)
}

export function interpretBulkPresenceResult(
  data: BulkPresenceRecordResult,
  statusCode: number,
  message?: string,
): BulkPresenceOutcome {
  const { succeeded, failed, duplicates } = data
  const failedStudentIds = failed.map((f) => f.studentId)
  const duplicateStudentIds = duplicates.map((d) => d.studentId)
  const succeededStudentIds = succeeded.map((s) => s.studentId)

  const counts = `${succeeded.length} OK · ${failed.length} échec(s) · ${duplicates.length} doublon(s)`

  if (failed.length > 0 && succeeded.length === 0 && duplicates.length === 0) {
    const detail = failed
      .slice(0, 5)
      .map((f) => `#${f.studentId}: ${f.error}${f.code ? ` (${f.code})` : ''}`)
      .join(' · ')
    return {
      kind: 'all_failed',
      title: 'Échec total',
      detail: message ?? `${counts}. ${detail}${failed.length > 5 ? '…' : ''}`,
      failedStudentIds,
      duplicateStudentIds,
      succeededStudentIds,
    }
  }

  if (duplicates.length > 0 && succeeded.length === 0 && failed.length === 0) {
    return {
      kind: 'all_duplicates',
      title: 'Aucun nouvel enregistrement',
      detail: message ?? `${duplicates.length} élève(s) déjà pointé(s) aujourd'hui.`,
      failedStudentIds,
      duplicateStudentIds,
      succeededStudentIds,
    }
  }

  if (isPartialHttpStatus(statusCode) || failed.length > 0 || duplicates.length > 0) {
    const failureDetail =
      failed.length > 0
        ? failed
            .slice(0, 3)
            .map((f) => `#${f.studentId}: ${f.error}`)
            .join(' · ')
        : ''
    return {
      kind: 'partial',
      title: 'Enregistrement partiel',
      detail: message ?? `${counts}${failureDetail ? `. ${failureDetail}` : ''}${failed.length > 3 ? '…' : ''}`,
      failedStudentIds,
      duplicateStudentIds,
      succeededStudentIds,
    }
  }

  return {
    kind: 'full_success',
    title: 'Cahier d\'appel enregistré',
    detail: message ?? `${succeeded.length} présence(s) enregistrée(s).`,
    failedStudentIds,
    duplicateStudentIds,
    succeededStudentIds,
  }
}
