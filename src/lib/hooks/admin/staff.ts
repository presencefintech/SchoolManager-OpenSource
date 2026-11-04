import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { staffApi } from '@/lib/admin/api'
import type { CreateStaffPayload } from '@/types/admin'

// ── Staff ──────────────────────────────────────────────────────────
export function useStaff() {
  return useQuery({
    queryKey: ['admin', 'staff'],
    queryFn: staffApi.list,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateStaffPayload) => staffApi.createStaffUser(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  })
}

export function useDisableStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => staffApi.disable(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'staff'] }),
  })
}

export function useDeactivateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => staffApi.deactivate(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'staff'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
    },
  })
}

export function useBlockStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => staffApi.block(id, reason),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'staff'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
    },
  })
}

export function useActivateStaff() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) => staffApi.activate(id, note),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'staff'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'staff-access'] })
    },
  })
}

export function useResetStaffPassword() {
  return useMutation({
    mutationFn: (id: number) => staffApi.resetPassword(id),
  })
}
