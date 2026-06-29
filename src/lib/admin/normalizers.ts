import type {
  EnrollmentListItem,
  EnrollmentDetail,
  SessionEnrollment,
  PendingVerificationItem,
  PaymentProfile,
  StudentListItem,
  StudentDetail,
  Moratorium, MoratoriumRecoveryRate,
} from '@/types/admin'

/** Prisma Decimal / string → number */
export function toAmount(value: unknown): number {
  if (value == null) return 0
  if (typeof value === 'number') return value
  if (typeof value === 'string') return parseFloat(value) || 0
  return 0
}

export function normalizeAcademicSession(raw: Record<string, unknown> | undefined) {
  if (!raw) return undefined
  return {
    id: Number(raw.id),
    label: String(raw.label ?? ''),
    startDate: String(raw.startDate ?? ''),
    endDate: String(raw.endDate ?? ''),
    isCurrent: Boolean(raw.isCurrent),
    status: String(raw.status ?? ''),
  }
}

export function normalizeSessionEnrollment(raw: Record<string, unknown>): SessionEnrollment {
  return {
    id: Number(raw.id),
    studentId: Number(raw.studentId),
    classId: Number(raw.classId),
    sessionId: Number(raw.sessionId),
    status: String(raw.status ?? 'ENROLLED'),
    type: String(raw.type ?? 'NEW'),
    totalAmount: toAmount(raw.totalAmount),
    paidAmount: toAmount(raw.paidAmount),
    balance: toAmount(raw.balance),
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
    session: normalizeAcademicSession(raw.session as Record<string, unknown> | undefined),
  }
}

export function normalizeEnrollmentListItem(raw: Record<string, unknown>): EnrollmentListItem {
  const cls = raw.class as { name?: string } | undefined
  return {
    id: Number(raw.id),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    matricule: (raw.matricule as string | undefined) ?? undefined,
    status: String(raw.status ?? ''),
    className: cls?.name ?? (raw.className as string | undefined),
    classId: raw.classId != null ? Number(raw.classId) : undefined,
    email: raw.email as string | undefined,
    phone: raw.phone as string | undefined,
    isLocked: Boolean(raw.isPaymentLocked ?? raw.isLocked ?? false),
    isPaymentLocked: Boolean(raw.isPaymentLocked ?? raw.isLocked ?? false),
    reminderPaused: Boolean(raw.reminderPausedUntil ?? raw.reminderPaused),
    biometricStatus: String(raw.biometricStatus ?? 'PENDING'),
    scholarshipPercent: raw.scholarshipPercent != null ? Number(raw.scholarshipPercent) : undefined,
    feesBalance: toAmount(raw.feesBalance),
    tuitionBalance: toAmount(raw.tuitionBalance),
    totalFees: toAmount(raw.totalFees),
    feesPaid: toAmount(raw.feesPaid),
    activeMoratoriumId: raw.activeMoratoriumId != null ? Number(raw.activeMoratoriumId) : undefined,
    academicYear: raw.academicYear as string | undefined,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export function normalizeEnrollmentDetail(raw: Record<string, unknown>): EnrollmentDetail {
  const base = normalizeEnrollmentListItem(raw)
  const enrollments = Array.isArray(raw.enrollments)
    ? (raw.enrollments as Record<string, unknown>[]).map(normalizeSessionEnrollment)
    : undefined
  const summary = raw.summary as { enrollmentCount?: number; currentStatus?: string } | undefined

  return {
    ...base,
    gender: raw.gender as string | undefined,
    dateOfBirth: raw.dateOfBirth ? String(raw.dateOfBirth) : undefined,
    address: raw.address as string | undefined,
    parentName: undefined,
    parentPhone: undefined,
    parentEmail: undefined,
    hasBiometrics: raw.biometricStatus === 'READY',
    reminderPaused: Boolean(raw.reminderPausedUntil ?? raw.reminderPaused),
    enrollments,
    dataIntegrity: raw.dataIntegrity as boolean | undefined,
    summary: summary
      ? { enrollmentCount: summary.enrollmentCount ?? 0, currentStatus: summary.currentStatus ?? base.status }
      : undefined,
  }
}

export function normalizeStudentListItem(raw: Record<string, unknown>): StudentListItem {
  const cls = raw.class as { name?: string } | undefined
  return {
    id: Number(raw.id),
    firstName: String(raw.firstName ?? ''),
    lastName: String(raw.lastName ?? ''),
    matricule: (raw.matricule as string | undefined) ?? undefined,
    status: String(raw.status ?? ''),
    className: cls?.name ?? (raw.className as string | undefined),
    email: raw.email as string | undefined,
    phone: raw.phone as string | undefined,
    parentPhone: raw.parentPhone as string | undefined,
    createdAt: String(raw.createdAt ?? ''),
    hasBiometrics: raw.biometricStatus === 'READY' || Boolean(raw.hasBiometrics),
    debtAmount: toAmount(raw.feesBalance ?? raw.debtAmount ?? raw.tuitionBalance),
    isPaymentLocked: Boolean(raw.isPaymentLocked ?? false),
    biometricStatus: String(raw.biometricStatus ?? 'PENDING'),
    scholarshipPercent: raw.scholarshipPercent != null ? Number(raw.scholarshipPercent) : undefined,
    activeMoratoriumId: raw.activeMoratoriumId != null ? Number(raw.activeMoratoriumId) : undefined,
    feesBalance: toAmount(raw.feesBalance),
    tuitionBalance: toAmount(raw.tuitionBalance),
    totalFees: toAmount(raw.totalFees),
    feesPaid: toAmount(raw.feesPaid),
  }
}

/** GET /admin/students/:id/detail — réponse { profile, stats, history } ou plat legacy */
export function normalizeStudentDetail(raw: Record<string, unknown>): StudentDetail {
  const profile = (raw.profile ?? raw) as Record<string, unknown>
  const stats = (raw.stats ?? {}) as Record<string, unknown>
  const history = (raw.history ?? {}) as Record<string, unknown>
  const cls = profile.class as { name?: string; id?: number } | undefined
  const presences = (history.presences ?? profile.presences) as Array<{ scannedAt?: string }> | undefined
  const parentsLink = profile.parentsLink as Array<{
    parent?: { firstName?: string; lastName?: string; phone?: string }
  }> | undefined
  const parent = parentsLink?.[0]?.parent

  const feesBalance = toAmount(stats.remainingDebt ?? profile.feesBalance ?? profile.tuitionBalance)
  const totalFees = toAmount(profile.totalFees)
  const totalPaid = toAmount(stats.totalPaid ?? profile.feesPaid)

  return {
    id: Number(profile.id),
    firstName: String(profile.firstName ?? ''),
    lastName: String(profile.lastName ?? ''),
    matricule: profile.matricule as string | undefined,
    status: String(profile.status ?? ''),
    email: profile.email as string | undefined,
    phone: profile.phone as string | undefined,
    dateOfBirth: profile.dateOfBirth ? String(profile.dateOfBirth) : undefined,
    gender: profile.gender as string | undefined,
    address: profile.address as string | undefined,
    parentName: parent
      ? [parent.firstName, parent.lastName].filter(Boolean).join(' ').trim() || undefined
      : (profile.parentName as string | undefined),
    parentPhone: (parent?.phone ?? profile.parentPhone) as string | undefined,
    parentEmail: profile.parentEmail as string | undefined,
    className: cls?.name ?? (profile.className as string | undefined),
    classId: profile.classId != null ? Number(profile.classId) : cls?.id,
    schoolId: Number(profile.schoolId ?? 0),
    hasBiometrics: profile.biometricStatus === 'READY' || Boolean(profile.hasBiometrics),
    isLocked: Boolean(profile.isLocked),
    isPaymentLocked: Boolean(profile.isPaymentLocked),
    reminderPaused: Boolean(profile.reminderPaused),
    biometricStatus: String(profile.biometricStatus ?? 'PENDING'),
    scholarshipPercent: profile.scholarshipPercent != null ? Number(profile.scholarshipPercent) : undefined,
    activeMoratoriumId: profile.activeMoratoriumId != null ? Number(profile.activeMoratoriumId) : undefined,
    feesBalance,
    tuitionBalance: toAmount(profile.tuitionBalance ?? feesBalance),
    totalFees,
    feesPaid: totalPaid,
    totalDue: totalFees,
    totalPaid,
    debtAmount: feesBalance,
    academicYear: profile.academicYear as string | undefined,
    placeOfBirth: profile.placeOfBirth as string | undefined,
    nationality: profile.nationality as string | undefined,
    bloodGroup: profile.bloodGroup as string | undefined,
    allergies: profile.allergies as string | undefined,
    medicalNotes: profile.medicalNotes as string | undefined,
    emergencyContactName: profile.emergencyContactName as string | undefined,
    emergencyContactPhone: profile.emergencyContactPhone as string | undefined,
    isVerifiedPhysically: profile.isVerifiedPhysically as boolean | undefined,
    lastReminderSentAt: profile.lastReminderSentAt ? String(profile.lastReminderSentAt) : undefined,
    reminderPausedUntil: profile.reminderPausedUntil ? String(profile.reminderPausedUntil) : undefined,
    createdAt: String(profile.createdAt ?? ''),
    updatedAt: String(profile.updatedAt ?? ''),
    presenceCount: presences?.length,
    lastPresence: presences?.[0]?.scannedAt ? String(presences[0].scannedAt) : undefined,
  }
}

export function formatStudentDisplayName(
  student: { firstName?: string; lastName?: string; matricule?: string; id?: number },
): string {
  const name = [student.firstName, student.lastName].filter(Boolean).join(' ').trim()
  if (name) return name
  if (student.matricule) return student.matricule
  if (student.id) return `Élève #${student.id}`
  return 'Élève'
}

export function normalizePendingVerification(row: Record<string, unknown>): PendingVerificationItem {
  const payment = (row.payment ?? {}) as Record<string, unknown>
  const student = (row.student ?? {}) as Record<string, unknown>
  const studentName =
    (student.name as string | undefined)
    ?? (row.studentName as string | undefined)
    ?? ([student.firstName, student.lastName].filter(Boolean).join(' ').trim() || '—')

  return {
    verificationId: Number(row.verificationId ?? row.id),
    paymentId: Number(row.paymentId ?? payment.id ?? row.id),
    status: String(row.status ?? payment.status ?? 'PENDING'),
    verificationStep: Number(row.verificationStep ?? 0),
    financeCheck: Boolean(row.financeCheck),
    adminCheck: Boolean(row.adminCheck),
    superAdminCheck: Boolean(row.superAdminCheck ?? false),
    suspicion: Boolean(row.suspicion),
    fraudScore: row.fraudScore != null ? Number(row.fraudScore) : null,
    queuedAt: String(row.queuedAt ?? payment.createdAt ?? row.createdAt ?? ''),
    studentName,
    amount: toAmount(payment.amount ?? row.amount),
    currency: String(payment.currency ?? row.currency ?? 'USD'),
    method: String(payment.method ?? row.method ?? ''),
    reference: (payment.reference ?? row.reference ?? payment.providerRef) as string | undefined,
    providerRef: payment.providerRef as string | undefined,
    receiptNumber: payment.receiptNumber as string | undefined,
    receiptUrl: payment.receiptUrl as string | undefined,
    createdAt: String(payment.createdAt ?? row.queuedAt ?? row.createdAt ?? ''),
    studentId: student.id != null ? Number(student.id) : undefined,
    studentMatricule: student.matricule as string | undefined,
    studentClassName: student.className as string | undefined,
    studentBalance: student.balance != null ? toAmount(student.balance) : undefined,
    id: Number(row.paymentId ?? payment.id ?? row.id),
  }
}

export function normalizePaymentProfile(raw: Record<string, unknown>): PaymentProfile {
  return {
    schoolId: Number(raw.schoolId ?? 0),
    schoolName: raw.schoolName as string | undefined,
    provider: String(raw.provider ?? 'FLUTTERWAVE') as PaymentProfile['provider'],
    legalName: String(raw.legalName ?? ''),
    contactEmail: raw.contactEmail as string | undefined,
    contactPhone: raw.contactPhone as string | undefined,
    settlementBankCode: raw.settlementBankCode as string | undefined,
    settlementAccountMasked: raw.settlementAccountMasked as string | undefined,
    settlementAccountName: raw.settlementAccountName as string | undefined,
    mobileMoneyBusinessId: raw.mobileMoneyBusinessId as string | undefined,
    flwSubaccountId: raw.flwSubaccountId as string | undefined,
    kycStatus: String(raw.kycStatus ?? 'NOT_CONFIGURED') as PaymentProfile['kycStatus'],
    kycNote: raw.kycNote as string | undefined,
    onlinePaymentsEnabled: Boolean(raw.onlinePaymentsEnabled),
    verifiedAt: raw.verifiedAt ? String(raw.verifiedAt) : undefined,
    rejectedAt: raw.rejectedAt ? String(raw.rejectedAt) : undefined,
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}

export function normalizeMoratoriumRecoveryRate(raw: Record<string, unknown>): MoratoriumRecoveryRate {
  return {
    schoolId: Number(raw.schoolId ?? 0),
    sessionId: raw.sessionId != null ? Number(raw.sessionId) : null,
    sessionLabel: raw.sessionLabel != null ? String(raw.sessionLabel) : null,
    recoveryRateGlobal: Number(raw.recoveryRateGlobal ?? raw.rate ?? 0),
    recoveryRateExcludingMoratorium: Number(raw.recoveryRateExcludingMoratorium ?? 0),
    totalDebt: Number(raw.totalDebt ?? 0),
    recoveredAmount: Number(raw.recoveredAmount ?? 0),
    studentsUnderMoratorium: Number(raw.studentsUnderMoratorium ?? 0),
    currency: raw.currency as string | undefined,
    computedAt: raw.computedAt as string | undefined,
  }
}

export function normalizeMoratorium(raw: Record<string, unknown>): Moratorium {
  const student = raw.student as { firstName?: string; lastName?: string } | undefined
  const studentName = raw.studentName as string | undefined
  let studentObj: { firstName: string; lastName: string } | undefined
  if (student?.firstName != null) {
    studentObj = { firstName: String(student.firstName), lastName: String(student.lastName ?? '') }
  } else if (studentName) {
    const parts = studentName.trim().split(/\s+/)
    studentObj = { firstName: parts[0] ?? '', lastName: parts.slice(1).join(' ') }
  }
  return {
    id: Number(raw.id),
    studentId: Number(raw.studentId),
    enrollmentId: raw.enrollmentId != null ? Number(raw.enrollmentId) : undefined,
    type: String(raw.type ?? 'EXCEPTIONAL'),
    startDate: String(raw.startDate ?? ''),
    endDate: String(raw.endDate ?? ''),
    reason: String(raw.reason ?? ''),
    status: String(raw.status ?? ''),
    studentName,
    student: studentObj,
    grantedByName: raw.grantedByName as string | undefined,
    internalNote: raw.internalNote != null ? String(raw.internalNote) : undefined,
    createdAt: String(raw.createdAt ?? ''),
    updatedAt: raw.updatedAt ? String(raw.updatedAt) : undefined,
  }
}
