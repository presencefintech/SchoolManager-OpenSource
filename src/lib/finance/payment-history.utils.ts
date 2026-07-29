export type PaymentFeeLine = {
  feeStructureId?: number
  feeLabel: string
  categoryName: string
  categoryCode: string
  billingPeriod: string
  monthYear: string | null
  amount: number
  isMonthly: boolean
}

export type StudentPaymentDetail = {
  id: number
  studentId: number
  studentName: string
  studentFirstName: string
  studentLastName: string
  amount: number
  currency: string
  status: string
  method: string
  methodLabel: string
  channel: string | null
  reference: string
  createdAt: string
  confirmedAt: string | null
  receiptNumber: string | null
  feeSummary: string
  fees: PaymentFeeLine[]
  isMonthlyPayment: boolean
}

export type StudentPaymentsDetailedPage = {
  data: StudentPaymentDetail[]
  total: number
  page: number
  lastPage: number
}

function normalizeFeeLine(row: unknown): PaymentFeeLine | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  return {
    feeStructureId: r.feeStructureId != null ? Number(r.feeStructureId) : undefined,
    feeLabel: String(r.feeLabel ?? 'Frais scolaires'),
    categoryName: String(r.categoryName ?? ''),
    categoryCode: String(r.categoryCode ?? ''),
    billingPeriod: String(r.billingPeriod ?? ''),
    monthYear: (r.monthYear as string | null) ?? null,
    amount: Number(r.amount ?? 0),
    isMonthly: Boolean(r.isMonthly),
  }
}

export function normalizeStudentPaymentDetail(row: unknown): StudentPaymentDetail | null {
  if (!row || typeof row !== 'object') return null
  const r = row as Record<string, unknown>
  const id = Number(r.id)
  if (!Number.isFinite(id) || id <= 0) return null

  const fees = Array.isArray(r.fees)
    ? r.fees.map(normalizeFeeLine).filter((f): f is PaymentFeeLine => f != null)
    : []

  const studentName =
    String(r.studentName ?? '').trim() ||
    [r.studentFirstName, r.studentLastName].filter(Boolean).join(' ').trim() ||
    `Élève #${r.studentId ?? id}`

  return {
    id,
    studentId: Number(r.studentId ?? 0),
    studentName,
    studentFirstName: String(r.studentFirstName ?? ''),
    studentLastName: String(r.studentLastName ?? ''),
    amount: Number(r.amount ?? 0),
    currency: String(r.currency ?? 'USD'),
    status: String(r.status ?? ''),
    method: String(r.method ?? ''),
    methodLabel: String(r.methodLabel ?? r.method ?? ''),
    channel: (r.channel as string | null) ?? null,
    reference: String(r.reference ?? ''),
    createdAt: String(r.createdAt ?? ''),
    confirmedAt: (r.confirmedAt as string | null) ?? null,
    receiptNumber: (r.receiptNumber as string | null) ?? null,
    feeSummary: String(r.feeSummary ?? 'Frais scolaires'),
    fees,
    isMonthlyPayment: Boolean(r.isMonthlyPayment),
  }
}

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  const o = payload as Record<string, unknown>

  // Double enveloppe ApiResponse : { data: { data: [...] } }
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data)) {
    const nested = o.data as Record<string, unknown>
    if (Array.isArray(nested.data)) return nested.data
    if (Array.isArray(nested.items)) return nested.items
    if (Array.isArray(nested.payments)) return nested.payments
    if (Array.isArray(nested.results)) return nested.results
  }

  if (Array.isArray(o.data)) return o.data
  if (Array.isArray(o.items)) return o.items
  if (Array.isArray(o.payments)) return o.payments
  if (Array.isArray(o.results)) return o.results
  return []
}

function extractMeta(payload: unknown, rowCount: number): Pick<StudentPaymentsDetailedPage, 'total' | 'page' | 'lastPage'> {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return { total: rowCount, page: 1, lastPage: 1 }
  }
  let o = payload as Record<string, unknown>
  if (o.data && typeof o.data === 'object' && !Array.isArray(o.data) && 'total' in (o.data as object)) {
    o = o.data as Record<string, unknown>
  }
  const total = Number(o.total ?? rowCount)
  const page = Number(o.page ?? 1)
  const lastPage = Number(o.lastPage ?? Math.max(1, Math.ceil(total / Math.max(rowCount, 1))))
  return {
    total: Number.isFinite(total) ? total : rowCount,
    page: Number.isFinite(page) && page > 0 ? page : 1,
    lastPage: Number.isFinite(lastPage) && lastPage > 0 ? lastPage : 1,
  }
}

/** Accepte `{ data: [...] }`, double enveloppe, ou un tableau brut. */
export function asStudentPaymentsDetailedPage(data: unknown): StudentPaymentsDetailedPage {
  const raw = extractRows(data)
  const rows = raw
    .map(normalizeStudentPaymentDetail)
    .filter((p): p is StudentPaymentDetail => p != null)
  const meta = extractMeta(data, rows.length)

  return {
    data: rows,
    total: meta.total,
    page: meta.page,
    lastPage: meta.lastPage,
  }
}
