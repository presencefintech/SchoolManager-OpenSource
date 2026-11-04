import { apiClient } from '@/lib/api/client'

/**
 * Client API enseignant — miroir de l'app mobile (`/api/v1/mobile/teacher/*`).
 * Les réponses sont enveloppées `{ success, message, data }` ; on dé-enveloppe ici
 * et on lit chaque champ de façon défensive (les routes varient légèrement).
 */
const BASE = '/mobile/teacher'

export type Rec = Record<string, unknown>

export function rec(value: unknown): Rec {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Rec) : {}
}

export function str(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  const t = String(value).trim()
  return t.length ? t : fallback
}

export function num(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : fallback
}

export function numOrNull(value: unknown): number | null {
  if (value == null || value === '') return null
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : null
}

function unwrap<T>(body: unknown): T {
  const r = rec(body)
  if ('data' in r && r.data !== undefined) return r.data as T
  return body as T
}

/** Certaines routes renvoient `[]`, d'autres `{ data: [] }` / `{ items: [] }`. */
export function asList(value: unknown): Rec[] {
  if (Array.isArray(value)) return value.map(rec)
  const r = rec(value)
  for (const key of ['data', 'items', 'results', 'notifications', 'classes', 'students', 'assignments', 'quizzes', 'submissions']) {
    if (Array.isArray(r[key])) return (r[key] as unknown[]).map(rec)
  }
  return []
}

async function get<T = unknown>(path: string, params?: Record<string, unknown>): Promise<T> {
  const res = await apiClient.get(`${BASE}${path}`, { params })
  return unwrap<T>(res.data)
}

async function post<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.post(`${BASE}${path}`, body)
  return unwrap<T>(res.data)
}

async function patch<T = unknown>(path: string, body?: unknown): Promise<T> {
  const res = await apiClient.patch(`${BASE}${path}`, body)
  return unwrap<T>(res.data)
}

async function blob(path: string, params?: Record<string, unknown>): Promise<Blob> {
  const res = await apiClient.get(`${BASE}${path}`, { params, responseType: 'blob' })
  return res.data as Blob
}

export function apiErrorMessage(err: unknown, fallback = 'Une erreur est survenue.'): string {
  const e = err as { response?: { data?: { message?: string } }; message?: string }
  return e?.response?.data?.message || e?.message || fallback
}

// ───────────────────────── Tableau de bord / classes ─────────────────────────

export type ClassSummary = { id: number; name: string; studentCount: number }
export type ScheduleSlot = {
  id: number
  classId: number
  className: string
  dayOfWeek: number
  start: string
  end: string
  level: string | null
  subject: string | null
  room: string | null
}
export type DaySchedule = {
  date: string
  dayOfWeek: number
  slots: ScheduleSlot[]
  hasOverlap: boolean
  nextSlot: ScheduleSlot | null
}
export type TeacherDashboard = {
  stats: { totalClasses: number; totalStudents: number; todaySlots: number }
  classes: ClassSummary[]
  todaySchedule: DaySchedule | null
}

function parseSlot(raw: unknown): ScheduleSlot {
  const r = rec(raw)
  return {
    id: num(r.id),
    classId: num(r.classId),
    className: str(r.className, 'Classe'),
    dayOfWeek: num(r.dayOfWeek),
    start: str(r.start, '--:--'),
    end: str(r.end, '--:--'),
    level: str(r.level) || null,
    subject: str(r.subject) || null,
    room: str(r.room) || null,
  }
}

function parseDay(raw: unknown): DaySchedule {
  const r = rec(raw)
  return {
    date: str(r.date),
    dayOfWeek: num(r.dayOfWeek),
    slots: asList(r.slots).map(parseSlot),
    hasOverlap: r.hasOverlap === true,
    nextSlot: r.nextSlot ? parseSlot(r.nextSlot) : null,
  }
}

function parseClassSummary(raw: unknown): ClassSummary {
  const r = rec(raw)
  return {
    id: num(r.id),
    name: str(r.name, 'Classe'),
    studentCount: num(r.studentCount ?? r.student_count),
  }
}

export type ClassStudent = {
  id: number
  firstName: string
  lastName: string
  matricule: string
  status: 'PRESENT' | 'ABSENT' | 'LATE'
  lastScanAt: string | null
  lastScanMethod: string | null
  isSuspicious: boolean
  fraudScore: number
  fraudReasons: string[]
  photoUrl: string | null
}

function parseStudent(raw: unknown): ClassStudent {
  const r = rec(raw)
  const status = str(r.status).toUpperCase()
  return {
    id: num(r.id),
    firstName: str(r.firstName),
    lastName: str(r.lastName),
    matricule: str(r.matricule),
    status: status === 'LATE' ? 'LATE' : status === 'ABSENT' ? 'ABSENT' : 'PRESENT',
    lastScanAt: str(r.lastScanAt) || null,
    lastScanMethod: str(r.lastScanMethod) || null,
    isSuspicious: r.isSuspicious === true,
    fraudScore: num(r.fraudScore),
    fraudReasons: Array.isArray(r.fraudReasons) ? (r.fraudReasons as unknown[]).map((x) => str(x)) : [],
    photoUrl: str(r.photoUrl) || null,
  }
}

export type ClassStats = {
  studentCount: number | null
  attendanceRate: number | null
  averageGrade: number | null
  presentCount: number | null
  lateCount: number | null
  absentCount: number | null
  incompleteProfiles: number | null
  recoveryRate: number | null
  totalDebt: number | null
}

function parseStats(raw: unknown): ClassStats {
  const r = rec(raw)
  const nested = rec(r.metrics ?? r.indicators)
  const fin = rec(rec(r.financial).metrics)
  const pick = (...vals: unknown[]) => {
    for (const v of vals) {
      const n = numOrNull(v)
      if (n != null) return n
    }
    return null
  }
  return {
    studentCount: pick(r.studentCount, r.effectif, nested.studentCount, fin.studentCount),
    attendanceRate: pick(r.attendanceRate, r.presenceRate, nested.attendanceRate, nested.presenceRate),
    averageGrade: pick(r.averageGrade, r.moyenne, nested.averageGrade, nested.moyenne),
    presentCount: pick(r.presentCount, r.attendanceCount, r.present, nested.presentCount, nested.attendanceCount, nested.present),
    lateCount: pick(r.lateCount, nested.lateCount, nested.late),
    absentCount: pick(r.absentCount, nested.absentCount, nested.absent),
    incompleteProfiles: pick(r.incompleteProfiles, nested.incompleteProfiles),
    recoveryRate: pick(fin.recoveryRate),
    totalDebt: pick(fin.totalDebt),
  }
}

export type ClassContact = {
  studentId: number
  studentName: string
  matricule: string
  emergencyName: string | null
  emergencyPhone: string | null
  parents: Array<{
    id: number
    name: string
    relationship: string | null
    isPrimary: boolean
    phone: string | null
    email: string | null
  }>
}

export type StudentProfile = {
  id: number | null
  fullName: string
  matricule: string | null
  className: string | null
  totalPresences: number | null
  attendanceRate: number | null
  parentContact: string | null
}

export type TeacherNotification = {
  id: number
  title: string
  message: string
  type: string
  isRead: boolean
  createdAt: string | null
  classId: number | null
  studentId: number | null
  assignmentId: number | null
  sheetId: number | null
  className: string | null
}

function parseNotification(raw: unknown): TeacherNotification {
  const r = rec(raw)
  const data = rec(r.data)
  return {
    id: num(r.id),
    title: str(r.title, 'Notification'),
    message: str(r.message),
    type: str(r.type ?? r.notificationType),
    isRead: r.isRead === true,
    createdAt: str(r.createdAt) || null,
    classId: numOrNull(r.classId ?? data.classId),
    studentId: numOrNull(r.studentId ?? data.studentId),
    assignmentId: numOrNull(r.assignmentId ?? data.assignmentId),
    sheetId: numOrNull(r.sheetId ?? data.sheetId),
    className: str(r.className ?? data.className) || null,
  }
}

export type DailyBriefing = {
  sessionDate: string
  sessionDateLabel: string
  teacherName: string
  schoolName: string
  totals: {
    classes: number
    enrolled: number
    present: number
    late: number
    absent: number
    unmarked: number
    sealedSheets: number
    rate: number
  }
  classes: Array<{
    classId: number
    className: string
    enrolled: number
    sheetId: number | null
    sheetStatus: string | null
    present: number
    late: number
    absent: number
    unmarked: number
    rate: number
  }>
  parentNotices: Array<{
    studentId: number
    studentName: string
    className: string | null
    reasonLabel: string
    note: string | null
  }>
  parentSignals: Array<{ kind: string; studentId: number; message: string }>
}

function parseBriefing(raw: unknown): DailyBriefing {
  const r = rec(raw)
  const t = rec(r.totals)
  return {
    sessionDate: str(r.sessionDate),
    sessionDateLabel: str(r.sessionDateLabel),
    teacherName: str(r.teacherName, 'Enseignant'),
    schoolName: str(r.schoolName, 'Établissement'),
    totals: {
      classes: num(t.classes),
      enrolled: num(t.enrolled),
      present: num(t.present),
      late: num(t.late),
      absent: num(t.absent),
      unmarked: num(t.unmarked),
      sealedSheets: num(t.sealedSheets),
      rate: num(t.rate),
    },
    classes: asList(r.classes).map((c) => ({
      classId: num(c.classId),
      className: str(c.className, 'Classe'),
      enrolled: num(c.enrolled),
      sheetId: numOrNull(c.sheetId),
      sheetStatus: str(c.sheetStatus) || null,
      present: num(c.present),
      late: num(c.late),
      absent: num(c.absent),
      unmarked: num(c.unmarked),
      rate: num(c.rate),
    })),
    parentNotices: asList(r.parentNotices).map((n) => ({
      studentId: num(n.studentId),
      studentName: str(n.studentName, 'Élève'),
      className: str(n.className) || null,
      reasonLabel: str(n.reasonLabel, 'Motif parent'),
      note: str(n.note) || null,
    })),
    parentSignals: asList(r.parentSignals).map((s) => ({
      kind: str(s.kind, 'LATE'),
      studentId: num(s.studentId),
      message: str(s.message),
    })),
  }
}

export type AttendanceHistoryItem = {
  id: number
  studentName: string
  className: string | null
  status: string
  at: string | null
  method: string | null
}

export const teacherMobileApi = {
  dashboard: async (): Promise<TeacherDashboard> => {
    const r = rec(await get('/dashboard'))
    const stats = rec(r.stats)
    return {
      stats: {
        totalClasses: num(stats.totalClasses ?? stats.total_classes),
        totalStudents: num(stats.totalStudents ?? stats.total_students),
        todaySlots: num(stats.todaySlots ?? stats.today_slots),
      },
      classes: asList(r.classes).map(parseClassSummary),
      todaySchedule: r.todaySchedule ? parseDay(r.todaySchedule) : null,
    }
  },

  myClasses: async (): Promise<ClassSummary[]> => asList(await get('/my-classes')).map(parseClassSummary),

  classStudents: async (classId: number): Promise<ClassStudent[]> =>
    asList(await get(`/classes/${classId}/students`)).map(parseStudent),

  classStats: async (classId: number): Promise<ClassStats> => parseStats(await get(`/classes/${classId}/stats`)),

  /** Contacts par élève : chaque ligne porte la liste de ses parents (nom, lien, téléphone). */
  classContacts: async (classId: number): Promise<ClassContact[]> => {
    const payload = await get(`/classes/${classId}/contacts`)
    const r = rec(payload)
    return asList(r.contacts ?? payload).map((c) => {
      const emergency = rec(c.emergencyContact)
      return {
        studentId: num(c.studentId),
        studentName: str(c.studentName, 'Élève'),
        matricule: str(c.matricule),
        emergencyName: str(emergency.name) || null,
        emergencyPhone: str(emergency.phone) || null,
        parents: asList(c.parents).map((p) => ({
          id: num(p.parentId ?? p.id),
          name: str(p.name, 'Parent'),
          relationship: str(p.relationship) || null,
          isPrimary: p.isPrimary === true,
          phone: str(p.phone) || null,
          email: str(p.email) || null,
        })),
      }
    })
  },

  classLogistics: async (classId: number): Promise<Rec> => rec(await get(`/classes/${classId}/logistics`)),

  studentProfile: async (studentId: number): Promise<StudentProfile> => {
    const r = rec(await get(`/student/${studentId}/profile`))
    return {
      id: numOrNull(r.id),
      fullName: str(r.fullName) || `${str(r.firstName)} ${str(r.lastName)}`.trim(),
      matricule: str(r.matricule) || null,
      className: str(r.className) || null,
      totalPresences: numOrNull(r.totalPresences),
      attendanceRate: numOrNull(r.attendanceRate),
      parentContact: str(r.parentContact ?? r.guardianPhone) || null,
    }
  },

  /** Emploi du temps : un jour (`date`) ou une plage (`from`/`to`). */
  daySchedule: async (date?: string): Promise<DaySchedule> =>
    parseDay(await get('/schedule', date ? { date } : undefined)),

  scheduleRange: async (from: string, to: string): Promise<{ from: string; to: string; days: DaySchedule[] }> => {
    const r = rec(await get('/schedule', { from, to }))
    return { from: str(r.from, from), to: str(r.to, to), days: asList(r.days).map(parseDay) }
  },

  conflicts: async (academicYear?: string): Promise<Rec> =>
    rec(await get('/classes/my-conflicts', academicYear ? { academicYear } : undefined)),

  notifications: async (): Promise<TeacherNotification[]> =>
    asList(await get('/notifications')).map(parseNotification),

  unreadCount: async (): Promise<number> => {
    const r = rec(await get('/notifications/unread-count'))
    return num(r.count ?? r.unreadCount)
  },

  markNotificationRead: (id: number) => patch(`/notifications/${id}/read`),
  markAllNotificationsRead: () => patch('/notifications/read-all'),

  attendanceHistory: async (params: { classId?: number; status?: string; from?: string; to?: string; page?: number; limit?: number } = {}): Promise<AttendanceHistoryItem[]> =>
    asList(await get('/attendance/history', params)).map((r) => {
      const student = rec(r.student)
      const cls = rec(r.class)
      const studentName =
        str(r.studentName) ||
        [student.lastName, student.postnom, student.firstName].map((x) => str(x)).filter(Boolean).join(' ') ||
        'Élève'
      return {
        id: num(r.id),
        studentName,
        className: str(r.className ?? cls.name) || null,
        status: str(r.status, 'PRESENT'),
        at: str(r.scannedAt ?? r.createdAt ?? r.timestamp) || null,
        method: str(r.scanMethod ?? r.method) || null,
      }
    }),

  dailyBriefing: async (sessionDate?: string): Promise<DailyBriefing> =>
    parseBriefing(await get('/daily-briefing', sessionDate ? { sessionDate } : undefined)),

  dailyBriefingPdf: (sessionDate?: string) => blob('/daily-briefing/pdf', sessionDate ? { sessionDate } : undefined),

  tenantConfig: async (): Promise<Rec> => rec(await get('/control-plane/tenant/config')),
}

export { get as teacherGet, post as teacherPost, patch as teacherPatch, blob as teacherBlob }
