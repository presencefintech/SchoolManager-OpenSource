/** Pointage du personnel — contrat `/api/v1/admin/staff-attendance` (voir docs/STAFF_ATTENDANCE_ZKTECO.md côté backend). */

export type StaffDayStatus =
  | 'PRESENT'
  | 'LATE'
  | 'ABSENT'
  | 'ON_LEAVE'
  | 'ON_MISSION'
  | 'REST'
  | 'EXPECTED'
  | 'NOT_EMPLOYED'

export interface StaffDayCorrection {
  mode: 'TIMES' | 'PRESENT'
  reason: string
}

export interface StaffDay {
  date: string
  status: StaffDayStatus
  arrivalAt: string | null
  departureAt: string | null
  lateMinutes: number
  leftEarly: boolean
  punchCount: number
  corrected: boolean
  correction: StaffDayCorrection | null
}

export type StaffDayCounts = Record<StaffDayStatus, number>

export interface StaffDayListItem {
  id: number
  firstName: string
  lastName: string
  jobTitle: string | null
  scheduleName: string | null
  day: StaffDay
}

export interface StaffDayBoard {
  date: string
  counts: StaffDayCounts
  staff: StaffDayListItem[]
}

export interface StaffMonthTotals {
  workedDays: number
  present: number
  late: number
  lateMinutesTotal: number
  absent: number
  onLeave: number
  leftEarly: number
  onMission: number
  correctedDays: number
}

export interface StaffMonth {
  staffMemberId: number
  month: string
  days: StaffDay[]
  totals: StaffMonthTotals
}

export interface StaffReportRow {
  staffMemberId: number
  firstName: string
  lastName: string
  totals: StaffMonthTotals
}

/** Employé pointé (terminal biométrique) — distinct de `StaffMember` (compte de connexion) dans `types/admin.ts`. */
export interface AttendanceStaffMember {
  id: number
  firstName: string
  lastName: string
  jobTitle: string | null
  userId: number | null
  teacherId: number | null
  scheduleId: number | null
  scheduleName?: string | null
  terminalCode: string
  active: boolean
}

export interface AttendanceStaffPayload {
  firstName: string
  lastName: string
  jobTitle?: string
  /** Compte de connexion lié (optionnel) ; `null` explicite pour délier lors d'une modification. */
  userId?: number | null
  teacherId?: number | null
  scheduleId: number
  /** Création uniquement : crée aussi un compte de connexion (rôle Personnel) lié à la fiche. */
  account?: StaffAccountInput
}

export interface StaffAccountInput {
  email: string
  password: string
  role: 'TEACHER' | 'FINANCE' | 'DIRECTOR' | 'IT' | 'MANAGER'
  phone?: string
}

export interface StaffSchedule {
  id: number
  name: string
  startMinute: number
  endMinute: number
  lateToleranceMinutes: number
  workDays: number[]
}

export interface StaffSchedulePayload {
  name: string
  startMinute: number
  endMinute: number
  lateToleranceMinutes?: number
  workDays?: number[]
}

export interface StaffLeave {
  id: number
  staffMemberId: number
  fromDate: string
  toDate: string
  reason: string
}

export interface StaffLeavePayload {
  staffMemberId: number
  fromDate: string
  toDate: string
  reason: string
}

export interface StaffMission {
  id: number
  staffMemberId: number
  fromDate: string
  toDate: string
  purpose: string
}

export interface StaffMissionPayload {
  staffMemberId: number
  fromDate: string
  toDate: string
  purpose: string
}

export interface StaffTerminal {
  id: number
  protocol: string
  serialNumber: string
  name: string
  active: boolean
  lastSeenAt: string | null
  clockDriftSeconds: number | null
  commandsPending: number
  commandsSent: number
  commandsFailed: number
}

export interface StaffTerminalPayload {
  protocol: string
  serialNumber: string
  name: string
}

export interface UnmatchedCode {
  code: string
  terminal: string
  punchCount: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface StaffCorrection {
  id: number
  staffMemberId: number
  date: string
  mode: 'TIMES' | 'PRESENT'
  arrivalTime: string | null
  departureTime: string | null
  reason: string
  authorName: string
  updatedAt: string
}

export interface CorrectionPayload {
  mode: 'TIMES' | 'PRESENT'
  arrivalTime?: string
  departureTime?: string
  reason: string
}

export interface AlertRecipient {
  id: number
  firstName: string
  lastName: string
  role: string
  hasPhone: boolean
  isDefault: boolean
  language: string
}

export type AlertWarningCode = 'ALERT_NEVER_SENT' | 'SEND_TIME_BEFORE_LATE_LIMIT' | 'NO_RECIPIENT'

export interface AlertWarning {
  code: AlertWarningCode
  message: string
  suggestedTime?: string
  scheduleName?: string
  lateLimit?: string
  staffCount?: number
}

export interface AlertSettings {
  enabled: boolean
  sendTime: string
  extraRecipientIds: number[]
  lastProcessedOn: string | null
  recipients: AlertRecipient[]
  warnings: AlertWarning[]
}

export interface AlertSettingsPayload {
  enabled: boolean
  sendTime: string
  extraRecipientIds: number[]
}

/** Pointage brut reçu du terminal — lecture seule, pour diagnostiquer une journée. */
export interface StaffPunch {
  id: number
  punchedAt: string
  verifyMode: string
  terminalName: string
}

export interface StaffImportRowResult {
  index: number
  success: boolean
  member?: AttendanceStaffMember
  error?: string
}

export interface StaffImportResult {
  createdCount: number
  failedCount: number
  results: StaffImportRowResult[]
}
