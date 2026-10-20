import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { StudentFeeCategoryInput } from '@/types/admin'

const KEY = ['admin', 'finance', 'student-fee-categories'] as const

/** Catégories tarifaires d'élève de l'école (dynamiques) + plafond de cumul. */
export function useStudentFeeCategories(opts?: { includeInactive?: boolean; enabled?: boolean }) {
  return useQuery({
    queryKey: [...KEY, opts?.includeInactive ? 'all' : 'active'],
    queryFn: () => financeApi.listStudentFeeCategories(opts?.includeInactive),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  })
}

function useInvalidateCatalog() {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: KEY })
    qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-structures-v2'] })
    qc.invalidateQueries({ queryKey: ['admin', 'enrollments', 'fee-preview'] })
  }
}

export function useCreateStudentFeeCategory() {
  const invalidate = useInvalidateCatalog()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: StudentFeeCategoryInput) => financeApi.createStudentFeeCategory(payload),
    onSuccess: (c) => {
      invalidate()
      toast.success('Catégorie créée', c.name)
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useUpdateStudentFeeCategory() {
  const invalidate = useInvalidateCatalog()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<StudentFeeCategoryInput> }) =>
      financeApi.updateStudentFeeCategory(id, payload),
    onSuccess: () => {
      invalidate()
      toast.success('Catégorie enregistrée')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useDeactivateStudentFeeCategory() {
  const invalidate = useInvalidateCatalog()
  const toast = useToast()
  return useMutation({
    mutationFn: (id: number) => financeApi.deactivateStudentFeeCategory(id),
    onSuccess: () => {
      invalidate()
      toast.success('Catégorie désactivée', 'Les obligations déjà calculées sont conservées.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useSetFeeCumulativeCap() {
  const invalidate = useInvalidateCatalog()
  const toast = useToast()
  return useMutation({
    mutationFn: (percent: number | null) => financeApi.setFeeCumulativeCap(percent),
    onSuccess: (r) => {
      invalidate()
      toast.success(
        'Plafond enregistré',
        r.maxCumulativeDiscountPercent == null
          ? 'Aucun plafond de cumul.'
          : `Remises cumulées limitées à ${r.maxCumulativeDiscountPercent} %.`,
      )
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

/** Attributions + catégories effectives d'un élève. */
export function useStudentFeeCategoriesOverview(studentId: number, sessionId?: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'students', studentId, 'fee-categories', sessionId ?? null],
    queryFn: () => financeApi.getStudentFeeCategories(studentId, sessionId),
    enabled: studentId > 0,
    staleTime: 30_000,
  })
}

function useInvalidateStudent(studentId: number) {
  const qc = useQueryClient()
  return () => {
    qc.invalidateQueries({ queryKey: ['admin', 'finance', 'students', studentId] })
    qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
    qc.invalidateQueries({ queryKey: ['finance', 'student', studentId] })
    qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fee-schedule', studentId] })
  }
}

export function useAssignStudentFeeCategory(studentId: number) {
  const invalidate = useInvalidateStudent(studentId)
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: { categoryId: number; sessionId?: number | null; reason?: string }) =>
      financeApi.assignStudentFeeCategory(studentId, payload),
    onSuccess: (data) => {
      invalidate()
      const total = data.obligations?.totalNet
      toast.success(
        'Catégorie attribuée',
        total != null ? `Frais recalculés · net ${total}` : undefined,
      )
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useRevokeStudentFeeCategory(studentId: number) {
  const invalidate = useInvalidateStudent(studentId)
  const toast = useToast()
  return useMutation({
    mutationFn: ({ assignmentId, reason }: { assignmentId: number; reason?: string }) =>
      financeApi.revokeStudentFeeCategory(studentId, assignmentId, reason),
    onSuccess: (data) => {
      invalidate()
      const total = data.obligations?.totalNet
      toast.success(
        'Catégorie retirée',
        total != null ? `Frais recalculés · net ${total}` : undefined,
      )
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}
