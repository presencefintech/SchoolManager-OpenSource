import { asList, num, numOrNull, rec, str, teacherBlob, teacherGet, teacherPatch, teacherPost } from '@/lib/teacher/api/mobile.api'

/** Cahier d'appel (brouillon → soumis → scellé) et remise des élèves (pickup). */

export type SheetStatus = 'DRAFT' | 'SUBMITTED' | 'SEALED'
export type LineStatus = 'PRESENT' | 'LATE' | 'ABSENT' | 'EXCUSED' | 'UNIFORM_VIOLATION'

export type SheetLine = {
  studentId: number
  studentName: string
  matricule: string
  status: LineStatus
  reasonCode: string
  note: string
}

export type SheetDraft = {
  id: number
  classId: number
  className: string
  sessionDate: string
  status: SheetStatus
  recordingMethod: string | null
  submittedAt: string | null
  sealedAt: string | null
  lines: SheetLine[]
}

const LINE_STATUSES: LineStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'UNIFORM_VIOLATION']

function parseDraft(raw: unknown): SheetDraft {
  const r = rec(raw)
  const status = str(r.status, 'DRAFT').toUpperCase()
  return {
    id: num(r.id),
    classId: num(r.classId),
    className: str(r.className),
    sessionDate: str(r.sessionDate),
    status: status === 'SEALED' ? 'SEALED' : status === 'SUBMITTED' ? 'SUBMITTED' : 'DRAFT',
    recordingMethod: str(r.recordingMethod) || null,
    submittedAt: str(r.submittedAt) || null,
    sealedAt: str(r.sealedAt) || null,
    lines: asList(r.lines).map((l) => {
      const s = str(l.status, 'PRESENT').toUpperCase() as LineStatus
      return {
        studentId: num(l.studentId),
        studentName: str(l.studentName, 'Élève'),
        matricule: str(l.matricule),
        status: LINE_STATUSES.includes(s) ? s : 'PRESENT',
        reasonCode: str(l.reasonCode),
        note: str(l.note),
      }
    }),
  }
}

export type SheetEntryInput = { studentId: number; status: LineStatus; reasonCode?: string; note?: string }

function entriesBody(entries: SheetLine[]): SheetEntryInput[] {
  return entries.map((l) => ({
    studentId: l.studentId,
    status: l.status,
    ...(l.reasonCode.trim() ? { reasonCode: l.reasonCode.trim() } : {}),
    ...(l.note.trim() ? { note: l.note.trim() } : {}),
  }))
}

export const teacherSheetApi = {
  draft: async (classId: number, sessionDate?: string): Promise<SheetDraft> =>
    parseDraft(await teacherGet(`/classes/${classId}/attendance-sheet/draft`, sessionDate ? { sessionDate } : undefined)),

  saveDraft: async (classId: number, lines: SheetLine[], sessionDate?: string): Promise<SheetDraft | null> => {
    const r = await teacherPatch(`/classes/${classId}/attendance-sheet/draft`, {
      ...(sessionDate ? { sessionDate } : {}),
      entries: entriesBody(lines),
    })
    return r && typeof r === 'object' ? parseDraft(r) : null
  },

  submit: async (classId: number, lines: SheetLine[], sessionDate: string) =>
    rec(
      await teacherPost(`/classes/${classId}/attendance-sheet`, {
        sessionDate,
        idempotencyKey: `web-${classId}-${sessionDate}-${Date.now()}`,
        entries: entriesBody(lines),
      }),
    ),

  seal: async (classId: number, sheetId: number) => rec(await teacherPost(`/classes/${classId}/attendance-sheet/${sheetId}/seal`)),

  exportPdf: (classId: number, sheetId: number) => teacherBlob(`/classes/${classId}/attendance-sheet/${sheetId}/export`),
}

export const LINE_STATUS_LABEL: Record<LineStatus, string> = {
  PRESENT: 'Présent',
  LATE: 'Retard',
  ABSENT: 'Absent',
  EXCUSED: 'Excusé',
  UNIFORM_VIOLATION: 'Tenue non conforme',
}

// ───────────────────────────── Remise des élèves ─────────────────────────────

export type PickupChild = {
  id: number
  name: string
  className: string
  status: string | null
  alreadyReleasedToday: boolean
}

export type PickupPreview = {
  adult: { id: number; name: string; photoUrl: string | null; relationship: string | null; phone: string | null }
  children: PickupChild[]
  cardId: number | null
}

function parseChild(c: Record<string, unknown>): PickupChild {
  return {
    id: num(c.id),
    name: str(c.name),
    className: str(c.className),
    status: str(c.status) || null,
    alreadyReleasedToday: c.alreadyReleasedToday === true,
  }
}

export const teacherPickupApi = {
  preview: async (qrPayload: string): Promise<PickupPreview> => {
    const r = rec(await teacherPost('/pickup/preview', { qrPayload }))
    const a = rec(r.adult)
    return {
      adult: {
        id: num(a.id),
        name: str(a.name, 'Adulte autorisé'),
        photoUrl: str(a.photoUrl) || null,
        relationship: str(a.relationship) || null,
        phone: str(a.phone) || null,
      },
      children: asList(r.children).map(parseChild),
      cardId: numOrNull(r.cardId),
    }
  },

  confirm: async (qrPayload: string, studentIds: number[]) => {
    const r = rec(await teacherPost('/pickup/confirm', { qrPayload, studentIds }))
    return {
      releaseId: num(r.releaseId),
      releasedAt: str(r.releasedAt) || null,
      children: asList(r.children).map(parseChild),
    }
  },
}
