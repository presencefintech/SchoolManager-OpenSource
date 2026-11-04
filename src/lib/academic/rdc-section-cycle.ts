/**
 * Cycles scolaires RDC : crèche / maternelle / primaire n'ont pas de filière (option).
 * Seul le secondaire (humanités, technique, lycée) exige une option.
 * Détection dynamique par code ou nom — pas de hardcode d'IDs école.
 */

const CYCLE_WITHOUT_OPTION_CODES = new Set([
  'MAT',
  'MATERNELLE',
  'MATER',
  'PRI',
  'PRIM',
  'PRIMAIRE',
  'ELEM',
  'ELEMENTAIRE',
  'PRESCO',
  'PRESCOLAIRE',
  'GARDERIE',
  'CRECHE',
  'FOND',
  'FONDAMENTAL',
  'EP',
  'PREPRI',
  'PREPRIMAIRE',
])

const CYCLE_WITHOUT_OPTION_NAME_RE =
  /maternel|primaire|elementaire|élémentaire|garderie|creche|crèche|préscolaire|prescolaire|jardin\s*d['']enfants|fondamental|pre[- ]?primaire|pré[- ]?primaire|enseignement\s+de\s+base/i

const CYCLE_WITH_OPTION_NAME_RE =
  /secondaire|humanit[eé]s|technique|humanit[eé]|lyc[eé]e|coll[eè]ge/i

export type SectionCycleRef = {
  name?: string | null
  code?: string | null
  requiresOption?: boolean
}

/** NFD + strip combining marks without unicode regex flags (TS target-safe). */
function normalizeSectionCode(raw: string): string {
  const nfd = String(raw).trim().toUpperCase().normalize('NFD')
  let out = ''
  for (let i = 0; i < nfd.length; i += 1) {
    const code = nfd.charCodeAt(i)
    if (code < 0x0300 || code > 0x036f) out += nfd[i]
  }
  return out.replace(/[^A-Z0-9]/g, '')
}

export function isRdcCycleWithoutOption(section: SectionCycleRef | null | undefined): boolean {
  if (!section) return false
  const code = normalizeSectionCode(String(section.code ?? ''))
  if (code && CYCLE_WITHOUT_OPTION_CODES.has(code)) return true

  const name = String(section.name ?? '').trim()
  if (!name) return false
  return CYCLE_WITHOUT_OPTION_NAME_RE.test(name)
}

export function isRdcCycleWithOption(section: SectionCycleRef | null | undefined): boolean {
  if (!section) return false
  const code = normalizeSectionCode(String(section.code ?? ''))
  if (code === 'SEC' || code === 'SECONDAIRE' || code === 'HUM' || code === 'TECH') return true
  return CYCLE_WITH_OPTION_NAME_RE.test(String(section.name ?? ''))
}

/**
 * Option (filière) obligatoire ?
 * - Maternelle / primaire / crèche → jamais
 * - Secondaire / technique / humanités → oui
 * - Autre cycle (ou section non résolue) → non
 * `optionsCount` est ignoré : une option technique « Générale » ne doit pas forcer le champ.
 */
export function sectionRequiresOption(
  section: SectionCycleRef | null | undefined,
  _optionsCount = 0,
): boolean {
  if (typeof section?.requiresOption === 'boolean') return section.requiresOption
  if (isRdcCycleWithoutOption(section)) return false
  return isRdcCycleWithOption(section)
}

export function findSectionById<T extends { id: number | string }>(
  sections: T[],
  id: number | string | null | undefined,
): T | null {
  const n = Number(id)
  if (!Number.isFinite(n) || n <= 0) return null
  return sections.find((s) => Number(s.id) === n) ?? null
}
