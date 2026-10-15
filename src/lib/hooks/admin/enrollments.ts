import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { enrollmentsApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { CreateEnrollmentPayload } from '@/types/admin'

// ── Enrollments ─────────────────────────────────────────────────────
export function useEnrollments(params?: { page?: number; limit?: number; search?: string; status?: string }) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'list', params],
    queryFn: () => enrollmentsApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useEnrollmentsByClass(classId: number) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'class', classId],
    queryFn: () => enrollmentsApi.listByClass(classId),
    enabled: !!classId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useEnrollmentDetail(studentId: number) {
  return useQuery({
    queryKey: ['admin', 'enrollments', studentId],
    queryFn: () => enrollmentsApi.getDetail(studentId),
    staleTime: 60_000,
    enabled: !!studentId,
    refetchOnWindowFocus: false,
  })
}

export function useCreateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreateEnrollmentPayload & { idempotencyKey?: string }) =>
      enrollmentsApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useApproveEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.approve(studentId),
    onSuccess: (_data, studentId) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
    },
  })
}

export function useRejectEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, reason }: { studentId: number; reason: string }) =>
      enrollmentsApi.reject(studentId, reason),
    onSuccess: (_data, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
    },
  })
}

export function useFinalizeEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (studentId: number) => enrollmentsApi.finalize(studentId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useToggleLock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, isLocked }: { studentId: number; isLocked: boolean }) =>
      enrollmentsApi.toggleLock(studentId, isLocked),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', 'list'] })
    },
  })
}

export function useAcademicSessions() {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'sessions'],
    queryFn: () => enrollmentsApi.listSessions(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function inferSchoolYearLabel(now = new Date()) {
  const y = now.getFullYear()
  const m = now.getMonth() + 1
  return m >= 9 ? `${y}-${y + 1}` : `${y - 1}-${y}`
}

export function useOpenAcademicSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (label?: string) => enrollmentsApi.openSession(label),
    onSuccess: (session) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', 'sessions'] })
      qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
      toast.success('Année scolaire', `${session.label} est maintenant l’année courante.`)
    },
    onError: (err) => {
      toast.error('Année scolaire', getApiErrorMessage(err))
    },
  })
}

export function useEnrollmentFeePreview(
  classId?: number,
  options?: {
    sessionId?: number
    studentId?: number
    explicitFeeStructureIds?: number[]
    studentCategory?: string
    scholarshipPercent?: number
    customCategoryLabel?: string
  },
) {
  const explicitKey = (options?.explicitFeeStructureIds ?? []).slice().sort((a, b) => a - b).join(',')
  return useQuery({
    queryKey: [
      'admin',
      'enrollments',
      'fee-preview',
      classId,
      options?.sessionId ?? null,
      options?.studentId ?? null,
      explicitKey,
      options?.studentCategory ?? null,
      options?.scholarshipPercent ?? null,
      options?.customCategoryLabel ?? null,
    ],
    queryFn: () =>
      enrollmentsApi.getFeePreview({
        classId: classId!,
        sessionId: options?.sessionId,
        studentId: options?.studentId,
        explicitFeeStructureIds: options?.explicitFeeStructureIds,
        studentCategory: options?.studentCategory,
        scholarshipPercent: options?.scholarshipPercent,
        customCategoryLabel: options?.customCategoryLabel,
      }),
    enabled: !!classId && classId > 0,
    staleTime: 60_000,
  })
}

export function useIntakeInbox(params?: { kind?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'enrollments', 'inbox', params],
    queryFn: () => enrollmentsApi.getIntakeInbox(params),
    staleTime: 20_000,
  })
}

export function useRentreePack() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      ...payload
    }: {
      studentId: number
      sessionId?: number
      classId?: number
      feesPaid?: number
      collectDeposit?: boolean
      paymentNotes?: string
      type?: string
      explicitFeeStructureIds?: number[]
      autoAssignExplicitFees?: boolean
      idempotencyKey?: string
    }) => enrollmentsApi.applyRentreePack(studentId, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function useEnrollInSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      studentId,
      ...payload
    }: {
      studentId: number
      sessionId: number
      classId?: number
      type?: string
      autoAssignExplicitFees?: boolean
      explicitFeeStructureIds?: number[]
    }) => enrollmentsApi.enrollInSession(studentId, payload),
    onSuccess: (_data, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-schedule', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'fee-assignments', studentId] })
    },
  })
}

export function useUpdateAdministrativeProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: Record<string, unknown> }) =>
      enrollmentsApi.updateAdministrativeProfile(studentId, payload),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] })
    },
  })
}

export function usePromoteStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, newClassId }: { studentId: number; newClassId: number }) =>
      enrollmentsApi.promote(studentId, newClassId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useUpdateEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, payload }: { studentId: number; payload: Partial<CreateEnrollmentPayload> }) =>
      enrollmentsApi.update(studentId, payload),
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
    },
  })
}

export function useTransferEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, targetSchoolId, newClassId }: { studentId: number; targetSchoolId: number; newClassId?: number }) =>
      enrollmentsApi.transfer(studentId, targetSchoolId, newClassId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useSetReminderPause() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, paused }: { studentId: number; paused: boolean }) =>
      enrollmentsApi.setReminderPause(studentId, paused),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function usePurgeEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, confirmationToken }: { studentId: number; confirmationToken: string }) =>
      enrollmentsApi.purge(studentId, confirmationToken),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] }),
  })
}

export function useUpdateBiometrics() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, photo }: { studentId: number; photo: File }) => {
      const fd = new FormData()
      fd.append('photo', photo)
      return enrollmentsApi.updateBiometrics(studentId, fd)
    },
    onSuccess: (_, { studentId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments', studentId] })
    },
  })
}
