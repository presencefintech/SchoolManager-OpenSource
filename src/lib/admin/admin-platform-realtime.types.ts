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
