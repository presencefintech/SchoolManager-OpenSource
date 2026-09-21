import { apiClient } from '@/lib/api/client'

export type MeetingStatus = 'SCHEDULED' | 'HELD' | 'CANCELLED'

export type MeetingPayload = {
  title: string
  sectionId?: number | null
  classId?: number | null
  scheduledAt: string
  location?: string
  agenda?: string
}

export type MeetingItem = {
  id: number
  title: string
  sectionId: number | null
  sectionName: string | null
  classId: number | null
  className: string | null
  scheduledAt: string
  location: string | null
  agenda: string | null
  minutes: string | null
  attendeeCount: number | null
  status: MeetingStatus
  createdAt: string
}

export type ReportPeriod = 'MONTHLY' | 'QUARTERLY' | 'SEMESTER' | 'ANNUAL'
export type ReportStatus = 'DRAFT' | 'FINALIZED' | 'SUBMITTED'

export type PeriodicReportPayload = {
  period: ReportPeriod
  from: string
  to: string
  summary: string
}

export type PeriodicReportItem = {
  id: number
  period: ReportPeriod
  from: string
  to: string
  summary: string
  status: ReportStatus
  createdAt: string
  finalizedAt: string | null
  submittedAt: string | null
}

export const directorOutreachApi = {
  listMeetings: (params?: { status?: MeetingStatus }) =>
    apiClient
      .get<{ success: boolean; data: MeetingItem[] }>('/admin/director/meetings', { params })
      .then((r) => r.data.data),

  createMeeting: (payload: MeetingPayload) =>
    apiClient
      .post<{ success: boolean; data: MeetingItem }>('/admin/director/meetings', payload)
      .then((r) => r.data.data),

  markMeetingHeld: (meetingId: number, payload: { minutes: string; attendeeCount?: number }) =>
    apiClient
      .post<{ success: boolean; data: MeetingItem }>(
        `/admin/director/meetings/${meetingId}/held`,
        payload
      )
      .then((r) => r.data.data),

  cancelMeeting: (meetingId: number) =>
    apiClient
      .post<{ success: boolean; data: MeetingItem }>(`/admin/director/meetings/${meetingId}/cancel`)
      .then((r) => r.data.data),

  listReports: (params?: { period?: ReportPeriod; status?: ReportStatus }) =>
    apiClient
      .get<{ success: boolean; data: PeriodicReportItem[] }>('/admin/director/reports', { params })
      .then((r) => r.data.data),

  createReport: (payload: PeriodicReportPayload) =>
    apiClient
      .post<{ success: boolean; data: PeriodicReportItem }>('/admin/director/reports', payload)
      .then((r) => r.data.data),

  finalizeReport: (reportId: number) =>
    apiClient
      .post<{ success: boolean; data: PeriodicReportItem }>(
        `/admin/director/reports/${reportId}/finalize`
      )
      .then((r) => r.data.data),

  submitReport: (reportId: number) =>
    apiClient
      .post<{ success: boolean; data: PeriodicReportItem }>(
        `/admin/director/reports/${reportId}/submit`
      )
      .then((r) => r.data.data),
}
