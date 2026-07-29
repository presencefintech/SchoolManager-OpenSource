export type PreEnrollmentStatus =
  | 'PENDING'
  | 'UNDER_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'COMPLETED'

export interface PreEnrollmentStudentInfo {
  lastName: string
  postnom: string
  firstName: string
  prenom?: string
  gender: string
  dateOfBirth: string
  placeOfBirth: string
  nationality: string
  parentFirstName?: string
  parentLastName?: string
  parentPhone: string
  parentEmail?: string
  parentAddress?: string
  emergencyContactName: string
  emergencyContactPhone: string
  bloodGroup?: string
  allergies?: string
  medicalNotes?: string
  preferredLanguage?: string
  photoUrl?: string
  birthCertificateUrl?: string
  enrollmentFormUrl?: string
  livenessScore?: number
  faceScore?: number
  academicYear?: string
}

export interface PreEnrollmentAcademicChoices {
  sectionId: number
  sectionName?: string
  /** Absent en maternelle / primaire RDC */
  optionId?: number
  optionName?: string
  classroomName?: string
}

export interface PreEnrollmentRecord {
  id: number
  studentInfo: PreEnrollmentStudentInfo
  schoolId: number
  classroomId: number | null
  status: PreEnrollmentStatus
  comment: string | null
  academicChoices: PreEnrollmentAcademicChoices
  createdAt: string
  updatedAt: string
  processedAt: string | null
  processedById: number | null
  school?: { id: number; name: string }
  class?: {
    id: number
    name: string
    sectionId: number
    optionId: number
  } | null
}

export interface PreEnrollmentListResponse {
  data: PreEnrollmentRecord[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export interface CreatePreEnrollmentPayload {
  studentInfo: {
    lastName: string
    postnom: string
    firstName: string
    prenom?: string
    gender: 'M' | 'F'
    dateOfBirth: string
    placeOfBirth: string
    nationality?: string
    parentPhone: string
    parentEmail?: string
    parentAddress?: string
    emergencyContactName: string
    emergencyContactPhone: string
    bloodGroup?: string
    allergies?: string
    medicalNotes?: string
    preferredLanguage?: string
  }
  classroomId?: number
  academicChoices: {
    sectionId: number
    optionId?: number
  }
  academicYear?: string
  schoolId?: number
}

export interface SchoolSectionRef {
  id: number
  name: string
  code?: string
  schoolId: number
}

export interface SchoolOptionRef {
  id: number
  name: string
  sectionId: number
  schoolId: number
}

export interface SchoolClassRef {
  id: number
  name: string
  sectionId: number
  optionId: number
  academicYear?: string | null
}

export const PRE_ENROLLMENT_STATUS_LABELS: Record<PreEnrollmentStatus, string> = {
  PENDING: 'En attente',
  UNDER_REVIEW: 'En revue',
  APPROVED: 'Approuvée',
  REJECTED: 'Rejetée',
  COMPLETED: 'Finalisée',
}

export const PRE_ENROLLMENT_STATUS_CLASSES: Record<PreEnrollmentStatus, string> = {
  PENDING: 'bg-amber-50 text-amber-700',
  UNDER_REVIEW: 'bg-sky-50 text-sky-700',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  COMPLETED: 'bg-indigo-50 text-indigo-700',
}
