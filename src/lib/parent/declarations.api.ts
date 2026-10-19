import { apiClient } from '@/lib/api/client'

/**
 * Déclarations de paiement (preuve SMS Mobile Money) — `/api/v1/mobile/parents/payment-declarations`.
 * Miroir de l'app mobile : liste, dépôt avec capture d'écran, correction et reçus.
 */
const BASE = '/mobile/parents/payment-declarations'

type Rec = Record<string, unknown>
const rec = (v: unknown): Rec => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Rec) : {})
const str = (v: unknown, d = '') => (v == null || String(v).trim() === '' ? d : String(v).trim())
const num = (v: unknown, d = 0) => {
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : d
}
const unwrap = (body: unknown): unknown => {
  const r = rec(body)
  return 'data' in r ? r.data : body
}

export type DeclarationStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type DeclarationReceipt = {
  number: string | null
  kind: string
  watermark: string | null
  downloadable: boolean
  label: string
}

export type DeclarationAllocation = {
  id: number
  studentId: number
  studentName: string | null
  matricule: string | null
  paymentCode: string | null
  amount: number
  currency: string
  reprintCount: number
  receipt: DeclarationReceipt
}

export type Declaration = {
  id: number
  studentId: number
  provider: string
  providerLabel: string
  transactionRef: string
  amount: number
  currency: string
  paidAt: string
  status: DeclarationStatus
  validationMode: 'INSTANT' | 'SEMI_AUTOMATIC'
  receipt: DeclarationReceipt
  createdAt: string
  payerPhone: string | null
  payerName: string | null
  note: string | null
  proofImageUrl: string | null
  rejectionReason: string | null
  approvedAt: string | null
  studentName: string | null
  paymentCode: string | null
  splitMode: string
  allocations: DeclarationAllocation[]
  surplusAmount: number
}

export type DeclarationChild = {
  studentId: number
  studentName: string
  matricule: string
  paymentCode: string
  className: string | null
  feesBalance: number
}

export type PaymentChannel = { code: string; displayName: string; hint: string }

function parseReceipt(raw: unknown): DeclarationReceipt {
  const r = rec(raw)
  return {
    number: str(r.number) || null,
    kind: str(r.kind, 'PROVISIONAL'),
    watermark: str(r.watermark) || null,
    downloadable: r.downloadable === true,
    label: str(r.label),
  }
}

function parseDeclaration(raw: unknown): Declaration {
  const r = rec(raw)
  const status = str(r.status).toUpperCase()
  return {
    id: num(r.id),
    studentId: num(r.studentId),
    provider: str(r.provider),
    providerLabel: str(r.providerLabel, str(r.provider)),
    transactionRef: str(r.transactionRef),
    amount: num(r.amount),
    currency: str(r.currency, 'USD'),
    paidAt: str(r.paidAt),
    status: status === 'APPROVED' ? 'APPROVED' : status === 'REJECTED' ? 'REJECTED' : 'PENDING',
    validationMode: str(r.validationMode).toUpperCase() === 'INSTANT' ? 'INSTANT' : 'SEMI_AUTOMATIC',
    receipt: parseReceipt(r.receipt),
    createdAt: str(r.createdAt),
    payerPhone: str(r.payerPhone) || null,
    payerName: str(r.payerName) || null,
    note: str(r.note) || null,
    proofImageUrl: str(r.proofImageUrl) || null,
    rejectionReason: str(r.rejectionReason) || null,
    approvedAt: str(r.approvedAt) || null,
    studentName: str(r.studentName) || null,
    paymentCode: str(r.paymentCode) || null,
    splitMode: str(r.splitMode, 'EQUAL'),
    allocations: (Array.isArray(r.allocations) ? r.allocations : []).map((a) => {
      const x = rec(a)
      return {
        id: num(x.id),
        studentId: num(x.studentId),
        studentName: str(x.studentName) || null,
        matricule: str(x.matricule) || null,
        paymentCode: str(x.paymentCode) || null,
        amount: num(x.amount),
        currency: str(x.currency, 'USD'),
        reprintCount: num(x.reprintCount),
        receipt: parseReceipt(x.receipt),
      }
    }),
    surplusAmount: num(r.surplusAmount),
  }
}

export type SubmitDeclarationInput = {
  studentId: number
  provider: string
  transactionRef: string
  amount: number
  currency: string
  paidAt: string
  splitMode: 'EQUAL' | 'CUSTOM'
  allocations: Array<{ studentId: number; amount?: number }>
  payerPhone?: string
  payerName?: string
  note?: string
  proof: File
}

export const declarationsApi = {
  children: async (): Promise<DeclarationChild[]> => {
    const res = await apiClient.get(`${BASE}/children`)
    const list = unwrap(res.data)
    return (Array.isArray(list) ? list : []).map((c) => {
      const r = rec(c)
      return {
        studentId: num(r.studentId),
        studentName: str(r.studentName, 'Élève'),
        matricule: str(r.matricule),
        paymentCode: str(r.paymentCode),
        className: str(r.className) || null,
        feesBalance: num(r.feesBalance),
      }
    })
  },

  channels: async (): Promise<PaymentChannel[]> => {
    const res = await apiClient.get(`${BASE}/channels`)
    const list = unwrap(res.data)
    return (Array.isArray(list) ? list : []).map((c) => {
      const r = rec(c)
      return { code: str(r.code), displayName: str(r.displayName, str(r.code)), hint: str(r.hint) }
    })
  },

  settings: async (): Promise<{ instant: boolean }> => {
    const res = await apiClient.get(`${BASE}/settings`)
    return { instant: str(rec(unwrap(res.data)).paymentValidationMode).toUpperCase() === 'INSTANT' }
  },

  list: async (studentId: number) => {
    const res = await apiClient.get(BASE, { params: { studentId, limit: 30 } })
    const r = rec(unwrap(res.data))
    const items = (Array.isArray(r.items) ? r.items : []).map(parseDeclaration)
    return { items, total: num(r.total, items.length) }
  },

  get: async (id: number): Promise<Declaration> => {
    const res = await apiClient.get(`${BASE}/${id}`)
    return parseDeclaration(unwrap(res.data))
  },

  submit: async (input: SubmitDeclarationInput): Promise<Declaration> => {
    const form = new FormData()
    form.append('studentId', String(input.studentId))
    form.append('provider', input.provider)
    form.append('transactionRef', input.transactionRef)
    form.append('amount', String(input.amount))
    form.append('currency', input.currency)
    form.append('paidAt', input.paidAt)
    form.append('splitMode', input.splitMode)
    if (input.allocations.length > 0) form.append('allocations', JSON.stringify(input.allocations))
    if (input.payerPhone) form.append('payerPhone', input.payerPhone)
    if (input.payerName) form.append('payerName', input.payerName)
    if (input.note) form.append('note', input.note)
    form.append('proofImage', input.proof)
    const res = await apiClient.post(BASE, form)
    return parseDeclaration(unwrap(res.data))
  },

  resubmit: async (id: number, proof: File): Promise<Declaration> => {
    const form = new FormData()
    form.append('proofImage', proof)
    const res = await apiClient.post(`${BASE}/${id}/resubmit`, form)
    return parseDeclaration(unwrap(res.data))
  },

  allocationReceipt: async (declarationId: number, allocationId: number): Promise<Blob> => {
    const res = await apiClient.get(`${BASE}/${declarationId}/allocations/${allocationId}/receipt`, {
      responseType: 'blob',
      headers: { Accept: 'application/pdf' },
    })
    return res.data as Blob
  },
}

export function formatPaymentCode(code: string | null | undefined): string {
  const c = (code ?? '').replace(/[\s\-_.]/g, '').toUpperCase()
  return c.length === 6 ? `${c.slice(0, 3)}-${c.slice(3)}` : c
}

export const DECLARATION_STATUS_LABEL: Record<DeclarationStatus, string> = {
  PENDING: 'En vérification',
  APPROVED: 'Validée',
  REJECTED: 'Refusée',
}
