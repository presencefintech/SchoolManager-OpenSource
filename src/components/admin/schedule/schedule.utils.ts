import type { ClassListItem, ClassPeriodItem } from '@/types/admin'

export const DAY_LABELS: Record<number, string> = {
  1: 'Lundi',
  2: 'Mardi',
  3: 'Mercredi',
  4: 'Jeudi',
  5: 'Vendredi',
  6: 'Samedi',
  7: 'Dimanche',
}

export const WEEKDAYS = [1, 2, 3, 4, 5] as const

export const SUBJECT_PALETTE = [
  { bg: 'bg-sky-50', border: 'border-sky-200', text: 'text-sky-900', bar: 'bg-sky-500' },
  { bg: 'bg-violet-50', border: 'border-violet-200', text: 'text-violet-900', bar: 'bg-violet-500' },
  { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-900', bar: 'bg-amber-500' },
  { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-900', bar: 'bg-emerald-500' },
  { bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-900', bar: 'bg-rose-500' },
  { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-900', bar: 'bg-indigo-500' },
] as const

export function timeToMinutes(value: string): number {
  const [h, m] = value.split(':').map(Number)
  return (h || 0) * 60 + (m || 0)
}

export function periodsOverlap(
  a: { dayOfWeek: number; startMinute: number; endMinute: number },
  b: { dayOfWeek: number; startMinute: number; endMinute: number },
): boolean {
  if (a.dayOfWeek !== b.dayOfWeek) return false
  return a.startMinute < b.endMinute && b.startMinute < a.endMinute
}

export function findTeacherOverlaps(
  periods: ClassPeriodItem[],
  candidate: {
    teacherId: number
    dayOfWeek: number
    start: string
    end: string
    excludeId?: number
  },
): ClassPeriodItem[] {
  const startMinute = timeToMinutes(candidate.start)
  const endMinute = timeToMinutes(candidate.end)
  return periods.filter(
    (p) =>
      p.isActive &&
      p.teacherId === candidate.teacherId &&
      p.id !== candidate.excludeId &&
      periodsOverlap(
        { dayOfWeek: candidate.dayOfWeek, startMinute, endMinute },
        p,
      ),
  )
}

export function detectAllOverlaps(periods: ClassPeriodItem[]): Set<number> {
  const ids = new Set<number>()
  for (let i = 0; i < periods.length; i++) {
    for (let j = i + 1; j < periods.length; j++) {
      const a = periods[i]
      const b = periods[j]
      if (a.teacherId !== b.teacherId) continue
      if (periodsOverlap(a, b)) {
        ids.add(a.id)
        ids.add(b.id)
      }
    }
  }
  return ids
}

export function subjectColor(key: string) {
  let hash = 0
  for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) >>> 0
  return SUBJECT_PALETTE[hash % SUBJECT_PALETTE.length]
}

export type TeacherOption = { id: number; name: string }

/** Options enseignant = Teacher.id (profil), pas User.id */
export function buildTeacherOptions(
  classes: ClassListItem[],
  periods: ClassPeriodItem[],
): TeacherOption[] {
  const map = new Map<number, string>()
  for (const c of classes) {
    if (c.teacherId) {
      map.set(c.teacherId, c.teacherName?.trim() || `Enseignant #${c.teacherId}`)
    }
  }
  for (const p of periods) {
    if (!map.has(p.teacherId)) {
      map.set(p.teacherId, p.teacherName?.trim() || `Enseignant #${p.teacherId}`)
    } else if (p.teacherName?.trim()) {
      map.set(p.teacherId, p.teacherName.trim())
    }
  }
  return Array.from(map.entries())
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
}
