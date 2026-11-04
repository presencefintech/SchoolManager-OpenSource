import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi, adminCloudinaryApi } from '@/lib/admin/api'
import type { StudentSecurityAction, StudentApplication, StudentDetail, StudentListItem, PaginatedResponse } from '@/types/admin'

// ── Students ───────────────────────────────────────────────────────
export function useStudentDashboard() {
  return useQuery({
    queryKey: ['admin', 'students', 'dashboard'],
    queryFn: studentsApi.getMainDashboard,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudents(
  params?: { page?: number; limit?: number; search?: string; classId?: number; status?: string },
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['admin', 'students', 'list', params],
    queryFn: () => studentsApi.list(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  })
}

export function useIncompleteDossiers(params?: { page?: number; limit?: number; gap?: string }) {
  return useQuery({
    queryKey: ['admin', 'students', 'desk-incomplete', params],
    queryFn: () => studentsApi.listIncompleteDossiers(params),
    staleTime: 20_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudentDetail(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'detail'],
    queryFn: () => studentsApi.getDetail(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useStudentActivity(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'activity'],
    queryFn: () => studentsApi.getActivity(id),
    staleTime: 30_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useDossierStatus(id: number) {
  return useQuery({
    queryKey: ['admin', 'students', id, 'dossier'],
    queryFn: () => studentsApi.getDossierStatus(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useDebtors() {
  return useQuery({
    queryKey: ['admin', 'students', 'debtors'],
    queryFn: studentsApi.getDebtors,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useStudentApplications(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'students', 'applications', params],
    queryFn: () => studentsApi.listApplications(params),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useApproveApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => studentsApi.approveApplication(id),
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'applications'] })
      const snapshots = qc.getQueriesData<PaginatedResponse<StudentApplication>>({
        queryKey: ['admin', 'students', 'applications'],
      })
      snapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((a) => (a.id === id ? { ...a, status: 'APPROVED' as const } : a)),
        })
      })
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] })
    },
  })
}

export function useRejectApplication() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) => studentsApi.rejectApplication(id, reason),
    onMutate: async ({ id }) => {
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'applications'] })
      const snapshots = qc.getQueriesData<PaginatedResponse<StudentApplication>>({
        queryKey: ['admin', 'students', 'applications'],
      })
      snapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((a) => (a.id === id ? { ...a, status: 'REJECTED' as const } : a)),
        })
      })
      return { snapshots }
    },
    onError: (_err, _vars, ctx) => {
      ctx?.snapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'applications'] })
    },
  })
}

export function useSecurityAction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, action, reason }: { id: number; action: StudentSecurityAction; reason?: string }) =>
      studentsApi.securityAction(id, action, reason),
    onMutate: async ({ id, action }) => {
      const locked = action === 'BLOCK'
      const detailKey = ['admin', 'students', id] as const
      await qc.cancelQueries({ queryKey: detailKey })
      await qc.cancelQueries({ queryKey: ['admin', 'students', 'list'] })

      const previousDetail = qc.getQueryData<StudentDetail>(detailKey)
      if (previousDetail) {
        qc.setQueryData<StudentDetail>(detailKey, {
          ...previousDetail,
          isPaymentLocked: locked,
        })
      }

      const listSnapshots = qc.getQueriesData<PaginatedResponse<StudentListItem>>({
        queryKey: ['admin', 'students', 'list'],
      })
      listSnapshots.forEach(([key, data]) => {
        if (!data?.data) return
        qc.setQueryData(key, {
          ...data,
          data: data.data.map((s) =>
            s.id === id ? { ...s, isPaymentLocked: locked } : s,
          ),
        })
      })

      return { previousDetail, listSnapshots }
    },
    onError: (_err, { id }, ctx) => {
      if (ctx?.previousDetail) qc.setQueryData(['admin', 'students', id], ctx.previousDetail)
      ctx?.listSnapshots.forEach(([key, data]) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: (_data, _err, { id }) => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students', id] })
      void qc.invalidateQueries({ queryKey: ['admin', 'students', 'list'] })
    },
  })
}

export function useLogPiiAccess() {
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason: string }) => studentsApi.logPiiAccess(id, reason),
  })
}

export function useUploadStudentPhoto() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, file, description }: { studentId: number; file: File; description?: string }) =>
      adminCloudinaryApi.uploadPhoto(studentId, file, description),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
  })
}
/** Import batch photos — matching {numeroCourt|matricule}.ext (+ biométrie FACE optionnelle) */
export function useBatchStudentPhotos() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      files,
      enrollBiometrics,
    }: {
      files: File[]
      enrollBiometrics?: boolean
    }) => studentsApi.batchPhotos(files, { enrollBiometrics }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'students'] })
    },
  })
}
export function useUploadStudentDocument() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, documentType, file, description }: {
      studentId: number; documentType: 'certificates' | 'reports'; file: File; description?: string
    }) => adminCloudinaryApi.uploadDocument(studentId, documentType, file, description),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
  })
}

export function useDeleteCloudinaryFile() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ studentId, publicId }: { studentId: number; publicId: string }) =>
      adminCloudinaryApi.deleteFile(studentId, publicId),
    onSuccess: (_, { studentId }) => qc.invalidateQueries({ queryKey: ['admin', 'students', studentId] }),
  })
}

// ── Archivage, corbeille & fusion ─────────────────────────────────
function invalidateStudentCaches(qc: ReturnType<typeof useQueryClient>) {
  qc.invalidateQueries({ queryKey: ['admin', 'students'] })
  qc.invalidateQueries({ queryKey: ['admin', 'enrollments'] })
  qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
}

export function useDuplicateStudents(threshold?: number) {
  return useQuery({
    queryKey: ['admin', 'students', 'duplicates', threshold ?? 'default'],
    queryFn: () => studentsApi.findDuplicates(threshold),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useArchivedStudents(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['admin', 'students', 'archived', params],
    queryFn: () => studentsApi.listArchived(params),
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  })
}

export function useMergePreview(targetId: number | null, sourceId: number | null) {
  return useQuery({
    queryKey: ['admin', 'students', 'merge-preview', targetId, sourceId],
    queryFn: () => studentsApi.previewMerge(targetId as number, sourceId as number),
    enabled: targetId != null && sourceId != null && targetId !== sourceId,
    staleTime: 0,
    refetchOnWindowFocus: false,
  })
}

export function useArchiveStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => studentsApi.archive(id),
    onSuccess: () => invalidateStudentCaches(qc),
  })
}

export function useRestoreStudent() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => studentsApi.restore(id),
    onSuccess: () => invalidateStudentCaches(qc),
  })
}

export function useMergeStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ targetId, sourceId }: { targetId: number; sourceId: number }) =>
      studentsApi.merge(targetId, sourceId),
    onSuccess: () => invalidateStudentCaches(qc),
  })
}
