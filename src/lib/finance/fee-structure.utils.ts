export type FeeStructureListItem = {
  id: number
  label: string
  amount: number
  description?: string
  sessionId?: number
  classId?: number
  categoryId?: number
  categoryName?: string
  billingPeriod?: string
  isActive?: boolean
  currency?: string
  assignmentMode?: 'AUTOMATIC' | 'EXPLICIT'
  effectiveFrom?: string | null
  effectiveTo?: string | null
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
  const categoryIdRaw = r.categoryId ?? category?.id
  const categoryId =
    categoryIdRaw != null && Number.isFinite(Number(categoryIdRaw))
      ? Number(categoryIdRaw)
      : undefined
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
    categoryId,
    categoryName,
    billingPeriod:
      typeof category?.billingPeriod === 'string' ? category.billingPeriod : undefined,
    isActive: r.isActive === undefined ? true : Boolean(r.isActive),
    currency: typeof r.currency === 'string' ? r.currency : undefined,
    assignmentMode:
      r.assignmentMode === 'EXPLICIT' || r.assignmentMode === 'AUTOMATIC'
        ? r.assignmentMode
        : undefined,
    effectiveFrom: typeof r.effectiveFrom === 'string' ? r.effectiveFrom : null,
    effectiveTo: typeof r.effectiveTo === 'string' ? r.effectiveTo : null,
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

/** Normalise un libellé libre vers un code UPPER_SNAKE ASCII (aligné backend). */
export function toFeeCategoryCode(raw: string): string {
  return raw
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .slice(0, 48)
}

export function isValidFeeCategoryCode(code: string): boolean {
  return /^[A-Z][A-Z0-9_]{1,47}$/.test(code)
}
