import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import type {
  AlertSettings,
  AlertSettingsPayload,
  AttendanceStaffMember,
  AttendanceStaffPayload,
  CorrectionPayload,
  StaffCorrection,
  StaffDayBoard,
  StaffLeave,
  StaffLeavePayload,
  StaffMission,
  StaffMissionPayload,
  StaffMonth,
  StaffReportRow,
  StaffSchedule,
  StaffSchedulePayload,
  StaffTerminal,
  StaffTerminalPayload,
  UnmatchedCode,
} from '@/types/staff-attendance'

const BASE = '/admin/staff-attendance'

type Envelope<T> = { success: boolean; data: T }

/** Clés de requête React Query — un seul endroit pour que toutes les vues invalident de concert. */
export const staffAttendanceKeys = {
  day: (date?: string) => ['staff-attendance', 'day', date ?? 'today'] as const,
  staffList: (active?: boolean) => ['staff-attendance', 'staff', active ?? 'all'] as const,
  staffMonth: (staffId: number, month: string) => ['staff-attendance', 'staff', staffId, 'month', month] as const,
  report: (month: string) => ['staff-attendance', 'report', month] as const,
  schedules: () => ['staff-attendance', 'schedules'] as const,
  leaves: (params?: { staffMemberId?: number; from?: string; to?: string }) =>
    ['staff-attendance', 'leaves', params ?? {}] as const,
  missions: (params?: { staffMemberId?: number; from?: string; to?: string }) =>
    ['staff-attendance', 'missions', params ?? {}] as const,
  terminals: () => ['staff-attendance', 'terminals'] as const,
  unmatched: () => ['staff-attendance', 'unmatched'] as const,
  corrections: (month: string, staffMemberId?: number) =>
    ['staff-attendance', 'corrections', month, staffMemberId ?? 'all'] as const,
  alertSettings: () => ['staff-attendance', 'alert-settings'] as const,
}

export interface ReportPdfResult {
  blob: Blob
  filename: string
  hash: string | null
}

async function blobErrorMessage(error: unknown): Promise<string> {
  if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
    try {
      const text = await error.response.data.text()
      const json = JSON.parse(text) as { message?: string }
      if (typeof json.message === 'string' && json.message) return json.message
    } catch {
      /* ignore */
    }
  }
  return 'Impossible de générer le rapport PDF.'
}

export const staffAttendanceApi = {
  // --- Consultation ---------------------------------------------------
  getDay: (date?: string) =>
    apiClient
      .get<Envelope<StaffDayBoard>>(`${BASE}/day`, { params: date ? { date } : undefined })
      .then((r) => r.data.data),

  getStaffMonth: (staffId: number, month: string) =>
    apiClient
      .get<Envelope<StaffMonth>>(`${BASE}/staff/${staffId}/month`, { params: { month } })
      .then((r) => r.data.data),

  getReport: (month: string) =>
    apiClient.get<Envelope<StaffReportRow[]>>(`${BASE}/report`, { params: { month } }).then((r) => r.data.data),

  downloadReportPdf: async (month: string): Promise<ReportPdfResult> => {
    try {
      const res = await apiClient.get(`${BASE}/report.pdf`, {
        params: { month },
        responseType: 'blob',
      })
      const disposition = res.headers['content-disposition'] as string | undefined
      const match = disposition ? /filename="?([^";\n]+)"?/i.exec(disposition) : null
      return {
        blob: res.data as Blob,
        filename: match?.[1]?.trim() ?? `rapport-presence-personnel-${month}.pdf`,
        hash: (res.headers['x-document-hash'] as string | undefined) ?? null,
      }
    } catch (err) {
      throw new Error(await blobErrorMessage(err))
    }
  },

  // --- Personnel --------------------------------------------------------
  listStaff: (active?: boolean) =>
    apiClient
      .get<Envelope<AttendanceStaffMember[]>>(`${BASE}/staff`, { params: active == null ? undefined : { active } })
      .then((r) => r.data.data),

  createStaff: (payload: AttendanceStaffPayload) =>
    apiClient.post<Envelope<AttendanceStaffMember>>(`${BASE}/staff`, payload).then((r) => r.data.data),

  updateStaff: (id: number, payload: Partial<AttendanceStaffPayload>) =>
    apiClient.patch<Envelope<AttendanceStaffMember>>(`${BASE}/staff/${id}`, payload).then((r) => r.data.data),

  deactivateStaff: (id: number) =>
    apiClient.delete<Envelope<AttendanceStaffMember>>(`${BASE}/staff/${id}`).then((r) => r.data.data),

  reactivateStaff: (id: number) =>
    apiClient.post<Envelope<AttendanceStaffMember>>(`${BASE}/staff/${id}/reactivate`).then((r) => r.data.data),

  // --- Horaires -----------------------------------------------------------
  listSchedules: () =>
    apiClient.get<Envelope<StaffSchedule[]>>(`${BASE}/schedules`).then((r) => r.data.data),

  createSchedule: (payload: StaffSchedulePayload) =>
    apiClient.post<Envelope<StaffSchedule>>(`${BASE}/schedules`, payload).then((r) => r.data.data),

  updateSchedule: (id: number, payload: Partial<StaffSchedulePayload>) =>
    apiClient.patch<Envelope<StaffSchedule>>(`${BASE}/schedules/${id}`, payload).then((r) => r.data.data),

  deleteSchedule: (id: number) =>
    apiClient.delete<Envelope<{ id: number }>>(`${BASE}/schedules/${id}`).then((r) => r.data.data),

  // --- Congés --------------------------------------------------------------
  listLeaves: (params?: { staffMemberId?: number; from?: string; to?: string }) =>
    apiClient.get<Envelope<StaffLeave[]>>(`${BASE}/leaves`, { params }).then((r) => r.data.data),

  createLeave: (payload: StaffLeavePayload) =>
    apiClient.post<Envelope<StaffLeave>>(`${BASE}/leaves`, payload).then((r) => r.data.data),

  deleteLeave: (id: number) =>
    apiClient.delete<Envelope<{ id: number }>>(`${BASE}/leaves/${id}`).then((r) => r.data.data),

  // --- Missions --------------------------------------------------------------
  listMissions: (params?: { staffMemberId?: number; from?: string; to?: string }) =>
    apiClient.get<Envelope<StaffMission[]>>(`${BASE}/missions`, { params }).then((r) => r.data.data),

  createMission: (payload: StaffMissionPayload) =>
    apiClient.post<Envelope<StaffMission>>(`${BASE}/missions`, payload).then((r) => r.data.data),

  deleteMission: (id: number) =>
    apiClient.delete<Envelope<{ id: number }>>(`${BASE}/missions/${id}`).then((r) => r.data.data),

  // --- Terminaux --------------------------------------------------------------
  listTerminals: () =>
    apiClient.get<Envelope<StaffTerminal[]>>(`${BASE}/terminals`).then((r) => r.data.data),

  createTerminal: (payload: StaffTerminalPayload) =>
    apiClient.post<Envelope<StaffTerminal>>(`${BASE}/terminals`, payload).then((r) => r.data.data),

  updateTerminal: (id: number, payload: { name?: string; active?: boolean }) =>
    apiClient.patch<Envelope<StaffTerminal>>(`${BASE}/terminals/${id}`, payload).then((r) => r.data.data),

  listUnmatched: () =>
    apiClient.get<Envelope<UnmatchedCode[]>>(`${BASE}/unmatched`).then((r) => r.data.data),

  assignUnmatched: (code: string, staffMemberId: number) =>
    apiClient
      .post<Envelope<{ code: string }>>(`${BASE}/unmatched/${code}/assign`, { staffMemberId })
      .then((r) => r.data.data),

  // --- Corrections --------------------------------------------------------------
  listCorrections: (month: string, staffMemberId?: number) =>
    apiClient
      .get<Envelope<StaffCorrection[]>>(`${BASE}/corrections`, { params: { month, staffMemberId } })
      .then((r) => r.data.data),

  putCorrection: (staffId: number, date: string, payload: CorrectionPayload) =>
    apiClient
      .put<Envelope<StaffCorrection>>(`${BASE}/staff/${staffId}/days/${date}/correction`, payload)
      .then((r) => r.data.data),

  deleteCorrection: (staffId: number, date: string) =>
    apiClient.delete<Envelope<{ date: string }>>(`${BASE}/staff/${staffId}/days/${date}/correction`).then((r) => r.data.data),

  // --- Alerte matinale --------------------------------------------------------------
  getAlertSettings: () =>
    apiClient.get<Envelope<AlertSettings>>(`${BASE}/alert-settings`).then((r) => r.data.data),

  updateAlertSettings: (payload: AlertSettingsPayload) =>
    apiClient.put<Envelope<AlertSettings>>(`${BASE}/alert-settings`, payload).then((r) => r.data.data),
}
