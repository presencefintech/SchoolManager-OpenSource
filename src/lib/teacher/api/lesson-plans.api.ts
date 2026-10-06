import { apiClient } from '@/lib/api/client'
import type { SchoolTerm } from '@/types/teacher-grades'

export type LessonPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type LessonPlanSteps = {
  revision?: string
  motivation?: string
  development?: string
  synthesis?: string
  application?: string
}

export type TeacherLessonPlan = {
  id: number
  title: string
  subject: string
  status: LessonPlanStatus
  term: SchoolTerm | string
  weekNumber: number
  classId: number
  objectives?: string | null
  materials?: string | null
  steps?: LessonPlanSteps | null
  feedback?: string | null
  submittedAt?: string | null
  updatedAt?: string
  class?: { id: number; name: string } | null
  subjectRef?: { id: number; name: string } | null
}

export type CreateLessonPlanBody = {
  classId: number
  subject: string
  term: SchoolTerm
  weekNumber: number
  title: string
  objectives?: string
  materials?: string
  steps?: LessonPlanSteps
}

export type UpdateLessonPlanBody = Partial<CreateLessonPlanBody>

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

function unwrapList(payload: unknown): TeacherLessonPlan[] {
  const data = unwrap<unknown>(payload)
  if (Array.isArray(data)) return data as TeacherLessonPlan[]
  if (data && typeof data === 'object') {
    const d = data as { items?: unknown; data?: unknown }
    if (Array.isArray(d.items)) return d.items as TeacherLessonPlan[]
    if (Array.isArray(d.data)) return d.data as TeacherLessonPlan[]
  }
  return []
}

export const teacherLessonPlansApi = {
  list: (params?: {
    classId?: number
    term?: SchoolTerm
    weekNumber?: number
    status?: LessonPlanStatus
  }) =>
    apiClient
      .get('/teacher/lesson-plans', { params })
      .then((r) => unwrapList(r.data)),

  get: (id: number) =>
    apiClient
      .get(`/teacher/lesson-plans/${id}`)
      .then((r) => unwrap<TeacherLessonPlan>(r.data)),

  create: (body: CreateLessonPlanBody) =>
    apiClient
      .post('/teacher/lesson-plans', body)
      .then((r) => unwrap<TeacherLessonPlan>(r.data)),

  update: (id: number, body: UpdateLessonPlanBody) =>
    apiClient
      .put(`/teacher/lesson-plans/${id}`, body)
      .then((r) => unwrap<TeacherLessonPlan>(r.data)),

  submit: (id: number) =>
    apiClient
      .post(`/teacher/lesson-plans/${id}/submit`)
      .then((r) => unwrap<TeacherLessonPlan>(r.data)),
}
