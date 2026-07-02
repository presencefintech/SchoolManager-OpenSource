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
  security: { alerts: number; blockedIPs: number }
  integrity: { errors: number }
  workers: { active: number; failed: number }
}

// Staff
export interface StaffMember {
  id: number
  firstName: string | null
  lastName: string | null
  email: string | null
  phone: string | null
  role: string
  status: string
  createdAt: string
  lastLogin: string | null
}

export interface CreateStaffPayload {
  firstName: string
  lastName: string
  email: string
  password: string
  role: 'TEACHER' | 'FINANCE'
  phone?: string
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
  enrollments?: SessionEnrollment[]
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
  matricule?: string
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
  gender: 'M' | 'F' | 'MALE' | 'FEMALE'
  birthDate: string
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
  paymentNotes?: string
  emergencyContactName?: string
  emergencyContactPhone?: string
  bloodGroup?: string
  allergies?: string
  medicalNotes?: string
  nfcTagId?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Presences
export interface PresenceLiveFeedEntry {
  id: number
  studentId?: number
  sessionId?: number | null
  enrollmentId?: number | null
  studentName: string
  matricule?: string
  className: string
  scannedAt: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
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

export interface SessionQR {
  qrCode: string
  expiresAt: number
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

export interface SectionRef {
  id: number
  name: string
  code?: string | null
  schoolId?: number
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
  optionId: number
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
export interface FinanceKpi {
  totalRevenue: number
  totalPaid: number
  totalDue: number
  collectionRate: number
  pendingPayments: number
  fraudAlerts: number
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

export interface FinanceFraudAlert {
  id: number
  type: string
  severity: string
  description: string
  studentName?: string
  amount?: number
  createdAt: string
}

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
}

export interface BulkMoratoriumPayload {
  studentIds: number[]
  type: MoratoriumType
  startDate: string
  endDate: string
  reason: string
}

export interface FeeStructurePayload {
  classId?: number
  totalAmount: number
  label: string
  academicSessionId?: number
  categoryId?: number
  dueDate?: string
}

export interface LinkOrphanPayload {
  transactionRef: string
  studentId: number
}

export interface AdvancedSearchParams {
  studentId?: number
  classId?: number
  method?: string
  status?: string
  startDate?: string
  endDate?: string
  minAmount?: number
  maxAmount?: number
  page?: number
  limit?: number
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
  email: string
  role: string
  firstName: string
  lastName: string
  status: 'PENDING' | 'ACCEPTED' | 'REVOKED' | string
  createdAt: string
}

export interface InvitationStatusSummary {
  parentCodes: ParentInvitationCode[]
  staffInvitations: StaffInvitation[]
}

export interface GenerateParentCodePayload {
  studentId: number
}

export interface InviteStaffPayload {
  email: string
  role: 'TEACHER' | 'FINANCE' | string
  firstName: string
  lastName: string
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

// School Settings
export interface AttendanceSettings {
  startHour: number
  startMinute: number
  gracePeriod: number
  lateThreshold?: number
  absentThreshold?: number
  [key: string]: unknown
}
