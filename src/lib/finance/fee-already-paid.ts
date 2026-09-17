import axios from 'axios'

export type FeeAlreadyPaidDetails = {
  studentId: number
  feeStructureId: number
  monthYear: string | null
  categoryName: string | null
  paidAt: string | null
  paymentId: number | null
  reference: string | null
  cashDesk: { id: number; name: string } | null
  cashier: { id: number; name: string } | null
}

const ALREADY_PAID_CODES = new Set([
  'FEE_ALREADY_PAID',
  'FEE_ANNUAL_ALREADY_PAID',
  'FEE_ONE_TIME_ALREADY_PAID',
])

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : null
}

function parseDesk(raw: unknown): FeeAlreadyPaidDetails['cashDesk'] {
  const o = asRecord(raw)
  if (!o) return null
  const id = Number(o.id)
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!Number.isInteger(id) || id <= 0 || !name) return null
  return { id, name }
}

function parseCashier(raw: unknown): FeeAlreadyPaidDetails['cashier'] {
  const o = asRecord(raw)
  if (!o) return null
  const id = Number(o.id)
  const name = typeof o.name === 'string' ? o.name.trim() : ''
  if (!Number.isInteger(id) || id <= 0 || !name) return null
  return { id, name }
}

export function parseFeeAlreadyPaidDetails(raw: unknown): FeeAlreadyPaidDetails | null {
  const o = asRecord(raw)
  if (!o) return null
  const studentId = Number(o.studentId)
  const feeStructureId = Number(o.feeStructureId)
  if (!Number.isInteger(studentId) || studentId <= 0) return null
  if (!Number.isInteger(feeStructureId) || feeStructureId <= 0) return null
  return {
    studentId,
    feeStructureId,
    monthYear: typeof o.monthYear === 'string' ? o.monthYear : null,
    categoryName: typeof o.categoryName === 'string' ? o.categoryName : null,
    paidAt: typeof o.paidAt === 'string' ? o.paidAt : null,
    paymentId: o.paymentId != null && Number.isFinite(Number(o.paymentId)) ? Number(o.paymentId) : null,
    reference: typeof o.reference === 'string' ? o.reference : null,
    cashDesk: parseDesk(o.cashDesk),
    cashier: parseCashier(o.cashier),
  }
}

export function extractFeeAlreadyPaidDetails(error: unknown): FeeAlreadyPaidDetails | null {
  if (!axios.isAxiosError(error)) return null
  const data = asRecord(error.response?.data)
  if (!data) return null
  const errors = asRecord(data.errors)
  const details = parseFeeAlreadyPaidDetails(errors?.details ?? data.details)
  if (details) return details
  return null
}

export function isFeeAlreadyPaidError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false
  if (extractFeeAlreadyPaidDetails(error)) return true
  const data = asRecord(error.response?.data)
  const errors = asRecord(data?.errors)
  const code =
    (typeof data?.code === 'string' && data.code) ||
    (typeof errors?.code === 'string' && errors.code) ||
    ''
  return error.response?.status === 409 && ALREADY_PAID_CODES.has(code)
}

export function formatFeeAlreadyPaidMessage(details: FeeAlreadyPaidDetails): string {
  const when = details.paidAt ? ` le ${details.paidAt}` : ''
  const ref = details.reference ? ` (reçu ${details.reference})` : ''
  const feeHint = details.monthYear
    ? ` pour ${details.monthYear}`
    : details.categoryName
      ? ` (${details.categoryName})`
      : ''
  if (details.cashDesk?.name && details.cashier?.name) {
    return `Déjà réglé${feeHint} au guichet « ${details.cashDesk.name} » par ${details.cashier.name}${when}${ref}.`
  }
  if (details.cashDesk?.name) {
    return `Déjà réglé${feeHint} au guichet « ${details.cashDesk.name} »${when}${ref}.`
  }
  if (details.cashier?.name) {
    return `Déjà réglé${feeHint} par ${details.cashier.name}${when}${ref}.`
  }
  return `Ce poste tarifaire est déjà réglé${feeHint}${ref}.`
}
