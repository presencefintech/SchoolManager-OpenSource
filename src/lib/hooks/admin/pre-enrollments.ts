import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { preEnrollmentApi, schoolAcademicApi, financeApi } from '@/lib/admin/api'
import type { CreatePreEnrollmentPayload, PreEnrollmentStatus } from '@/types/pre-enrollment'

// ── Pré-inscriptions web ───────────────────────────────────────────────────

export function usePreEnrollments(params?: { status?: string; page?: number; limit?: number; schoolId?: number }) {
  return useQuery({
    queryKey: ['admin', 'pre-enrollments', params],
    queryFn: () => preEnrollmentApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolSections(schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'sections', schoolId],
    queryFn: () => schoolAcademicApi.listSections(schoolId),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolOptions(sectionId: number, schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'options', sectionId, schoolId],
    queryFn: () => schoolAcademicApi.listOptions(sectionId, schoolId),
    staleTime: 120_000,
    enabled: sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useSchoolClasses(sectionId: number, optionId?: number, academicYear?: string, schoolId?: number) {
  return useQuery({
    queryKey: ['admin', 'school', 'classes', sectionId, optionId ?? 0, academicYear, schoolId],
    queryFn: () => schoolAcademicApi.listClasses(sectionId, optionId, academicYear, schoolId),
    staleTime: 120_000,
    enabled: sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useCreatePreEnrollment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: CreatePreEnrollmentPayload) => preEnrollmentApi.create(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pre-enrollments'] }),
  })
}

export function useUpdatePreEnrollmentStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, comment }: { id: number; status: PreEnrollmentStatus; comment?: string }) =>
      preEnrollmentApi.updateStatus(id, { status, comment }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'pre-enrollments'] }),
  })
}

export function useSyncBalance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (enrollmentId: number) => financeApi.syncBalance(enrollmentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
      qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
      qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}

export function usePaymentProfile(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-profile'],
    queryFn: () => financeApi.getPaymentProfile(),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function usePaymentOnboarding() {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-profile', 'onboarding'],
    queryFn: () => financeApi.getPaymentOnboarding(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpsertPaymentProfile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeApi.upsertPaymentProfile,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'payment-profile'] })
    },
  })
}

export function useTestPaymentProfileCredentials() {
  return useMutation({
    mutationFn: financeApi.testPaymentProfileCredentials,
  })
}

export function useMarkVerificationProcessed() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ verificationId, notes }: { verificationId: number; notes?: string }) =>
      financeApi.markVerificationProcessed(verificationId, notes),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] }),
  })
}

export function useExportPendingVerifications() {
  return useMutation({
    mutationFn: (format: 'csv' | 'json' = 'csv') => financeApi.exportPendingVerifications(format),
  })
}
