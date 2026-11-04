import { apiClient } from '@/lib/api/client'
import type { SchoolTerm } from '@/types/teacher-grades'

export type LessonPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

/** Contenu d'une étape pédagogique (modèle T : matière d'un côté, méthode/procédé de l'autre). */
export type LessonStepItem = {
  content?: string
  method?: string
}

/**
 * `revision`/`motivation`/etc. acceptent aussi une simple chaîne pour rester compatibles
 * avec les fiches créées avant l'ajout du champ "méthode" — utiliser `normalizeStepItem()`
 * pour lire une valeur quel que soit son ancien format.
 */
export type LessonPlanSteps = {
  initialDuration?: number
  revision?: LessonStepItem | string
  motivation?: LessonStepItem | string
  development?: LessonStepItem | string
  mainDuration?: number
  analysis?: LessonStepItem | string
  synthesis?: LessonStepItem | string
  controlDuration?: number
  application?: LessonStepItem | string
  integration?: LessonStepItem | string
  selfEvaluation?: LessonStepItem | string
}

/** Lit une étape quel que soit son format de stockage (ancienne chaîne ou objet). */
export function normalizeStepItem(value: LessonStepItem | string | undefined | null): LessonStepItem {
  if (!value) return {}
  if (typeof value === 'string') return { content: value }
  return value
}

export type TeacherLessonPlan = {
  id: number
  title: string
  subject: string
  subBranch?: string | null
  status: LessonPlanStatus
  term: SchoolTerm | string
  weekNumber: number
  classId: number
  objectives?: string | null
  materials?: string | null
  bibliographicReferences?: string | null
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
  subBranch?: string
  term: SchoolTerm
  weekNumber: number
  title: string
  objectives?: string
  materials?: string
  bibliographicReferences?: string
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
