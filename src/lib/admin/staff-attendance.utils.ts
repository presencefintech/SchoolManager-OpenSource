import axios from 'axios'
import type { StaffDayStatus } from '@/types/staff-attendance'

export const STAFF_DAY_STATUS_LABEL: Record<StaffDayStatus, string> = {
  PRESENT: 'Présent',
  LATE: 'En retard',
  ABSENT: 'Absent',
  ON_LEAVE: 'En congé',
  ON_MISSION: 'En mission',
  REST: 'Repos',
  EXPECTED: 'Attendu',
  NOT_EMPLOYED: '—',
}

export const STAFF_DAY_STATUS_STYLE: Record<StaffDayStatus, string> = {
  PRESENT: 'bg-emerald-50 text-emerald-700',
  LATE: 'bg-amber-50 text-amber-800',
  ABSENT: 'bg-red-50 text-red-700',
  ON_LEAVE: 'bg-indigo-50 text-indigo-700',
  ON_MISSION: 'bg-sky-50 text-sky-700',
  REST: 'bg-zinc-100 text-zinc-500',
  EXPECTED: 'bg-zinc-50 text-zinc-400',
  NOT_EMPLOYED: 'bg-zinc-50 text-zinc-300',
}

export const WORKDAY_LABEL: Record<number, string> = {
  1: 'Lun',
  2: 'Mar',
  3: 'Mer',
  4: 'Jeu',
  5: 'Ven',
  6: 'Sam',
  7: 'Dim',
}

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Minutes depuis minuit (ex. 07:30 = 450) → `HH:MM`. */
export function minutesToHHMM(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${pad2(h)}:${pad2(m)}`
}

/** `HH:MM` → minutes depuis minuit ; `null` si mal formé. */
export function hhmmToMinutes(hhmm: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(hhmm.trim())
  if (!match) return null
  const h = Number(match[1])
  const m = Number(match[2])
  if (h < 0 || h > 24 || m < 0 || m > 59) return null
  return h * 60 + m
}

/** Instant ISO UTC → `HH:MM` dans le fuseau du navigateur (celui de l'école, en usage normal). */
export function formatInstantHHMM(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
}

/** `YYYY-MM-DD` → `JJ/MM/AAAA`. */
export function formatDateFr(dateStr: string | null | undefined): string {
  if (!dateStr) return '—'
  const [y, m, d] = dateStr.split('-')
  if (!y || !m || !d) return dateStr
  return `${d}/${m}/${y}`
}

/** Date du jour `YYYY-MM-DD`, jour calendaire local. */
export function todayDateValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

/** Mois courant `YYYY-MM`. */
export function currentMonthValue(): string {
  const d = new Date()
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}`
}

export function isCurrentMonth(month: string): boolean {
  return month === currentMonthValue()
}

export function staffFullName(s: { firstName: string; lastName: string }): string {
  return `${s.firstName} ${s.lastName}`.trim()
}

/**
 * Détail champ par champ d'une erreur 400 (`error.details.validation: [{ field, message }]`).
 * Le message global (`getApiErrorMessage`) reste la source principale ; ceci complète en liste.
 */
export function extractValidationMessages(error: unknown): string[] {
  if (!axios.isAxiosError(error)) return []
  const data = error.response?.data as
    | { error?: { details?: { validation?: { field?: string; message?: string }[] } } }
    | undefined
  const items = data?.error?.details?.validation
  if (!Array.isArray(items)) return []
  return items
    .map((i) => (i.field && i.message ? `${i.field} — ${i.message}` : i.message || i.field || ''))
    .filter(Boolean)
}
