import type { SchoolCardTheme } from '@/lib/student-card/card-theme'

/**
 * Données affichées sur la carte élève (format badge CR80 — 85.6 × 54 mm).
 */
export type StudentCardFinancialStatus = 'current' | 'alert' | 'standard'

export type StudentCardGender = 'MALE' | 'FEMALE' | 'M' | 'F'

export interface StudentCardData {
  studentId: number
  firstName: string
  lastName: string
  postnom?: string | null
  prenom?: string | null
  /** Nom complet RDC pour export PDF (Nom Postnom Prénom) */
  rdcFullName?: string
  matricule: string | null
  /** N° court scolaire (1–9999) — affiché sur badge / carte */
  numeroCourt?: number | null
  className: string | null
  section: string | null
  option: string | null
  photoUrl: string | null
  qrPayload: string
  schoolName: string
  schoolCity?: string | null
  schoolLogoUrl?: string | null
  schoolSlogan?: string | null
  schoolDevise?: string | null
  /** Thème couleurs personnalisé par école */
  cardTheme?: SchoolCardTheme | null
  academicYear: string | null
  /** Date de naissance affichée (déjà formatée fr-FR) */
  dateOfBirth: string | null
  placeOfBirth: string | null
  nationality: string | null
  gender: StudentCardGender | null
  financialStatus: StudentCardFinancialStatus
}

export interface StudentCardProps {
  data: StudentCardData
  preview?: boolean
  className?: string
  id?: string
}

export interface StudentCardPhotoProps {
  photoUrl: string | null
  firstName: string
  lastName: string
  className?: string
}

export interface StudentCardFinancialInput {
  feesBalance?: number | null
  isUpToDate?: boolean | null
  isPaymentLocked?: boolean | null
}
