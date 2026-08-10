import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financeRoleApi } from '@/lib/finance/api/finance.api'
import { financeQueryKeys } from '@/lib/finance/query-keys'
import { resolveAcademicSessionId } from '@/lib/finance/collection-analytics.utils'
import type { CashSession, GuichetDashboard, CollectionAnalyticsSummary } from '@/types/finance'
import type { FinanceFraudAlert, FinanceIntegrityScan } from '@/types/admin'

// ── Dashboard & Analytics ──────────────────────────────────────────────────

export function useExecutiveDashboard(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'dashboard'],
    queryFn: financeRoleApi.getExecutiveDashboard,
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
  })
}

export function useGuichetDashboard() {
  return useQuery<GuichetDashboard>({
    queryKey: financeQueryKeys.guichetDashboard(),
    queryFn: financeRoleApi.getGuichetDashboard,
    staleTime: 30_000,
    refetchInterval: 120_000,
  })
}

/** Réseau scolaire — sites accessibles depuis la caisse (hub multi-sites). */
export function useNetworkContext() {
  return useQuery({
    queryKey: ['finance', 'network', 'context'],
    queryFn: financeRoleApi.getNetworkContext,
    staleTime: 120_000,
  })
}

/** F-04 — session académique active (depuis guichet dashboard, cache partagé). */
export function useFinanceAcademicSessionId() {
  const { data: guichet, isLoading, isSuccess } = useGuichetDashboard()
  const sessionId = resolveAcademicSessionId(guichet)

  return {
    sessionId,
    hasSession: sessionId != null,
    isLoading,
    isReady: isSuccess,
  }
}

export function useCollectionAnalytics(
  sessionId?: number | null,
  opts?: { enabled?: boolean },
) {
  const id = sessionId != null && sessionId > 0 ? sessionId : undefined
  return useQuery<CollectionAnalyticsSummary | null>({
    queryKey: id != null ? financeQueryKeys.collectionAnalytics(id) : ['finance', 'collection', 'none'],
    queryFn: () => financeRoleApi.getCollectionAnalytics(id!),
    staleTime: 60_000,
    enabled: (opts?.enabled ?? true) && id != null,
  })
}

export function useDailyCashReport(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'daily-cash'],
    queryFn: financeRoleApi.getDailyCashReport,
    staleTime: 30_000,
    refetchInterval: 120_000,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceIntegrity(opts?: { enabled?: boolean }) {
  return useQuery<FinanceIntegrityScan>({
    queryKey: ['finance', 'integrity'],
    queryFn: financeRoleApi.checkIntegrity,
    staleTime: 300_000,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleAiInsights(
  horizonDays: 7 | 30 | 90 = 30,
  opts?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['finance', 'ai-insights', horizonDays],
    queryFn: () => financeRoleApi.getAiInsights(horizonDays),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleHealthCheck(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'health-check'],
    queryFn: financeRoleApi.getHealthCheck,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleStrategic(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'strategic'],
    queryFn: financeRoleApi.getStrategicDashboard,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleEfficiency(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'efficiency'],
    queryFn: financeRoleApi.getEfficiency,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleFraudAlerts(opts?: { enabled?: boolean }) {
  return useQuery<FinanceFraudAlert[]>({
    queryKey: ['finance', 'fraud-alerts'],
    queryFn: financeRoleApi.getFraudAlerts,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceRoleAuditLogs(params?: { page?: number; limit?: number }, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'audit-logs', params],
    queryFn: () => financeRoleApi.getAuditLogs(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

/** KYC paiements en ligne parent — GET /admin/finance/payment-profile (lecture FINANCE). */
export function useFinancePaymentProfile(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'payment-profile'],
    queryFn: financeRoleApi.getPaymentProfile,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceFeeCategories() {
  return useQuery({
    queryKey: ['finance', 'fee-categories'],
    queryFn: financeRoleApi.getFeeCategories,
    staleTime: 300_000,
  })
}

export function useStudentFeePeriodStatus(studentId: number, feeStructureId?: number) {
  return useQuery({
    queryKey: ['finance', 'fee-periods', studentId, feeStructureId],
    queryFn: () => financeRoleApi.getStudentFeePeriodStatus(studentId, feeStructureId!),
    enabled: studentId > 0 && !!feeStructureId,
    staleTime: 30_000,
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

  const academicSessionId = resolveAcademicSessionId(
    guichet.data as GuichetDashboard | undefined,
  )

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
    staleTime: 15_000,
    refetchInterval: 30_000,
    enabled: id > 0,
  })
}

export function useCashSessionHistory(params?: { page?: number; limit?: number }) {
  return useQuery({
    queryKey: ['finance', 'cash-session', 'history', params],
    queryFn: () => financeRoleApi.listCashSessionHistory(params),
    staleTime: 30_000,
  })
}

export function useOpeningFloatSuggestion(enabled = true) {
  return useQuery({
    queryKey: ['finance', 'cash-session', 'opening-suggestion'],
    queryFn: () => financeRoleApi.getOpeningFloatSuggestion(),
    staleTime: 60_000,
    enabled,
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
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: {
        closingCounted: number
        closeNotes?: string
        fxRateAtClose?: number
        closingSheet?:
          | import('@/types/finance').CashDenominationSheet
          | import('@/types/finance').CashDenominationSheet[]
      }
    }) => financeRoleApi.closeSession(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
    },
  })
}

export function useAddCashSessionMovement() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: number
      payload: {
        type: import('@/types/finance').CashLedgerMovementType
        amount: number
        amountCdf?: number
        note?: string
        ref?: string
      }
    }) => financeRoleApi.addCashSessionMovement(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
    },
  })
}

// ── Paiements ──────────────────────────────────────────────────────────────

export function useProcessPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.processPayment,
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['finance', 'dashboard'] })
      qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      qc.invalidateQueries({ queryKey: ['finance', 'debtors'] })
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['fee-schedule', variables.studentId] })
      qc.invalidateQueries({ queryKey: financeQueryKeys.feeSchedule(variables.studentId) })
      qc.invalidateQueries({ queryKey: ['student-wallet', variables.studentId] })
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
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['finance', 'payments', 'pending'] })
      void qc.invalidateQueries({ queryKey: ['finance', 'guichet-dashboard'] })
      void qc.invalidateQueries({ queryKey: ['finance', 'daily-cash'] })
      void qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
    },
  })
}

export function useVerifyExternal() {
  return useMutation({
    mutationFn: financeRoleApi.verifyExternal,
  })
}

export function useDownloadReceipt() {
  return useMutation({
    mutationFn: (input: number | { paymentId: number; format?: 'A4' | 'Thermal' }) => {
      if (typeof input === 'number') {
        return financeRoleApi.downloadReceipt(input, 'Thermal')
      }
      return financeRoleApi.downloadReceipt(input.paymentId, input.format ?? 'Thermal')
    },
  })
}

// ── Débiteurs & Risques ────────────────────────────────────────────────────

export function useDebtors(minDebt?: number, opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['finance', 'debtors', minDebt],
    queryFn: () => financeRoleApi.getDebtors(minDebt),
    staleTime: 60_000,
    enabled: opts?.enabled ?? true,
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.triggerDebtReminders,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'debt-reminders'] })
    },
  })
}

export function useDebtReminderPolicy() {
  return useQuery({
    queryKey: ['finance', 'debt-reminders', 'policy'],
    queryFn: financeRoleApi.getDebtReminderPolicy,
    staleTime: 30_000,
  })
}

export function useUpdateDebtReminderPolicy() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.updateDebtReminderPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'debt-reminders'] })
    },
  })
}

export function useDebtReminderJournal(params?: { limit?: number; cursor?: number; campaignKey?: string }) {
  return useQuery({
    queryKey: ['finance', 'debt-reminders', 'journal', params],
    queryFn: () => financeRoleApi.listDebtReminderJournal(params),
    staleTime: 15_000,
  })
}

export function useDebtReminderHealth() {
  return useQuery({
    queryKey: ['finance', 'debt-reminders', 'health'],
    queryFn: financeRoleApi.getDebtReminderHealth,
    staleTime: 15_000,
    refetchInterval: 60_000,
  })
}

export function useRunLateFees() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: financeRoleApi.runLateFees,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'debtors'] })
      qc.invalidateQueries({ queryKey: ['finance', 'students-financial'] })
    },
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

export function useExportCashSessionReport() {
  return useMutation({
    mutationFn: (sessionId: number) => financeRoleApi.exportCashSessionReport(sessionId),
  })
}

export function useSubmitCashSessionToPromoter() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, note }: { id: number; note?: string }) =>
      financeRoleApi.submitCashSessionToPromoter(id, note ? { note } : undefined),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
    },
  })
}

export function useExportAccountingJournal() {
  return useMutation({
    mutationFn: financeRoleApi.exportAccountingJournal,
  })
}

export function useExportGeneralLedger() {
  return useMutation({
    mutationFn: financeRoleApi.exportGeneralLedger,
  })
}

// ── Suivi financier (filtres classe / section / statut) ─────────────────────

export function useStudentsFinancial(params?: {
  classId?: number
  sectionId?: number
  optionId?: number
  status?: import('@/types/finance').StudentFinancialStatus
  sort?: import('@/types/finance').StudentFinancialSort
  minDebt?: number
  minRisk?: number
  page?: number
  limit?: number
}) {
  return useQuery({
    queryKey: ['finance', 'students-financial', params],
    queryFn: () => financeRoleApi.listStudentsFinancial(params),
    staleTime: 30_000,
  })
}

export function useExportStudentsFinancialPrint() {
  return useMutation({
    mutationFn: financeRoleApi.exportStudentsFinancialPrint,
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

export function useStudentSiblings(id: number) {
  return useQuery({
    queryKey: ['finance', 'student', id, 'siblings'],
    queryFn: () => financeRoleApi.getStudentSiblings(id),
    staleTime: 60_000,
    enabled: id > 0,
  })
}

// ── Élèves (recherche finance) ─────────────────────────────────────────────

export function useFinanceStudentSearch(
  query: string,
  filters?: { classId?: number; sectionId?: number; optionId?: number },
) {
  const classId = filters?.classId
  const sectionId = filters?.sectionId
  const optionId = filters?.optionId
  const hasFilter = classId != null || sectionId != null || optionId != null
  const q = query.trim()
  const enabled = q.length >= 2 || hasFilter

  return useQuery({
    queryKey: ['finance', 'students', 'search', q, classId ?? null, sectionId ?? null, optionId ?? null],
    queryFn: () =>
      financeRoleApi.searchStudents(q, {
        classId,
        sectionId,
        optionId,
        limit: hasFilter && q.length < 2 ? 40 : 15,
      }),
    staleTime: 30_000,
    enabled,
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

export function useStudentPaymentsDetailed(
  studentId: number,
  params?: Parameters<typeof financeRoleApi.getStudentPaymentsDetailed>[1],
  options?: { enabled?: boolean },
) {
  return useQuery({
    queryKey: ['finance', 'student-payments-detailed', studentId, params],
    queryFn: () => financeRoleApi.getStudentPaymentsDetailed(studentId, params),
    staleTime: 30_000,
    enabled: (options?.enabled ?? true) && studentId > 0,
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

export function useFinanceCurrencyConfig() {
  return useQuery({
    queryKey: ['finance', 'currency-config'],
    queryFn: financeRoleApi.getCurrencyConfig,
    staleTime: 120_000,
    retry: 1,
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
