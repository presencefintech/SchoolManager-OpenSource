import { useQuery } from '@tanstack/react-query'
import { financeApi } from '@/lib/admin/api/finance.api'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import type { ClassYearFeeDashboard } from '@/types/finance'

export type ClassYearFeeSource = 'admin' | 'finance'

export function useClassYearFeeDashboard(
  source: ClassYearFeeSource,
  params?: { sessionId?: number; classId?: number },
  opts?: { enabled?: boolean },
) {
  return useQuery<ClassYearFeeDashboard>({
    queryKey: [source, 'class-year-fees', params?.sessionId ?? null, params?.classId ?? null],
    queryFn: () =>
      source === 'admin'
        ? financeApi.getClassYearFees(params)
        : financeRoleApi.getClassYearFees(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}
