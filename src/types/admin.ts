// Dashboard
export interface WeeklyTrendPoint {
  date: string
  label: string
  present: number
  rate: number
}

export interface DashboardStats {
  totalStudents: number
  presentToday: number
  absentToday: number
  lateToday: number
  attendanceRate: number
  fraudAlerts: number
  weeklyTrend?: WeeklyTrendPoint[]
}

export interface LiveFeedEntry {
  id: number
  studentId: number
  studentName: string
  className: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  timestamp: string
  method?: string
}

export interface HeatmapEntry {
  hour: string
  count: number
}

export interface FraudAlert {
  id: number
  type: string
  description: string
  studentId?: number
  studentName?: string
  severity: 'LOW' | 'MEDIUM' | 'HIGH'
  createdAt: string
  resolved: boolean
}

export interface ControlDashboardStats {
  pipeline: { healthy: boolean; queueDepth: number }
  security: {
    alerts: number
    blockedIPs: number
    gatekeeper: { livenessFailure: number; imageQuality: number; other: number }
    fraudAlertActive: boolean
  }
  integrity: {
    errors: number
    withSeal: number
    verified: number
    unchecked: number
    status: 'healthy' | 'warning' | 'critical' | 'unavailable'
  }
  workers: { active: number; failed: number; waiting: number; health: string }
  performance: {
    apiAvgMs: number
    workerAvgMs: number
    scansPerMinute: number
  }
  scanFlow: ScanFlowPoint[]
  generatedAt?: string
}

export interface ScanFlowPoint {
  label: string
  timestamp: string
  count: number
}

export interface AttendanceActivityItem {
  id: string
  presenceId: number
  studentName: string
  method: string
  status: string
  direction?: 'ARRIVAL' | 'EXIT' | null
  scannedAt: string
}

export interface ActiveScanSession {
  sessionId: string
  classId: number
  teacherId: number
  sessionNonce: string
  startedAt: string
  expiresAt: string
  scanCount: number
  maxScans: number
  status: string
}

export interface PresenceSyncBatch {
  id: string
  schoolId: number
  actorId: number
  itemCount: number
  successCount: number
  failedCount: number
  duplicateCount: number
  correlationId: string | null
  createdAt: string
  completedAt: string | null
  successRate: number
}

export interface PresenceSyncBatchDetail extends PresenceSyncBatch {
  results: Array<{
    studentId?: number
    status?: string
    error?: string
    duplicate?: boolean
  }>
}

export interface AdminPaymentRealtimeItem {
  id: string
  type: 'confirmed' | 'failed' | 'correction'
  paymentId: number
  studentId?: number
  studentName?: string
  amount?: number
  currency?: string
  provider?: string
  reason?: string
  message?: string
  timestamp: string
}

export type CashActivityKind =
  | 'SESSION_OPEN'
  | 'SESSION_CLOSE'
  | 'CASH_PAYMENT'
  | 'MOBILE_PAYMENT'
  | 'LEDGER_MOVEMENT'
  | 'SMS_PENDING'
  | 'SMS_DECLARATION'
  | 'SMS_REJECTED'
  | 'REFUND'

export interface CashActivityRealtimeItem {
  id: string
  kind: CashActivityKind
  label: string
  amount?: number
  currency?: string
  cashSessionId?: number
  paymentId?: number
  studentId?: number
  studentName?: string
  method?: string
  reference?: string
  direction?: 'IN' | 'OUT' | 'INFO'
  affectsCashDrawer?: boolean
  movementType?: string
  timestamp: string
  schoolId?: number
  schoolName?: string
  schoolGroupId?: number | null
}

export interface AdminEnrollmentRealtimeItem {
  id: string
  type: 'approved' | 'request'
  studentId: number
  schoolId: number
  matricule?: string
  fullName?: string
  /** Identité RDC pour affichage détail admin */
  rdcFullName?: string
  timestamp: string
}

// Staff
import type { StaffAccountView } from '@/lib/admin/api/schools.api'

export interface StaffMember {
  id: number
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  role: string
  status: string
  isActive?: boolean
  createdAt: string
  lastLogin: string | null
  account?: StaffAccountView
  /** Teacher.id — identifiant que la classe enregistre. Absent si le profil n’existe pas encore. */
  teacherProfileId?: number | null
}

export interface CreateStaffPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  role: 'TEACHER' | 'FINANCE' | 'DIRECTOR' | 'IT'
  phone?: string
}

export interface RegeneratePasswordResult {
  tempPassword: string
  user: { id: number; firstName: string; lastName: string; email: string }
}

// Students
export interface StudentStats {
  total: number
  active: number
  inactive: number
  suspended: number
  pendingEnrollment: number
  withDebt: number
}

export interface StudentListItem {
  id: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  matricule?: string
  status: string
  className?: string
  email?: string
  phone?: string
  parentPhone?: string
  createdAt: string
  hasBiometrics: boolean
  debtAmount?: number
  isPaymentLocked?: boolean
  biometricStatus?: string
  scholarshipPercent?: number
  activeMoratoriumId?: number
  feesBalance?: number
  tuitionBalance?: number
  totalFees?: number
  feesPaid?: number
}

export interface StudentDetail {
  id: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  matricule?: string
  status: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  className?: string
  classId?: number
  schoolId: number
  schoolName?: string
  hasBiometrics: boolean
  isLocked: boolean
  isPaymentLocked?: boolean
  reminderPaused: boolean
  biometricStatus?: string
  scholarshipPercent?: number
  activeMoratoriumId?: number
  feesBalance?: number
  tuitionBalance?: number
  totalFees?: number
  feesPaid?: number
  academicYear?: string
  placeOfBirth?: string
  nationality?: string
  bloodGroup?: string
  allergies?: string
  medicalNotes?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  isVerifiedPhysically?: boolean
  lastReminderSentAt?: string
  reminderPausedUntil?: string
  createdAt: string
  updatedAt: string
  totalDue?: number
  totalPaid?: number
  debtAmount?: number
  presenceCount?: number
  lastPresence?: string
  lastPresenceStatus?: string
  monthPresent?: number
  monthLate?: number
  monthAbsent?: number
  monthPresenceRate?: number | null
  enrollments?: SessionEnrollment[]
  photoUrl?: string
  birthCertificateUrl?: string
  enrollmentFormUrl?: string
}

export interface StudentActivity {
  id: number
  type: string
  description: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface DossierStatus {
  studentId: number
  hasPhoto: boolean
  hasBiometrics: boolean
  hasParentContact: boolean
  isFinanciallyCleared: boolean
  matricule?: string
  completionRate: number
}

export interface Debtor {
  studentId: number
  firstName: string
  lastName: string
  className?: string
  totalDue: number
  totalPaid: number
  balance: number
  lastPaymentDate?: string
}

export interface StudentApplication {
  id: number
  firstName: string
  lastName: string
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED'
  submittedAt: string
  parentName?: string
  parentPhone?: string
  desiredClass?: string
}

// Enrollments
export interface AcademicSessionRef {
  id: number
  label: string
  startDate: string
  endDate: string
  isCurrent: boolean
  status: string
}

export interface SessionEnrollment {
  id: number
  studentId: number
  classId: number
  sessionId: number
  status: string
  type: string
  totalAmount: number
  paidAmount: number
  balance: number
  createdAt: string
  updatedAt?: string
  session?: AcademicSessionRef
}

export interface EnrollmentListItem {
  id: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  matricule?: string
  qrcodeHmac?: string | null
  status: string
  className?: string
  classId?: number
  email?: string
  phone?: string
  isLocked: boolean
  isPaymentLocked?: boolean
  reminderPaused?: boolean
  biometricStatus?: string
  scholarshipPercent?: number
  feesBalance?: number
  tuitionBalance?: number
  totalFees?: number
  feesPaid?: number
  activeMoratoriumId?: number
  academicYear?: string
  createdAt: string
  updatedAt?: string
}

export interface EnrollmentDetail {
  id: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  matricule?: string
  status: string
  className?: string
  classId?: number
  email?: string
  phone?: string
  dateOfBirth?: string
  gender?: string
  address?: string
  parentName?: string
  parentPhone?: string
  parentEmail?: string
  isLocked: boolean
  isPaymentLocked?: boolean
  reminderPaused: boolean
  hasBiometrics: boolean
  biometricStatus?: string
  scholarshipPercent?: number
  feesBalance?: number
  tuitionBalance?: number
  totalFees?: number
  feesPaid?: number
  activeMoratoriumId?: number
  academicYear?: string
  createdAt: string
  enrollments?: SessionEnrollment[]
  dataIntegrity?: boolean
  summary?: { enrollmentCount: number; currentStatus: string }
}

export interface CreateEnrollmentPayload {
  firstName: string
  lastName: string
  postnom: string
  prenom?: string
  gender: 'M' | 'F' | 'MALE' | 'FEMALE'
  birthDate?: string
  classId: number
  sectionId?: number
  optionId?: number
  placeOfBirth?: string
  nationality?: string
  academicYear?: string
  matricule?: string
  status?: 'ACTIVE' | 'PENDING_ENROLLMENT' | 'INACTIVE' | 'SUSPENDED'
  scholarshipPercent?: number
  totalFees?: number
  feesPaid?: number
  /** Si true (défaut), crée un Payment CASH pour feesPaid */
  collectDeposit?: boolean
  paymentNotes?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  bloodGroup?: string
  allergies?: string
  medicalNotes?: string
  nfcTagId?: string
  /** Opt-in pack EXPLICIT à ASSIGN */
  explicitFeeStructureIds?: number[]
  autoAssignExplicitFees?: boolean
}

export type EnrollmentFeePreviewLine = {
  feeStructureId: number
  categoryId: number
  categoryCode: string
  categoryName: string
  billingPeriod: string
  amount: number
  currency: string
  source?: 'AUTOMATIC' | 'ASSIGN' | 'OVERRIDE' | 'EXEMPT' | 'PROPOSED'
  assignmentMode?: string
}

export type EnrollmentFeePreview = {
  sessionId?: number
  academicYear: string
  currency: string
  totalFees: number
  mode?: 'catalog' | 'student_effective'
  asOf?: string
  feeLines: EnrollmentFeePreviewLine[]
}

export type ExplicitFeePackResult = {
  assigned: number[]
  skipped: Array<{ feeStructureId: number; reason: string }>
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Presences
/** Direction de pointage (arrivée / sortie). */
export type PresenceDirection = 'ARRIVAL' | 'EXIT'

export interface PresenceLiveFeedEntry {
  id: number
  studentId?: number
  sessionId?: number | null
  enrollmentId?: number | null
  studentName: string
  matricule?: string
  className: string
  sectionName?: string | null
  optionName?: string | null
  day?: string | null
  time?: string | null
  scannedAt: string
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXITED'
  direction?: PresenceDirection | null
  method?: string
  security?: { isSuspicious: boolean; riskScore: number; alerts: string[] } | null
  location?: { lat: number; lng: number } | null
  qrCode?: string | null
}

export interface PresenceStats {
  present: number
  absent: number
  late: number
  totalStudents: number
  attendanceRate: number
  criticalFraud: number
}

export interface PresenceHeatmapEntry {
  hour: string
  count: number
}

export interface PresenceSecurityAlert {
  id: number
  isSuspectedFraud: boolean
  fraudScore: number
  fraudReasons: string[]
  presence: {
    id: number
    student: { firstName: string; lastName: string; matricule: string; uuid: string }
    class: { name: string }
  }
}

export interface RecordPresencePayload {
  studentId: number
  classId: number
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  sessionDate?: string
  idempotencyKey?: string
  reasonCode?: string
  note?: string
}

export interface BulkPresencePayload {
  classId: number
  sessionDate?: string
  idempotencyKey?: string
  entries: Array<{
    studentId: number
    status: 'PRESENT' | 'ABSENT' | 'LATE'
    reasonCode?: string
    note?: string
  }>
}

export interface AdminPresenceRecordResult {
  id: number
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  studentName: string
  fraudScore?: number
  idempotentReplay?: boolean
  isSameDayDuplicate?: boolean
}

export interface BulkPresenceRecordItem {
  studentId: number
  presenceId: number
  status: 'PRESENT' | 'ABSENT' | 'LATE'
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
  /** Présent quand la soumission passe par le workflow cahier d'appel (Phase B) */
  sheetId?: number
  sheetStatus?: AttendanceSheetStatus
}

export type AttendanceSheetStatus = 'DRAFT' | 'SUBMITTED' | 'SEALED'

export interface AttendanceSheetLineView {
  studentId: number
  studentName: string
  matricule: string
  enrollmentId: number | null
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  reasonCode: string | null
  note: string | null
  presenceId: number | null
}

export interface AttendanceSheetDraft {
  id: number
  schoolId: number
  classId: number
  className: string
  sessionId: number
  sessionDate: string
  status: AttendanceSheetStatus
  recordingMethod: string | null
  lines: AttendanceSheetLineView[]
  submittedAt: string | null
  sealedAt: string | null
}

export interface PendingAttendanceSheetSummary {
  sheetId: number
  classId: number
  className: string
  sessionDate: string
  status: AttendanceSheetStatus
  createdByName: string
  lineCount: number
  exceptionCount: number
  submittedAt: string | null
}

export interface SubmittedAttendanceSheetResult {
  sheetId: number
  status: 'SUBMITTED'
  submittedAt: string
  lineCount: number
}

export interface SealedAttendanceSheetResult {
  sheetId: number
  status: AttendanceSheetStatus
  sealedAt: string
  sheetAuditSeal: string
  lineCount: number
  presenceCount: number
}

export type PresenceReasonGroup =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENCE_HEALTH'
  | 'ABSENCE_AUTHORIZED'
  | 'ABSENCE_DISCIPLINARY'
  | 'ABSENCE_UNAUTHORIZED'
  | 'OTHER'

export interface PresenceReasonCodeEntry {
  code: string
  labelFr: string
  labelEn?: string
  dfeSymbol: string | null
  appliesTo: readonly ('PRESENT' | 'LATE' | 'ABSENT')[]
  group: PresenceReasonGroup
  groupLabelFr: string
  groupLabelEn?: string
  requiresNote: boolean
  sortOrder: number
}

// Classes
export interface ClassListItem {
  id: number
  name: string
  level?: string
  capacity?: number
  studentCount?: number
  teacherName?: string
  teacherId?: number
  isActive: boolean
  schoolId: number
  sectionId?: number
  optionId?: number
  sectionName?: string
  optionName?: string
  academicYear?: string
  createdAt: string
}

export interface ClassPeriodItem {
  id: number
  schoolId: number
  classId: number
  className: string | null
  level: string | null
  teacherId: number
  teacherName: string | null
  academicYear: string
  dayOfWeek: number
  startMinute: number
  endMinute: number
  start: string
  end: string
  subject: string | null
  room: string | null
  isActive: boolean
}

export interface CreateClassPeriodPayload {
  classId: number
  teacherId: number
  academicYear: string
  dayOfWeek: number
  start: string
  end: string
  subject?: string | null
  room?: string | null
  isActive?: boolean
}

export type UpdateClassPeriodPayload = Partial<CreateClassPeriodPayload>

export interface SectionRef {
  id: number
  name: string
  code?: string | null
  schoolId?: number
  requiresOption?: boolean
}

export interface OptionRef {
  id: number
  name: string
  sectionId: number
  code?: string | null
  schoolId?: number
}

export interface ClassDetail extends ClassListItem {
  description?: string
  students?: { id: number; firstName: string; lastName: string; matricule?: string; status: string }[]
}

export interface ClassStats {
  studentCount: number
  attendanceRate: number
  presentToday?: number
  absentToday?: number
  totalDue?: number
  totalPaid?: number
  balance?: number
}

export interface ClassAuditEntry {
  id: number
  action: string
  description?: string
  createdAt: string
  actor?: string
}

export interface CreateClassPayload {
  name: string
  academicYear: string
  sectionId: number
  optionId?: number
  level?: string
  capacity?: number
  teacherId?: number
  description?: string
}

export interface RolloverPayload {
  fromYear: string
  toYear: string
  classIds?: number[]
}

// Finance

/** Contrat backend — GET /admin/finance/dashboard/strategic */
export interface EnterpriseDashboardDTO {
  performance: {
    monthlyRevenue: number
    projectedRevenue: number
    arpu: number
    digitalAdoption: number
    collectionEfficiency: number
  }
  audit: {
    pendingVerifications: number
    isBenfordValid: boolean
    suspiciousActivity: boolean
    devianceLevel: number
    daysSalesOutstanding: number
    highRiskProfiles: Array<{
      studentName: string
      debtAmount: number
      fraudAlertCount: number
      riskLevel: 'CRITICAL' | 'HIGH'
    }>
  }
  treasury: {
    totalUnpaid: number
    totalFees?: number
    feesPaid?: number
    breakEvenRequirement: number
    badDebtEstimate: number
  }
}

export interface FinanceKpi {
  totalRevenue: number
  totalPaid: number
  totalDue: number
  collectionRate: number
  pendingPayments: number
  fraudAlerts: number
  /** Encaissements confirmés du mois en cours (strategic). */
  monthlyRevenue?: number
  enterprise?: EnterpriseDashboardDTO
}

/** GET /admin/finance/dashboard/efficiency — recouvrement par niveau scolaire. */
export interface FinanceCollectionEfficiencyLevel {
  levelName: string
  studentCount: number
  totalDue: number
  efficiency: number
}

/** GET /admin/finance/dashboard/comparative — même forme que efficiency (par niveau). */
export type FinanceComparativeDashboard = FinanceCollectionEfficiencyLevel[]

/** GET /admin/finance/closing/end-of-day — snapshot journalier confirmé. */
export interface FinanceEndOfDayClosing {
  date: string
  total: number
  count: number
  methods: Array<{ method: string; amount: number; count: number }>
  reconciliation: { status: string; reference: string }
}

/** GET /admin/finance/dashboard/payment-methods — répartition confirmée (jour ou mois). */
export interface FinancePaymentMethodBreakdownRow {
  method: string
  amount: number
  count: number
  sharePct: number
}

export interface FinancePaymentMethodsBreakdown {
  period: 'day' | 'month'
  from: string
  to: string
  total: number
  count: number
  methods: FinancePaymentMethodBreakdownRow[]
}

/** GET /admin/finance/dashboard/fee-types — encaissements par catégorie de frais. */
export interface FinanceFeeTypeBreakdownRow {
  feeType: string
  amount: number
  count: number
  sharePct: number
}

export interface FinanceFeeTypesBreakdown {
  period: 'day' | 'month'
  from: string
  to: string
  total: number
  count: number
  feeTypes: FinanceFeeTypeBreakdownRow[]
}

/** GET/POST /admin/finance/seal-batches — lots de scellés financiers. */
export type FinancialSealBatchStatus = 'PENDING' | 'SEALED' | 'ARCHIVED'

export interface FinancialSealBatch {
  id: number
  batchReference: string
  status: FinancialSealBatchStatus
  paymentCount: number
  linkedPaymentCount?: number
  totalAmount: number
  currency: string
  sealHmac?: string | null
  sealedAt?: string | null
  sealedBy?: { id: number; name: string } | null
  createdAt: string
}

export interface FinancialSealBatchListResponse {
  items: FinancialSealBatch[]
  total: number
  page: number
  limit: number
}

export interface CreateSealBatchPayload {
  paymentIds: number[]
  metadata?: Record<string, unknown>
}

export interface CreateSealBatchResult {
  id: number
  batchReference: string
  status: FinancialSealBatchStatus
  paymentCount: number
  totalAmount: number
  currency: string
  sealHmac: string
  sealedAt: string
  paymentIds: number[]
}

export interface FinancialSealBatchPaymentLine {
  id: number
  amount: number
  currency: string
  method: string
  reference: string
  status: string
  confirmedAt?: string | null
  studentId: number
  studentName: string
  studentMatricule?: string | null
}

export interface FinancialSealBatchDetail extends FinancialSealBatch {
  payments: FinancialSealBatchPaymentLine[]
  paymentIds: number[]
  metadata?: Record<string, unknown> | null
}

export interface FinancialSealBatchVerifyResult {
  valid: boolean
  batchReference: string
  storedSealHmac: string | null
  recomputedSealHmac: string
  verifiedAt: string
  message: string
}

/** Ligne paiement éligible au scellé (recherche avancée). */
export interface SealablePaymentRow {
  id: number
  amount: number
  currency?: string
  method: string
  status: string
  reference?: string | null
  financialSealBatchId?: number | null
  createdAt: string
  studentName: string
}

/** GET /admin/finance/audit/integrity-scan — contrôle cohérence soldes élèves. */
export interface FinanceIntegrityScanDetail {
  id: number
  firstName?: string | null
  lastName?: string | null
  totalFees?: number
  feesPaid?: number
  tuitionBalance?: number
}

export interface FinanceIntegrityScan {
  status: 'SECURE' | 'WARNING' | string
  totalChecked: number
  anomaliesFound: number
  details: FinanceIntegrityScanDetail[]
}

/** @deprecated Prefer PendingVerificationItem */
export interface PendingPayment {
  verificationId?: number
  id: number
  studentName: string
  amount: number
  method: string
  status: string
  createdAt: string
  studentId?: number
  reference?: string
}

export type PaymentProofType =
  | 'RECEIPT_PDF'
  | 'MOBILE_MONEY_SCREENSHOT'
  | 'BANK_TRANSFER_SLIP'
  | 'CASH_VOUCHER'
  | 'OTHER'

export interface ConfirmPaymentProofPayload {
  proofType?: PaymentProofType
  manualJustification?: string
}

export interface PendingVerificationItem {
  verificationId: number
  paymentId: number
  status: string
  verificationStep: number
  financeCheck: boolean
  adminCheck: boolean
  financeCheckerName?: string | null
  adminCheckerName?: string | null
  financeCheckAt?: string | null
  adminCheckAt?: string | null
  superAdminCheck: boolean
  suspicion: boolean
  fraudScore: number | null
  queuedAt: string
  studentName: string
  amount: number
  currency: string
  method: string
  reference?: string
  providerRef?: string
  receiptNumber?: string
  receiptUrl?: string
  proofType?: PaymentProofType
  reconciliationNote?: string
  createdAt: string
  studentId?: number
  studentMatricule?: string
  studentClassName?: string
  studentBalance?: number
  /** Alias paymentId for legacy UI */
  id: number
}

export type PaymentProfileKycStatus = 'PENDING' | 'VERIFIED' | 'REJECTED' | 'NOT_CONFIGURED'
export type PaymentSettlementProvider = 'FLUTTERWAVE' | 'RAWBANK' | 'UBA'

export interface PaymentProfile {
  schoolId: number
  schoolName?: string
  provider: PaymentSettlementProvider
  legalName: string
  contactEmail?: string
  contactPhone?: string
  settlementBankCode?: string
  settlementAccountMasked?: string
  settlementAccountName?: string
  mobileMoneyBusinessId?: string
  flwSubaccountId?: string
  kycStatus: PaymentProfileKycStatus
  kycNote?: string
  onlinePaymentsEnabled: boolean
  verifiedAt?: string
  rejectedAt?: string
  updatedAt?: string
}

export type OnboardingStepStatus = 'DONE' | 'PENDING' | 'BLOCKED' | 'OPTIONAL'

export interface PaymentOnboardingStep {
  key: string
  label: string
  status: OnboardingStepStatus
  detail?: string
}

export interface PaymentOnboardingChecklist {
  schoolId: number
  readyForOnlinePayments: boolean
  currentStep: string
  steps: PaymentOnboardingStep[]
  profile: PaymentProfile
}

export interface UpsertPaymentProfilePayload {
  legalName: string
  contactEmail?: string
  contactPhone?: string
  settlementBankCode: string
  settlementAccountNumber: string
  settlementAccountName: string
  mobileMoneyBusinessId?: string
  provider?: PaymentSettlementProvider
}

/**
 * Alerte fraude normalisée — utilisée par `/admin/finance` et `/admin/finance/audit`.
 * Source : `normalizeFraudAlertsResponse()` sur GET `/admin/finance/audit/fraud-alerts`.
 */
export interface FinanceFraudAlert {
  id: number
  type: string
  severity: string
  description: string
  studentName?: string
  amount?: number
  createdAt: string
}

/**
 * Contrat backend brut — `FinanceService.detectAndAlertAnomalies`.
 * Le frontend accepte aussi un tableau legacy `FinanceFraudAlert[]`.
 */
export interface FinanceFraudAlertsApiResponse {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | string
  deviance?: number
  benfordValid?: boolean
  reason?: string
  suspicious?: boolean
  anomalies: Array<{
    id?: number
    amount?: number
    method?: string
    createdAt?: string
    audit?: { suspicious?: boolean; deviance?: number }
  }>
}

export type FinanceFraudAlertsRaw = FinanceFraudAlertsApiResponse | FinanceFraudAlert[]

export interface AuditLogEntry {
  id: number
  action: string
  resource: string
  description?: string
  actorEmail?: string
  createdAt: string
  metadata?: Record<string, unknown>
}

export interface TopPayer {
  studentId: number
  studentName: string
  totalPaid: number
  className?: string
  lastPaymentDate?: string
}

export interface ManualPaymentPayload {
  studentId: number
  amount: number
  method: 'CASH' | 'BANK_TRANSFER' | 'MOBILE_MONEY' | 'CHEQUE' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'CARD' | 'BANK'
  note?: string
  reference?: string
  proofType?: PaymentProofType
  manualJustification?: string
  sessionId?: number
  feeStructureId?: number
  monthYear?: string
  fees?: Array<{
    feeStructureId: number
    monthYear?: string
    amount: number
  }>
}

export interface BulkMoratoriumPayload {
  studentIds: number[]
  type: MoratoriumType
  startDate: string
  endDate: string
  reason: string
}

/** @deprecated Legacy endpoint — préférer CreateFeeStructurePayload */
export interface FeeStructurePayload {
  classId?: number
  totalAmount: number
  label: string
  academicSessionId?: number
  categoryId?: number
  dueDate?: string
}

export type FeeBillingPeriod = 'ONE_TIME' | 'ANNUAL' | 'MONTHLY'

export interface FeeCategoryItem {
  id: number
  name: string
  code: string
  description?: string | null
  billingPeriod: FeeBillingPeriod
  dueDayOfMonth?: number | null
  isActive: boolean
}

export interface CreateFeeCategoryPayload {
  name: string
  code: string
  description?: string
  billingPeriod: FeeBillingPeriod
  dueDayOfMonth?: number
}

export interface UpdateFeeCategoryPayload {
  name?: string
  description?: string | null
  billingPeriod?: FeeBillingPeriod
  dueDayOfMonth?: number | null
  displayOrder?: number
  isActive?: boolean
  parentId?: number | null
}

export interface CreateFeeStructurePayload {
  sessionId: number
  categoryId: number
  amount: number
  classId?: number | null
  description?: string
  assignmentMode?: 'AUTOMATIC' | 'EXPLICIT'
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface FeeStructurePreviewDto {
  enrolledCount: number
  billingPeriod: FeeBillingPeriod
  billingMonthCount: number
  unitAmount: number
  yearTotal: number
  currency: string
  scopeKey: string
  scopeLabel: string
  categoryName: string
  className: string | null
  sessionLabel: string
  existing: {
    id: number
    amount: number
    isActive: boolean
    deletedAt: string | null
  } | null
  wouldRestore: boolean
}

export interface UpdateFeeStructurePayload {
  amount?: number
  currency?: string
  description?: string | null
  isActive?: boolean
  assignmentMode?: 'AUTOMATIC' | 'EXPLICIT'
  effectiveFrom?: string | null
  effectiveTo?: string | null
}

export interface LinkOrphanPayload {
  transactionRef: string
  studentId: number
}

export interface AdvancedSearchParams {
  studentId?: number
  classId?: number
  sectionId?: number
  optionId?: number
  /** Texte libre multi-mots : nom, matricule, référence, reçu, téléphone, caissier… */
  search?: string
  method?: string
  status?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  feeCategoryId?: number
  billingPeriod?: string
  monthYear?: string
  currency?: string
  channel?: string
  isFlagged?: boolean
  sortBy?: 'createdAt' | 'amount' | 'status' | 'method'
  sortOrder?: 'asc' | 'desc'
  page?: number
  limit?: number
}

export interface AdvancedSearchPaymentItem {
  id: number
  studentId?: number
  studentName: string
  matricule?: string | null
  className?: string | null
  sectionName?: string | null
  optionName?: string | null
  cashierName?: string | null
  feeLabels?: string[]
  amount: number
  currency?: string
  method: string
  status: string
  reference?: string | null
  receiptNumber?: string | null
  phone?: string | null
  isFlagged?: boolean
  createdAt: string
}

export interface AdvancedSearchResult {
  data: AdvancedSearchPaymentItem[]
  total: number
  page: number
  lastPage: number
  totalAmount?: number
}

export interface MobilePendingItem {
  id: number
  studentName: string
  amount: number
  method?: string
  phone?: string
  operator?: string
  reference?: string
  createdAt: string
}

export interface AdminRefundRequest {
  id: number
  uuid?: string
  paymentId: number
  amount: number
  reason: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'PROCESSING' | 'PROCESSED' | 'FAILED' | 'CANCELLED' | 'SYNCED'
  reviewNotes?: string | null
  reviewedAt?: string | null
  processedAt?: string | null
  createdAt: string
  requestedBy?: { id: number; name: string } | null
  reviewedBy?: { id: number; name: string } | null
  gateway?: {
    provider?: string | null
    refundRef?: string | null
    status?: string | null
    correlationId?: string | null
  } | null
  payment?: {
    reference?: string
    method?: string
    channel?: string
    studentName?: string
    matricule?: string
  }
}

export type StudentSecurityAction = 'BLOCK' | 'UNBLOCK'

export type MoratoriumType = 'MONTHLY' | 'QUARTERLY' | 'EXCEPTIONAL' | 'SCHOLARSHIP_REVIEW'

export interface MoratoriumRecoveryRate {
  schoolId: number
  sessionId: number | null
  sessionLabel: string | null
  recoveryRateGlobal: number
  recoveryRateExcludingMoratorium: number
  totalDebt: number
  recoveredAmount: number
  studentsUnderMoratorium: number
  currency?: string
  computedAt?: string
}

export interface Moratorium {
  id: number
  studentId: number
  enrollmentId?: number
  type: MoratoriumType | string
  startDate: string
  endDate: string
  reason: string
  status: string
  studentName?: string
  student?: { firstName: string; lastName: string }
  grantedByName?: string
  internalNote?: string | null
  createdAt: string
  updatedAt?: string
}

export interface CreateMoratoriumPayload {
  studentId: number
  enrollmentId?: number
  type: MoratoriumType
  startDate: string
  endDate: string
  reason: string
}

export interface MoratoriumPolicy {
  schoolId: number
  maxDays: number
  maxPerYear: number
  allowedTypes: MoratoriumType[]
  defaultNotifyBehavior?: string
  parentRequestEnabled?: boolean
  parentMaxRequestDays?: number
  autoApproveMaxDays?: number
  currency?: string
  source?: 'database' | 'provisioned'
}

/** Corps PATCH /admin/finance/moratoriums/policy (noms alignés backend). */
export interface UpdateMoratoriumPolicyPayload {
  maxMoratoriumDays?: number
  maxMoratoriumsPerYear?: number
  moratoriumBehavior?: 'SKIP' | 'FRIENDLY_TEMPLATE'
  parentRequestEnabled?: boolean
  parentMaxRequestDays?: number
  autoApproveMaxDays?: number
}

// Invitations
export interface ParentInvitationCode {
  id: number
  code: string
  studentId: number
  student?: { firstName: string; lastName: string; matricule?: string }
  expiresAt?: string
  usedAt?: string
  createdAt: string
}

export interface StaffInvitation {
  id: number
  userId?: number | null
  userStatus?: string | null
  email: string
  role: string
  firstName: string
  lastName: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | string
  verificationStep?: 'INVITED' | 'AWAITING_VERIFICATION' | 'COMPLETED' | string
  verificationLabel?: string
  createdAt: string
}

export interface RevokeStaffInvitationPayload {
  invitationId: number
  targetUserId?: number
}

export interface InviteStaffPayload {
  email: string
  phone: string
  role: 'TEACHER' | 'FINANCE' | string
  firstName: string
  lastName: string
  /** Si renseigné (politique 12 car. + spécial), le compte est actif tout de suite. */
  password?: string
}

export interface InvitationStatusSummary {
  parentCodes: ParentInvitationCode[]
  staffInvitations: StaffInvitation[]
}

export interface GenerateParentCodePayload {
  studentId: number
}

// Teachers
export interface TeacherListItem {
  id: number
  userId: number
  firstName?: string
  lastName?: string
  email?: string
  classes?: { id: number; name: string }[]
}

export interface TeacherDashboard {
  teacher: { id: number; firstName?: string; lastName?: string; email?: string }
  classes: { id: number; name: string }[]
  stats: { totalScans: number; present: number; absent: number; late: number }
  recentScans: TeacherScanEntry[]
}

export interface TeacherScanEntry {
  id: number
  studentId?: number
  studentName?: string
  className?: string
  status: string
  method?: string
  scannedAt: string
}

// School Settings — Sprint 1 attendance (GET/PATCH /admin/schools/.../attendance-settings)
export interface AttendanceMethods {
  manual: boolean
  qrCode: boolean
  rfid: boolean
  facialRecognition: boolean
  fingerprint: boolean
}

export interface AttendanceValidationRules {
  requireGPS: boolean
  allowOffline: boolean
  requireLiveness: boolean
  dualQrRequired: boolean
  maxClockSkewMs: number
  enforceSchoolGeofence: boolean
}

export interface SchoolGeofence {
  latitude: number | null
  longitude: number | null
  radiusKm: number
  radiusMeters: number
  configured: boolean
}

export interface AttendanceScheduleSettings {
  startHour: number
  startMinute: number
  endHour: number
  endMinute: number
  lateToleranceMinutes: number
  scanWindowStrict: boolean
  exitScanEnabled: boolean
}

export interface AttendanceNotificationSettings {
  parentPresenceNotificationsEnabled: boolean
  parentDepartureNotificationsEnabled: boolean
}

export interface AttendanceAbsenceSettings {
  autoMarkEnabled: boolean
  cutoffHour: number
  cutoffMinute: number
  timezone: string
}

export interface AttendanceSettings {
  schoolId: number
  source: 'database' | 'legacy'
  methods: AttendanceMethods
  enabledPresenceModes: string[]
  offlineSyncEnabled: boolean
  validationRules: AttendanceValidationRules
  scheduleSettings: AttendanceScheduleSettings
  geofence: SchoolGeofence
  notificationSettings: AttendanceNotificationSettings
  absenceSettings: AttendanceAbsenceSettings
  updatedAt: string | null
}

export type PatchAttendanceSettingsPayload = {
  methods?: Partial<AttendanceMethods>
  offlineSyncEnabled?: boolean
  validationRules?: Partial<AttendanceValidationRules>
  scheduleSettings?: Partial<AttendanceScheduleSettings>
  geofence?: { latitude: number; longitude: number; radiusKm: number }
  notificationSettings?: Partial<AttendanceNotificationSettings>
  absenceSettings?: Partial<AttendanceAbsenceSettings>
}

export interface AttendanceNotificationDelivery {
  id: number
  schoolId: number
  userId: number
  parentId: number | null
  studentId: number
  presenceId: number | null
  correlationId: string
  attendanceEvent: string
  channel: string | null
  status: string
  title: string
  message: string
  failureReason: string | null
  sentAt: string | null
  deliveredAt: string | null
  readAt: string | null
  acknowledgedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AttendanceReadinessChecks {
  settingsProvisioned: boolean
  qrCodeEnabled: boolean
  geofenceConfigured: boolean
  academicSessionOpen: boolean
  dualQrRequired: boolean
  offlineSyncEnabled: boolean
  parentPresenceNotificationsEnabled: boolean
}

export interface AttendanceReadiness {
  schoolId: number
  ready: boolean
  score: number
  checks: AttendanceReadinessChecks
  metricsLastHour?: {
    dualQrValidated: number
    dualQrRejected: number
    syncBatches: number
  }
  recommendations: string[]
}

export interface AttendanceProvisionResult {
  provisioned: boolean
  schoolId: number
  message: string
}

export interface SchoolBranding {
  name: string
  address: string | null
  phone: string | null
  email: string | null
  city: string | null
  logoUrl: string | null
  addressLine: string | null
  slogan: string | null
  devise: string | null
  documentAccentColor: string
  documentAccentColorOverride: string | null
  legalFooter: string | null
  cardTheme?: import('@/lib/student-card/card-theme').SchoolCardTheme | null
  uiTheme?: {
    atmosphere: import('@/lib/theme/preferences').Atmosphere
    appearance?: import('@/lib/theme/preferences').Appearance
    accent?: string
  } | null
}
