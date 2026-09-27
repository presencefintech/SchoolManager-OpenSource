import { apiClient } from '@/lib/api/client'

export type DirectorFraudAlert = {
  id: number
  createdAt: string
  fraudScore: number | null
  fraudReasons: string | null
  studentId: number
  student: { firstName: string; lastName: string; matricule: string } | null
  classId: number | null
  className: string | null
  presenceId: number
}

export const directorFraudApi = {
  list: () =>
    apiClient
      .get<{ success: boolean; data: DirectorFraudAlert[] }>('/admin/director/fraud-alerts')
      .then((r) => r.data.data),
}
