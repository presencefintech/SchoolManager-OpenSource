import type { PaymentProofType } from '@/types/admin'

export const PAYMENT_PROOF_TYPE_LABELS: Record<PaymentProofType, string> = {
  RECEIPT_PDF: 'Reçu PDF',
  MOBILE_MONEY_SCREENSHOT: 'Capture Mobile Money',
  BANK_TRANSFER_SLIP: 'Bordereau / virement bancaire',
  CASH_VOUCHER: 'Bordereau de caisse',
  OTHER: 'Autre (motif requis)',
}

export const PAYMENT_PROOF_TYPE_OPTIONS = Object.entries(PAYMENT_PROOF_TYPE_LABELS).map(
  ([value, label]) => ({ value: value as PaymentProofType, label }),
)

/** Preuve par défaut selon le canal de paiement (aligné backend). */
export function defaultProofTypeForMethod(method: string): PaymentProofType {
  const m = method.toUpperCase()
  if (m === 'CASH') return 'CASH_VOUCHER'
  if (m === 'BANK' || m === 'BANK_TRANSFER' || m === 'CHEQUE') return 'BANK_TRANSFER_SLIP'
  if (
    m === 'MOBILE_MONEY' ||
    m === 'ORANGE_MONEY' ||
    m === 'MPESA' ||
    m === 'AIRTEL_MONEY'
  ) {
    return 'MOBILE_MONEY_SCREENSHOT'
  }
  if (m === 'CARD') return 'RECEIPT_PDF'
  return 'OTHER'
}

export function labelPaymentProofType(proofType?: PaymentProofType | null): string | undefined {
  if (!proofType) return undefined
  return PAYMENT_PROOF_TYPE_LABELS[proofType] ?? proofType
}
