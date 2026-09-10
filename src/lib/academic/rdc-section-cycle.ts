/**
 * Cycles scolaires RDC : maternelle / primaire n'ont pas de filière (option).
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
]);

const CYCLE_WITHOUT_OPTION_NAME_RE =
  /maternel|primaire|elementaire|élémentaire|garderie|creche|crèche|préscolaire|prescolaire|jardin\s*d['']enfants/i;

const CYCLE_WITH_OPTION_NAME_RE =
  /secondaire|humanit[eé]s|technique|humanit[eé]|lyc[eé]e|coll[eè]ge/i;

export type SectionCycleRef = {
  name?: string | null;
  code?: string | null;
};

/** NFD + strip combining marks without unicode regex flags (TS target-safe). */
function normalizeSectionCode(raw: string): string {
  const nfd = String(raw).trim().toUpperCase().normalize('NFD');
  let out = '';
  for (let i = 0; i < nfd.length; i += 1) {
    const code = nfd.charCodeAt(i);
    if (code < 0x0300 || code > 0x036f) out += nfd[i];
  }
  return out;
}

export function isRdcCycleWithoutOption(section: SectionCycleRef | null | undefined): boolean {
  if (!section) return false;
  const code = normalizeSectionCode(String(section.code ?? ''));
  if (code && CYCLE_WITHOUT_OPTION_CODES.has(code)) return true;

  const name = String(section.name ?? '').trim();
  if (!name) return false;
  return CYCLE_WITHOUT_OPTION_NAME_RE.test(name);
}

/**
 * Option (filière) obligatoire ?
 * - Maternelle / primaire → jamais
 * - Secondaire / technique → oui
 * - Autre cycle → oui seulement s'il existe déjà des options
 */
export function sectionRequiresOption(
  section: SectionCycleRef | null | undefined,
  optionsCount = 0,
): boolean {
  if (isRdcCycleWithoutOption(section)) return false;
  if (CYCLE_WITH_OPTION_NAME_RE.test(String(section?.name ?? ''))) return true;
  return optionsCount > 0;
}
