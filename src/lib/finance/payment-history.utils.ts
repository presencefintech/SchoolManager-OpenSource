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

  return {
    id,
    studentId: Number(r.studentId ?? 0),
    studentName: String(r.studentName ?? ''),
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

/** Accepte `{ data: [...] }` ou un tableau brut. */
export function asStudentPaymentsDetailedPage(data: unknown): StudentPaymentsDetailedPage {
  if (Array.isArray(data)) {
    return {
      data: data
        .map(normalizeStudentPaymentDetail)
        .filter((p): p is StudentPaymentDetail => p != null),
      total: data.length,
      page: 1,
      lastPage: 1,
    }
  }

  if (!data || typeof data !== 'object') {
    return { data: [], total: 0, page: 1, lastPage: 1 }
  }

  const page = data as Record<string, unknown>
  const raw = Array.isArray(page.data) ? page.data : []

  return {
    data: raw
      .map(normalizeStudentPaymentDetail)
      .filter((p): p is StudentPaymentDetail => p != null),
    total: Number(page.total ?? raw.length),
    page: Number(page.page ?? 1),
    lastPage: Number(page.lastPage ?? 1),
  }
}
