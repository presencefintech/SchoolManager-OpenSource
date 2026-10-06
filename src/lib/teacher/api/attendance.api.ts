import { apiClient } from '@/lib/api/client'

export type TeacherGateScanResult = {
  studentName: string
  className: string | null
  photoUrl: string | null
  outcome: 'RECORDED' | 'ALREADY_PRESENT' | string
  attendanceStatus: string
  attendanceMessage: string
  financeStatus: string
  financeMessage: string
  financeDisplayed: boolean
  alreadyPresent: boolean
  attendanceLabel: string
}

function asMap(raw: unknown): Record<string, unknown> {
  if (raw && typeof raw === 'object') return raw as Record<string, unknown>
  return {}
}

function text(value: unknown): string | null {
  if (value == null) return null
  const t = String(value).trim()
  return t.length ? t : null
}

function parseGateScan(payload: unknown): TeacherGateScanResult {
  const envelope = asMap(payload)
  if (envelope.success === false) {
    throw new Error(text(envelope.message) ?? 'Pointage refusé.')
  }
  const data = asMap(envelope.data)
  const student = asMap(data.student)
  const attendance = asMap(data.attendance)
  const finance = asMap(data.financialStatus)

  const composed = [student.lastName, student.postnom, student.firstName]
    .map(text)
    .filter(Boolean)
    .join(' ')

  const outcome =
    text(attendance.outcome) ??
    (attendance.alreadyPresent === true || data.isSameDayDuplicate === true
      ? 'ALREADY_PRESENT'
      : 'RECORDED')

  const alreadyPresent = outcome === 'ALREADY_PRESENT'
  const financeDisplayed = finance.displayed !== false
  const alert = text(finance.alertMessage)

  return {
    studentName: composed || text(data.studentName) || 'Élève',
    className: text(student.className),
    photoUrl: text(student.photoUrl),
    outcome,
    attendanceStatus: (text(attendance.status) ?? text(data.status) ?? 'PRESENT').toUpperCase(),
    attendanceMessage: text(attendance.message) ?? text(envelope.message) ?? '',
    financeStatus: (text(finance.status) ?? 'UP_TO_DATE').toUpperCase(),
    // Mention discrète uniquement en alerte (WARNING / CRITICAL).
    financeMessage: financeDisplayed ? alert || '' : '',
    financeDisplayed: financeDisplayed && Boolean(alert),
    alreadyPresent,
    attendanceLabel: alreadyPresent ? 'Déjà présent' : 'Enregistré',
  }
}

function deviceId(): string {
  if (typeof window === 'undefined') return 'web-teacher'
  const key = 'presence.teacher.deviceId'
  let id = localStorage.getItem(key)
  if (!id) {
    id = `web-${crypto.randomUUID()}`
    localStorage.setItem(key, id)
  }
  return id
}

export type GateScanBatchItemResult = {
  ok: boolean
  clientScanId?: string
  data?: TeacherGateScanResult
  error?: string
}

export type GateScanBatchSummary = {
  total: number
  succeeded: number
  failed: number
  items: GateScanBatchItemResult[]
}

export const teacherAttendanceApi = {
  /** POST /api/v1/teacher/attendance/scan */
  scan: async (qrPayload: string): Promise<TeacherGateScanResult> => {
    const { data } = await apiClient.post('/teacher/attendance/scan', {
      qrPayload,
      scanData: qrPayload,
      deviceId: deviceId(),
    })
    return parseGateScan(data)
  },

  /** POST /api/v1/teacher/attendance/scan/batch */
  scanBatch: async (
    items: Array<{
      qrPayload: string
      scanData?: string
      clientScanId?: string
      deviceId?: string
      gpsLat?: number
      gpsLng?: number
      gpsAccuracy?: number
    }>,
    concurrency = 8,
  ): Promise<GateScanBatchSummary> => {
    const { data } = await apiClient.post('/teacher/attendance/scan/batch', {
      items,
      deviceId: deviceId(),
      concurrency,
    })
    const envelope = asMap(data)
    const body = asMap(envelope.data ?? data)
    const rawItems = Array.isArray(body.items) ? body.items : []
    return {
      total: Number(body.total ?? rawItems.length) || rawItems.length,
      succeeded: Number(body.succeeded ?? 0) || 0,
      failed: Number(body.failed ?? 0) || 0,
      items: rawItems.map((entry) => {
        const row = asMap(entry)
        return {
          ok: row.ok === true,
          clientScanId: text(row.clientScanId) ?? undefined,
          data: row.data ? parseGateScan({ success: true, data: row.data }) : undefined,
          error: text(row.error) ?? undefined,
        }
      }),
    }
  },

  /** POST /api/v1/teacher/attendance/manual */
  manual: async (body: {
    matricule?: string
    name?: string
    classId?: number
  }): Promise<TeacherGateScanResult> => {
    const { data } = await apiClient.post('/teacher/attendance/manual', {
      ...body,
      deviceId: deviceId(),
    })
    return parseGateScan(data)
  },

  /** GET /api/v1/teacher/attendance/gate-roster */
  gateRoster: async (etag?: string) => {
    const { data, status, headers } = await apiClient.get('/teacher/attendance/gate-roster', {
      headers: etag ? { 'If-None-Match': etag } : undefined,
      validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
    })
    return { status, data, etag: headers?.etag as string | undefined }
  },
}
