import { apiClient } from '@/lib/api/client'

export type ClassVisitStatus = 'DRAFT' | 'FINALIZED'

export type ClassVisitCriterion = {
  key: string
  label: string
  score: number // 1-5
}

export type ClassVisitPayload = {
  teacherId: number
  classId: number
  subject?: string
  visitedAt: string
  criteria: ClassVisitCriterion[]
  observations: string
  recommendations?: string
}

export type ClassVisitItem = {
  id: number
  teacherId: number
  teacher?: { id: number; firstName: string; lastName: string } | null
  classId: number
  class?: { id: number; name: string } | null
  subject: string | null
  visitedAt: string
  criteria: ClassVisitCriterion[]
  observations: string
  recommendations: string | null
  averageScore: number | null
  status: ClassVisitStatus
  createdAt: string
  finalizedAt: string | null
}

export type ClassVisitListResponse = {
  items: ClassVisitItem[]
  total: number
  page: number
  lastPage: number
}

export const directorVisitsApi = {
  list: (params?: { teacherId?: number; classId?: number; status?: ClassVisitStatus; page?: number; limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: ClassVisitListResponse }>('/admin/director/visits', { params })
      .then((r) => r.data.data),

  create: (payload: ClassVisitPayload) =>
    apiClient
      .post<{ success: boolean; data: ClassVisitItem }>('/admin/director/visits', payload)
      .then((r) => r.data.data),

  finalize: (visitId: number) =>
    apiClient
      .post<{ success: boolean; data: ClassVisitItem }>(`/admin/director/visits/${visitId}/finalize`)
      .then((r) => r.data.data),
}
