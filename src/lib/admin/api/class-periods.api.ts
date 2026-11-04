import { apiClient } from '@/lib/api/client'
import type {
  ClassPeriodItem,
  CreateClassPeriodPayload,
  UpdateClassPeriodPayload,
} from '@/types/admin'

function unwrapList(raw: unknown): ClassPeriodItem[] {
  if (Array.isArray(raw)) return raw as ClassPeriodItem[]
  const d = raw as { data?: unknown }
  return Array.isArray(d?.data) ? (d.data as ClassPeriodItem[]) : []
}

function unwrapOne(raw: unknown): ClassPeriodItem {
  const d = raw as { data?: ClassPeriodItem }
  return (d?.data ?? raw) as ClassPeriodItem
}

export const classPeriodsApi = {
  list: (params?: {
    teacherId?: number
    classId?: number
    academicYear?: string
    dayOfWeek?: number
    activeOnly?: boolean
  }) =>
    apiClient
      .get('/admin/class-periods', { params })
      .then((r) => unwrapList(r.data)),

  create: (payload: CreateClassPeriodPayload) =>
    apiClient.post('/admin/class-periods', payload).then((r) => unwrapOne(r.data)),

  update: (id: number, payload: UpdateClassPeriodPayload) =>
    apiClient.put(`/admin/class-periods/${id}`, payload).then((r) => unwrapOne(r.data)),

  deactivate: (id: number) =>
    apiClient.delete(`/admin/class-periods/${id}`).then((r) => unwrapOne(r.data)),
}
