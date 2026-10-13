import { apiClient } from '@/lib/api/client'
import type { LessonPlanSteps } from '@/lib/teacher/api/lesson-plans.api'

export type LessonPlanStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED'

export type AdminLessonPlanItem = {
  id: number
  title: string
  subject: string
  subBranch?: string | null
  status: LessonPlanStatus
  term: string
  weekNumber: number
  academicYear?: string | null
  teacherId: number
  classId: number
  objectives?: string | null
  materials?: string | null
  bibliographicReferences?: string | null
  steps?: LessonPlanSteps | null
  feedback?: string | null
  teacher?: {
    id: number
    user?: { firstName?: string | null; lastName?: string | null } | null
  } | null
  class?: { id: number; name: string } | null
  submittedAt?: string | null
  updatedAt?: string
  approvedAt?: string | null
}

function unwrapList(payload: unknown): AdminLessonPlanItem[] {
  if (Array.isArray(payload)) return payload as AdminLessonPlanItem[]
  if (payload && typeof payload === 'object') {
    const d = payload as { items?: unknown; data?: unknown }
    if (Array.isArray(d.items)) return d.items as AdminLessonPlanItem[]
    if (Array.isArray(d.data)) return d.data as AdminLessonPlanItem[]
  }
  return []
}

export const adminLessonPlansApi = {
  list: (params?: {
    status?: LessonPlanStatus
    teacherId?: number
    classId?: number
    term?: string
    weekNumber?: number
  }) =>
    apiClient
      .get('/admin/lesson-plans', { params })
      .then((r) => unwrapList(r.data?.data ?? r.data)),

  review: (id: number, body: { decision: 'APPROVED' | 'REJECTED'; feedback?: string }) =>
    apiClient
      .patch(`/admin/lesson-plans/${id}/review`, body)
      .then((r) => r.data?.data ?? r.data),
}

export type TeacherNeedStatus =
  | 'PENDING'
  | 'APPROVED_BY_DIR'
  | 'SENT_TO_ADMIN'
  | 'REJECTED'
  | 'FUNDED'

export type AdminTeacherNeedItem = {
  id: number
  title: string
  description: string
  estimatedCost: number | string
  status: TeacherNeedStatus
  feedback?: string | null
  teacherId: number
  createdAt?: string
  reviewedAt?: string | null
  teacher?: {
    id: number
    user?: { firstName?: string | null; lastName?: string | null } | null
  } | null
}

function unwrapNeeds(payload: unknown): AdminTeacherNeedItem[] {
  if (Array.isArray(payload)) return payload as AdminTeacherNeedItem[]
  if (payload && typeof payload === 'object') {
    const d = payload as { items?: unknown; data?: unknown }
    if (Array.isArray(d.items)) return d.items as AdminTeacherNeedItem[]
    if (Array.isArray(d.data)) return d.data as AdminTeacherNeedItem[]
  }
  return []
}

export const adminTeacherNeedsApi = {
  list: (params?: { status?: TeacherNeedStatus }) =>
    apiClient
      .get('/admin/needs', { params })
      .then((r) => unwrapNeeds(r.data?.data ?? r.data)),

  review: (
    id: number,
    body: {
      decision: 'APPROVED_BY_DIR' | 'SENT_TO_ADMIN' | 'REJECTED' | 'FUNDED'
      feedback?: string
    },
  ) =>
    apiClient.patch(`/admin/needs/${id}/review`, body).then((r) => r.data?.data ?? r.data),
}
