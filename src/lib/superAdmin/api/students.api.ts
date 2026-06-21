import { apiClient } from '@/lib/api/client'
import type {
  StudentGlobalStats,
  StudentListResponse,
  StudentDebtorItem,
  StudentDashboard,
  StudentActivityItem,
  StudentDossier,
} from '@/types/super-admin'

export const studentsApi = {
  getSchoolStats: (schoolId: number) =>
    apiClient
      .get<{ success: boolean; data: StudentGlobalStats }>(
        `/superadmin/students-management/schools/${schoolId}/students/stats`
      )
      .then((r) => r.data.data),

  listStudents: (
    schoolId: number,
    params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string }
  ) =>
    apiClient
      .get<{ success: boolean; data: StudentListResponse }>(
        `/superadmin/students-management/schools/${schoolId}/students`,
        { params }
      )
      .then((r) => r.data.data),

  getDebtors: (schoolId: number, minDebt?: number) =>
    apiClient
      .get<{ success: boolean; data: StudentDebtorItem[] }>(
        `/superadmin/students-management/schools/${schoolId}/students/debtors`,
        { params: minDebt !== undefined ? { minDebt } : undefined }
      )
      .then((r) => r.data.data),

  getStudentDashboard: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: StudentDashboard }>(
        `/superadmin/students-management/students/${studentId}/dashboard`
      )
      .then((r) => r.data.data),

  getStudentActivity: (studentId: number, limit = 15) =>
    apiClient
      .get<{ success: boolean; data: StudentActivityItem[] }>(
        `/superadmin/students-management/students/${studentId}/activity`,
        { params: { limit } }
      )
      .then((r) => r.data.data),

  getStudentDossier: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: StudentDossier }>(
        `/superadmin/students-management/students/${studentId}/dossier`
      )
      .then((r) => r.data.data),

  invalidateStats: (schoolId: number) =>
    apiClient
      .delete<{ success: boolean; data: { message: string } }>(
        `/superadmin/students-management/schools/${schoolId}/students/stats/invalidate`
      )
      .then((r) => r.data.data),
}
