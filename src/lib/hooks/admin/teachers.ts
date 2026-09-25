import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { teachersApi } from '@/lib/admin/api'

// ── Teachers ───────────────────────────────────────────────────────

export function useTeacherDashboard(teacherId: number) {
  return useQuery({
    queryKey: ['admin', 'teachers', teacherId, 'dashboard'],
    queryFn: () => teachersApi.getDashboard(teacherId),
    staleTime: 60_000,
    enabled: !!teacherId,
    refetchOnWindowFocus: false,
  })
}

export function useTeacherScans(teacherId: number, params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'teachers', teacherId, 'scans', params],
    queryFn: () => teachersApi.getScans(teacherId, params),
    staleTime: 30_000,
    enabled: !!teacherId,
    refetchOnWindowFocus: false,
  })
}

export function useForceValidatePresence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ presenceId, status, reason }: { presenceId: number; status: string; reason?: string }) =>
      teachersApi.forceValidatePresence(presenceId, { status, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'teachers'] })
      qc.invalidateQueries({ queryKey: ['admin', 'presences'] })
    },
  })
}

export function useUpdateTeacherClasses() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ teacherId, classIds }: { teacherId: number; classIds: number[] }) =>
      teachersApi.updateTeacherClasses(teacherId, classIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'teachers'] }),
  })
}
