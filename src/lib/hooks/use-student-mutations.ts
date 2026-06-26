import { useMutation, useQueryClient } from '@tanstack/react-query'
import { enrollmentApi } from '@/lib/superAdmin/api/enrollment.api'
import { studentsApi } from '@/lib/superAdmin/api/students.api'
import { queryKeys } from '@/lib/query/keys'
import type { StudentDashboard, StudentGlobalStats, StudentListResponse } from '@/types/super-admin'

/** Invalide le cache stats côté serveur puis rafraîchit — feedback immédiat */
export function useInvalidateStudentStats(schoolId: number) {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: () => studentsApi.invalidateStats(schoolId),
    onMutate: async () => {
      await qc.cancelQueries({ queryKey: queryKeys.superadmin.students.stats(schoolId) })
      const previous = qc.getQueryData<StudentGlobalStats>(
        queryKeys.superadmin.students.stats(schoolId),
      )
      return { previous }
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        qc.setQueryData(queryKeys.superadmin.students.stats(schoolId), ctx.previous)
      }
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: queryKeys.superadmin.students.stats(schoolId) })
    },
  })
}

interface ToggleLockVars {
  studentId: number
  schoolId: number
  isLocked: boolean
}

/**
 * Verrou financier — UI optimiste sur dashboard + ligne liste.
 * Rollback automatique si le PATCH échoue.
 */
export function useToggleStudentPaymentLock() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ studentId, isLocked }: ToggleLockVars) =>
      enrollmentApi.toggleStudentLock(studentId, isLocked),
    onMutate: async ({ studentId, schoolId, isLocked }) => {
      const dashKey = queryKeys.superadmin.students.dashboard(studentId)
      await qc.cancelQueries({ queryKey: dashKey })

      const previousDashboard = qc.getQueryData<StudentDashboard>(dashKey)
      const listKeyPrefix = ['superadmin', 'students', 'list', schoolId] as const

      if (previousDashboard) {
        qc.setQueryData<StudentDashboard>(dashKey, {
          ...previousDashboard,
          profile: { ...previousDashboard.profile, isPaymentLocked: isLocked },
        })
      }

      const listQueries = qc.getQueriesData<StudentListResponse>({ queryKey: listKeyPrefix })
      const previousLists = listQueries.map(([key, data]) => ({ key, data }) as const)

      listQueries.forEach(([key, data]) => {
        if (!data) return
        qc.setQueryData<StudentListResponse>(key, {
          ...data,
          data: data.data.map((s) =>
            s.id === studentId ? { ...s, isPaymentLocked: isLocked } : s,
          ),
        })
      })

      return { previousDashboard, previousLists }
    },
    onError: (_err, { studentId }, ctx) => {
      if (ctx?.previousDashboard) {
        qc.setQueryData(
          queryKeys.superadmin.students.dashboard(studentId),
          ctx.previousDashboard,
        )
      }
      ctx?.previousLists.forEach(({ key, data }) => {
        if (data) qc.setQueryData(key, data)
      })
    },
    onSettled: (_data, _err, { studentId, schoolId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.superadmin.students.dashboard(studentId) })
      void qc.invalidateQueries({ queryKey: ['superadmin', 'students', 'list', schoolId] })
    },
  })
}

interface SetGraceVars {
  studentId: number
  until: string | null
}

/**
 * Période de grâce — invalidation ciblée + callback optionnel pour l'intégrité locale.
 */
export function useSetStudentGracePeriod() {
  const qc = useQueryClient()

  return useMutation({
    mutationFn: ({ studentId, until }: SetGraceVars) =>
      enrollmentApi.setStudentGracePeriod(studentId, until),
    onSettled: (_data, _err, { studentId }) => {
      void qc.invalidateQueries({ queryKey: queryKeys.superadmin.students.dashboard(studentId) })
    },
  })
}
