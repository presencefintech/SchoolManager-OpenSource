import { apiClient } from '@/lib/api/client'
import type {
  AcademicTermStatus,
  EvaluationStatus,
  EvaluationType,
  GradebookGrid,
  SchoolTerm,
} from '@/types/teacher-grades'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

export type AdminGradeClass = {
  id: number
  name: string
  academicYear?: string | null
  studentCount: number
}

export type AdminGradeSubject = {
  id: number
  name: string
}

export type AdminGradeContext = {
  classes: AdminGradeClass[]
  subjects: AdminGradeSubject[]
  serverTime: string
}

export type AdminEvaluationListItem = {
  id: number
  title: string
  type: EvaluationType
  maxScore: number | string
  coefficient: number | string
  term: SchoolTerm
  academicYear: string
  evaluatedAt: string
  status: EvaluationStatus | string
  classId: number
  subjectId: number
  class?: { id: number; name: string; academicYear?: string | null }
  subject?: { id: number; name: string }
  teacher?: {
    id: number
    user?: {
      firstName?: string | null
      lastName?: string | null
      prenom?: string | null
      postnom?: string | null
    } | null
  } | null
  _count?: { grades: number }
}

export type AdminAcademicTermPeriod = {
  id: number
  academicYear: string
  term: SchoolTerm
  status: AcademicTermStatus
  reason?: string | null
  submittedAt?: string | null
  lockedAt?: string | null
  submittedById?: number | null
  lockedById?: number | null
  bulletinScale?: number | string | null
  tjWeight?: number | string | null
  examWeight?: number | string | null
}

export type GradeAuditLogItem = {
  id: number
  createdAt: string
  reason: string | null
  previousScore: number | null
  newScore: number | null
  previousIsAbsent: boolean | null
  newIsAbsent: boolean | null
  changedByUserId: number
  changedBy: { id: number; fullName: string; role: string }
  gradeId: number
  student: { id: number; matricule: string | null; fullName: string }
  evaluation: {
    id: number
    title: string
    type: EvaluationType
    term: SchoolTerm
    academicYear: string
    classId: number
    className: string
    subjectId: number
    subjectName: string
    teacher: { id: number; fullName: string } | null
  }
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
    gradedCount: number
    studentCount: number
  }
}

export const adminGradesApi = {
  context: () =>
    apiClient.get('/admin/grades/context').then((r) => unwrap<AdminGradeContext>(r.data)),

  listEvaluations: (params?: {
    classId?: number
    subjectId?: number
    term?: SchoolTerm
    academicYear?: string
    type?: EvaluationType
    status?: string
    page?: number
    limit?: number
  }) =>
    apiClient.get('/admin/grades', { params }).then((r) => {
      const data = unwrap<{
        items?: AdminEvaluationListItem[]
        total?: number
        page?: number
        limit?: number
      }>(r.data)
      return {
        items: data.items ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 25,
      }
    }),

  getEvaluation: (evaluationId: number) =>
    apiClient
      .get(`/admin/grades/${evaluationId}`)
      .then((r) => unwrap(r.data)),

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
    apiClient
      .post('/admin/grades', body)
      .then((r) => unwrap<AdminEvaluationListItem>(r.data)),

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
      .patch(`/admin/grades/${evaluationId}`, body)
      .then((r) => unwrap<AdminEvaluationListItem>(r.data)),

  deleteEvaluation: (evaluationId: number) =>
    apiClient
      .delete(`/admin/grades/${evaluationId}`)
      .then((r) => unwrap<{ id: number; deleted: boolean }>(r.data)),

  publishEvaluation: (evaluationId: number) =>
    apiClient
      .post(`/admin/grades/${evaluationId}/publish`)
      .then((r) => unwrap(r.data)),

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
      .post(`/admin/grades/${evaluationId}/grades`, body)
      .then((r) => unwrap<{ evaluationId: number; upserted: number }>(r.data)),

  grid: (params: {
    classId: number
    subjectId: number
    term: SchoolTerm
    academicYear: string
  }) =>
    apiClient
      .get('/admin/grades/grid', { params })
      .then((r) => unwrap<GradebookGrid>(r.data)),

  averages: (params: {
    classId: number
    subjectId: number
    term: SchoolTerm
    academicYear: string
    studentId?: number
  }) =>
    apiClient.get('/admin/grades/averages', { params }).then((r) => unwrap(r.data)),

  classPeriodSummary: (params: {
    classId: number
    subjectId: number
    periodId: SchoolTerm
    academicYear: string
  }) =>
    apiClient
      .get(
        `/admin/grades/classes/${params.classId}/subjects/${params.subjectId}/period/${params.periodId}/summary`,
        { params: { academicYear: params.academicYear } },
      )
      .then((r) => unwrap<ClassPeriodSummary>(r.data)),

  listPeriods: (academicYear?: string) =>
    apiClient
      .get('/admin/grades/periods', {
        params: academicYear ? { academicYear } : undefined,
      })
      .then((r) => unwrap<AdminAcademicTermPeriod[]>(r.data)),

  setPeriodStatus: (body: {
    academicYear: string
    term: SchoolTerm
    status: AcademicTermStatus
    reason?: string | null
  }) =>
    apiClient
      .post('/admin/grades/periods/status', body)
      .then((r) => unwrap<AdminAcademicTermPeriod>(r.data)),

  listAuditLogs: (params?: {
    classId?: number
    subjectId?: number
    teacherUserId?: number
    studentId?: number
    changedByUserId?: number
    evaluationId?: number
    from?: string
    to?: string
    page?: number
    limit?: number
  }) =>
    apiClient.get('/admin/grades/audit-logs', { params }).then((r) => {
      const data = unwrap<{
        items?: GradeAuditLogItem[]
        total?: number
        page?: number
        limit?: number
      }>(r.data)
      return {
        items: data.items ?? [],
        total: data.total ?? 0,
        page: data.page ?? 1,
        limit: data.limit ?? 25,
      }
    }),
}
