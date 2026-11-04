import { apiClient } from '@/lib/api/client'

export type LongTermTermEntry = {
  academicYear: string
  term: string
  classId: number | null
  className: string | null
  optionName: string | null
  finalPercentage: number
  classRank: number | null
  classSize: number | null
  decision: string | null
  conductNote: number | null
  applicationNote: number | null
  domainAverages: Record<string, number> | null
  deliberationId: number | null
}

export type LongTermHistory = {
  studentId: number
  schoolId: number
  studentName: string
  matricule: string
  terms: LongTermTermEntry[]
  yearlyAverages: Array<{
    academicYear: string
    averagePercentage: number
    termCount: number
  }>
  globalAveragePercentage: number | null
  averageRankRatio: number | null
  yearsCovered: string[]
}

export type DisciplineSummaryView = {
  averageConductNote: number | null
  averageApplicationNote: number | null
  totalAbsences: number
  unjustifiedAbsences: number
  sanctionCount: number
  majorSanctionCount: number
  unresolvedSanctionCount: number
  byYear: Record<string, unknown> | null
}

export type StudentCareerProfileView = {
  id: number
  entryYear: string | null
  currentCycle: string | null
  suggestedOption: string | null
  suggestedPathwayCode: string | null
  suggestedPathway: string | null
  orientationConfidence: number | null
  metadata: unknown
  lastComputedAt: string | null
}

export type CareerProfileResponse = {
  history: LongTermHistory
  profile: StudentCareerProfileView | null
  discipline: DisciplineSummaryView | null
}

export type OrientationClusterScore = {
  code: string
  pathway: string
  optionLabel: string
  score: number
  averagePercentage: number
  sampleCount: number
}

export type OrientationRecommendation = {
  studentId: number
  schoolId: number
  ruleId: number | null
  suggestedOption: string | null
  suggestedPathwayCode: string | null
  suggestedPathway: string | null
  postSecondaryPathwayCode: string | null
  postSecondaryPathway: string | null
  confidence: number
  currentCycle: string
  rationale: string[]
  clusterScores: OrientationClusterScore[]
  discipline: DisciplineSummaryView
  history: LongTermHistory
}

export type LeavingCertificateData = {
  certificateId: number
  uuid: string
  student: {
    id: number
    fullName: string
    matricule: string
    dateOfBirth: string | null
    placeOfBirth: string | null
    gender: string | null
  }
  schoolId: number
  entryYear: string | null
  currentCycle: string | null
  academicYear: string
  cursus: LongTermTermEntry[]
  yearlyAverages: LongTermHistory['yearlyAverages']
  globalAveragePercentage: number | null
  orientation: {
    suggestedOption: string | null
    suggestedPathwayCode: string | null
    suggestedPathway: string | null
    postSecondaryPathwayCode: string | null
    postSecondaryPathway: string | null
    confidence: number
    rationale: string[]
    ruleId: number | null
  }
  discipline: DisciplineSummaryView
  conductAverage: number | null
  applicationAverage: number | null
  certificationChecks: Array<{ code: string; ok: boolean; detail: string }>
  securityHash: string
  validationStatus: string
  verifyToken: string
  generatedAt: string
}

function unwrapData<T>(payload: { data?: T } | T): T {
  if (payload && typeof payload === 'object' && 'data' in payload) {
    return (payload as { data: T }).data
  }
  return payload as T
}

export const studentOrientationApi = {
  getCareerProfile: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: CareerProfileResponse }>(
        `/admin/students/${studentId}/career-profile`,
      )
      .then((r) => unwrapData(r.data)),

  generateOrientation: (studentId: number) =>
    apiClient
      .post<{ success: boolean; data: OrientationRecommendation }>(
        `/admin/students/${studentId}/orientation`,
      )
      .then((r) => unwrapData(r.data)),

  issueLeavingCertificate: (
    studentId: number,
    body?: { persistValidated?: boolean },
  ) =>
    apiClient
      .post<{ success: boolean; data: LeavingCertificateData }>(
        `/admin/students/${studentId}/leaving-certificate`,
        body ?? {},
      )
      .then((r) => unwrapData(r.data)),
}
