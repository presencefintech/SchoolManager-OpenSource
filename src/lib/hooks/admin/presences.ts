import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import axios from 'axios'
import { useEmpirePollingInterval } from '@/lib/realtime/empire-realtime-provider'
import { presencesApi } from '@/lib/admin/api'
import { getApiErrorMessage, getBackendMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { RecordPresencePayload, BulkPresencePayload, PresenceLiveFeedEntry, PresenceSecurityAlert } from '@/types/admin'

// ── Presences ─────────────────────────────────────────────────────

export function usePresenceLiveFeed(params?: { classId?: number; page?: number; limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(15_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'live', params],
    queryFn: () => presencesApi.getLiveFeed(params),
    staleTime: 0,
    refetchInterval,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceStats() {
  const refetchInterval = useEmpirePollingInterval(60_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'stats'],
    queryFn: presencesApi.getStats,
    staleTime: 30_000,
    refetchInterval,
  })
}

export function usePresenceHeatmap(classId?: number) {
  return useQuery({
    queryKey: ['admin', 'presences', 'heatmap', classId],
    queryFn: () => presencesApi.getHeatmap(classId),
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function usePresenceAlerts(enabled = true) {
  return useQuery({
    queryKey: ['admin', 'presences', 'alerts'],
    queryFn: presencesApi.getAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled,
  })
}

export function useRecordPresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RecordPresencePayload) => presencesApi.record(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useBulkRecordPresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkPresencePayload) => presencesApi.bulkRecord(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useValidatePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => presencesApi.validate(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'presences'] })
      const feedSnapshots = qc.getQueriesData<{ entries: PresenceLiveFeedEntry[]; total: number }>({
        queryKey: ['admin', 'presences', 'live'],
      })
      feedSnapshots.forEach(([key, data]) => {
        if (!data?.entries) return
        qc.setQueryData(key, {
          ...data,
          entries: data.entries.map((e) =>
            e.id === id ? { ...e, status: e.status ?? 'PRESENT' } : e,
          ),
        })
      })
      return { feedSnapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.feedSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useDeletePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => presencesApi.remove(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'presences'] })
      const feedSnapshots = qc.getQueriesData<{ entries: PresenceLiveFeedEntry[]; total: number }>({
        queryKey: ['admin', 'presences', 'live'],
      })
      feedSnapshots.forEach(([key, data]) => {
        if (!data?.entries) return
        qc.setQueryData(key, {
          ...data,
          entries: data.entries.filter((e) => e.id !== id),
          total: Math.max(0, (data.total ?? data.entries.length) - 1),
        })
      })
      return { feedSnapshots }
    },
    onError: (err, _vars, ctx) => {
      ctx?.feedSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
      const msg =
        getBackendMessage(err) ?? (err instanceof Error ? err.message : 'Erreur lors de la suppression')
      console.error('[useDeletePresence]', msg, axios.isAxiosError(err) ? err.response?.status : undefined)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'stats'] })
    },
  })
}

export function useDismissSecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, note }: { eventId: number; note?: string }) =>
      presencesApi.dismissSecurityAlert(eventId, note),
    onMutate: async ({ eventId }) => {
      const key = ['admin', 'presences', 'alerts'] as const
      await qc.cancelQueries({ queryKey: key })
      const previous = qc.getQueryData<PresenceSecurityAlert[]>(key)
      if (previous) {
        qc.setQueryData(
          key,
          previous.filter((a) => a.id !== eventId),
        )
      }
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) qc.setQueryData(['admin', 'presences', 'alerts'], ctx.previous)
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] })
    },
  })
}

export function useValidateSecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (eventId: number) => presencesApi.validateSecurityAlert(eventId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] })
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useNotifySecurityAlert() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ eventId, message }: { eventId: number; message?: string }) =>
      presencesApi.notifySecurityAlert(eventId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences', 'alerts'] }),
  })
}

export function usePresenceReasonCodes() {
  return useQuery({
    queryKey: ['admin', 'presences', 'reason-codes'],
    queryFn: presencesApi.getReasonCodes,
    staleTime: 3600_000,
  })
}

export function useActiveScanSessions(params?: { classId?: number; limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(30_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'scan-sessions', params],
    queryFn: () => presencesApi.listActiveScanSessions(params),
    staleTime: 15_000,
    refetchInterval,
  })
}

export function useRevokeScanSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sessionId: string) => presencesApi.revokeScanSession(sessionId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'presences', 'scan-sessions'] }),
  })
}

export function useSyncBatches(params?: { limit?: number }) {
  const refetchInterval = useEmpirePollingInterval(60_000, 120_000)
  return useQuery({
    queryKey: ['admin', 'presences', 'sync-batches', params],
    queryFn: () => presencesApi.listSyncBatches(params),
    staleTime: 30_000,
    refetchInterval,
  })
}

export function useSyncBatchDetail(batchId: string | null) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sync-batches', 'detail', batchId],
    queryFn: () => presencesApi.getSyncBatch(batchId!),
    enabled: !!batchId,
    staleTime: 60_000,
  })
}

export function useAttendanceSheetDraft(classId: number, sessionDate?: string) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sheet-draft', classId, sessionDate ?? ''],
    queryFn: () => presencesApi.getSheetDraft(classId, sessionDate),
    enabled: classId > 0,
    staleTime: 0,
  })
}

export function usePendingAttendanceSheets(params?: {
  sessionDate?: string
  classId?: number
  status?: import('@/types/admin').AttendanceSheetStatus
}) {
  return useQuery({
    queryKey: ['admin', 'presences', 'sheets-pending', params],
    queryFn: () => presencesApi.listPendingSheets(params),
    staleTime: 30_000,
    refetchInterval: params?.status === 'SEALED' ? false : 60_000,
  })
}

export function useExportAttendanceSheet() {
  const toast = useToast()
  return useMutation({
    mutationFn: ({ sheetId, format }: { sheetId: number; format: 'pdf' | 'csv' }) =>
      presencesApi.exportSheetRegister(sheetId, format),
    onSuccess: (filename) => {
      toast.success('Téléchargement prêt', filename)
    },
    onError: (err) => {
      toast.error('Export impossible', getApiErrorMessage(err))
    },
  })
}

export function useSubmitAttendanceSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sheetId: number) => presencesApi.submitSheet(sheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useSealAttendanceSheet() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (sheetId: number) => presencesApi.sealSheet(sheetId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}
