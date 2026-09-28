export type DeskReminderFilterRow = {
  studentName: string
  parentName: string | null
  className: string | null
  whatsappUrl: string | null
}

export function deskReminderShareUrl(digest: string | null | undefined): string | null {
  const text = digest?.trim()
  if (!text) return null
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function formatReminderDay(iso: string | null | undefined): string | null {
  if (!iso) return null
  const [year, month, day] = iso.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
  })
}

export function filterDeskReminderRows<T extends DeskReminderFilterRow>(
  rows: T[],
  query: string,
  onlyMissingPhone: boolean,
): T[] {
  const needle = query.trim().toLowerCase()
  return rows.filter((row) => {
    if (onlyMissingPhone && row.whatsappUrl) return false
    if (!needle) return true
    return [row.studentName, row.parentName, row.className].some((value) =>
      value?.toLowerCase().includes(needle),
    )
  })
}
