/** Identité métier d’une classe — 1ère Mat ≡ 1ère maternelle ≡ 1ère année. */

function foldClassText(raw: string): string {
  const nfd = String(raw ?? '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
  let out = ''
  for (let i = 0; i < nfd.length; i += 1) {
    const code = nfd.charCodeAt(i)
    if (code < 0x0300 || code > 0x036f) out += nfd[i]
  }
  return out.replace(/['’]/g, ' ').replace(/[^a-z0-9]+/g, ' ').trim()
}

function parseClassIdentity(name: string, sectionName?: string | null) {
  let text = foldClassText(name)
    .replace(/\b(premiere|premier)\b/g, '1')
    .replace(/\b(deuxieme|second)\b/g, '2')
    .replace(/\btroisieme\b/g, '3')
    .replace(/\bquatrieme\b/g, '4')
    .replace(/\bcinquieme\b/g, '5')
    .replace(/\bsixieme\b/g, '6')
    .replace(/\bseptieme\b/g, '7')
    .replace(/\bhuitieme\b/g, '8')
    .replace(/\bneuvieme\b/g, '9')
    .replace(/\b(\d{1,2})\s*(ere|eme|e|re)\b/g, '$1')
    .replace(/\b(\d{1,2})(ere|eme|re)\b/g, '$1')

  const foldedSection = foldClassText(sectionName ?? '')
  const cycleFromName = detectCycle(text)
  const cycleFromSection = detectCycle(foldedSection)
  const cycle = cycleFromName || cycleFromSection || 'other'

  text = text
    .replace(
      /\b(maternelle|maternel|mater|mat|primaire|prim|elementaire|elem|prescolaire|creche|garderie|secondaire|humanites|humanite|lycee|college|technique|tech|scientifique|annee|an|classe|niveau|degre)\b/g,
      ' ',
    )
    .replace(/\b(\d+)\s*p\b/g, '$1')
    .replace(/\s+/g, ' ')
    .trim()

  const parts = text.split(' ').filter(Boolean)
  const grade = parts.find((p) => /^\d{1,2}$/.test(p)) ?? ''
  const group = parts.filter((p) => p !== grade).join(' ')
  return { cycle, grade, group }
}

function detectCycle(text: string): string | null {
  if (!text) return null
  if (/\b(maternelle|maternel|mater|mat|prescolaire|creche|garderie)\b/.test(text)) return 'mat'
  if (/\b(primaire|prim|elementaire|elem)\b/.test(text)) return 'prim'
  if (/\b(secondaire|humanite|humanites|lycee|college)\b/.test(text)) return 'sec'
  if (/\b(\d+)\s*p\b/.test(text)) return 'prim'
  return null
}

export function classIdentityKey(name: string, sectionName?: string | null): string {
  const parsed = parseClassIdentity(name, sectionName)
  return `${parsed.cycle}|${parsed.grade}|${parsed.group}`
}

export function dedupeClassList<T extends {
  id: number
  name: string
  studentCount?: number | null
  academicYear?: string | null
  sectionName?: string | null
  section?: { name?: string | null } | null
}>(rows: T[], currentYear?: string | null): T[] {
  const groups = new Map<string, T[]>()
  for (const row of rows) {
    const key = classIdentityKey(row.name, row.sectionName ?? row.section?.name)
    const list = groups.get(key) ?? []
    list.push(row)
    groups.set(key, list)
  }
  return Array.from(groups.values()).map((group) => {
    if (group.length === 1) return group[0]
    return group.slice().sort((a, b) => {
      const studentDelta = (b.studentCount ?? 0) - (a.studentCount ?? 0)
      if (studentDelta !== 0) return studentDelta
      if (currentYear) {
        const aCurrent = a.academicYear === currentYear ? 1 : 0
        const bCurrent = b.academicYear === currentYear ? 1 : 0
        if (bCurrent !== aCurrent) return bCurrent - aCurrent
      }
      return a.id - b.id
    })[0]
  })
}
