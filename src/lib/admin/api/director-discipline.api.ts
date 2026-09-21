import { apiClient } from '@/lib/api/client'

export type DisciplineSeverity = 'MINOR' | 'MAJOR' | 'SEVERE'
export type DisciplineStatus = 'OPEN' | 'DELIBERATED' | 'TRANSMITTED_TO_ADMIN' | 'CLOSED'

export type DisciplineIncidentPayload = {
  studentId: number
  classId?: number
  occurredAt: string
  severity: DisciplineSeverity
  nature: string
  description: string
}

export type DisciplineDeliberationPayload = {
  decision: string
  recommendation?: string
  transmitToAdmin: boolean
}

export type DisciplineIncidentItem = {
  id: number
  studentId: number
  student?: { id: number; firstName: string; lastName: string; matricule: string } | null
  classId: number | null
  className: string | null
  occurredAt: string
  severity: DisciplineSeverity
  nature: string
  description: string
  status: DisciplineStatus
  decision: string | null
  recommendation: string | null
  deliberatedAt: string | null
  transmittedAt: string | null
  createdAt: string
}

export type DisciplineListResponse = {
  items: DisciplineIncidentItem[]
  total: number
  page: number
  lastPage: number
}

export const directorDisciplineApi = {
  list: (params?: {
    studentId?: number
    classId?: number
    severity?: DisciplineSeverity
    status?: DisciplineStatus
    page?: number
    limit?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: DisciplineListResponse }>('/admin/director/discipline', { params })
      .then((r) => r.data.data),

  create: (payload: DisciplineIncidentPayload) =>
    apiClient
      .post<{ success: boolean; data: DisciplineIncidentItem }>('/admin/director/discipline', payload)
      .then((r) => r.data.data),

  deliberate: (incidentId: number, payload: DisciplineDeliberationPayload) =>
    apiClient
      .post<{ success: boolean; data: DisciplineIncidentItem }>(
        `/admin/director/discipline/${incidentId}/deliberate`,
        payload
      )
      .then((r) => r.data.data),

  close: (incidentId: number) =>
    apiClient
      .post<{ success: boolean; data: DisciplineIncidentItem }>(
        `/admin/director/discipline/${incidentId}/close`
      )
      .then((r) => r.data.data),
}
