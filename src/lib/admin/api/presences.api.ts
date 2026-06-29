import { apiClient } from '@/lib/api/client'
import { parseFraudReasons } from '@/lib/admin/fraud-alert.utils'
import type {
  PresenceLiveFeedEntry, PresenceStats, PresenceHeatmapEntry,
  PresenceSecurityAlert, SessionQR, RecordPresencePayload, BulkPresencePayload,
  AdminPresenceRecordResult, BulkPresenceRecordResult,
} from '@/types/admin'

function normalizeSecurityAlert(raw: Record<string, unknown>): PresenceSecurityAlert {
  const base = raw as unknown as PresenceSecurityAlert
  return {
    ...base,
    fraudReasons: parseFraudReasons(raw.fraudReasons),
  }
}

export const presencesApi = {
  getLiveFeed: (params?: { classId?: number; page?: number; limit?: number }) =>
    apiClient.get<{ success: boolean; data: any }>('/admin/presences/live', { params })
      .then(r => {
        const d = r.data.data
        const entries: PresenceLiveFeedEntry[] = (d?.data ?? []).map((p: any) => ({
          id:          p.id,
          studentName: p.studentName,
          matricule:   p.matricule,
          className:   p.className,
          scannedAt:   p.scannedAt,
          status:      p.status,
          method:      p.method,
          security:    p.security ?? null,
          location:    p.location ?? null,
        }))
        return { entries, total: d?.pagination?.total ?? 0, pagination: d?.pagination }
      }),

  getStats: () =>
    apiClient.get<{ success: boolean; data: any }>('/admin/presences/stats')
      .then(r => {
        const d = r.data.data
        return {
          present:        d?.overview?.present       ?? 0,
          absent:         d?.overview?.absent        ?? 0,
          late:           d?.overview?.late          ?? 0,
          totalStudents:  d?.overview?.totalStudents ?? 0,
          attendanceRate: d?.attendanceRate          ?? 0,
          criticalFraud:  d?.alerts?.criticalFraud   ?? 0,
        } satisfies PresenceStats
      }),

  getHeatmap: (classId?: number) =>
    apiClient.get<{ success: boolean; data: PresenceHeatmapEntry[] }>('/admin/presences/heatmap', {
      params: classId ? { classId } : undefined,
    }).then(r => r.data.data ?? []),

  getAlerts: () =>
    apiClient.get<{ success: boolean; data: any[] }>('/admin/presences/alerts')
      .then(r => (r.data.data ?? []).map((row) => normalizeSecurityAlert(row))),

  generateSessionQR: (classId: number) =>
    apiClient.get<{ success: boolean; data: SessionQR }>('/admin/presences/session-qr', {
      params: { classId },
    }).then(r => r.data.data),

  record: (payload: RecordPresencePayload) =>
    apiClient.post<{ success: boolean; data: AdminPresenceRecordResult; statusCode?: number }>(
      '/admin/presences/record',
      payload
    ).then(r => r.data.data),

  bulkRecord: (payload: BulkPresencePayload) =>
    apiClient.post<{ success: boolean; data: BulkPresenceRecordResult; message?: string; statusCode?: number }>(
      '/admin/presences/bulk',
      payload
    ).then(r => ({
      data: r.data.data,
      message: r.data.message,
      statusCode: r.status,
    })),

  validate: (id: number, reason?: string) =>
    apiClient.patch<{ success: boolean; data: any }>(`/admin/presences/${id}/validate`, { reason })
      .then(r => r.data.data),

  remove: (id: number, reason?: string) =>
    apiClient.delete<{ success: boolean; data: null }>(`/admin/presences/${id}`, {
      data: { reason },
      headers: { 'Content-Type': 'application/json' },
    }).then(r => r.data),

  dismissSecurityAlert: (eventId: number, note?: string) =>
    apiClient.patch(`/admin/presences/security-events/${eventId}/dismiss`, { note })
      .then((r) => r.data),

  validateSecurityAlert: (eventId: number) =>
    apiClient.patch(`/admin/presences/security-events/${eventId}/validate`, {})
      .then((r) => r.data),

  notifySecurityAlert: (eventId: number, message?: string) =>
    apiClient.post(`/admin/presences/security-events/${eventId}/notify`, { message })
      .then((r) => r.data),
}
