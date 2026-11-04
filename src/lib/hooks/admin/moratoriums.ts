import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api'
import type { CreateMoratoriumPayload, MoratoriumType, UpdateMoratoriumPolicyPayload } from '@/types/admin'

// ── Moratoriums ────────────────────────────────────────────────────

export function useMoratoriumPolicy(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', 'policy'],
    queryFn: () => financeApi.getMoratoriumPolicy(),
    staleTime: 600_000,
    gcTime: 1_800_000,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    retry: (failureCount, error) => {
      const status = (error as { response?: { status?: number } })?.response?.status
      if (status === 429) return false
      return failureCount < 1
    },
    enabled: options?.enabled ?? true,
  })
}

export function useAllowedMoratoriumTypes(options?: { enabled?: boolean }) {
  const { data: policy, isLoading, isError, error } = useMoratoriumPolicy(options)
  const ALL: MoratoriumType[] = ['MONTHLY', 'QUARTERLY', 'EXCEPTIONAL', 'SCHOLARSHIP_REVIEW']
  const allowedTypes: MoratoriumType[] = policy?.allowedTypes?.length
    ? policy.allowedTypes.filter((t): t is MoratoriumType => ALL.includes(t as MoratoriumType))
    : ['EXCEPTIONAL', 'MONTHLY']
  const defaultType: MoratoriumType = allowedTypes.includes('EXCEPTIONAL')
    ? 'EXCEPTIONAL'
    : allowedTypes[0] ?? 'EXCEPTIONAL'
  return { allowedTypes, defaultType, isLoading, isError, error, policy }
}

export function useMoratoriums(params?: { studentId?: number; status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', params],
    queryFn: () => financeApi.listMoratoriums(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateMoratoriumPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: UpdateMoratoriumPolicyPayload) => financeApi.updateMoratoriumPolicy(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums', 'policy'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] })
    },
  })
}

export function useApproveMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, internalNote }: { id: number; internalNote?: string }) =>
      financeApi.approveMoratorium(id, { internalNote }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useRejectMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      financeApi.rejectMoratorium(id, reason),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useMoratoriumRecoveryRate() {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', 'recovery-rate'],
    queryFn: financeApi.getMoratoriumRecoveryRate,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useCreateMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateMoratoriumPayload) => financeApi.createMoratorium(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useUpdateMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateMoratoriumPayload> }) =>
      financeApi.updateMoratorium(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useRevokeMoratorium() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeApi.revokeMoratorium(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}

export function useAdminRefundRequests(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'refunds', params],
    queryFn: () => financeApi.listRefundRequests(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useAdminRefundRequest(id: number | null) {
  return useQuery({
    queryKey: ['admin', 'finance', 'refunds', 'detail', id],
    queryFn: () => financeApi.getRefundRequest(id!),
    enabled: id != null && id > 0,
    staleTime: 15_000,
  })
}

export function useAdminStudentFeePeriodStatus(studentId: number, feeStructureId?: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-periods', studentId, feeStructureId],
    queryFn: () => financeApi.getStudentFeePeriodStatus(studentId, feeStructureId!),
    enabled: studentId > 0 && !!feeStructureId,
    staleTime: 30_000,
  })
}

export function useReviewRefundRequest() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reviewNotes }: { id: number; action: 'approve' | 'reject'; reviewNotes?: string }) =>
      financeApi.reviewRefund(id, { action, reviewNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'refunds'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['finance', 'refunds'] })
    },
  })
}

/** Alias guide F-12 */
export const useReviewRefund = useReviewRefundRequest

export function useFinancialSealBatches(params?: {
  status?: string
  page?: number
  limit?: number
  fromDate?: string
  toDate?: string
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'seal-batches', params],
    queryFn: () => financeApi.listSealBatches(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinancialSealBatchDetail(batchId: number | null) {
  return useQuery({
    queryKey: ['admin', 'finance', 'seal-batch', batchId],
    queryFn: () => financeApi.getSealBatch(batchId!),
    enabled: batchId != null,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useVerifySealBatch() {
  return useMutation({
    mutationFn: (batchId: number) => financeApi.verifySealBatch(batchId),
  })
}

export function useCreateSealBatch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.createSealBatch,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'seal-batches'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'seal-batch'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'advanced-search'] })
    },
  })
}
