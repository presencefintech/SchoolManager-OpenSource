export type ReceiptIntegrityLevel = 'CERTIFIED' | 'SUSPECT' | 'REJECTED'

export type ReceiptVerifyFailureReason =
  | 'INVALID_TOKEN'
  | 'INVALID_CODE'
  | 'NOT_FOUND'
  | 'NOT_CONFIRMED'
  | 'SIGNATURE_MISMATCH'
  | 'RECEIPT_INCOMPLETE'

export type ReceiptVerifyFeeLine = {
  label: string
  amount: string
  currency: string
  periodLabel: string | null
}

export type ReceiptMarketingLinks = {
  brand: string
  certifiedBadge: string
  websiteUrl: string
  salesEmail: string
  whatsappUrl: string | null
  ctaTitle: string
  ctaText: string
  ctaWhatsAppLabel: string
}

export type ReceiptVerifySuccess = {
  valid: true
  algorithm: string
  integrityLevel: ReceiptIntegrityLevel
  publicVerifyCode: string
  manualVerifyUrl: string
  receiptNumber: string
  paymentId: number
  reference: string
  amount: string
  currency: string
  cdfEquivalent: number | null
  exchangeRate: number | null
  confirmedAt: string
  verifiedAt: string
  studentName: string
  studentMatricule: string
  parentName: string
  balanceDue: string
  poweredBy: string
  className: string | null
  sessionLabel: string
  schoolId: number
  schoolName: string
  schoolCity: string | null
  schoolAddress: string | null
  schoolPhone: string | null
  schoolEmail: string | null
  schoolLogoUrl: string | null
  schoolAccentColor: string
  marketing: ReceiptMarketingLinks
  motiveSummary: string
  feeLines: ReceiptVerifyFeeLine[]
  method: string
  channel: string
  orchestratedBy: string
  hmacValid: boolean
  documentHashDisplay: string
  signatureDisplay: string
  verifyUrl: string
  ogTitle?: string
  ogDescription?: string
  ogImageUrl?: string
}

export type ReceiptVerifyResult =
  | ReceiptVerifySuccess
  | { valid: false; reason: ReceiptVerifyFailureReason }
