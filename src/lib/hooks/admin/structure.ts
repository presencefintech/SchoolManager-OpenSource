import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { classesApi, structureApi } from '@/lib/admin/api'
import type { CreateClassPayload, RolloverPayload } from '@/types/admin'

// ── Structure scolaire (sections / options) ───────────────────────

export function useSections() {
  return useQuery({
    queryKey: ['admin', 'structure', 'sections'],
    queryFn: () => structureApi.listSections(),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useOptions(sectionId?: number) {
  return useQuery({
    queryKey: ['admin', 'structure', 'options', sectionId ?? 'all'],
    queryFn: () => structureApi.listOptions(sectionId && sectionId > 0 ? sectionId : undefined),
    staleTime: 120_000,
    // sectionId omis / 0 → toutes les options ; sinon filtre par section
    enabled: sectionId == null || sectionId > 0,
    refetchOnWindowFocus: false,
  })
}

export function useCreateSection() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { name: string; code?: string }) => structureApi.createSection(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'structure', 'sections'] }),
  })
}

export function useCreateOption() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: { sectionId: number; name: string; code?: string }) =>
      structureApi.createOption(payload),
    onSuccess: (_, { sectionId }) => {
      qc.invalidateQueries({ queryKey: ['admin', 'structure', 'options'] })
      qc.invalidateQueries({ queryKey: ['admin', 'structure', 'options', sectionId] })
    },
  })
}

export function useUpdateClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<CreateClassPayload> }) =>
      classesApi.update(id, payload),
    onSuccess: (_, { id }) => qc.invalidateQueries({ queryKey: ['admin', 'classes', id] }),
  })
}

export function useToggleClassStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => classesApi.toggleStatus(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}

export function useDeleteClass() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => classesApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'classes'] })
      qc.invalidateQueries({ queryKey: ['admin', 'dashboard'] })
    },
  })
}

export function useClassConflicts(teacherId: number | undefined) {
  return useQuery({
    queryKey: ['admin', 'classes', 'conflicts', teacherId],
    queryFn: () => classesApi.getConflicts(teacherId!),
    enabled: !!teacherId,
    staleTime: 30_000,
  })
}

export function useAssignStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentIds }: { classId: number; studentIds: number[] }) =>
      classesApi.assignStudents(classId, studentIds),
    onSuccess: (_, { classId }) => qc.invalidateQueries({ queryKey: ['admin', 'classes', classId] }),
  })
}

export function useTransferStudents() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ classId, studentIds, targetClassId }: { classId: number; studentIds: number[]; targetClassId: number }) =>
      classesApi.transfer(classId, { studentIds, targetClassId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}

export function useRollover() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: RolloverPayload) => classesApi.rollover(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'classes'] }),
  })
}
