import { apiClient } from '@/lib/api/client'

/**
 * Client API parent — miroir de l'app mobile (`/api/v1/mobile/parents/*`).
 * Les réponses sont enveloppées `{ success, message, data }` ; on dé-enveloppe ici.
 */
const BASE = '/mobile/parents'

type Envelope<T> = { success?: boolean; message?: string; data?: T }

function unwrap<T>(body: unknown): T {
  if (body && typeof body === 'object' && 'data' in (body as Envelope<T>)) {
    return (body as Envelope<T>).data as T
  }
  return body as T
}

async function get<T>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get(`${BASE}${path}`, { params })
  return unwrap<T>(res.data)
}

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post(`${BASE}${path}`, body)
  return unwrap<T>(res.data)
}

async function patch<T>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch(`${BASE}${path}`, body)
  return unwrap<T>(res.data)
}

/** Certaines routes renvoient `[]`, d'autres `{ data: [] }` / `{ items: [] }`. */
export function asList<T>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[]
  if (value && typeof value === 'object') {
    const v = value as Record<string, unknown>
    for (const key of ['data', 'items', 'results', 'notifications', 'announcements', 'logs']) {
      if (Array.isArray(v[key])) return v[key] as T[]
    }
  }
  return []
}

// ───────────────────────── Types ─────────────────────────

export interface ParentStudent {
  id: number
  firstName?: string
  lastName?: string
  prenom?: string
  postnom?: string
  fullName?: string
  rdcFullName?: string
  matricule?: string
  photo?: string
  className?: string
  classId?: number
  balance?: number
  paid?: number
  isSecure?: boolean
  attendanceRate?: number
}

export interface DashboardStudent {
  id: number
  name?: string
  firstName?: string
  lastName?: string
  rdcFullName?: string
  photo?: string
  classId?: number
  balance?: number
  debt?: number
  paid?: number
  isUpToDate?: boolean
}

export interface ParentDashboard {
  summary?: {
    totalChildren?: number
    unreadCount?: number
    financials?: { totalDebt?: number; totalPaid?: number; healthScore?: number }
    attendance?: { averageRate?: number; status?: 'GOOD' | 'ATTENTION' | 'NONE' }
  }
  students?: DashboardStudent[]
  insights?: { type?: string; message?: string; studentId?: number }[]
  security?: { status?: 'VERIFIED' | 'ISSUE_DETECTED'; timestamp?: string }
}

export interface ParentNotification {
  id: number | string
  title?: string
  message?: string
  body?: string
  type?: string
  isRead?: boolean
  read?: boolean
  createdAt?: string
  data?: Record<string, unknown>
}

export type PresenceStatus = string

export interface AttendanceEntry {
  id: number
  studentName?: string
  matricule?: string
  className?: string
  sectionName?: string | null
  optionName?: string | null
  scannedAt: string
  /** PRESENT | LATE | ABSENT | EXITED */
  status: PresenceStatus
  /** ARRIVAL | EXIT */
  direction?: 'ARRIVAL' | 'EXIT' | string
  day?: string
  time?: string
  method?: string
  security?: { isSuspicious?: boolean; riskScore?: number; alerts?: string[] }
  location?: { roomName?: string | null }
}

export interface AttendanceQuery {
  page?: number
  limit?: number
  status?: 'PRESENT' | 'LATE' | 'ABSENT'
  /** ISO 8601 */
  from?: string
  to?: string
}

export interface AttendancePage {
  data: AttendanceEntry[]
  pagination?: { total?: number; page?: number; limit?: number; totalPages?: number }
}

export interface FeeStructure {
  id: number
  amount: number
  label: string
  description?: string
  categoryName?: string
  categoryCode?: string
  billingPeriod?: 'ONE_TIME' | 'ANNUAL' | 'MONTHLY' | string
  allowedMonthYear?: string
}

export interface FinanceTransaction {
  id?: string
  amount?: number
  date?: string
  status?: 'PAID' | 'PENDING' | 'REJECTED' | string
  reference?: string
  method?: string
  receiptReady?: boolean
  receiptInProgress?: boolean
}

export interface Moratorium {
  active: boolean
  pendingApproval: boolean
  type?: string
  endDate?: string
  remindersOnHold: boolean
  policy?: {
    parentRequestEnabled?: boolean
    parentMaxRequestDays?: number
    autoApproveMaxDays?: number
    allowedTypes?: string[]
  }
}

export interface StudentFinances {
  summary?: { totalInvoiced?: number; totalPaid?: number; balance?: number; progress?: number }
  currency?: string
  studentName?: string
  isFullyPaid?: boolean
  transactions?: FinanceTransaction[]
  moratorium?: Moratorium
  defaultFeeStructureId?: number
  feeStructures?: FeeStructure[]
}

export interface PaymentMethodOption {
  code?: string
  id?: string
  name?: string
  label?: string
  provider?: string
  gateway?: string
  [key: string]: unknown
}

export interface PaymentMethods {
  methods: Partial<Record<'BANK' | 'MOBILE_MONEY' | 'CARD' | 'AGGREGATOR', PaymentMethodOption[]>>
  banks?: string[]
  mobileMoney?: string[]
  aggregators?: string[]
  cards?: string[]
  total?: number
}

export type PaymentMethodCode = 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'

export interface PaymentIntent {
  paymentIntentId?: string
  status?: 'CREATED' | 'PROCESSING' | 'SUCCEEDED' | 'FAILED' | 'EXPIRED' | 'CANCELLED'
  amount?: number
  currency?: string
  monthYear?: string
  feeStructureId?: number
  expiresAt?: string
  paymentId?: number
  feeLines?: {
    feeStructureId?: number
    categoryName?: string
    monthYear?: string
    amount?: number
    remainingAfter?: number
  }[]
}

export interface PaymentResult {
  paymentId: number
  reference: string
  status: 'PENDING' | 'CONFIRMED' | 'FAILED' | 'RECONCILED' | 'REFUNDED' | 'SUSPICIOUS' | 'CANCELLED'
  provider?: string
  nextStep?: string
  receiptNumber?: string
  receiptUrl?: string
  confirmedAt?: string
  redirectUrl?: string
  serverAmount?: number
  amount?: number
  currency?: string
  method?: string
  student?: { id?: number; name?: string; remainingBalance?: number; isUpToDate?: boolean }
}

export interface StudentPass {
  qrCodeString?: string
  expiresAt?: string
}

export interface SecurityLog {
  id?: number | string
  action?: string
  type?: string
  description?: string
  ipAddress?: string
  device?: string
  createdAt?: string
}

export interface NotificationSettings {
  email?: boolean
  push?: boolean
  sms?: boolean
}

// ───────────────────────── Endpoints ─────────────────────────

export const parentApi = {
  dashboard: () => get<ParentDashboard>('/dashboard'),
  students: () => get<ParentStudent[]>('/students').then(asList<ParentStudent>),
  claimStudent: (code: string) => post<{ studentName?: string }>('/claim-student', { code }),
  preEnroll: (body: Record<string, unknown>) => post<unknown>('/pre-enroll', body),

  notifications: (params: { page?: number; limit?: number; unreadOnly?: boolean } = {}) =>
    get<unknown>('/notifications', params).then(asList<ParentNotification>),
  notificationSettings: (body: NotificationSettings) =>
    patch<unknown>('/settings/notifications', body),
  registerPushToken: (token: string, platform = 'web') =>
    post<unknown>('/notifications/register-token', { token, platform }),
  securityLogs: (params: { page?: number; limit?: number } = {}) =>
    get<unknown>('/security-logs', params).then(asList<SecurityLog>),

  attendance: (studentId: number, params: AttendanceQuery = {}) =>
    get<AttendancePage>(`/students/${studentId}/attendance`, { ...params }),
  pass: (studentId: number) => get<StudentPass>(`/students/${studentId}/pass`),
  clearance: (studentId: number) => get<unknown>(`/students/${studentId}/clearance`),
  classDetails: (classId: number) => get<Record<string, unknown>>(`/classes/${classId}`),
  classLogistics: (classId: number) => get<Record<string, unknown>>(`/classes/${classId}/logistics`),
  classContacts: (classId: number) => get<unknown>(`/classes/${classId}/contacts`),

  finances: (studentId: number) => get<StudentFinances>(`/students/${studentId}/finances`),
  payments: (studentId: number, params: Record<string, unknown> = {}) =>
    get<unknown>(`/students/${studentId}/payments`, params),
  invoices: (studentId: number) => get<unknown>(`/students/${studentId}/invoices`),
  feeStructures: (studentId: number) =>
    get<{ session?: { id?: number; label?: string }; feeStructures?: FeeStructure[]; defaultFeeStructureId?: number }>(
      `/students/${studentId}/fee-structures`,
    ),
  feeSchedule: (studentId: number) =>
    get<{ currency?: string; sessionLabel?: string; lines?: Record<string, unknown>[]; summary?: Record<string, unknown> }>(
      `/students/${studentId}/fee-schedule`,
    ),
  feePeriods: (studentId: number, feeStructureId: number) =>
    get<{ paidMonths?: string[]; unpaidMonths?: string[]; nextDueMonth?: string; allowedMonthYear?: string }>(
      `/students/${studentId}/fee-periods`,
      { feeStructureId },
    ),
  paymentMethods: () => get<PaymentMethods>('/payments/methods'),
  moratorium: (studentId: number) => get<Moratorium>(`/students/${studentId}/moratorium`),
  requestMoratorium: (
    studentId: number,
    body: { requestedDays: number; reason: string; type?: string },
  ) => post<{ autoApproved?: boolean; message?: string }>(`/students/${studentId}/moratorium-request`, body),

  createIntent: (body: {
    studentId: number
    feeStructureId?: number
    monthYear?: string
    idempotencyKey?: string
  }) => post<PaymentIntent>('/finance/intents', body),
  executeIntent: (
    intentId: string,
    body: { method: PaymentMethodCode; gateway: string; phone?: string; idempotencyKey?: string },
  ) => post<PaymentResult>(`/finance/intents/${intentId}/execute`, body),
  payment: (paymentId: number | string) => get<PaymentResult>(`/payments/${paymentId}`),
  /** PDF officiel, ou null si le reçu est encore en cours de génération (réponse JSON PENDING). */
  receiptPdf: async (paymentId: number | string): Promise<Blob | null> => {
    const res = await apiClient.get(`${BASE}/payments/${paymentId}/receipt`, { responseType: 'blob' })
    const type = String(res.headers['content-type'] ?? '')
    return type.includes('application/pdf') ? (res.data as Blob) : null
  },
  uploadProof: (paymentId: number | string, proof: string) =>
    post<unknown>(`/payments/${paymentId}/upload-proof`, { proof }),

  announcements: (params: Record<string, unknown> = { page: 1, limit: 30, sort: 'ranked' }) =>
    get<unknown>('/announcements', params).then(asList<Announcement>),
  announcement: (id: number | string) => get<Announcement>(`/announcements/${id}`),
  acknowledgeAnnouncement: (id: number | string, body: { markRead?: boolean; agree?: boolean }) =>
    patch<unknown>(`/announcements/${id}/acknowledge`, body),

  assignments: (studentId: number) =>
    get<unknown>(`/students/${studentId}/assignments`).then(asList<AssignmentItem>),
  assignment: (studentId: number, id: number | string) =>
    get<AssignmentItem>(`/students/${studentId}/assignments/${id}`),
  quizzes: (studentId: number) =>
    get<unknown>(`/students/${studentId}/quizzes`).then(asList<QuizItem>),
  quiz: (studentId: number, id: number | string) =>
    get<QuizItem>(`/students/${studentId}/quizzes/${id}`),
  /** `answers` : questionId → lettre de l'option choisie (A, B, C…). */
  submitQuiz: (studentId: number, id: number | string, answers: Record<string, string>) =>
    post<Record<string, unknown>>(`/students/${studentId}/quizzes/${id}/submit`, { answers }),
  submitAssignment: (
    studentId: number,
    body: { assignmentId: number; attachmentUrl: string; attachmentKind: string; parentComment?: string },
  ) => post<Record<string, unknown>>(`/students/${studentId}/assignments/submit`, { ...body, studentId, status: 'SUBMITTED' }),
  uploadAssignmentAttachment: async (studentId: number, assignmentId: number | string, file: File) => {
    const form = new FormData()
    form.append('file', file)
    const res = await apiClient.post(`${BASE}/students/${studentId}/assignments/${assignmentId}/upload-attachment`, form)
    return unwrap<{ attachmentUrl?: string; url?: string; attachmentKind?: string }>(res.data)
  },

  aiTutorStatus: (studentId: number) => get<Record<string, unknown>>(`/students/${studentId}/ai-tutor/status`),
  aiTutorSessions: (studentId: number) =>
    get<unknown>(`/students/${studentId}/ai-tutor/sessions`, { page: 1, limit: 20 }).then(asList<AiTutorSession>),
  aiTutorSession: (studentId: number, sessionId: number | string) =>
    get<AiTutorSession>(`/students/${studentId}/ai-tutor/sessions/${sessionId}`),
  aiTutorCreate: (studentId: number, body: Record<string, unknown> = {}) =>
    post<AiTutorSession>(`/students/${studentId}/ai-tutor/sessions`, body),
  aiTutorClose: (studentId: number, sessionId: number | string) =>
    post<unknown>(`/students/${studentId}/ai-tutor/sessions/${sessionId}/close`),
  aiTutorAsk: (studentId: number, sessionId: number | string, question: string) =>
    post<Record<string, unknown>>(`/students/${studentId}/ai-tutor/sessions/${sessionId}/ask`, { question }),

  schoolCircle: () => get<SchoolCircle>('/school-circle'),
  absenceNotice: (studentId: number, body: { reason: string; note?: string }) =>
    post<{ headline?: string }>(`/students/${studentId}/absence-notice`, body),
  lateNotice: (studentId: number) => post<{ headline?: string }>(`/students/${studentId}/late-notice`),
  pickupComing: (studentId: number) => post<{ headline?: string }>(`/students/${studentId}/pickup-coming`),
  addPickupAdult: (
    studentId: number,
    body: { lastName: string; firstName: string; phone: string; relationship: string },
  ) => post<{ headline?: string }>(`/students/${studentId}/pickup-adults`, body),
  revokePickupAdult: (studentId: number, adultId: number) =>
    post<{ headline?: string }>(`/students/${studentId}/pickup-adults/${adultId}/revoke`),
}

export interface Announcement {
  id: number | string
  title?: string
  body?: string
  excerpt?: string
  urgency?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string
  publishedAt?: string
  expiresAt?: string
  isRead?: boolean
  isAgreed?: boolean
  requiresAgreement?: boolean
  needsAction?: boolean
}

/** Nom d'affichage d'un élève (RDC : nom + postnom + prénom). */
export function studentDisplayName(
  s: Partial<Pick<ParentStudent, 'rdcFullName' | 'fullName' | 'lastName' | 'postnom' | 'firstName' | 'prenom'>> & {
    name?: string
  },
): string {
  return (
    s.rdcFullName ||
    s.fullName ||
    s.name ||
    [s.lastName, s.postnom, s.firstName || s.prenom].filter(Boolean).join(' ') ||
    'Élève'
  )
}

export function formatMoney(amount: number | undefined | null, currency = 'USD'): string {
  const n = Number(amount ?? 0)
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency, maximumFractionDigits: 2 }).format(n)
  } catch {
    return `${n.toFixed(2)} ${currency}`
  }
}

export interface AssignmentSubmission {
  status?: string
  grade?: number
  maxGrade?: number
  teacherComment?: string
  parentComment?: string
  submittedAt?: string
  attachmentUrl?: string
}

export interface AssignmentItem {
  id: number
  title?: string
  subject?: string
  description?: string
  dueDate?: string
  status?: string
  teacherName?: string
  attachmentUrl?: string
  submission?: AssignmentSubmission | null
}

export interface QuizQuestion {
  id: number
  text: string
  sortOrder?: number
  options?: Record<string, string> | { key?: string; label?: string; text?: string }[]
}

export interface QuizItem {
  id: number
  title?: string
  description?: string
  dueDate?: string
  status?: string
  questionCount?: number
  teacherName?: string
  questions?: QuizQuestion[]
  submission?: { score?: number; maxScore?: number; percentage?: number; submittedAt?: string } | null
}

export interface AiTutorMessage {
  id: number
  role: 'TUTOR' | 'PARENT' | 'STUDENT' | string
  content: string
  createdAt?: string
}

export interface AiTutorSession {
  id: number
  subject?: string
  messageCount?: number
  closedAt?: string | null
  createdAt?: string
  messages?: AiTutorMessage[]
}

export interface SchoolContact {
  role?: string
  roleLabel?: string
  title?: string
  name?: string
  phone?: string | null
  mobile?: string | null
  email?: string | null
  subject?: string | null
}

export interface PickupAdult {
  id: number
  name?: string
  phone?: string | null
  relationship?: string | null
}

export interface SchoolCircleChild {
  id?: number
  studentId?: number
  name?: string
  fullName?: string
  adults?: PickupAdult[]
  [key: string]: unknown
}

export interface SchoolCircle {
  school?: { name?: string; phone?: string; email?: string; address?: string }
  direction?: SchoolContact[]
  staff?: SchoolContact[]
  children?: SchoolCircleChild[]
  students?: SchoolCircleChild[]
  sos?: { phone?: string; label?: string }
}
