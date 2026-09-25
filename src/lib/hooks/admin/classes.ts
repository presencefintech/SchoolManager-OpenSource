import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesApi, classPeriodsApi } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'
import type { CreateClassPeriodPayload, UpdateClassPeriodPayload, CreateClassPayload } from '@/types/admin'

// ── Classes ────────────────────────────────────────────────────────

export function useClasses(params?: { search?: string; isActive?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'classes', 'list', params],
    queryFn: () => classesApi.list(params),
    enabled: !!getAuthToken(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useClassPeriods(params?: {
  teacherId?: number
  classId?: number
  academicYear?: string
  dayOfWeek?: number
  activeOnly?: boolean
}) {
  return useQuery({
    queryKey: ['admin', 'class-periods', params],
    queryFn: () => classPeriodsApi.list(params),
    enabled: !!getAuthToken(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClassPeriodPayload) => classPeriodsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
  })
}

export function useUpdateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: UpdateClassPeriodPayload }) =>
      classPeriodsApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
  })
}

export function useDeactivateClassPeriod() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => classPeriodsApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'class-periods'] }),
  })
}

export function useClassDetail(id: number) {
  return useQuery({
    queryKey: ['admin', 'classes', id],
    queryFn: () => classesApi.getById(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useClassStats(id: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'stats'],
    queryFn: () => classesApi.getStats(id),
    staleTime: 60_000,
    enabled: !!id && enabled,
    refetchOnWindowFocus: false,
  })
}

export function useClassAudit(id: number, enabled = true) {
  return useQuery({
    queryKey: ['admin', 'classes', id, 'audit'],
    queryFn: () => classesApi.getAudit(id),
    staleTime: 120_000,
    enabled: !!id && enabled,
    refetchOnWindowFocus: false,
  })
}

export function useCreateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateClassPayload) => classesApi.create(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'structure'] })
    },
  })
}
