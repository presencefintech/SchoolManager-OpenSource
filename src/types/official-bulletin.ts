import type { SchoolTerm } from '@/types/teacher-grades'

/** Aligné sur le payload DynamicBulletin + extension délibération (backend). */

export type GradeItem = {
  subjectId: number
  name: string
  code: string | null
  coefficient: number
  tj: {
    obtained: number | null
    max: number
    percentage: number | null
  }
  exam: {
    obtained: number | null
    max: number
    percentage: number | null
  }
  obtained: number | null
  max: number
  percentage: number | null
  dispensed: boolean
}

export type SubDomainGroup = {
  subDomainId: number | null
  name: string
  code: string | null
  sortOrder: number
  subjects: GradeItem[]
  subtotalObtained: number | null
  subtotalMax: number
  percentage: number | null
}

export type DomainGroup = {
  domainId: number | null
  name: string
  code: string | null
  sortOrder: number
  subDomains: SubDomainGroup[]
  totalObtained: number | null
  totalMax: number
  percentage: number | null
}

export type DeliberationDecision = 'PASSE' | 'REPECHAGE' | 'DOUBLE' | 'EN_ATTENTE'

/** Métadonnées d’identité EPST (en-tête du modèle officiel). */
export type BulletinIdentity = {
  province?: string | null
  city?: string | null
  commune?: string | null
  schoolCode?: string | null
  permanentNumber?: string | null
  nationalId?: string | null
  sex?: 'M' | 'F' | string | null
  birthPlace?: string | null
  birthDate?: string | null
  classYearLabel?: string | null
  /** Libellé de cycle (primaire, CTEB, humanités…). */
  cycleName?: string | null
  academicYearStart?: string | null
  academicYearEnd?: string | null
}

export type StudentBulletinProps = {
  meta: {
    schoolId: number
    classId: number
    studentId: number
    academicYear: string
    term: SchoolTerm | string | null
    period?: string | null
    scale: number
    generatedAt: string
  }
  student: {
    id: number
    fullName: string
    matricule: string
    sex?: string | null
    birthPlace?: string | null
    birthDate?: string | null
  }
  school?: {
    name?: string | null
    city?: string | null
    province?: string | null
    commune?: string | null
    code?: string | null
  }
  classInfo: {
    id: number
    name: string
    sectionId?: number
    sectionName: string
    optionId?: number
    optionName: string
    level?: string | null
    cycleName?: string | null
  }
  schoolName?: string
  identity?: BulletinIdentity
  domains: DomainGroup[]
  totals: {
    obtained: number | null
    max: number
    percentage: number | null
    coefficientSum?: number
    subjectCount?: number
    gradedSubjectCount?: number
  }
  rank: {
    position: number | null
    classSize: number
    gradedCount?: number
  }
  deliberation: {
    decision: DeliberationDecision | string
    decisionLabel: string
    suggestedDecision?: DeliberationDecision | string
    suggestedDecisionLabel?: string
    conductNote?: number | null
    applicationNote?: number | null
    validatedAt?: string | null
    securityHash: string
    verifyToken: string
    placeLabel?: string | null
  }
  /** URL publique de vérification (QR). */
  verifyUrl?: string
}

export type BulletinPermissions = {
  isBulletinPrintingEnabled: boolean
  isZipExportEnabled: boolean
}
