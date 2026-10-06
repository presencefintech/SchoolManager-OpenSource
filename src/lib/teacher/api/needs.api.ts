import { apiClient } from '@/lib/api/client'

export type TeacherNeedStatus =
  | 'PENDING'
  | 'APPROVED_BY_DIR'
  | 'SENT_TO_ADMIN'
  | 'REJECTED'
  | 'FUNDED'

export type TeacherNeed = {
  id: number
  title: string
  description: string
  estimatedCost: number | string
  status: TeacherNeedStatus
  feedback?: string | null
  createdAt?: string
  updatedAt?: string
  teacher?: {
    id: number
    user?: { firstName?: string | null; lastName?: string | null } | null
  } | null
  reviewedBy?: {
    id: number
    firstName?: string | null
    lastName?: string | null
  } | null
}

export type CreateTeacherNeedBody = {
  title: string
  description: string
  estimatedCost: number
}

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

function unwrapList(payload: unknown): TeacherNeed[] {
  const data = unwrap<unknown>(payload)
  if (Array.isArray(data)) return data as TeacherNeed[]
  if (data && typeof data === 'object') {
    const d = data as { items?: unknown; data?: unknown }
    if (Array.isArray(d.items)) return d.items as TeacherNeed[]
    if (Array.isArray(d.data)) return d.data as TeacherNeed[]
  }
  return []
}

export const teacherNeedsApi = {
  list: () =>
    apiClient.get('/teacher/needs').then((r) => unwrapList(r.data)),

  create: (body: CreateTeacherNeedBody) =>
    apiClient
      .post('/teacher/needs', body)
      .then((r) => unwrap<TeacherNeed>(r.data)),
}
