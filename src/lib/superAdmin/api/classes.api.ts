import { apiClient } from '@/lib/api/client'
import { dedupeClassList } from '@/lib/academic/class-identity'
import type {
  ClassListData,
  CapacityAlertItem,
  ClassSetupReport,
  ClassPerformanceStats,
  ClassAuditEntry,
  ClassExport,
  TeacherConflicts,
  RolloverResult,
} from '@/types/super-admin'

export const classesApi = {
  getClasses: (schoolId: number, params?: { page?: number; limit?: number; name?: string }) =>
    apiClient
      .get<ClassListData>('/superadmin/classes', { params: { schoolId, ...params } })
      .then((r) => {
        const payload = r.data
        const data = dedupeClassList(
          (payload.data ?? []).map((c) => ({
            ...c,
            studentCount: c._count?.students ?? 0,
            sectionName: (c as { section?: { name?: string } }).section?.name,
            optionName: (c as { option?: { name?: string } }).option?.name,
          })),
        )
        return { ...payload, data, meta: { ...payload.meta, total: data.length } }
      }),

  getCapacityAlerts: (schoolId: number) =>
    apiClient
      .get<CapacityAlertItem[]>('/superadmin/classes/alerts/capacity', { params: { schoolId } })
      .then((r) => r.data),

  validateSetup: (classId: number) =>
    apiClient
      .get<ClassSetupReport>(`/superadmin/classes/${classId}/validate-setup`)
      .then((r) => r.data),

  getClassAuditTrail: (classId: number) =>
    apiClient
      .get<ClassAuditEntry[]>(`/superadmin/classes/${classId}/audit-trail`)
      .then((r) => r.data),

  getPerformanceStats: (classId: number) =>
    apiClient
      .get<ClassPerformanceStats>(`/superadmin/classes/${classId}/performance-stats`)
      .then((r) => r.data),

  exportFull: (classId: number) =>
    apiClient
      .get<ClassExport>(`/superadmin/classes/${classId}/export-full`)
      .then((r) => r.data),

  getTeacherConflicts: (teacherId: number, academicYear: string) =>
    apiClient
      .get<TeacherConflicts>(`/superadmin/classes/teachers/${teacherId}/conflicts`, {
        params: { academicYear },
      })
      .then((r) => r.data),

  rollover: (schoolId: number, fromYear: string, toYear: string) =>
    apiClient
      .post<RolloverResult>('/superadmin/classes/maintenance/rollover', { schoolId, fromYear, toYear })
      .then((r) => r.data),

  duplicate: (classId: number, newName: string) =>
    apiClient
      .post<{ status: string; data: unknown }>(`/superadmin/classes/${classId}/duplicate`, { newName })
      .then((r) => r.data),
}
