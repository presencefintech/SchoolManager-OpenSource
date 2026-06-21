export interface PlatformStats {
  totalSchools: number
  totalStudents: number
  totalRevenue: string
  activeUsers: number
  arpu: string
}

export interface SchoolHealth {
  score: number
  level: 'CRITICAL' | 'STABLE' | 'EXCELLENT'
  label: string
}

export interface School {
  id: number
  name: string
  city: string
  email?: string
  deletedAt: null | string
  _count: {
    students: number
    admins: number
    payments: number
  }
  health: SchoolHealth
}

export interface SchoolAdminUser {
  firstName: string
  lastName: string
  email: string
}

export interface SchoolAdminRecord {
  id: number
  userId: number
  roleName: string
  user: SchoolAdminUser
}

export interface SchoolDetail {
  id: number
  name: string
  city: string
  email?: string
  deletedAt: null | string
  _count: {
    students: number
    classes: number
    payments: number
  }
  admins: SchoolAdminRecord[]
}

export interface SchoolPerformance {
  collected: number
  remaining: number
  efficiency: number
  studentCount: number
  breakEvenThreshold: number
  isHealthy: boolean
}

export interface SchoolPaymentDashboard {
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
  }
  treasury: {
    totalUnpaid: number
    breakEvenRequirement: number
    badDebtEstimate: number
  }
}

export interface AnomalyPayment {
  id: number
  amount: number
  method: string
  audit: { suspicious: boolean; deviance: number }
}

export interface SchoolAnomalies {
  severity: 'HIGH' | 'LOW'
  deviance?: number
  benfordValid?: boolean
  anomalies: AnomalyPayment[]
  reason?: string
}

/* ─── Dashboard global — Monitoring ────────────────────────── */
export interface ReconciliationHealth {
  lastRun: {
    startTime: string
    endTime: string | null
    reconciled: number
    errors: number
  } | null
  metrics: {
    successRate: number
    avgProcessTime: number
    totalErrors: number
  }
}

export interface ProviderStat {
  method: string
  reliabilityRate: number
  volume: number
}

export interface SecurityAlerts {
  count: number
  recent: Array<{
    id: number
    amount: number
    method: string
    createdAt: string
    studentId: number
  }>
}

/* ─── Dashboard global — Anomalies ─────────────────────────── */
export interface AnomalyEvent {
  id: number
  fraudScore: number
  createdAt: string
  presence: {
    student: { firstName: string; lastName: string }
    school: { name: string; city: string }
  } | null
}

export interface AnomalyDashboard {
  count: number
  data: AnomalyEvent[]
}

/* ─── Dashboard global — Mobile Money ──────────────────────── */
export interface PendingPayment {
  id: number
  amount: number
  method: string
  status: string
  createdAt: string
  school: { name: string }
}

export interface FraudRadarItem {
  id: number
  fraudScore: number
  createdAt: string
  payment: {
    amount: number
    method: string
    school: { name: string }
  }
}

/* ─── Dashboard global — Queue ──────────────────────────────── */
export interface QueueStatus {
  waiting: number
  active: number
  completed: number
  failed: number
  delayed: number
  total: number
  redisEnabled: boolean
}

/* ─── Sessions actives ──────────────────────────────────────── */
export interface ActiveSessionItem {
  id: number
  userId: number
  expiresAt: string
  createdAt: string
  user: {
    email: string
    role: string
    firstName: string
    lastName: string
  }
}

/* ─── Audit snapshot ────────────────────────────────────────── */
export interface AuditSnapshotEntry {
  id: number
  action: string
  resource: string
  severity: string
  createdAt: string
  description: string | null
  actor: {
    firstName: string
    lastName: string
    role: string
  } | null
}

/* ─── Stockage Cloudinary ───────────────────────────────────── */
export interface StorageStats {
  total_files: number
  storage_used: string
  bandwidth: string
}

/* ─── Audit trail ───────────────────────────────────────────── */
export interface AuditTrailData {
  count: number
  data: AuditSnapshotEntry[]
}

/* ─── Classes ───────────────────────────────────────────────── */
export interface ClassItem {
  id: number
  name: string
  academicYear: string
  maxStudents: number | null
  isActive: boolean
  isLocked: boolean
  _count: { students: number }
  teacher: {
    user: { firstName: string; lastName: string }
  } | null
}

export interface ClassListData {
  data: ClassItem[]
  meta: { total: number; page: number; limit: number }
}

/* ─── Alertes capacité classes ──────────────────────────────── */
export interface CapacityAlertItem {
  id: number
  name: string
  currentCount: number
  capacity: number
  status: 'FULL' | 'WARNING'
  occupancyRate: number
}

/* ─── Classes — détail ──────────────────────────────────────── */
export interface ClassSetupReport {
  isValid: boolean
  errors: string[]
  completenessScore: number
}

export interface ClassPerformanceStats {
  class: { id: number; name: string }
  metrics: {
    attendanceCount: number
    totalPaid: number
    totalDebt: number
    incompleteProfiles: number
  }
  financial: {
    classId: number
    className: string
    metrics: { studentCount: number; recoveryRate: number; totalDebt: number }
  }
}

export interface ClassAuditEntry {
  id: number
  action: string
  severity?: string
  createdAt: string
  description?: string | null
  user?: { firstName: string; lastName: string } | null
}

export interface ClassExport {
  metadata: { generatedAt: string; className: string; academicYear: string; teacher: string }
  students: Array<{
    id: number
    firstName: string
    lastName: string
    gender: string
    dateOfBirth: string | null
    photoUrl: string | null
  }>
}

export interface TeacherConflicts {
  isOverloaded: boolean
  assignmentCount: number
  assignedClasses: Array<{ id: number; name: string }>
}

export interface RolloverResult {
  status: string
  count: number
}

/* ─── Présence ───────────────────────────────────────────────── */
export interface PresenceLiveFeedItem {
  id: number
  studentId: number
  scannedAt: string
  validated: boolean
  status: string | null
  scanMethod: string | null
  student: {
    firstName: string
    lastName: string
    photoUrl: string | null
    class: { name: string } | null
  }
}

export interface PresenceClassBreakdown {
  id: number
  name: string
  _count: { students: number }
}

export interface PresenceDashboard {
  liveFeed: PresenceLiveFeedItem[]
  stats: { presentCount: number; absentCount: number }
  criticalAbsents: Array<{
    firstName: string
    lastName: string
    class: { name: string } | null
  }>
  classBreakdown: PresenceClassBreakdown[]
}

export interface PresenceRecordResult {
  id: number
  status: string
  studentName: string
  fraudScore: number
}

/* ─── Enrollment ─────────────────────────────────────────────── */
export interface WorkerHealth {
  pending: number
  details: Array<{ status: string; _count: { _all: number } }>
}

export interface FinanceAuditResult {
  total: number
  count: number
  ids: number[]
}

/* ─── Core monitoring ───────────────────────────────────────── */
export interface CoreUser {
  id: number
  firstName: string
  lastName: string
  email: string
  role: string
  createdAt: string
  school: { name: string } | null
}

export interface CoreStudent {
  id: number
  firstName: string
  lastName: string
  matricule: string | null
  status: string
  createdAt: string
  school: { name: string } | null
}

export interface CorePresence {
  id: number
  status: string | null
  createdAt: string
  student: { firstName: string; lastName: string }
  school: { name: string }
}

export interface CoreAuditLog {
  id: number
  action: string
  resource: string | null
  createdAt: string
  actor: { firstName: string; lastName: string; email: string } | null
  school: { name: string } | null
}

export interface CoreListResponse<T> {
  rows: T[]
  total: number
}

export interface FinanceReportDetail {
  id: number
  reference: string
  student: string
  class?: string
  amount: number
  method: string
  confirmedAt: string | null
  agent: string
}

export interface FinanceReport {
  reportId: string
  generatedAt: string
  summary: { CASH: number; MOBILE_MONEY: number; BANK: number; TOTAL: number }
  totalTransactions: number
  details: FinanceReportDetail[]
}

/* ─── Finance BI ─────────────────────────────────────────────── */
export interface FinancePerformance {
  collected: number
  remaining: number
  efficiency: number
  studentCount: number
  breakEvenThreshold: number
  isHealthy: boolean
}

export interface FinanceEfficiencyLevel {
  levelName: string
  studentCount: number
  totalDue: number
  efficiency: number
}

export interface TopPayer {
  id: number
  fullName: string
  score: number
  totalPaid: number
}

export interface FinanceAnomaliesResult {
  severity: 'HIGH' | 'LOW'
  deviance?: number
  benfordValid?: boolean
  reason?: string
  anomalies: Array<{ id: number; amount: number; method: string; audit: { suspicious: boolean; deviance: number } }>
}

export interface EndOfDaySnapshot {
  date: string
  total: number
  count: number
  methods: Array<{ method: string; amount: number; count: number }>
  reconciliation: { status: 'READY_FOR_DEPOSIT' | 'NO_ACTIVITY'; reference: string }
}

export interface FinanceAuditFull {
  meta: { schoolId: number; at: string; risk: 'CRITICAL' | 'LOW' }
  audit: {
    integrity: { count: number; anomalies: unknown[] }
    securityGap: { totalAlerts: number; averageScore: number }
    stats: { benfordSuspect: boolean; fraudAlerts: FinanceAnomaliesResult }
  }
}

/* ─── Students ───────────────────────────────────────────────── */
export interface StudentGlobalStats {
  totalStudents: number
  presentToday: number
  lateToday: number
  totalClasses: number
  attendanceRate: number
  lastUpdate: string
}

export interface StudentListItem {
  id: number
  firstName: string
  lastName: string
  matricule: string | null
  status: string
  biometricStatus: string | null
  isPaymentLocked: boolean
  class: { name: string } | null
  _count: { payments: number; presences: number }
}

export interface StudentListResponse {
  total: number
  page: number
  totalPages: number
  data: StudentListItem[]
}

export interface StudentDebtorItem {
  id: number
  firstName: string
  lastName: string
  matricule: string | null
  feesBalance: number
  class: { name: string } | null
}

export interface StudentStats {
  attendanceRate: number
  totalPaid: number
  remainingDebt: number
  tuitionDebt: number
  isUpToDate: boolean
  currency: string
}

export interface StudentProfile {
  id: number
  firstName: string
  lastName: string
  matricule: string | null
  status: string
  photoUrl: string | null
  gender: string
  birthDate: string | null
  isPaymentLocked: boolean
  biometricStatus: string | null
  school: { name: string; baseCurrency: string } | null
  class: { name: string } | null
}

export interface StudentDashboard {
  profile: StudentProfile
  stats: StudentStats
  history: {
    payments: Array<{ id: number; amount: number; currency: string; createdAt: string }>
    presences: Array<{ id: number; status: string | null; scannedAt: string; scanMethod: string | null }>
    sessions: Array<{ id: number; createdAt: string; session: { year: string } | null }>
    discipline: Array<{ id: number; type: string; createdAt: string }>
  }
}

export interface StudentActivityItem {
  type: 'PRESENCE' | 'PAYMENT' | 'DISCIPLINE'
  date: string
  title: string
  icon: string
}

export interface StudentDossier {
  checks: {
    photo: boolean
    biometrics: boolean
    verified: boolean
    payment: boolean
    documents: boolean
  }
  completionRate: number
  isReady: boolean
}

/* ─── Invitations ───────────────────────────────────────────── */
export interface StaffInvitation {
  id: number
  email: string
  role: string
  status: string
  createdAt: string
  firstName?: string
  lastName?: string
}

export interface ParentInvitation {
  id: number
  code?: string
  studentId: number
  status: string
  createdAt: string
  email?: string
}

export interface SchoolInvitationsStatus {
  staff?: StaffInvitation[]
  parents?: ParentInvitation[]
  pending?: number
  total?: number
}

/* ─── Fees ──────────────────────────────────────────────────── */
export type FeeType = 'TUITION' | 'TRANSPORT' | 'CANTEEN' | 'OTHER'

export interface FeeSchoolStructure {
  id: number
  name: string
  amount: number
  type: FeeType
  levelId: number | null
  createdAt: string
}

export interface FeeCategory {
  id: number
  name: string
  description: string | null
  schoolId: number
  createdAt: string
}

export interface FeeHistoryEntry {
  id: number
  changedAt: string
  previousAmount: number | null
  newAmount: number
  reason: string | null
  changedBy?: string
}

export interface FeeInvoice {
  id: number
  reference?: string
  amount: number
  status: string
  description: string | null
  createdAt: string
  dueDate?: string | null
  student?: { firstName: string; lastName: string } | null
}

export interface BulkApplyResult {
  processed: number
  success: number
  errors: number
}

export interface ReconcileResult {
  enrollmentId: number
  newBalance?: number
  adjustedAmount?: number
  message?: string
}
