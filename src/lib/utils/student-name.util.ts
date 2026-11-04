/**
 * Identité élève RDC — aligné sur backend/src/utils/student-name.util.ts
 *
 * - firstName / lastName : champs legacy (conservés)
 * - prenom / postnom     : précision administrative RDC
 */

export interface StudentIdentityFields {
  firstName?: string | null
  lastName?: string | null
  prenom?: string | null
  postnom?: string | null
}

function titleCasePrenom(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  return trimmed
    .split(/(\s+|-)/)
    .map((part) => {
      if (/^\s+$/.test(part) || part === '-') return part
      const lower = part.toLocaleLowerCase('fr-FR')
      return lower.charAt(0).toLocaleUpperCase('fr-FR') + lower.slice(1)
    })
    .join('')
}

/** Prénom effectif : prenom admin ou repli sur firstName */
export function resolvePrenom(input: StudentIdentityFields): string {
  const admin = (input.prenom ?? '').trim()
  if (admin) return titleCasePrenom(admin)
  const legacy = (input.firstName ?? '').trim()
  return legacy ? titleCasePrenom(legacy) : ''
}

export function resolveNom(input: StudentIdentityFields): string {
  const nom = (input.lastName ?? '').trim()
  return nom ? nom.toUpperCase() : ''
}

/** Affichage legacy UI : firstName lastName uniquement */
export function formatLegacyFullName(input: StudentIdentityFields): string {
  const first = (input.firstName ?? '').trim()
  const last = (input.lastName ?? '').trim()
  return [first, last].filter(Boolean).join(' ')
}

/** Affichage administratif RDC : Nom · Postnom · Prénom */
export function formatRdcFullName(input: StudentIdentityFields): string {
  const nom = resolveNom(input)
  const postnom = (input.postnom ?? '').trim().toUpperCase()
  const prenom = resolvePrenom(input)
  return [nom, postnom, prenom].filter(Boolean).join(' ')
}

/** Affichage UI standard — nom RDC complet (Nom · Postnom · Prénom). */
export function formatStudentFullName(input: StudentIdentityFields): string {
  return formatRdcFullName(input)
}

/** Alias explicite — exports, détail admin, cartes, reçus */
export const formatStudentAdminName = formatRdcFullName

export function formatStudentInitials(input: StudentIdentityFields): string {
  const prenom = resolvePrenom(input)
  const nom = resolveNom(input)
  const initials = `${prenom.charAt(0)}${nom.charAt(0)}`.toUpperCase()
  return initials || '?'
}

export function formatStudentIdentityView(input: StudentIdentityFields) {
  return {
    nom: resolveNom(input),
    postnom: (input.postnom ?? '').trim().toUpperCase() || null,
    prenom: resolvePrenom(input),
    fullName: formatRdcFullName(input),
    legacyFullName: formatLegacyFullName(input),
    initials: formatStudentInitials(input),
  }
}
