import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'

export function useExecutiveDashboard() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeRoleApi.getExecutiveDashboard,
    staleTime: 60_000,
  })
}

export function useCollectionAnalytics(sessionId?: number) {
  return useQuery({
    queryKey: ['finance', 'collection', sessionId],
    queryFn: () => financeRoleApi.getCollectionAnalytics(sessionId!),
    staleTime: 60_000,
    enabled: sessionId != null && sessionId > 0,
  })
}

export function useDailyCashReport() {
  return useQuery({
    queryKey: ['finance', 'daily-cash'],
    queryFn: financeRoleApi.getDailyCashReport,
    staleTime: 30_000,
    refetchInterval: 120_000,
  })
}

export function useFinanceIntegrity() {
  return useQuery({
    queryKey: ['finance', 'integrity'],
    queryFn: financeRoleApi.checkIntegrity,
    staleTime: 300_000,
  })
}

export function useDebtors(minDebt?: number) {
  return useQuery({
    queryKey: ['finance', 'debtors', minDebt],
    queryFn: () => financeRoleApi.getDebtors(minDebt),
    staleTime: 60_000,
  })
}

export function useHighRisk() {
  return useQuery({
    queryKey: ['finance', 'high-risk'],
    queryFn: financeRoleApi.getHighRisk,
    staleTime: 60_000,
  })
}

export function useProcessPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.processPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'debtors'] })
    },
  })
}

export function useSearchTransactions(params: Parameters<typeof financeRoleApi.searchTransactions>[0]) {
  const hasParams = Object.values(params).some(v => v !== undefined && v !== '')
  return useQuery({
    queryKey: ['finance', 'transactions', params],
    queryFn: () => financeRoleApi.searchTransactions(params),
    staleTime: 30_000,
    enabled: hasParams,
  })
}

export function useStudentFinanceProfile(id: number) {
  return useQuery({
    queryKey: ['finance', 'student', id],
    queryFn: () => financeRoleApi.getStudentProfile(id),
    staleTime: 60_000,
    enabled: id > 0,
  })
}

export function useFinanceClasses() {
  return useQuery({
    queryKey: ['finance', 'classes'],
    queryFn: financeRoleApi.getClasses,
    staleTime: 120_000,
  })
}

export function useClassFinancialStatus(id: number) {
  return useQuery({
    queryKey: ['finance', 'class', id, 'status'],
    queryFn: () => financeRoleApi.getClassFinancialStatus(id),
    staleTime: 60_000,
    enabled: id > 0,
  })
}

export function useClassAudit(id: number) {
  return useQuery({
    queryKey: ['finance', 'class', id, 'audit'],
    queryFn: () => financeRoleApi.getClassAudit(id),
    staleTime: 120_000,
    enabled: id > 0,
  })
}
