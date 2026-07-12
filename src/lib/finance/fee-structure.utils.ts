export type FeeStructureListItem = {
  id: number
  label: string
  amount: number
  description?: string
  sessionId?: number
  classId?: number
  categoryName?: string
  billingPeriod?: string
  isActive?: boolean
}

export function normalizeFeeStructureListItem(row: unknown): FeeStructureListItem | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const id = Number(r.id)
  if (!Number.isFinite(id) || id <= 0) return null

  const category = r.category as Record<string, unknown> | undefined
  const description = typeof r.description === 'string' ? r.description.trim() : ''
  const categoryName =
    typeof category?.name === 'string' ? category.name.trim() : undefined
  const label =
    description ||
    categoryName ||
    (typeof r.label === 'string' ? r.label.trim() : '') ||
    (typeof r.scopeKey === 'string' ? String(r.scopeKey) : '') ||
    `Barème #${id}`

  return {
    id,
    label,
    amount: Number(r.amount ?? 0),
    description: description || undefined,
    sessionId: r.sessionId != null ? Number(r.sessionId) : undefined,
    classId: r.classId != null ? Number(r.classId) : undefined,
    categoryName,
    billingPeriod:
      typeof category?.billingPeriod === 'string' ? category.billingPeriod : undefined,
    isActive: r.isActive === undefined ? true : Boolean(r.isActive),
  }
}

/** Accepte un tableau brut ou une réponse paginée `{ items: [...] }`. */
export function asFeeStructureList(data: unknown): FeeStructureListItem[] {
  const raw = Array.isArray(data)
    ? data
    : data && typeof data === 'object' && Array.isArray((data as { items?: unknown }).items)
      ? (data as { items: unknown[] }).items
      : []

  return raw
    .map(normalizeFeeStructureListItem)
    .filter((item): item is FeeStructureListItem => item != null)
}
