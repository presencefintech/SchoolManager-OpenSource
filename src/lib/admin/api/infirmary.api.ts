import { apiClient } from '@/lib/api/client'

export type InfirmaryOutcome = 'REST' | 'OBSERVED' | 'MEDICATED' | 'SENT_HOME' | 'REFERRED'

export const INFIRMARY_OUTCOMES: { value: InfirmaryOutcome; label: string }[] = [
  { value: 'REST', label: 'Repos à l’infirmerie' },
  { value: 'OBSERVED', label: 'Mise en observation' },
  { value: 'MEDICATED', label: 'Soin donné' },
  { value: 'SENT_HOME', label: 'Renvoyé à la maison' },
  { value: 'REFERRED', label: 'Évacué / hôpital' },
]

export type InfirmaryVisit = {
  id: number
  arrivedAt: string
  complaint: string
  outcome: InfirmaryOutcome
  outcomeLabel: string
  notes: string | null
  className: string | null
  recordedBy: string | null
}

export type InfirmaryVisitList = {
  studentId: number
  total: number
  items: InfirmaryVisit[]
}

export type CreateInfirmaryVisitPayload = {
  complaint: string
  outcome: InfirmaryOutcome
  notes?: string
}

export const infirmaryApi = {
  list: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: InfirmaryVisitList }>(`/admin/students/${studentId}/infirmary`)
      .then((r) => r.data.data),

  create: (studentId: number, payload: CreateInfirmaryVisitPayload) =>
    apiClient
      .post<{ success: boolean; data: InfirmaryVisit }>(`/admin/students/${studentId}/infirmary`, payload)
      .then((r) => r.data.data),
}
