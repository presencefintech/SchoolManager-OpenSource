import { apiClient } from '@/lib/api/client'

export type DirectorTeacher = {
  id: number
  firstName: string
  lastName: string
  email: string
  phone: string | null
  classes: Array<{ id: number; name: string }>
}

export type LeaveStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_ADMIN'

export type LeaveRequestPayload = {
  teacherId: number
  fromDate: string
  toDate: string
  reason: string
}

export type LeaveRequestItem = {
  id: number
  teacherId: number
  teacher?: { id: number; firstName: string; lastName: string } | null
  fromDate: string
  toDate: string
  reason: string
  status: LeaveStatus
  decisionNote: string | null
  createdAt: string
  decidedAt: string | null
}

export type TeacherNoteKind = 'OBSERVATION' | 'WARNING' | 'COMMENDATION'

export type TeacherNotePayload = {
  teacherId: number
  kind: TeacherNoteKind
  note: string
}

export type TeacherNoteItem = {
  id: number
  teacherId: number
  kind: TeacherNoteKind
  note: string
  createdAt: string
}

export const directorStaffApi = {
  myTeachers: () =>
    apiClient
      .get<{ success: boolean; data: DirectorTeacher[] }>('/admin/director/staff/teachers')
      .then((r) => r.data.data),

  listLeaves: (params?: { teacherId?: number; status?: LeaveStatus }) =>
    apiClient
      .get<{ success: boolean; data: LeaveRequestItem[] }>('/admin/director/staff/leaves', { params })
      .then((r) => r.data.data),

  createLeave: (payload: LeaveRequestPayload) =>
    apiClient
      .post<{ success: boolean; data: LeaveRequestItem }>('/admin/director/staff/leaves', payload)
      .then((r) => r.data.data),

  decideLeave: (leaveId: number, decision: 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_ADMIN', note?: string) =>
    apiClient
      .post<{ success: boolean; data: LeaveRequestItem }>(
        `/admin/director/staff/leaves/${leaveId}/decide`,
        { decision, note }
      )
      .then((r) => r.data.data),

  listNotes: (teacherId?: number) =>
    apiClient
      .get<{ success: boolean; data: TeacherNoteItem[] }>('/admin/director/staff/notes', {
        params: teacherId ? { teacherId } : undefined,
      })
      .then((r) => r.data.data),

  createNote: (payload: TeacherNotePayload) =>
    apiClient
      .post<{ success: boolean; data: TeacherNoteItem }>('/admin/director/staff/notes', payload)
      .then((r) => r.data.data),
}
