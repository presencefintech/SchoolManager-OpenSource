import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useEmpirePollingInterval } from '@/lib/realtime/empire-realtime-provider'
import { financeApi } from '@/lib/admin/api'
import { getAuthToken } from '@/lib/api/auth-storage'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { BulkMoratoriumPayload, LinkOrphanPayload, AdvancedSearchParams, ConfirmPaymentProofPayload, FinanceCollectionEfficiencyLevel, FinanceEndOfDayClosing, FinanceIntegrityScan } from '@/types/admin'

// ── Finance — hooks manquants ──────────────────────────────────────

export function useFinanceDetailedReport(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'detailed-report'],
    queryFn: financeApi.getDetailedReport,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceAggregateReport(params: {
  period: string
  anchor?: string
  persist?: boolean
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'aggregate-report', params],
    queryFn: () => financeApi.getAggregateReport(params),
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceCurrencyConfig() {
  return useQuery({
    queryKey: ['admin', 'finance', 'currency-config'],
    queryFn: financeApi.getCurrencyConfig,
    staleTime: 300_000,
  })
}

export function useCashFloatPolicy() {
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-float-policy'],
    queryFn: financeApi.getCashFloatPolicy,
    staleTime: 60_000,
  })
}

export function useUpdateCashFloatPolicy() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.updateCashFloatPolicy,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-float-policy'] })
      qc.invalidateQueries({ queryKey: ['finance', 'cash-session', 'opening-suggestion'] })
      toast.success('Politique caisse', 'Fond d’ouverture mis à jour pour cet établissement.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useCashFundTraceability(params?: {
  varianceDays?: number
  varianceOnly?: boolean
  limit?: number
}) {
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-fund-traceability', params],
    queryFn: () => financeApi.getCashFundTraceability(params),
    staleTime: 20_000,
    refetchInterval: 60_000,
  })
}

export function useDownloadAdminCashSessionReport() {
  return useMutation({
    mutationFn: (sessionId: number) => financeApi.downloadCashSessionReport(sessionId),
  })
}

export function useAcknowledgeCashSessionReport() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (sessionId: number) => financeApi.acknowledgeCashSessionReport(sessionId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
      toast.success('Rapport visé', 'Le visa de la direction a été enregistré.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useSchoolDayDigest(date?: string) {
  return useQuery({
    queryKey: ['admin', 'finance', 'day-digest', date ?? 'today'],
    queryFn: () => financeApi.getSchoolDayDigest(date),
    staleTime: 30_000,
  })
}

export function useCashDesksLive(date?: string) {
  const refetchInterval = useEmpirePollingInterval(15_000)
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-desks-live', date ?? 'today'],
    queryFn: () => financeApi.getCashDesksLive(date),
    staleTime: 8_000,
    refetchInterval,
    enabled: !!getAuthToken(),
  })
}

export function useForceCloseCashSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      sessionId,
      reason,
      closingCounted,
      closeNotes,
    }: {
      sessionId: number
      reason: string
      closingCounted?: number
      closeNotes?: string
    }) => financeApi.forceCloseCashSession(sessionId, { reason, closingCounted, closeNotes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'day-digest'] })
      toast.success('Guichet clôturé', 'La session a été forcée à la clôture par l’administration.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useUnlockCashSessionCorrections() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      sessionId,
      hours,
      notes,
    }: {
      sessionId: number
      hours?: number
      notes?: string
    }) => financeApi.unlockCashSessionCorrections(sessionId, { hours, notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      toast.success('Correction ouverte', 'Le caissier peut corriger les lignes pendant la fenêtre déverrouillée.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useReviewCashSession() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({ sessionId, notes }: { sessionId: number; notes?: string }) =>
      financeApi.reviewCashSession(sessionId, notes),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-fund-traceability'] })
      toast.success('Session visée', 'Le visa de l’administration a été enregistré.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useAdminCashOps() {
  return useQuery({
    queryKey: ['admin', 'finance', 'cash-ops'],
    queryFn: () => financeApi.getCashOps(),
    staleTime: 20_000,
    enabled: !!getAuthToken(),
  })
}

export function useUpdateCashOps() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: {
      multiCounterEnabled?: boolean
      channels?: Partial<import('@/types/finance').SchoolCashOps['channels']>
    }) => financeApi.updateCashOps(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-ops'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      toast.success('Caisse', 'Paramètres de guichet et de paiement enregistrés.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useCreateCashDesk() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: {
      name: string
      code?: string
      specialty?: import('@/types/finance').CashDeskSpecialty
      locationHint?: string
    }) => financeApi.createCashDesk(payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-ops'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      toast.success('Guichet créé', 'Le guichet est disponible pour l’ouverture de caisse.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useUpdateCashDesk() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: number
      name?: string
      code?: string
      isActive?: boolean
      specialty?: import('@/types/finance').CashDeskSpecialty
      locationHint?: string | null
      notes?: string | null
      allowedChannels?: import('@/types/finance').SchoolPaymentChannelKey[] | null
      assignedUserIds?: number[]
    }) => financeApi.updateCashDesk(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-ops'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'cash-desks-live'] })
      toast.success('Guichet', 'Configuration du guichet mise à jour.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useDownloadSchoolDayDigestPdf() {
  return useMutation({
    mutationFn: (date?: string) => financeApi.downloadSchoolDayDigestPdf(date),
  })
}

export function useDemoValuePanel() {
  return useQuery({
    queryKey: ['admin', 'finance', 'demo-value-panel'],
    queryFn: () => financeApi.getDemoValuePanel(),
    staleTime: 60_000,
  })
}

export function useGoLiveReadiness() {
  return useQuery({
    queryKey: ['admin', 'finance', 'go-live-readiness'],
    queryFn: () => financeApi.getGoLiveReadiness(),
    staleTime: 60_000,
  })
}

export function useWeeklyPromoterDigest() {
  return useQuery({
    queryKey: ['admin', 'finance', 'week-digest'],
    queryFn: () => financeApi.getWeeklyPromoterDigest(),
    staleTime: 60_000,
  })
}

export function useSendWeeklyPromoterDigest() {
  const toast = useToast()
  return useMutation({
    mutationFn: () => financeApi.sendWeeklyPromoterDigest(),
    onSuccess: (data) => {
      toast.success(
        data.status === 'sent'
          ? 'Bilan hebdo envoyé à ADMIN et FINANCE'
          : 'Aucune activité cette semaine — non envoyé',
      )
    },
    onError: () => toast.error("Impossible d'envoyer le bilan hebdo"),
  })
}

export function useFinanceExchangeRates() {
  return useQuery({
    queryKey: ['admin', 'finance', 'exchange-rates'],
    queryFn: () => financeApi.listExchangeRates(30),
    staleTime: 120_000,
  })
}

export function useCreateExchangeRate() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.createExchangeRate,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'exchange-rates'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'aggregate-report'] })
      toast.success('Taux enregistré', 'Historique immuable mis à jour.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useUpdateCurrencyConfig() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: financeApi.updateCurrencyConfig,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['finance', 'currency-config'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'aggregate-report'] })
      toast.success('Devise mise à jour', 'Paramètres d\'affichage enregistrés.')
    },
    onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
  })
}

export function useFinanceInsights(opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'insights'],
    queryFn: financeApi.getInsights,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceComparativeDashboard(opts?: { enabled?: boolean }) {
  return useQuery<FinanceCollectionEfficiencyLevel[]>({
    queryKey: ['admin', 'finance', 'comparative'],
    queryFn: financeApi.getComparativeDashboard,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceEfficiency(opts?: { enabled?: boolean }) {
  return useQuery<FinanceCollectionEfficiencyLevel[]>({
    queryKey: ['admin', 'finance', 'efficiency'],
    queryFn: financeApi.getEfficiency,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceEndOfDay(opts?: { enabled?: boolean }) {
  return useQuery<FinanceEndOfDayClosing | null>({
    queryKey: ['admin', 'finance', 'end-of-day'],
    queryFn: financeApi.getEndOfDay,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinancePaymentMethods(period: 'day' | 'month' = 'month', opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'payment-methods', period],
    queryFn: () => financeApi.getPaymentMethods(period),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinanceFeeTypes(period: 'day' | 'month' = 'month', opts?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'fee-types', period],
    queryFn: () => financeApi.getFeeTypes(period),
    staleTime: 120_000,
    refetchOnWindowFocus: false,
    enabled: opts?.enabled ?? true,
  })
}

export function useFinancePresenceSecurity() {
  return useQuery({
    queryKey: ['admin', 'finance', 'presence-security'],
    queryFn: financeApi.getPresenceSecurity,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceIntegrityScan() {
  return useQuery<FinanceIntegrityScan>({
    queryKey: ['admin', 'finance', 'integrity-scan'],
    queryFn: financeApi.checkIntegrity,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceRiskProfiles() {
  return useQuery({
    queryKey: ['admin', 'finance', 'risk-profiles'],
    queryFn: financeApi.getRiskProfiles,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceDuplicates() {
  return useQuery({
    queryKey: ['admin', 'finance', 'duplicates'],
    queryFn: financeApi.getDuplicates,
    staleTime: 120_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceLedger() {
  return useQuery({
    queryKey: ['admin', 'finance', 'ledger'],
    queryFn: financeApi.getLedger,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useFinanceCashierAudit(cashierId: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'cashier-audit', cashierId],
    queryFn: () => financeApi.getCashierAudit(cashierId),
    staleTime: 60_000,
    enabled: !!cashierId,
    refetchOnWindowFocus: false,
  })
}

export function useAdvancedSearch(params: AdvancedSearchParams, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: ['admin', 'finance', 'advanced-search', params],
    queryFn: () => financeApi.advancedSearch(params as Record<string, string | number | boolean | undefined>),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    enabled: options?.enabled ?? true,
  })
}

export function useFraudRiskAnalysis() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: Record<string, unknown>) => financeApi.fraudRiskAnalysis(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'fraud-alerts'] }),
  })
}

export function useConfirmBankTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ paymentId, proof }: { paymentId: number; proof?: ConfirmPaymentProofPayload }) =>
      financeApi.confirmBankTransaction(paymentId, proof),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance', 'mobile-pending'] })
      qc.invalidateQueries({ queryKey: ['admin', 'finance'] })
    },
  })
}

export function useResendReceipt() {
  return useMutation({
    mutationFn: (paymentId: number) => financeApi.resendReceipt(paymentId),
  })
}

export function useLinkOrphanTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: LinkOrphanPayload) => financeApi.linkOrphanTransaction(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance'] }),
  })
}

export function useGetMoratorium(id: number) {
  return useQuery({
    queryKey: ['admin', 'finance', 'moratoriums', id],
    queryFn: () => financeApi.getMoratorium(id),
    staleTime: 60_000,
    enabled: !!id,
    refetchOnWindowFocus: false,
  })
}

export function useCreateBulkMoratoriums() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: BulkMoratoriumPayload) =>
      financeApi.createBulkMoratoriums(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'finance', 'moratoriums'] }),
  })
}
