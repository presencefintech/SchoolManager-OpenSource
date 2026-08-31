import type { AdminEnrollmentRealtimeItem, AdminPaymentRealtimeItem } from '@/types/admin'
import { formatRdcFullName, formatStudentFullName } from '@/lib/utils/student-name.util'

export function parsePaymentConfirmedAdmin(raw: unknown): AdminPaymentRealtimeItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const paymentId = Number(p.paymentId)
  if (!Number.isFinite(paymentId)) return null
  const timestamp =
    typeof p.timestamp === 'string'
      ? p.timestamp
      : typeof p.confirmedAt === 'string'
        ? p.confirmedAt
        : new Date().toISOString()
  return {
    id: `pay-ok-${paymentId}-${timestamp}`,
    type: 'confirmed',
    paymentId,
    studentId: p.studentId != null ? Number(p.studentId) : undefined,
    studentName: typeof p.studentName === 'string' ? p.studentName : undefined,
    amount: p.amount != null ? Number(p.amount) : undefined,
    currency: typeof p.currency === 'string' ? p.currency : undefined,
    provider: typeof p.provider === 'string' ? p.provider : undefined,
    timestamp,
  }
}

export function parsePaymentFailedAdmin(raw: unknown): AdminPaymentRealtimeItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const paymentId = Number(p.paymentId)
  if (!Number.isFinite(paymentId)) return null
  const timestamp = typeof p.timestamp === 'string' ? p.timestamp : new Date().toISOString()
  return {
    id: `pay-ko-${paymentId}-${timestamp}`,
    type: 'failed',
    paymentId,
    provider: typeof p.provider === 'string' ? p.provider : undefined,
    reason: typeof p.reason === 'string' ? p.reason : undefined,
    message: typeof p.message === 'string' ? p.message : undefined,
    timestamp,
  }
}

export function parseEnrollmentApproved(raw: unknown): AdminEnrollmentRealtimeItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const studentId = Number(p.studentId)
  const schoolId = Number(p.schoolId)
  if (!Number.isFinite(studentId) || !Number.isFinite(schoolId)) return null
  const timestamp = typeof p.timestamp === 'string' ? p.timestamp : new Date().toISOString()
  return {
    id: `enr-ok-${studentId}-${timestamp}`,
    type: 'approved',
    studentId,
    schoolId,
    matricule: typeof p.matricule === 'string' ? p.matricule : undefined,
    timestamp,
  }
}

export function parseNewEnrollmentRequest(raw: unknown): AdminEnrollmentRealtimeItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const studentId = Number(p.studentId)
  const schoolId = Number(p.schoolId)
  if (!Number.isFinite(studentId) || !Number.isFinite(schoolId)) return null
  const timestamp = typeof p.timestamp === 'string' ? p.timestamp : new Date().toISOString()
  const identity = {
    firstName: typeof p.firstName === 'string' ? p.firstName : undefined,
    lastName: typeof p.lastName === 'string' ? p.lastName : undefined,
    prenom: typeof p.prenom === 'string' ? p.prenom : undefined,
    postnom: typeof p.postnom === 'string' ? p.postnom : undefined,
  }
  const fullName =
    typeof p.legacyFullName === 'string'
      ? p.legacyFullName
      : formatStudentFullName(identity) || undefined
  const rdcFullName =
    typeof p.rdcFullName === 'string'
      ? p.rdcFullName
      : typeof p.fullName === 'string' && !p.legacyFullName
        ? p.fullName
        : formatRdcFullName(identity) || undefined
  return {
    id: `enr-req-${studentId}-${timestamp}`,
    type: 'request',
    studentId,
    schoolId,
    fullName,
    rdcFullName,
    timestamp,
  }
}

const CASH_KINDS = new Set([
  'SESSION_OPEN',
  'SESSION_CLOSE',
  'CASH_PAYMENT',
  'MOBILE_PAYMENT',
  'LEDGER_MOVEMENT',
  'SMS_PENDING',
  'SMS_DECLARATION',
  'SMS_REJECTED',
  'REFUND',
])

export function parseCashActivity(raw: unknown): import('@/types/admin').CashActivityRealtimeItem | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const kind = typeof p.kind === 'string' ? p.kind : ''
  if (!CASH_KINDS.has(kind)) return null
  const timestamp = typeof p.timestamp === 'string' ? p.timestamp : new Date().toISOString()
  const label = typeof p.label === 'string' && p.label.trim() ? p.label : 'Mouvement de caisse'
  const schoolId = p.schoolId != null ? Number(p.schoolId) : undefined
  const paymentId = p.paymentId != null ? Number(p.paymentId) : undefined
  const cashSessionId = p.cashSessionId != null ? Number(p.cashSessionId) : undefined
  const studentId = p.studentId != null ? Number(p.studentId) : undefined
  const direction =
    p.direction === 'IN' || p.direction === 'OUT' || p.direction === 'INFO' ? p.direction : undefined
  return {
    id: `cash-${kind}-${schoolId ?? 'x'}-${paymentId ?? cashSessionId ?? timestamp}`,
    kind: kind as import('@/types/admin').CashActivityKind,
    label,
    amount: p.amount != null ? Number(p.amount) : undefined,
    currency: typeof p.currency === 'string' ? p.currency : undefined,
    cashSessionId: Number.isFinite(cashSessionId) ? cashSessionId : undefined,
    paymentId: Number.isFinite(paymentId) ? paymentId : undefined,
    studentId: Number.isFinite(studentId) ? studentId : undefined,
    studentName: typeof p.studentName === 'string' && p.studentName.trim() ? p.studentName : undefined,
    method: typeof p.method === 'string' ? p.method : undefined,
    reference: typeof p.reference === 'string' ? p.reference : undefined,
    direction,
    affectsCashDrawer: typeof p.affectsCashDrawer === 'boolean' ? p.affectsCashDrawer : undefined,
    movementType: typeof p.movementType === 'string' ? p.movementType : undefined,
    timestamp,
    schoolId: Number.isFinite(schoolId) ? schoolId : undefined,
    schoolName: typeof p.schoolName === 'string' && p.schoolName.trim() ? p.schoolName : undefined,
    schoolGroupId: p.schoolGroupId != null && Number.isFinite(Number(p.schoolGroupId))
      ? Number(p.schoolGroupId)
      : undefined,
  }
}
