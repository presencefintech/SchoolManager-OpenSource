import type { EnrollmentCreateResult, StudentDashboard } from '@/types/super-admin'
import type {
  StudentCardData,
  StudentCardFinancialInput,
  StudentCardFinancialStatus,
  StudentCardGender,
} from '@/types/student-card'
import { QR_MAX_PAYLOAD_LENGTH, validateQrPayload } from './validate-qr'
import { formatStudentIdentityView } from '@/lib/utils/student-name.util'
import { serializeStudentCardQrPayload } from './build-qr-payload'

const STATUS_STRIPE: Record<StudentCardFinancialStatus, string> = {
  current: '#059669',
  alert: '#dc2626',
  standard: '#2563eb',
}

export function deriveFinancialStatus(input: StudentCardFinancialInput): StudentCardFinancialStatus {
  if (input.isPaymentLocked) return 'alert'
  if (input.feesBalance != null && input.feesBalance > 0) return 'alert'
  if (input.isUpToDate === true) return 'current'
  if (input.feesBalance === 0) return 'current'
  return 'standard'
}

export function formatValidityLabel(academicYear: string | null | undefined): string {
  const trimmed = academicYear?.trim()
  if (trimmed) return `Validité : ${trimmed}`
  const y = new Date().getFullYear()
  return `Validité : ${y}-${y + 1}`
}

export function formatGenderLabel(gender: StudentCardGender | null | undefined): string | null {
  if (!gender) return null
  if (gender === 'MALE' || gender === 'M') return 'Masculin'
  if (gender === 'FEMALE' || gender === 'F') return 'Féminin'
  return null
}

export function getFinancialStripeColor(status: StudentCardFinancialStatus): string {
  return STATUS_STRIPE[status]
}

export function buildStudentCardData(input: {
  studentId: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  matricule?: string | null
  photoUrl?: string | null
  qrPayload: string
  schoolName: string
  schoolCity?: string | null
  schoolLogoUrl?: string | null
  className?: string | null
  section?: string | null
  option?: string | null
  academicYear?: string | null
  dateOfBirth?: string | null
  placeOfBirth?: string | null
  nationality?: string | null
  gender?: StudentCardGender | null
  feesBalance?: number | null
  isUpToDate?: boolean | null
  isPaymentLocked?: boolean | null
}): StudentCardData {
  const identity = formatStudentIdentityView(input)
  return {
    studentId: input.studentId,
    firstName: input.firstName,
    lastName: input.lastName,
    postnom: identity.postnom,
    prenom: identity.prenom,
    rdcFullName: identity.fullName,
    matricule: input.matricule ?? null,
    className: input.className ?? null,
    section: input.section ?? null,
    option: input.option ?? null,
    photoUrl: input.photoUrl ?? null,
    qrPayload: input.qrPayload,
    schoolName: input.schoolName,
    schoolCity: input.schoolCity ?? null,
    schoolLogoUrl: input.schoolLogoUrl ?? null,
    academicYear: input.academicYear ?? null,
    dateOfBirth: input.dateOfBirth?.trim() || null,
    placeOfBirth: input.placeOfBirth?.trim() || null,
    nationality: input.nationality?.trim() || null,
    gender: input.gender ?? null,
    financialStatus: deriveFinancialStatus({
      feesBalance: input.feesBalance,
      isUpToDate: input.isUpToDate,
      isPaymentLocked: input.isPaymentLocked,
    }),
  }
}

export function buildStudentQrPayload(studentId: number, matricule?: string | null): string {
  return serializeStudentCardQrPayload(studentId, matricule)
}

/**
 * Payload QR pour la carte CR80 : utilise le QR backend s'il est assez court,
 * sinon bascule sur le format compact (lisible à ~14 mm imprimé).
 */
export function resolveCardQrPayload(
  studentId: number,
  matricule: string | null | undefined,
  backendQrcode?: string | null,
): string {
  const compact = buildStudentQrPayload(studentId, matricule)
  const raw = backendQrcode?.trim()
  if (!raw) return compact

  if (raw.length <= QR_MAX_PAYLOAD_LENGTH) return raw

  // QR backend (souvent signé/JWT) trop dense pour l'impression carte
  return compact
}

export function mapDashboardToStudentCard(
  dashboard: StudentDashboard,
  context?: {
    schoolName?: string
    schoolLogoUrl?: string | null
    academicYear?: string | null
    section?: string | null
    option?: string | null
  },
): StudentCardData {
  const { profile, stats, history } = dashboard
  const sessionYear = history.sessions.find((s) => s.session?.year)?.session?.year ?? null
  const gender = (profile.gender === 'MALE' || profile.gender === 'FEMALE' || profile.gender === 'M' || profile.gender === 'F')
    ? profile.gender
    : null

  return buildStudentCardData({
    studentId: profile.id,
    firstName: profile.firstName,
    lastName: profile.lastName,
    postnom: profile.postnom,
    prenom: profile.prenom,
    matricule: profile.matricule,
    photoUrl: profile.photoUrl,
    qrPayload: resolveCardQrPayload(profile.id, profile.matricule),
    schoolName: context?.schoolName ?? profile.school?.name ?? 'Établissement',
    schoolLogoUrl: context?.schoolLogoUrl,
    className: profile.class?.name ?? null,
    section: context?.section ?? null,
    option: context?.option ?? null,
    academicYear: context?.academicYear ?? sessionYear,
    dateOfBirth: profile.birthDate
      ? new Date(profile.birthDate).toLocaleDateString('fr-FR')
      : null,
    gender,
    feesBalance: stats.remainingDebt,
    isUpToDate: stats.isUpToDate,
    isPaymentLocked: profile.isPaymentLocked,
  })
}

export function mapEnrollmentToStudentCard(
  result: EnrollmentCreateResult,
  context: {
    schoolName: string
    schoolCity?: string | null
    schoolLogoUrl?: string | null
    className?: string | null
    section?: string | null
    option?: string | null
    academicYear?: string | null
    placeOfBirth?: string | null
    nationality?: string | null
    gender?: StudentCardGender | null
    photoUrl?: string | null
  },
): StudentCardData {
  const { student, qrcode } = result
  const qrPayload = resolveCardQrPayload(student.id, student.matricule, qrcode)

  return buildStudentCardData({
    studentId: student.id,
    firstName: student.firstName,
    lastName: student.lastName,
    postnom: student.postnom,
    prenom: student.prenom,
    matricule: student.matricule,
    photoUrl: context.photoUrl ?? student.photoUrl,
    qrPayload,
    schoolName: context.schoolName,
    schoolCity: context.schoolCity,
    schoolLogoUrl: context.schoolLogoUrl,
    className: context.className,
    section: context.section,
    option: context.option,
    academicYear: context.academicYear ?? student.academicYear,
    placeOfBirth: context.placeOfBirth ?? student.placeOfBirth,
    nationality: context.nationality ?? student.nationality,
    gender: context.gender ?? null,
    feesBalance: student.feesBalance,
    isUpToDate: student.feesBalance === 0 || student.feesBalance == null,
  })
}
