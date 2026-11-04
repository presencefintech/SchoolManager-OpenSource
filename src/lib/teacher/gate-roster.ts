import { get, set } from 'idb-keyval'
import { apiClient } from '@/lib/api/client'

const ROSTER_KEY = 'teacher-gate-roster-v1'
/**
 * Re-sync périodique quand on est en ligne (ETag → 304 si inchangé).
 * Hors ligne, le cache IndexedDB reste utilisable plusieurs jours (pas d’éviction logique).
 */
const STALE_AFTER_MS = 12 * 60 * 60 * 1000

export type GateRosterStudent = {
  id: number
  uuid: string
  matricule: string
  barcode: string | null
  firstName: string
  lastName: string
  prenom: string | null
  postnom: string | null
  fullName: string
  classId: number | null
  className: string | null
  photoUrl: string | null
}

export type GateRosterCache = {
  schoolId: number
  syncedAt: string
  count: number
  etag: string
  students: GateRosterStudent[]
}

type RosterIndex = {
  byId: Map<number, GateRosterStudent>
  byMatricule: Map<string, GateRosterStudent>
  byBarcode: Map<string, GateRosterStudent>
  byUuid: Map<string, GateRosterStudent>
}

let memoryIndex: RosterIndex | null = null
let memoryEtag: string | null = null
let syncInFlight: Promise<GateRosterCache | null> | null = null

function buildIndex(students: GateRosterStudent[]): RosterIndex {
  const byId = new Map<number, GateRosterStudent>()
  const byMatricule = new Map<string, GateRosterStudent>()
  const byBarcode = new Map<string, GateRosterStudent>()
  const byUuid = new Map<string, GateRosterStudent>()
  for (const s of students) {
    byId.set(s.id, s)
    if (s.matricule) byMatricule.set(s.matricule.trim().toLowerCase(), s)
    if (s.barcode) byBarcode.set(s.barcode.trim().toLowerCase(), s)
    if (s.uuid) byUuid.set(s.uuid.trim().toLowerCase(), s)
  }
  return { byId, byMatricule, byBarcode, byUuid }
}

function setMemory(cache: GateRosterCache) {
  memoryIndex = buildIndex(cache.students)
  memoryEtag = cache.etag
}

export async function loadGateRosterCache(): Promise<GateRosterCache | null> {
  const cached = (await get<GateRosterCache>(ROSTER_KEY)) ?? null
  if (cached?.students?.length) setMemory(cached)
  return cached
}

export async function getGateRosterMeta(): Promise<{
  count: number
  syncedAt: string | null
  stale: boolean
} | null> {
  const cached = await loadGateRosterCache()
  if (!cached) return null
  const age = Date.now() - new Date(cached.syncedAt).getTime()
  return {
    count: cached.count,
    syncedAt: cached.syncedAt,
    stale: !Number.isFinite(age) || age > STALE_AFTER_MS,
  }
}

/**
 * Parse un payload douchette / QR et résout l’élève dans le cache local.
 */
export function lookupGateRosterStudent(payload: string): GateRosterStudent | null {
  if (!memoryIndex) return null
  const trimmed = payload.trim()
  if (!trimmed) return null

  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed) as Record<string, unknown>
      if (data.kind === 'pickup') return null
      const id = Number(data.studentId)
      if (Number.isInteger(id) && id > 0) {
        const hit = memoryIndex.byId.get(id)
        if (hit) return hit
      }
      const uuidRaw = data.studentUuid ?? data.uuid
      if (typeof uuidRaw === 'string' && uuidRaw.trim()) {
        const hit = memoryIndex.byUuid.get(uuidRaw.trim().toLowerCase())
        if (hit) return hit
      }
      if (typeof data.matricule === 'string' && data.matricule.trim()) {
        const hit = memoryIndex.byMatricule.get(data.matricule.trim().toLowerCase())
        if (hit) return hit
      }
    } catch {
      /* raw badge */
    }
  }

  const key = trimmed.toLowerCase()
  return (
    memoryIndex.byBarcode.get(key) ??
    memoryIndex.byMatricule.get(key) ??
    memoryIndex.byUuid.get(key) ??
    null
  )
}

export async function ensureGateRosterLoaded(): Promise<GateRosterCache | null> {
  if (memoryIndex) {
    return (await get<GateRosterCache>(ROSTER_KEY)) ?? null
  }
  return loadGateRosterCache()
}

/**
 * Synchronise le référentiel depuis l’API (ETag → 304 si inchangé).
 */
export async function syncGateRoster(options?: {
  force?: boolean
}): Promise<GateRosterCache | null> {
  if (typeof window === 'undefined') return null
  if (!navigator.onLine && !options?.force) {
    return loadGateRosterCache()
  }
  if (syncInFlight) return syncInFlight

  syncInFlight = (async () => {
    try {
      const cached = (await get<GateRosterCache>(ROSTER_KEY)) ?? null
      const age = cached ? Date.now() - new Date(cached.syncedAt).getTime() : Infinity
      if (cached && !options?.force && Number.isFinite(age) && age < STALE_AFTER_MS) {
        setMemory(cached)
        return cached
      }

      const headers: Record<string, string> = {}
      if (cached?.etag) headers['If-None-Match'] = cached.etag

      const res = await apiClient.get('/teacher/attendance/gate-roster', {
        headers,
        validateStatus: (s) => (s >= 200 && s < 300) || s === 304,
      })

      if (res.status === 304 && cached) {
        const refreshed = { ...cached, syncedAt: new Date().toISOString() }
        await set(ROSTER_KEY, refreshed)
        setMemory(refreshed)
        return refreshed
      }

      const envelope = res.data as { data?: GateRosterCache; success?: boolean }
      const payload = envelope?.data
      if (!payload?.students) return cached

      await set(ROSTER_KEY, payload)
      setMemory(payload)
      return payload
    } catch {
      return loadGateRosterCache()
    } finally {
      syncInFlight = null
    }
  })()

  return syncInFlight
}

/** Exposé pour tests. */
export function __resetGateRosterMemoryForTests() {
  memoryIndex = null
  memoryEtag = null
  syncInFlight = null
}

export function __getGateRosterMemoryEtagForTests() {
  return memoryEtag
}
