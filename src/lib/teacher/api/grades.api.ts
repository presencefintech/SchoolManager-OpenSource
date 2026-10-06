import { apiClient } from '@/lib/api/client'
import type {
  AcademicTermStatus,
  EvaluationType,
  GradebookGrid,
  SchoolTerm,
  TeacherGradeContext,
} from '@/types/teacher-grades'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

export type EvaluationListItem = {
  id: number
  title: string
  type: EvaluationType
  maxScore: number | string
  coefficient: number | string
  term: SchoolTerm
  academicYear: string
  evaluatedAt: string
  status: string
  classId: number
  subjectId: number
}

export type AcademicTermPeriod = {
  id: number
  academicYear: string
  term: SchoolTerm
  status: AcademicTermStatus
  reason?: string | null
}

export const teacherGradesApi = {
  context: () =>
    apiClient.get('/teacher/grades/context').then((r) => unwrap<TeacherGradeContext>(r.data)),

  grid: (params: {
    classId: number
    subjectId: number
    term: SchoolTerm
    academicYear: string
  }) =>
    apiClient
      .get('/teacher/grades/grid', { params })
      .then((r) => unwrap<GradebookGrid>(r.data)),

  listEvaluations: (params: {
    classId?: number
    subjectId?: number
    term?: SchoolTerm
    academicYear?: string
    limit?: number
  }) =>
    apiClient.get('/teacher/grades', { params }).then((r) => {
      const data = unwrap<{ items?: EvaluationListItem[]; total?: number }>(r.data)
      return {
        items: data.items ?? (Array.isArray(data) ? (data as EvaluationListItem[]) : []),
        total: data.total ?? 0,
      }
    }),

  upsertGrades: (
    evaluationId: number,
    body: {
      grades: Array<{
        studentId: number
        score?: number | null
        isAbsent?: boolean
        comment?: string | null
      }>
      reason?: string | null
    },
  ) =>
    apiClient
      .post(`/teacher/grades/${evaluationId}/grades`, body)
      .then((r) => unwrap<{ evaluationId: number; upserted: number }>(r.data)),

  createEvaluation: (body: {
    classId: number
    subjectId: number
    title: string
    type: EvaluationType
    maxScore: number
    coefficient?: number
    term: SchoolTerm
    academicYear: string
    evaluatedAt: string
    publish?: boolean
  }) =>
    apiClient.post('/teacher/grades', body).then((r) => unwrap<EvaluationListItem>(r.data)),

  updateEvaluation: (
    evaluationId: number,
    body: Partial<{
      title: string
      type: EvaluationType
      maxScore: number
      coefficient: number
      term: SchoolTerm
      academicYear: string
      evaluatedAt: string
      publish: boolean
    }>,
  ) =>
    apiClient
      .patch(`/teacher/grades/${evaluationId}`, body)
      .then((r) => unwrap<EvaluationListItem>(r.data)),

  deleteEvaluation: (evaluationId: number) =>
    apiClient
      .delete(`/teacher/grades/${evaluationId}`)
      .then((r) => unwrap<{ id: number; deleted: boolean }>(r.data)),

  publishEvaluation: (evaluationId: number) =>
    apiClient
      .post(`/teacher/grades/${evaluationId}/publish`)
      .then((r) => unwrap(r.data)),

  listPeriods: (academicYear?: string) =>
    apiClient
      .get('/teacher/grades/periods', { params: academicYear ? { academicYear } : undefined })
      .then((r) => unwrap<AcademicTermPeriod[]>(r.data)),

  submitPeriod: (body: { academicYear: string; term: SchoolTerm; reason?: string | null }) =>
    apiClient
      .post('/teacher/grades/periods/submit', body)
      .then((r) => unwrap<AcademicTermPeriod>(r.data)),

  averages: (params: {
    classId: number
    subjectId: number
    term: SchoolTerm
    academicYear: string
    studentId?: number
  }) =>
    apiClient.get('/teacher/grades/averages', { params }).then((r) => unwrap(r.data)),

  classPeriodSummary: (params: {
    classId: number
    subjectId: number
    periodId: SchoolTerm
    academicYear: string
  }) =>
    apiClient
      .get(
        `/teacher/grades/classes/${params.classId}/subjects/${params.subjectId}/period/${params.periodId}/summary`,
        { params: { academicYear: params.academicYear } },
      )
      .then((r) => unwrap<ClassPeriodSummary>(r.data)),
}

export type ClassPeriodSummary = {
  classId: number
  subjectId: number
  term: SchoolTerm
  academicYear: string
  scale: number
  students: Array<{
    studentId: number
    fullName: string
    provisionalAverage: number | null
    tj?: { onScale: number | null }
    examen?: { onScale: number | null }
  }>
  classStats?: {
    average: number | null
    min?: number | null
    max?: number | null
    gradedCount: number
    studentCount: number
  }
}
