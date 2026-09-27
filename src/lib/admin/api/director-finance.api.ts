import { apiClient } from '@/lib/api/client'
import type {
  StudentFinancialSort,
  StudentFinancialStatus,
  StudentsFinancialListResponse,
  StudentsFinancialPrintReport,
} from '@/types/finance'

export type DirectorFinanceSituationParams = {
  classId: number
  status?: StudentFinancialStatus
  sort?: StudentFinancialSort
  page?: number
  limit?: number
}

export const directorFinanceApi = {
  listSituation: (params: DirectorFinanceSituationParams) =>
    apiClient
      .get<{ success: boolean; data: StudentsFinancialListResponse }>(
        '/admin/director/finance/students',
        { params }
      )
      .then((r) => r.data.data),

  exportSituationPrint: (params: DirectorFinanceSituationParams) =>
    apiClient
      .get<{ success: boolean; data: StudentsFinancialPrintReport }>(
        '/admin/director/finance/students/export/print',
        { params }
      )
      .then((r) => r.data.data),
}
