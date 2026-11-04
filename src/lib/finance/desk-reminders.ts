export type ReminderChannel = 'whatsapp' | 'sms'

export type DeskReminderFilterRow = {
  studentName: string
  parentName: string | null
  className: string | null
  whatsappUrl: string | null
  smsUrl?: string | null
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
    if (onlyMissingPhone && (row.whatsappUrl || row.smsUrl)) return false
    if (!needle) return true
    return [row.studentName, row.parentName, row.className].some((value) =>
      value?.toLowerCase().includes(needle),
    )
  })
}

/** File d'un clic : l'API si elle est branchée, sinon les liens un par un. */
export function planBulkReminders<T extends { whatsappUrl: string | null }>(
  rows: T[],
  messagingReady: boolean,
): { mode: 'api' | 'queue'; reachable: T[]; missingPhone: T[] } {
  const reachable = rows.filter((row) => Boolean(row.whatsappUrl))
  const missingPhone = rows.filter((row) => !row.whatsappUrl)
  return {
    mode: messagingReady ? 'api' : 'queue',
    reachable,
    missingPhone,
  }
}

export type SelectableReminder = {
  studentId: number
  whatsappUrl: string | null
  smsUrl?: string | null
  preferredChannel?: ReminderChannel | null
}

/** Coche ou décoche toutes les lignes visibles (filtre courant). */
export function toggleVisibleSelection(visibleIds: readonly number[], selected: ReadonlySet<number>): Set<number> {
  const next = new Set(selected)
  const allOn = visibleIds.length > 0 && visibleIds.every((id) => next.has(id))
  if (allOn) {
    for (const id of visibleIds) next.delete(id)
    return next
  }
  for (const id of visibleIds) next.add(id)
  return next
}

export function planSelectedReminders<T extends SelectableReminder>(
  rows: readonly T[],
  selectedIds: ReadonlySet<number>,
  channelOverride: ReadonlyMap<number, ReminderChannel>,
): {
  reachable: Array<{ row: T; channel: ReminderChannel; url: string }>
  missingPhone: T[]
} {
  const reachable: Array<{ row: T; channel: ReminderChannel; url: string }> = []
  const missingPhone: T[] = []
  for (const row of rows) {
    if (!selectedIds.has(row.studentId)) continue
    const preferred = channelOverride.get(row.studentId) ?? row.preferredChannel ?? 'whatsapp'
    const channel: ReminderChannel = preferred === 'sms' ? 'sms' : 'whatsapp'
    const url = channel === 'sms' ? row.smsUrl ?? null : row.whatsappUrl
    if (!url) {
      missingPhone.push(row)
      continue
    }
    reachable.push({ row, channel, url })
  }
  return { reachable, missingPhone }
}
