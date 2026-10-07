import { apiClient } from '@/lib/api/client'
import {
  parseContentDispositionFilename,
  triggerBlobDownload,
} from '@/lib/download-blob'
import type { AttendanceHistoryResponse } from './presences.api'

export type DirectorSectionAssignment = {
  id: number
  userId: number
  sectionId: number
  schoolId: number
  section: { id: number; name: string; code: string | null }
}

export type DirectorClassItem = {
  id: number
  name: string
  sectionId: number
  level: string
}

export type DirectorSummary = {
  sectionCount: number
  classCount: number
  presenceToday: number
  absentToday?: number
  studentCount?: number
  sections: Array<{ id: number; name: string; code: string | null }>
  classes: Array<{ id: number; name: string; sectionId: number }>
}

export type DirectorAbsenceItem = {
  id: number
  firstName: string
  lastName: string
  matricule: string
  classId: number | null
  className: string | null
  sectionId: number | null
  sectionName: string | null
  totalAbsences: number
  emergencyContactName: string | null
  emergencyContactPhone: string | null
}

export type DirectorAbsencesResponse = {
  items: DirectorAbsenceItem[]
  total: number
  presentCount: number
  studentCount: number
  absentCount: number
  page: number
  lastPage: number
}

export type DirectorPresenceLiveEntry = {
  id: number
  studentName: string
  matricule: string
  className: string
  scannedAt: string
  status: string
  direction?: 'ARRIVAL' | 'EXIT' | null
  method: string
  security?: {
    isSuspicious?: boolean
    riskScore?: number
    alerts?: string[]
  } | null
}

export type DirectorPresenceLiveResponse = {
  data: DirectorPresenceLiveEntry[]
  pagination?: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type DirectorHeatmapEntry = {
  hour: string
  count: number
}

export type DirectorTodaySheet = {
  sheetId: number
  classId: number
  className: string
  sessionDate: string
  status: 'DRAFT' | 'SUBMITTED' | 'SEALED' | string
  lineCount: number
  presentCount: number
  lateCount: number
  absentCount: number
  submittedAt: string | null
}

export type DirectorPunctualityClassRank = {
  classId: number
  className: string
  enrolled: number
  present: number
  late: number
  onTime: number
  punctualityRate: number
}

export type DirectorPunctualityLatecomer = {
  studentId: number
  studentName: string
  classId: number | null
  className: string | null
  scannedAt: string
  scannedAtLabel: string
}

export type DirectorPunctualityReport = {
  schoolId: number
  schoolName: string
  sessionDate: string
  sessionDateLabel: string
  generatedAt: string
  totals: {
    totalStudents: number
    present: number
    late: number
    onTime: number
    absent: number
    attendanceRate: number
    punctualityRate: number
  }
  classRanking: DirectorPunctualityClassRank[]
  latecomers: DirectorPunctualityLatecomer[]
}

export type DirectorPunctualityDeliverResult = {
  report: DirectorPunctualityReport
  fileName: string
  relativeUrl: string
  byteSize: number
  emailsSent: number
}

export const directorsApi = {
  summary: () =>
    apiClient
      .get<{ success: boolean; data: DirectorSummary }>('/admin/director/summary')
      .then((r) => r.data.data),

  mySections: () =>
    apiClient
      .get<{ success: boolean; data: DirectorSectionAssignment[] }>(
        '/admin/director/sections'
      )
      .then((r) => r.data.data),

  myClasses: () =>
    apiClient
      .get<{ success: boolean; data: DirectorClassItem[] }>(
        '/admin/director/classes'
      )
      .then((r) => r.data.data),

  getAssignedSections: (userId: number) =>
    apiClient
      .get<{ success: boolean; data: DirectorSectionAssignment[] }>(
        `/admin/directors/${userId}/sections`
      )
      .then((r) => r.data.data),

  assignSections: (userId: number, sectionIds: number[]) =>
    apiClient
      .put<{ success: boolean; data: DirectorSectionAssignment[] }>(
        `/admin/directors/${userId}/sections`,
        { sectionIds }
      )
      .then((r) => r.data.data),

  presenceLive: (params?: { classId?: number; page?: number; limit?: number }) =>
    apiClient
      .get<{ success: boolean; data: DirectorPresenceLiveResponse }>(
        '/admin/director/presence/live',
        { params }
      )
      .then((r) => r.data.data),

  presenceHeatmap: (params?: { classId?: number }) =>
    apiClient
      .get<{ success: boolean; data: DirectorHeatmapEntry[] }>(
        '/admin/director/presence/heatmap',
        { params }
      )
      .then((r) => r.data.data),

  presenceAbsences: (params?: {
    classId?: number
    sectionId?: number
    page?: number
    limit?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: DirectorAbsencesResponse }>(
        '/admin/director/presence/absences',
        { params }
      )
      .then((r) => r.data.data),

  presenceHistory: (params?: {
    classId?: number
    sectionId?: number
    studentId?: number
    status?: 'PRESENT' | 'LATE' | 'ABSENT' | 'EXITED'
    from?: string
    to?: string
    sessionId?: number
    page?: number
    limit?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: AttendanceHistoryResponse }>(
        '/admin/director/presence/history',
        { params }
      )
      .then((r) => r.data.data),

  presenceSheets: () =>
    apiClient
      .get<{ success: boolean; data: DirectorTodaySheet[] }>(
        '/admin/director/presence/sheets'
      )
      .then((r) => r.data.data),

  punctualityReport: (params?: { date?: string }) =>
    apiClient
      .get<{ success: boolean; data: DirectorPunctualityReport }>(
        '/admin/director/presence/punctuality-report',
        { params }
      )
      .then((r) => r.data.data),

  punctualityReportDeliver: (params?: { date?: string }) =>
    apiClient
      .get<{ success: boolean; data: DirectorPunctualityDeliverResult }>(
        '/admin/director/presence/punctuality-report',
        { params: { ...params, deliver: true } }
      )
      .then((r) => r.data.data),

  downloadPunctualityReportPdf: async (params?: { date?: string }) => {
    const res = await apiClient.get<Blob>(
      '/admin/director/presence/punctuality-report/pdf',
      { params, responseType: 'blob', timeout: 60_000 }
    )
    const filename = parseContentDispositionFilename(
      res.headers['content-disposition'] as string | undefined,
      `rapport-ponctualite-${params?.date ?? 'jour'}.pdf`
    )
    triggerBlobDownload(res.data, filename)
    return filename
  },
}
