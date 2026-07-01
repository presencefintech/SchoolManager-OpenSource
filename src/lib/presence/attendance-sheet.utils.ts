import type { AttendanceSheetStatus } from '@/types/admin'

export const SHEET_STATUS_LABEL: Record<AttendanceSheetStatus, string> = {
  DRAFT: 'Brouillon',
  SUBMITTED: 'Soumis — en attente de clôture',
  SEALED: 'Scellé',
}

export const SHEET_STATUS_BADGE: Record<AttendanceSheetStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  SUBMITTED: 'bg-blue-50 text-blue-800 border-blue-200',
  SEALED: 'bg-emerald-50 text-emerald-800 border-emerald-200',
}

export function isSheetEditable(status?: AttendanceSheetStatus): boolean {
  return status !== 'SEALED'
}
