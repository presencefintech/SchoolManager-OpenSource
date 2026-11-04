import { useQuery } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { financeQueryKeys } from '@/lib/finance/query-keys'

export function useStudentFeeSchedule(
  studentId: number,
  sessionId?: number,
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: financeQueryKeys.feeSchedule(studentId, sessionId),
    queryFn: () => financeRoleApi.getStudentFeeSchedule(studentId, sessionId),
    enabled: (options?.enabled ?? true) && Number.isFinite(studentId) && studentId > 0,
    staleTime: 30_000,
  })
}
