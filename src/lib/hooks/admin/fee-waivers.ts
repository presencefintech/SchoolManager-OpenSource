import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api'
import type {
  FeeWaiverStatus,
  ReviewFeeWaiverPayload,
  UpdateManagerControlsPayload,
} from '@/types/finance'

// ── Remises / exonérations à valider par le Promoteur ─────────────────

export const feeWaiverKeys = {
  all: ['admin', 'finance', 'fee-waivers'] as const,
  list: (params?: { status?: FeeWaiverStatus; studentId?: number }) =>
    [...feeWaiverKeys.all, params ?? {}] as const,
}

export function useFeeWaiverRequests(
  params?: { status?: FeeWaiverStatus; studentId?: number },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: feeWaiverKeys.list(params),
    queryFn: () => financeApi.listFeeWaivers(params),
    enabled: options?.enabled ?? true,
    staleTime: 15_000,
  })
}

export function useReviewFeeWaiver() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: ReviewFeeWaiverPayload & { id: number }) =>
      financeApi.reviewFeeWaiver(id, payload),
    onSuccess: (request) => {
      qc.invalidateQueries({ queryKey: feeWaiverKeys.all })
      // Approuvée : l'attribution et l'échéancier de l'élève changent.
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', request.studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', request.studentId] })
      qc.invalidateQueries({ queryKey: ['finance', 'scholarships'] })
    },
  })
}

// ── Seuils du Promoteur ───────────────────────────────────────────────

const managerControlsKey = ['admin', 'manager-controls'] as const

export function useManagerControls() {
  return useQuery({
    queryKey: managerControlsKey,
    queryFn: financeApi.getManagerControls,
    staleTime: 60_000,
  })
}

export function useUpdateManagerControls() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateManagerControlsPayload) => financeApi.updateManagerControls(payload),
    onSuccess: (controls) => {
      qc.setQueryData(managerControlsKey, controls)
      // Le seuil de validation change qui valide dans la file de vérification.
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] })
    },
  })
}
