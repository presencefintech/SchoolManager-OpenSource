import { del, get, set } from 'idb-keyval'
import { teacherAttendanceApi, type TeacherGateScanResult } from '@/lib/teacher/api/attendance.api'
import {
  ensureGateRosterLoaded,
  lookupGateRosterStudent,
} from '@/lib/teacher/gate-roster'

const IDB_KEY = 'teacher-gate-scan-queue-v1'

export type GateScanQueueItem = {
  id: string
  qrPayload: string
  deviceId: string
  scannedAt: string
  localLabel: string
  gpsLat?: number
  gpsLng?: number
  gpsAccuracy?: number
}

function localLabel(payload: string): string {
  const fromRoster = lookupGateRosterStudent(payload)
  if (fromRoster?.fullName) return fromRoster.fullName
  const trimmed = payload.trim()
  try {
    const parsed = JSON.parse(trimmed) as { matricule?: string; studentId?: number }
    if (parsed?.matricule) return String(parsed.matricule)
    if (parsed?.studentId) return `Élève #${parsed.studentId}`
  } catch {
    /* raw badge */
  }
  return trimmed.length <= 24 ? trimmed : `${trimmed.slice(0, 20)}…`
}

async function deviceId(): Promise<string> {
  if (typeof window === 'undefined') return 'web-teacher'
  const key = 'presence.teacher.deviceId'
  let id = localStorage.getItem(key)
  if (!id) {
    id = `web-${crypto.randomUUID()}`
    localStorage.setItem(key, id)
  }
  return id
}

export async function loadGateScanQueue(): Promise<GateScanQueueItem[]> {
  return (await get<GateScanQueueItem[]>(IDB_KEY)) ?? []
}

async function saveGateScanQueue(items: GateScanQueueItem[]): Promise<void> {
  await set(IDB_KEY, items)
}

export async function clearGateScanQueue(): Promise<void> {
  await del(IDB_KEY)
}

export async function enqueueGateScan(payload: string): Promise<{
  item: GateScanQueueItem
  optimistic: TeacherGateScanResult
}> {
  const trimmed = payload.trim()
  if (!trimmed) throw new Error('Badge vide.')

  await ensureGateRosterLoaded()
  const rosterHit = lookupGateRosterStudent(trimmed)

  const id = crypto.randomUUID()
  const label = rosterHit?.fullName ?? localLabel(trimmed)
  const item: GateScanQueueItem = {
    id,
    qrPayload: trimmed,
    deviceId: await deviceId(),
    scannedAt: new Date().toISOString(),
    localLabel: label,
  }

  const queue = await loadGateScanQueue()
  queue.push(item)
  await saveGateScanQueue(queue)

  const optimistic: TeacherGateScanResult = {
    studentName: label,
    className: rosterHit?.className ?? null,
    photoUrl: rosterHit?.photoUrl ?? null,
    outcome: 'RECORDED',
    attendanceStatus: 'PRESENT',
    attendanceMessage: navigator.onLine
      ? 'Badge accepté — synchronisation…'
      : 'Enregistré hors ligne — sync dès reconnexion',
    financeStatus: 'UP_TO_DATE',
    financeMessage: '',
    financeDisplayed: false,
    alreadyPresent: false,
    attendanceLabel: 'Enregistré',
    balanceFormatted: null,
    unpaidMonths: [],
  }

  return { item, optimistic }
}

let flushing = false
let flushAgain = false

export async function flushGateScanQueue(): Promise<{
  succeeded: number
  failed: number
  last?: TeacherGateScanResult
}> {
  if (flushing) {
    flushAgain = true
    return { succeeded: 0, failed: 0 }
  }

  flushing = true
  let succeeded = 0
  let failed = 0
  let last: TeacherGateScanResult | undefined

  try {
    let pending = await loadGateScanQueue()
    while (pending.length > 0) {
      const chunk = pending.slice(0, 50)
      const summary = await teacherAttendanceApi.scanBatch(
        chunk.map((item) => ({
          clientScanId: item.id,
          qrPayload: item.qrPayload,
          scanData: item.qrPayload,
          deviceId: item.deviceId,
        })),
      )

      const removeIds = new Set<string>()
      for (const row of summary.items) {
        if (!row.clientScanId) continue
        if (row.ok || row.error) {
          removeIds.add(row.clientScanId)
          if (row.ok) {
            succeeded += 1
            if (row.data) last = row.data
          } else {
            failed += 1
          }
        }
      }

      if (removeIds.size === 0) {
        for (const item of chunk) removeIds.add(item.id)
      }

      pending = pending.filter((item) => !removeIds.has(item.id))
      await saveGateScanQueue(pending)
    }
  } finally {
    flushing = false
    if (flushAgain) {
      flushAgain = false
      void flushGateScanQueue()
    }
  }

  return { succeeded, failed, last }
}
