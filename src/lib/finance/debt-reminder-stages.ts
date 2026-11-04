import type { DebtReminderTone } from '@/types/finance'

/**
 * Aperçu du calendrier de relance, aligné sur `debt-reminder-schedule.ts` côté backend :
 * négatif = avant l'échéance (amical), premier jour ≥ 0 neutre, dernier jour = dernier avis, le reste ferme.
 */

export const OFFSET_MIN = -30
export const OFFSET_MAX = 120
export const MAX_OFFSETS = 10

export const TONE_LABEL: Record<DebtReminderTone, string> = {
  pre: 'Rappel amical',
  due: 'À l’échéance',
  firm: 'Ferme',
  final: 'Dernier avis',
}

export function normalizeOffsets(offsets: number[]): number[] {
  return [...new Set(offsets.map((value) => Math.trunc(value)))].sort((a, b) => a - b)
}

/** « -3, 1 7;15 » → [-3, 1, 7, 15] ; ignore ce qui sort des bornes. */
export function parseOffsets(input: string): number[] {
  const values = input
    .split(/[,;\s]+/)
    .filter(Boolean)
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= OFFSET_MIN && n <= OFFSET_MAX)
  return normalizeOffsets(values).slice(0, MAX_OFFSETS)
}

export function describeStages(offsets: number[]): { offset: number; tone: DebtReminderTone }[] {
  const sorted = normalizeOffsets(offsets)
  const after = sorted.filter((value) => value >= 0)
  return sorted.map((offset) => {
    if (offset < 0) return { offset, tone: 'pre' }
    if (offset === after[after.length - 1]) return { offset, tone: 'final' }
    if (offset === after[0]) return { offset, tone: 'due' }
    return { offset, tone: 'firm' }
  })
}

export function offsetLabel(offset: number): string {
  return offset < 0 ? `J${offset}` : `J+${offset}`
}

/** Clé de journal « J+7#R2@2026-11-05 » → « J+7 (2ᵉ répétition) · échéance 05/11/2026 ». */
export function formatCampaignKey(key: string): string {
  const match = /^(J[+-]\d+)(?:#R(\d+))?@(\d{4})-(\d{2})-(\d{2})$/.exec(key)
  if (!match) return key === 'manual' ? 'Envoi manuel' : key
  const [, step, repeat, year, month, day] = match
  const repeatLabel = repeat ? ` (répétition ${repeat})` : ''
  return `${step}${repeatLabel} · échéance ${day}/${month}/${year}`
}
