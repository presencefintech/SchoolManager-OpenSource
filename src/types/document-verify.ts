export type DocumentIntegrityLevel = 'CERTIFIED' | 'SUSPECT' | 'REJECTED'

export type DocumentVerifyFailureReason =
  | 'INVALID_TOKEN'
  | 'INVALID_CODE'
  | 'NOT_FOUND'
  | 'SIGNATURE_MISMATCH'
  | 'DOCUMENT_INCOMPLETE'

export type DocumentVerifySuccess = {
  valid: true
  algorithm: string
  integrityLevel: DocumentIntegrityLevel
  docType: string
  docTypeLabel: string
  documentRef: string
  publicVerifyCode: string
  issuedAt: string
  verifiedAt: string
  studentName: string
  studentMatricule: string
  className: string | null
  academicYear: string | null
  schoolId: number
  schoolName: string
  schoolCity: string | null
  schoolAddress: string | null
  schoolPhone: string | null
  schoolEmail: string | null
  schoolLogoUrl: string | null
  hmacValid: boolean
  verifyUrl: string
  manualVerifyUrl: string
}

export type DocumentVerifyResult =
  | DocumentVerifySuccess
  | { valid: false; reason: DocumentVerifyFailureReason }
