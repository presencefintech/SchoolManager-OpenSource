import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import type { CashSession } from '@/types/finance'

// ── Dashboard & Analytics ──────────────────────────────────────────────────

export function useExecutiveDashboard() {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeRoleApi.getExecutiveDashboard,
    staleTime: 60_000,
  })
}

export function useGuichetDashboard() {
  return useQuery({
    queryKey: ['finance', 'guichet-dashboard'],
    queryFn: financeRoleApi.getGuichetDashboard,
    staleTime: 30_000,
    refetchInterval: 120_000,
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

// ── Sessions de caisse ─────────────────────────────────────────────────────

export function useCurrentSession() {
  return useQuery({
    queryKey: ['finance', 'cash-session', 'current'],
    queryFn: financeRoleApi.getCurrentSession,
    staleTime: 30_000,
    refetchInterval: 60_000,
    retry: 1,
  })
}

/** Session caisse ouverte — fusionne /current et dashboard guichet (résilience proxy). */
export function useResolvedCashSession() {
  const current = useCurrentSession()
  const guichet = useGuichetDashboard()

  const fromCurrent = current.data as CashSession | null | undefined
  const fromGuichet = (guichet.data as { openCashSession?: CashSession | null } | undefined)
    ?.openCashSession

  const session =
    fromCurrent?.status === 'OPEN'
      ? fromCurrent
      : fromGuichet?.status === 'OPEN'
        ? fromGuichet
        : null

  const academicSessionId = (guichet.data as { currentAcademicSessionId?: number | null } | undefined)
    ?.currentAcademicSessionId

  const isLoading = current.isLoading || guichet.isLoading
  const couldNotVerify =
    !session && !isLoading && current.isError && guichet.isError

  return {
    session,
    hasOpenSession: session?.status === 'OPEN',
    academicSessionId,
    isLoading,
    couldNotVerify,
    refetch: () => {
      void current.refetch()
      void guichet.refetch()
    },
    isError: current.isError && guichet.isError,
  }
}

export function useSessionSummary(id: number) {
  return useQuery({
    queryKey: ['finance', 'cash-session', id, 'summary'],
    queryFn: () => financeRoleApi.getSessionSummary(id),
    staleTime: 30_000,
    enabled: id > 0,
  })
}

export function useOpenSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.openSession,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
    },
  })
}

export function useCloseSession() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { closingCounted: number; closeNotes?: string } }) =>
      financeRoleApi.closeSession(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
    },
  })
}

// ── Paiements ──────────────────────────────────────────────────────────────

export function useProcessPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.processPayment,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'debtors'] })
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
    },
  })
}

export function usePendingPayments() {
  return useQuery({
    queryKey: ['finance', 'payments', 'pending'],
    queryFn: financeRoleApi.getPendingPayments,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })
}

export function useVerifyPaymentStep() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.verifyPaymentStep,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance'] }),
  })
}

export function useVerifyExternal() {
  return useMutation({
    mutationFn: financeRoleApi.verifyExternal,
  })
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: (paymentId: number) => financeRoleApi.downloadReceipt(paymentId),
  })
}

// ── Débiteurs & Risques ────────────────────────────────────────────────────

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

export function useTriggerDebtReminders() {
  return useMutation({
    mutationFn: financeRoleApi.triggerDebtReminders,
  })
}

export function useExportDebtors() {
  return useMutation({
    mutationFn: financeRoleApi.exportDebtors,
  })
}

export function useExportPayments() {
  return useMutation({
    mutationFn: financeRoleApi.exportPayments,
  })
}

export function useExportCashSession() {
  return useMutation({
    mutationFn: (sessionId: number) => financeRoleApi.exportCashSession(sessionId),
  })
}

// ── Transactions & Recherche ───────────────────────────────────────────────

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

export function useStudentWallet(id: number) {
  return useQuery({
    queryKey: ['finance', 'student', id, 'wallet'],
    queryFn: () => financeRoleApi.getStudentWallet(id),
    staleTime: 30_000,
    enabled: id > 0,
  })
}

// ── Élèves (recherche finance) ─────────────────────────────────────────────

export function useFinanceStudentSearch(query: string) {
  return useQuery({
    queryKey: ['finance', 'students', 'search', query],
    queryFn: () => financeRoleApi.searchStudents(query),
    staleTime: 30_000,
    enabled: query.trim().length >= 2,
  })
}

export function useStudentConfirmedPayments(studentId: number) {
  return useQuery({
    queryKey: ['finance', 'student-payments', studentId],
    queryFn: () =>
      financeRoleApi.searchTransactions({ studentId, status: 'CONFIRMED', limit: 50 }).then(
        (r: any) => (Array.isArray(r) ? r : (r?.data ?? [])) as {
          id: number
          amount: number
          reference?: string
          method?: string
          createdAt: string
        }[]
      ),
    staleTime: 30_000,
    enabled: studentId > 0,
  })
}

// ── Catalogue ──────────────────────────────────────────────────────────────

export function useFinanceFeeStructures(params?: { classId?: number }) {
  return useQuery({
    queryKey: ['finance', 'fee-structures', params],
    queryFn: () => financeRoleApi.getFeeStructures(params),
    staleTime: 120_000,
  })
}

export function useFinanceMoratoriums(params?: { status?: string }) {
  return useQuery({
    queryKey: ['finance', 'moratoriums', params],
    queryFn: () => financeRoleApi.getMoratoriums(params),
    staleTime: 60_000,
  })
}

// ── Clôture journalière ────────────────────────────────────────────────────

export function useClosingPreview() {
  return useQuery({
    queryKey: ['finance', 'closing', 'preview'],
    queryFn: financeRoleApi.getClosingPreview,
    staleTime: 30_000,
  })
}

export function useFinalizeClosing() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.finalizeClosing,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'closing'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
    },
  })
}

// ── Remboursements ─────────────────────────────────────────────────────────

export function useRefunds(params?: { status?: string; page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['finance', 'refunds', params],
    queryFn: () => financeRoleApi.getRefunds(params),
    staleTime: 60_000,
  })
}

export function useRefund(id: number) {
  return useQuery({
    queryKey: ['finance', 'refunds', id],
    queryFn: () => financeRoleApi.getRefund(id),
    staleTime: 60_000,
    enabled: id > 0,
  })
}

export function useCreateRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.createRefund,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'refunds'] }),
  })
}

export function useProcessRefund() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { notes?: string } }) =>
      financeRoleApi.processRefund(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'refunds'] })
      qc.invalidateQueries({ queryKey: ['finance', 'student'] })
      qc.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['finance', 'debtors'] })
    },
  })
}

export function useSyncRefundGateway() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => financeRoleApi.syncRefundGateway(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'refunds'] })
      qc.invalidateQueries({ queryKey: ['finance', 'student'] })
      qc.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
    },
  })
}

// ── Classes ────────────────────────────────────────────────────────────────

export function useFinanceClasses() {
  return useQuery({
    queryKey: ['finance', 'classes'],
    queryFn: financeRoleApi.getClasses,
    staleTime: 120_000,
  })
}

export function useFinanceClassDetail(id: number) {
  return useQuery({
    queryKey: ['finance', 'class', id],
    queryFn: () => financeRoleApi.getClassDetail(id),
    staleTime: 120_000,
    enabled: id > 0,
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

export function useExportClassPayments() {
  return useMutation({
    mutationFn: (classId: number) => financeRoleApi.exportClassPayments(classId),
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

export function useClassStudents(id: number) {
  return useQuery({
    queryKey: ['finance', 'class', id, 'students'],
    queryFn: () => financeRoleApi.getClassStudents(id),
    staleTime: 120_000,
    enabled: id > 0,
  })
}
