import { apiClient } from '@/lib/api/client'
import type { TeacherDashboard, TeacherScanEntry } from '@/types/admin'

export type TeacherSanctionType = 'WARNING' | 'BLAME' | 'SUSPENSION' | 'OTHER'

export type TeacherDisciplinaryRecord = {
  id: number
  teacherId: number
  infractionDate: string
  reason: string
  sanctionType: TeacherSanctionType
  notes?: string | null
  createdAt?: string
  issuedBy?: { id: number; firstName?: string | null; lastName?: string | null } | null
}

export type TeacherPerformance = {
  teacherId: number
  onTimeSubmissionRate: number | null
  submittedCount: number
  onTimeCount: number
  approvedFirstPass: number
  rejectedPlans: number
  rejectionEvents: number
  sanctionCount: number
  sanctions?: Array<{
    id: number
    infractionDate: string
    sanctionType: TeacherSanctionType
    reason: string
    createdAt?: string
  }>
}

export const teachersApi = {
  getDashboard: (teacherId: number) =>
    apiClient.get(`/admin/teachers/support/${teacherId}/dashboard`).then(r => r.data.data as TeacherDashboard),

  getScans: (teacherId: number, params?: { page?: number; limit?: number }) =>
    apiClient.get(`/admin/teachers/support/${teacherId}/scans`, { params }).then(r => (r.data.data ?? []) as TeacherScanEntry[]),

  forceValidatePresence: (presenceId: number, payload: { status: string; reason?: string }) =>
    apiClient.patch(`/admin/teachers/presence/${presenceId}/force-validate`, payload).then(r => r.data.data),

  updateTeacherClasses: (teacherId: number, classIds: number[]) =>
    apiClient.put(`/admin/teachers/management/${teacherId}/classes`, { classIds }).then(r => r.data.data),

  /** Teacher.id (profil), pas User.id */
  getPerformance: (teacherProfileId: number) =>
    apiClient
      .get(`/admin/teachers/${teacherProfileId}/performance`)
      .then((r) => r.data.data as TeacherPerformance),

  listDisciplinary: (teacherProfileId: number) =>
    apiClient
      .get(`/admin/teachers/${teacherProfileId}/disciplinary`)
      .then((r) => (r.data.data ?? []) as TeacherDisciplinaryRecord[]),

  addDisciplinary: (
    teacherProfileId: number,
    body: {
      infractionDate: string
      reason: string
      sanctionType: TeacherSanctionType
      notes?: string
    },
  ) =>
    apiClient
      .post(`/admin/teachers/${teacherProfileId}/disciplinary`, body)
      .then((r) => r.data.data as TeacherDisciplinaryRecord),
}
