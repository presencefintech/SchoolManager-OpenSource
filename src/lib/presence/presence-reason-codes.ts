export type PresenceStatusValue = 'PRESENT' | 'LATE' | 'ABSENT'

import type { PresenceReasonCodeEntry, PresenceReasonGroup } from '@/types/admin'

export type { PresenceReasonGroup }

export const PRESENCE_REASON_GROUP_ORDER: PresenceReasonGroup[] = [
  'LATE',
  'ABSENCE_HEALTH',
  'ABSENCE_AUTHORIZED',
  'ABSENCE_DISCIPLINARY',
  'ABSENCE_UNAUTHORIZED',
  'OTHER',
  'PRESENT',
]

export const PRESENCE_REASON_GROUP_LABELS: Record<PresenceReasonGroup, string> = {
  PRESENT: 'Présence',
  LATE: 'Retard',
  ABSENCE_HEALTH: 'Santé',
  ABSENCE_AUTHORIZED: 'Absence autorisée',
  ABSENCE_DISCIPLINARY: 'Mesure disciplinaire',
  ABSENCE_UNAUTHORIZED: 'Absence non autorisée',
  OTHER: 'Autre',
}

/** Catalogue local — aligné sur GET /admin/presences/reason-codes */
export const PRESENCE_REASON_CATALOG_FALLBACK = [
  { code: 'LATE_BEFORE_REGISTER', labelFr: 'Retard avant fermeture du registre', dfeSymbol: 'L', appliesTo: ['LATE'], group: 'LATE', groupLabelFr: 'Retard', requiresNote: false, sortOrder: 10 },
  { code: 'LATE_AFTER_REGISTER', labelFr: 'Retard après fermeture du registre', dfeSymbol: 'U', appliesTo: ['LATE'], group: 'LATE', groupLabelFr: 'Retard', requiresNote: false, sortOrder: 20 },
  { code: 'ABSENCE_ILLNESS', labelFr: 'Maladie', dfeSymbol: 'I', appliesTo: ['ABSENT'], group: 'ABSENCE_HEALTH', groupLabelFr: 'Santé', requiresNote: false, sortOrder: 30 },
  { code: 'ABSENCE_MEDICAL', labelFr: 'Rendez-vous médical ou dentaire', dfeSymbol: 'M', appliesTo: ['ABSENT'], group: 'ABSENCE_HEALTH', groupLabelFr: 'Santé', requiresNote: false, sortOrder: 40 },
  { code: 'ABSENCE_AUTHORIZED', labelFr: 'Absence autorisée par l\'établissement', dfeSymbol: 'C', appliesTo: ['ABSENT'], group: 'ABSENCE_AUTHORIZED', groupLabelFr: 'Absence autorisée', requiresNote: false, sortOrder: 50 },
  { code: 'ABSENCE_RELIGIOUS', labelFr: 'Observance religieuse', dfeSymbol: 'R', appliesTo: ['ABSENT'], group: 'ABSENCE_AUTHORIZED', groupLabelFr: 'Absence autorisée', requiresNote: false, sortOrder: 60 },
  { code: 'ABSENCE_FAMILY', labelFr: 'Circonstances familiales exceptionnelles', dfeSymbol: 'F', appliesTo: ['ABSENT'], group: 'ABSENCE_AUTHORIZED', groupLabelFr: 'Absence autorisée', requiresNote: false, sortOrder: 70 },
  { code: 'ABSENCE_EDUCATION_OFF_SITE', labelFr: 'Activité éducative hors établissement', dfeSymbol: 'B', appliesTo: ['ABSENT'], group: 'ABSENCE_AUTHORIZED', groupLabelFr: 'Absence autorisée', requiresNote: false, sortOrder: 80 },
  { code: 'ABSENCE_TRANSPORT', labelFr: 'Perturbation des transports', dfeSymbol: 'T', appliesTo: ['ABSENT'], group: 'ABSENCE_AUTHORIZED', groupLabelFr: 'Absence autorisée', requiresNote: false, sortOrder: 90 },
  { code: 'ABSENCE_EXCLUDED', labelFr: 'Exclusion ou suspension', dfeSymbol: 'E', appliesTo: ['ABSENT'], group: 'ABSENCE_DISCIPLINARY', groupLabelFr: 'Mesure disciplinaire', requiresNote: false, sortOrder: 95 },
  { code: 'ABSENCE_HOLIDAY', labelFr: 'Absence vacances non autorisée', dfeSymbol: 'H', appliesTo: ['ABSENT'], group: 'ABSENCE_UNAUTHORIZED', groupLabelFr: 'Absence non autorisée', requiresNote: false, sortOrder: 96 },
  { code: 'ABSENCE_UNAUTHORIZED', labelFr: 'Absence non autorisée', dfeSymbol: 'O', appliesTo: ['ABSENT'], group: 'ABSENCE_UNAUTHORIZED', groupLabelFr: 'Absence non autorisée', requiresNote: false, sortOrder: 97 },
  { code: 'OTHER', labelFr: 'Autre motif', dfeSymbol: null, appliesTo: ['ABSENT', 'LATE'], group: 'OTHER', groupLabelFr: 'Autre', requiresNote: true, sortOrder: 99 },
  { code: 'PRESENT_ON_TIME', labelFr: 'Présent à l\'heure', dfeSymbol: null, appliesTo: ['PRESENT'], group: 'PRESENT', groupLabelFr: 'Présence', requiresNote: false, sortOrder: 100 },
  { code: 'PRESENT_REMOTE', labelFr: 'Enseignement à distance autorisé', dfeSymbol: 'R', appliesTo: ['PRESENT'], group: 'PRESENT', groupLabelFr: 'Présence', requiresNote: false, sortOrder: 110 },
] as const satisfies ReadonlyArray<{
  code: string
  labelFr: string
  dfeSymbol: string | null
  appliesTo: readonly PresenceStatusValue[]
  group: PresenceReasonGroup
  groupLabelFr: string
  requiresNote: boolean
  sortOrder: number
}>

export type PresenceReasonCode = (typeof PRESENCE_REASON_CATALOG_FALLBACK)[number]['code']

export type PresenceReasonCatalogEntry = PresenceReasonCodeEntry

export function formatReasonOptionLabel(entry: Pick<PresenceReasonCatalogEntry, 'labelFr' | 'dfeSymbol'>): string {
  return entry.dfeSymbol ? `${entry.labelFr} (${entry.dfeSymbol})` : entry.labelFr
}

export function listPresenceReasonCatalog(
  catalog?: PresenceReasonCatalogEntry[] | null,
): PresenceReasonCatalogEntry[] {
  const source = catalog?.length ? catalog : [...PRESENCE_REASON_CATALOG_FALLBACK]
  return [...source].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function listPresenceReasonsForStatus(
  status: PresenceStatusValue,
  catalog?: PresenceReasonCatalogEntry[] | null,
) {
  return listPresenceReasonCatalog(catalog).filter((r) =>
    (r.appliesTo as readonly PresenceStatusValue[]).includes(status),
  )
}

export function groupPresenceReasonCatalog(entries: PresenceReasonCatalogEntry[]) {
  const byGroup = new Map<PresenceReasonGroup, PresenceReasonCatalogEntry[]>()
  for (const entry of entries) {
    const list = byGroup.get(entry.group) ?? []
    list.push(entry)
    byGroup.set(entry.group, list)
  }
  return PRESENCE_REASON_GROUP_ORDER.filter((g) => byGroup.has(g)).map((group) => ({
    group,
    labelFr: PRESENCE_REASON_GROUP_LABELS[group],
    items: (byGroup.get(group) ?? []).sort((a, b) => a.sortOrder - b.sortOrder),
  }))
}

export function defaultReasonCodeForStatus(status: PresenceStatusValue): PresenceReasonCode | '' {
  if (status === 'PRESENT') return 'PRESENT_ON_TIME'
  if (status === 'LATE') return 'LATE_BEFORE_REGISTER'
  if (status === 'ABSENT') return 'ABSENCE_UNAUTHORIZED'
  return ''
}

export function reasonRequiresNote(
  code: string | undefined,
  catalog?: PresenceReasonCatalogEntry[] | null,
): boolean {
  return listPresenceReasonCatalog(catalog).some((r) => r.code === code && r.requiresNote)
}

export function validatePresenceReason(
  status: PresenceStatusValue,
  reasonCode?: string,
  note?: string,
  catalog?: PresenceReasonCatalogEntry[] | null,
): string | null {
  if (status === 'PRESENT') return null
  if (!reasonCode) return 'Sélectionnez un motif dans la liste.'
  if (!listPresenceReasonsForStatus(status, catalog).some((r) => r.code === reasonCode)) {
    return 'Ce motif n\'est pas valable pour le statut choisi.'
  }
  if (reasonRequiresNote(reasonCode, catalog) && (!note || note.trim().length < 3)) {
    return 'Décrivez brièvement le motif (3 caractères minimum).'
  }
  return null
}
