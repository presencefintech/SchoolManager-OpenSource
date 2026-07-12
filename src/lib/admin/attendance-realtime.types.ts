/** Payload socket `attendance.statistics.updated` — aligné backend. */
export interface AttendanceStatisticsUpdatedPayload {
  event: 'attendance.statistics.updated'
  schoolId: number
  /** Présents + retards combinés côté publisher. */
  present: number
  absent: number
  late: number
  attendancePercentage: number
  updatedAt: string
}

/** Payload socket `attendance.activity` / `attendance.recorded`. */
export interface AttendanceActivityPayload {
  event: 'attendance.activity' | 'attendance.recorded'
  schoolId: number
  presenceId: number
  studentName: string
  method: string
  status: string
  scannedAt: string
  classId?: number | null
  studentId?: number
}

export function parseAttendanceStatisticsUpdated(
  raw: unknown,
): AttendanceStatisticsUpdatedPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const schoolId = Number(p.schoolId)
  const present = Number(p.present)
  const absent = Number(p.absent)
  const late = Number(p.late)
  const attendancePercentage = Number(p.attendancePercentage)
  if (
    !Number.isFinite(schoolId) ||
    !Number.isFinite(present) ||
    !Number.isFinite(absent) ||
    !Number.isFinite(late) ||
    !Number.isFinite(attendancePercentage)
  ) {
    return null
  }
  return {
    event: 'attendance.statistics.updated',
    schoolId,
    present,
    absent,
    late,
    attendancePercentage,
    updatedAt: typeof p.updatedAt === 'string' ? p.updatedAt : new Date().toISOString(),
  }
}

export function parseAttendanceActivity(raw: unknown): AttendanceActivityPayload | null {
  if (!raw || typeof raw !== 'object') return null
  const p = raw as Record<string, unknown>
  const schoolId = Number(p.schoolId)
  const presenceId = Number(p.presenceId)
  if (!Number.isFinite(schoolId) || !Number.isFinite(presenceId)) return null
  const studentName = typeof p.studentName === 'string' ? p.studentName : `Élève #${presenceId}`
  const method = typeof p.method === 'string' ? p.method : 'UNKNOWN'
  const status = typeof p.status === 'string' ? p.status : 'UNKNOWN'
  const scannedAt = typeof p.scannedAt === 'string' ? p.scannedAt : new Date().toISOString()
  const event =
    p.event === 'attendance.recorded' ? 'attendance.recorded' : 'attendance.activity'
  return {
    event,
    schoolId,
    presenceId,
    studentName,
    method,
    status,
    scannedAt,
    classId: p.classId != null ? Number(p.classId) : null,
    studentId: p.studentId != null ? Number(p.studentId) : undefined,
  }
}

export function activityToItem(payload: AttendanceActivityPayload) {
  return {
    id: `${payload.presenceId}-${payload.scannedAt}`,
    presenceId: payload.presenceId,
    studentName: payload.studentName,
    method: payload.method,
    status: payload.status,
    scannedAt: payload.scannedAt,
  }
}
