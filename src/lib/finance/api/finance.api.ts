import { downloadBlob } from '@/lib/finance/download-blob'
import { parseContentDispositionFilename } from '@/lib/download-blob'
import { apiClient } from '@/lib/api/client'
import { dedupeClassList } from '@/lib/academic/class-identity'
import { normalizeFinanceAiInsights } from '@/lib/admin/finance-ai.utils'
import {
  mapEnterpriseDashboardToKpi,
  normalizeCollectionEfficiencyLevels,
  normalizeFinanceHealth,
  normalizeFraudAlertsResponse,
  normalizeIntegrityScan,
} from '@/lib/admin/finance-dashboard.utils'
import { asStudentPaymentsDetailedPage } from '@/lib/finance/payment-history.utils'
import { asFeeStructureList } from '@/lib/finance/fee-structure.utils'
import { normalizePaymentProfile, normalizePendingVerification } from '@/lib/admin/normalizers'
import {
  normalizeCollectionAnalytics,
} from '@/lib/finance/collection-analytics.utils'
import type {
  StudentFeeScheduleDto,
  StudentFeePeriodStatusDto,
  StudentsFinancialListResponse,
  StudentsFinancialPrintReport,
  ProcessPaymentResponse,
  DebtReminderPolicy,
  DebtReminderPolicyUpdate,
  DebtReminderTriggerInput,
  DebtReminderTriggerResult,
  DebtReminderJournalPage,
  DebtReminderHealth,
  DeskReminderList,
  DeskReminderDispatch,
  LateFeeRunResult,
  GuichetDashboard,
  CollectionAnalyticsSummary,
  ClassYearFeeDashboard,
  PaymentDeclarationDto,
  PaymentDeclarationPage,
  PaymentDeclarationStudentLookup,
} from '@/types/finance'
import type { FeeCategoryItem, PaymentProfile, PendingVerificationItem } from '@/types/admin'
import type {
  CashJournalParams,
  CashJournalReport,
  CashJournalVisibilityPatch,
} from '@/lib/finance/cash-journal'

async function throwIfJsonErrorBlob(blob: Blob, fallback: string): Promise<void> {
  const type = blob.type || ''
  if (type.includes('json') || type.includes('text/plain')) {
    const text = await blob.text()
    let message = fallback
    try {
      const json = JSON.parse(text) as { message?: string }
      if (typeof json.message === 'string' && json.message) message = json.message
    } catch {
      if (text.trim()) message = text.slice(0, 200)
    }
    throw new Error(message)
  }
  const head = await blob.slice(0, 5).text()
  if (head.startsWith('{') || head.startsWith('[')) {
    const text = await blob.text()
    let message = fallback
    try {
      const json = JSON.parse(text) as { message?: string }
      if (typeof json.message === 'string' && json.message) message = json.message
    } catch {
      /* ignore */
    }
    throw new Error(message)
  }
}

async function fetchMonthlySituationExport(
  url: string,
  params: { from: string; to: string; reportMonth?: string },
  kind: 'pdf' | 'xlsx',
  fallbackFilename?: string,
): Promise<{ blob: Blob; filename: string }> {
  const { normalizeBlobError } = await import('@/lib/finance/download-receipt-pdf')
  const fallback =
    fallbackFilename ??
    (kind === 'pdf' ? 'situation-financiere.pdf' : 'situation-financiere.xlsx')
  try {
    const res = await apiClient.get(url, {
      params,
      responseType: 'blob',
      timeout: 90_000,
    })
    const blob = res.data as Blob
    await throwIfJsonErrorBlob(
      blob,
      kind === 'pdf' ? 'Impossible de générer le PDF' : 'Impossible de générer l’Excel',
    )
    return {
      blob,
      filename: parseContentDispositionFilename(
        res.headers['content-disposition'] as string | undefined,
        fallback,
      ),
    }
  } catch (err) {
    throw await normalizeBlobError(err)
  }
}

export const financeRoleApi = {
  // ── Dashboard & Analytics ──────────────────────────────────────────────────
  getExecutiveDashboard: () =>
    apiClient.get('/finance/payments/analytics/executive').then(r => r.data.data),

  getCollectionAnalytics: (sessionId: number) =>
    apiClient
      .get('/finance/payments/analytics/collection', { params: { sessionId } })
      .then((r) => normalizeCollectionAnalytics(r.data.data)),

  getDailyCashReport: () =>
    apiClient.get('/finance/payments/reports/daily-cash').then(r => r.data.data),

  getGuichetDashboard: () =>
    apiClient.get('/finance/dashboard/guichet').then((r) => r.data.data as GuichetDashboard),

  getCashJournal: (params: CashJournalParams) =>
    apiClient
      .get('/finance/dashboard/cash-journal', { params })
      .then((r) => r.data.data as CashJournalReport),

  updateCashJournalVisibility: (body: CashJournalVisibilityPatch) =>
    apiClient
      .put('/finance/dashboard/cash-journal/visibility', body)
      .then((r) => r.data.data as CashJournalReport['visibility']),

  getClassYearFees: (params?: { sessionId?: number; classId?: number }) =>
    apiClient
      .get('/finance/dashboard/class-year-fees', { params })
      .then((r) => r.data.data as ClassYearFeeDashboard),

  checkIntegrity: () =>
    apiClient
      .get('/finance/payments/audit/integrity')
      .then((r) => normalizeIntegrityScan(r.data.data)),

  /** Intelligence financière v4 — même endpoint admin (rôle FINANCE autorisé). */
  getAiInsights: (horizonDays: 7 | 30 | 90 = 30) =>
    apiClient
      .get('/admin/finance/ai/insights', { params: { horizonDays } })
      .then((r) => {
        const normalized = normalizeFinanceAiInsights(r.data?.data ?? r.data)
        if (!normalized) throw new Error('Réponse intelligence financière invalide')
        return normalized
      }),

  getHealthCheck: () =>
    apiClient
      .get('/admin/finance/analytics/health-check')
      .then((r) => normalizeFinanceHealth(r.data.data)),

  getStrategicDashboard: () =>
    apiClient
      .get('/admin/finance/dashboard/strategic')
      .then((r) => mapEnterpriseDashboardToKpi(r.data.data)),

  getComparativeDashboard: () =>
    apiClient
      .get('/admin/finance/dashboard/comparative')
      .then((r) => normalizeCollectionEfficiencyLevels(r.data.data)),

  getEfficiency: () =>
    apiClient
      .get('/admin/finance/dashboard/efficiency')
      .then((r) => normalizeCollectionEfficiencyLevels(r.data.data)),

  getFraudAlerts: () =>
    apiClient
      .get('/admin/finance/audit/fraud-alerts')
      .then((r) => normalizeFraudAlertsResponse(r.data.data)),

  getAuditLogs: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get('/admin/finance/audit/logs', { params })
      .then((r) => (r.data.data ?? []) as unknown[]),

  // ── Sessions de caisse ─────────────────────────────────────────────────────
  listCashDesks: () =>
    apiClient
      .get('/finance/cash-sessions/desks')
      .then((r) => (r.data.data ?? []) as import('@/types/finance').CashDesk[]),

  getCashOps: () =>
    apiClient
      .get('/finance/cash-sessions/ops')
      .then((r) => r.data.data as import('@/types/finance').SchoolCashOps),

  openSession: (payload: {
    cashDeskId?: number
    openingFloat?: number
    openingFloatCdf?: number
    openNotes?: string
    currency?: string
    openingSheet?:
      | import('@/types/finance').CashDenominationSheet
      | import('@/types/finance').CashDenominationSheet[]
  }) =>
    apiClient.post('/finance/cash-sessions/open', payload).then(r => r.data.data),

  getCurrentSession: () =>
    apiClient.get('/finance/cash-sessions/current').then(r => r.data.data),

  getSessionSummary: (id: number) =>
    apiClient.get(`/finance/cash-sessions/${id}/summary`).then(r => r.data.data),

  listCashSessionHistory: (params?: { page?: number; limit?: number }) =>
    apiClient
      .get('/finance/cash-sessions/history', { params })
      .then(r => r.data.data as import('@/types/finance').CashSessionHistoryPage),

  getOpeningFloatSuggestion: () =>
    apiClient
      .get('/finance/cash-sessions/opening-suggestion')
      .then(r => r.data.data as import('@/types/finance').OpeningFloatSuggestion),

  getCashFloatPolicy: () =>
    apiClient
      .get('/finance/cash-sessions/float-policy')
      .then(r => r.data.data as import('@/types/finance').CashFloatPolicy),

  closeSession: (
    id: number,
    payload: {
      closingCounted?: number
      closeNotes?: string
      fxRateAtClose?: number
      closingSheet?:
        | import('@/types/finance').CashDenominationSheet
        | import('@/types/finance').CashDenominationSheet[]
    },
  ) =>
    apiClient.post(`/finance/cash-sessions/${id}/close`, payload).then(r => r.data.data),

  addCashSessionMovement: (
    id: number,
    payload: {
      type: import('@/types/finance').CashLedgerMovementType
      amount: number
      amountCdf?: number
      note?: string
      ref?: string
    },
  ) =>
    apiClient
      .post(`/finance/cash-sessions/${id}/movements`, payload)
      .then(r => r.data.data),

  // ── Paiements ──────────────────────────────────────────────────────────────
  processPayment: (payload: {
    studentId: number
    amount: number
    method: 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'
    sessionId: number
    reference?: string
    comment?: string
    feeStructureId?: number
    monthYear?: string
    fees?: Array<{
      feeStructureId: number
      monthYear?: string
      amount: number
    }>
    proofType?: string
    manualJustification?: string
    payerPhone?: string
    tenderCurrency?: 'USD' | 'CDF'
    tenderAmount?: number
    amountPaidUSD?: number
    amountPaidCDF?: number
    idempotencyKey?: string
  }) => {
    const { idempotencyKey, ...body } = payload
    return apiClient
      .post('/finance/payments/process', body, {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      })
      .then((r) => {
        const data = r.data.data as ProcessPaymentResponse
        const paymentId = data.payment?.id ?? data.paymentId ?? data.id
        return { ...data, paymentId, id: paymentId }
      })
  },

  /** Encaissement inter-sites — float local, dette campus d’inscription. */
  processCrossCampusPayment: (payload: {
    studentId: number
    targetSchoolId: number
    feeObligationId: number
    amount: number
    currency: 'USD' | 'CDF'
    paymentMethod: 'CASH' | 'MOBILE_MONEY' | 'CARD'
    notes?: string
    monthYear?: string
    fees?: Array<{ feeStructureId: number; monthYear?: string; amount: number }>
    idempotencyKey?: string
  }) => {
    const { idempotencyKey, ...body } = payload
    return apiClient
      .post('/finance/payments/cross-campus', body, {
        headers: idempotencyKey ? { 'x-idempotency-key': idempotencyKey } : undefined,
      })
      .then((r) => {
        const data = r.data.data as ProcessPaymentResponse & {
          collectingSchoolId: number
          collectingSchoolName: string
          targetSchoolId: number
          targetSchoolName: string
          isCrossCampus: true
        }
        const paymentId = data.payment?.id ?? data.paymentId ?? data.id
        return { ...data, paymentId, id: paymentId }
      })
  },

  /** Recherche élèves tous campuses du réseau (guichet inter-sites). */
  searchNetworkStudents: (query: string, limit = 20) =>
    apiClient
      .get('/network/students/search', { params: { q: query, limit } })
      .then((r) => {
        const d = r.data.data as {
          students?: Array<{
            studentId: number
            matricule: string
            fullName: string
            className: string | null
            feesBalance: number
            schoolId: number
            schoolName: string
            isCrossCampus: boolean
          }>
        }
        const rows = d?.students ?? []
        return rows.map((s) => ({
          id: s.studentId,
          name: s.fullName,
          matricule: s.matricule,
          className: s.className,
          feesBalance: s.feesBalance,
          schoolId: s.schoolId,
          schoolName: s.schoolName,
          isCrossSite: s.isCrossCampus,
        })) as import('@/types/finance').FinanceStudentResult[]
      }),

  verifyPaymentStep: (payload: {
    paymentId: number
    action: 'approve' | 'reject' | 'FINANCE' | 'REJECT'
    notes?: string
  }) => {
    const action =
      payload.action === 'approve' || payload.action === 'FINANCE' ? 'approve' : 'reject'
    return apiClient
      .post(`/finance/payments/${payload.paymentId}/verify-step`, {
        action,
        notes: payload.notes,
      })
      .then((r) => r.data.data)
  },

  verifyExternal: (providerRef: string) =>
    apiClient.post(`/finance/payments/verify/${providerRef}`).then(r => r.data.data),

  getPendingPayments: (): Promise<{
    items: PendingVerificationItem[]
    total: number
    page: number
    limit: number
  }> =>
    apiClient.get('/finance/payments/pending').then((r) => {
      const raw = r.data?.data
      const rows: Record<string, unknown>[] = Array.isArray(raw)
        ? raw
        : Array.isArray(raw?.items)
          ? raw.items
          : []
      const items = rows.map((row) => normalizePendingVerification(row))
      return {
        items,
        total: Number(raw?.total ?? items.length),
        page: Number(raw?.page ?? 1),
        limit: Number(raw?.limit ?? items.length),
      }
    }),

  // ── Reçus ──────────────────────────────────────────────────────────────────
  downloadReceipt: async (
    paymentId: number,
    format: 'A4' | 'Thermal' = 'Thermal',
  ): Promise<Blob> => {
    const { downloadFinanceReceiptPdf } = await import('@/lib/finance/download-receipt-pdf')
    return downloadFinanceReceiptPdf(paymentId, format)
  },

  getThermalReceipt: (paymentId: number) =>
    apiClient
      .get(`/finance/payments/receipts/${paymentId}/thermal`, { timeout: 90_000 })
      .then((r) => {
        const raw = r.data?.data ?? r.data
        return raw as {
          url?: string
          pdfBase64?: string
          whatsapp?: string | null
          receiptData?: Record<string, unknown>
        }
      }),

  // ── Débiteurs & Risques ────────────────────────────────────────────────────
  getDebtors: (minDebt?: number) =>
    apiClient.get('/finance/payments/debtors/list', { params: { minDebt } }).then(r => r.data.data),

  getHighRisk: () =>
    apiClient.get('/finance/payments/risks/high-risk').then(r => r.data.data),

  triggerDebtReminders: (payload?: DebtReminderTriggerInput) =>
    apiClient
      .post('/finance/debt-reminders/trigger', payload ?? {})
      .then(r => r.data.data as DebtReminderTriggerResult),

  getDebtReminderPolicy: () =>
    apiClient
      .get('/finance/debt-reminders/policy')
      .then(r => r.data.data as DebtReminderPolicy),

  updateDebtReminderPolicy: (payload: DebtReminderPolicyUpdate) =>
    apiClient
      .put('/finance/debt-reminders/policy', payload)
      .then(r => r.data.data as DebtReminderPolicy),

  listDebtReminderJournal: (params?: { limit?: number; cursor?: number; campaignKey?: string }) =>
    apiClient
      .get('/finance/debt-reminders/journal', { params })
      .then(r => r.data.data as DebtReminderJournalPage),

  getDebtReminderHealth: () =>
    apiClient
      .get('/finance/debt-reminders/health')
      .then(r => r.data.data as DebtReminderHealth),

  listDeskReminders: () =>
    apiClient.get('/finance/debt-reminders/today').then((r) => r.data.data as DeskReminderList),

  markDeskReminderOpened: (studentId: number) =>
    apiClient
      .post(`/finance/debt-reminders/today/${studentId}/opened`)
      .then((r) => r.data.data),

  dispatchDeskReminders: (studentIds: number[]) =>
    apiClient
      .post('/finance/debt-reminders/today/dispatch', { studentIds })
      .then((r) => r.data.data as DeskReminderDispatch),

  runLateFees: () =>
    apiClient
      .post('/finance/late-fees/run')
      .then(r => r.data.data as LateFeeRunResult),

  // ── Transactions & Recherche ───────────────────────────────────────────────
  searchTransactions: (params: {
    status?: string
    studentId?: number
    classId?: number
    sectionId?: number
    optionId?: number
    method?: string
    search?: string
    startDate?: string
    endDate?: string
    minAmount?: number
    maxAmount?: number
    feeCategoryId?: number
    billingPeriod?: string
    monthYear?: string
    currency?: string
    channel?: string
    isFlagged?: boolean
    sortBy?: string
    sortOrder?: string
    limit?: number
    page?: number
  }) =>
    apiClient.get('/finance/payments/transactions/search', { params }).then(r => r.data.data),

  getStudentProfile: (id: number) =>
    apiClient.get(`/finance/payments/student/${id}/profile`).then(r => r.data.data),

  // ── Élèves (finance) ───────────────────────────────────────────────────────
  searchStudents: (
    query: string,
    filters?: {
      classId?: number
      sectionId?: number
      optionId?: number
      debtorsOnly?: boolean
      sort?: 'name' | 'balance'
      limit?: number
    },
  ) =>
    apiClient
      .get('/finance/students/search', {
        params: {
          q: query || undefined,
          limit: filters?.limit ?? 15,
          classId: filters?.classId,
          sectionId: filters?.sectionId,
          optionId: filters?.optionId,
          debtorsOnly: filters?.debtorsOnly ? 'true' : undefined,
          sort: filters?.sort,
        },
      })
      .then((r) => {
        const d = r.data.data
        return (Array.isArray(d) ? d : (d?.results ?? [])) as import('@/types/finance').FinanceStudentResult[]
      }),

  getNetworkContext: () =>
    apiClient.get('/finance/network/context').then(r => r.data.data as import('@/types/finance').NetworkContext),

  getNetworkClearing: (params?: { from?: string; to?: string }) =>
    apiClient
      .get('/finance/network/clearing', { params })
      .then((r) => r.data.data as import('@/types/finance').NetworkClearing),

  getStudentWallet: (id: number) =>
    apiClient.get(`/finance/students/${id}/wallet`).then(r => r.data.data),

  getStudentSiblings: (id: number) =>
    apiClient.get(`/finance/students/${id}/siblings`).then((r) => {
      const d = r.data.data
      const list = Array.isArray(d) ? d : (d?.siblings ?? [])
      return list as {
        id: number
        matricule: string
        name: string
        className: string | null
        balance: number
        schoolId?: number
        schoolName?: string
        isCrossSite?: boolean
      }[]
    }),

  getStudentFeeSchedule: (studentId: number, sessionId?: number) =>
    apiClient
      .get(`/finance/students/${studentId}/fee-schedule`, {
        params: sessionId != null && sessionId > 0 ? { sessionId } : undefined,
      })
      .then(r => r.data.data as StudentFeeScheduleDto),

  getStudentFeePeriodStatus: (studentId: number, feeStructureId: number) =>
    apiClient
      .get(`/finance/students/${studentId}/fee-periods`, { params: { feeStructureId } })
      .then(r => r.data.data as StudentFeePeriodStatusDto),

  getStudentPaymentsDetailed: (studentId: number, params?: {
    page?: number
    limit?: number
    startDate?: string
    endDate?: string
  }) =>
    apiClient
      .get(`/finance/students/${studentId}/payments/details`, { params })
      .then((r) => asStudentPaymentsDetailedPage(r.data?.data ?? r.data)),

  getStudentStats: () =>
    apiClient.get('/finance/students/stats').then(
      (r) =>
        r.data.data as {
          total: number
          inOrder: number
          debtors: number
          inOrderPct: number | null
          debtorPct: number | null
        },
    ),

  listStudentsFinancial: (params?: {
    classId?: number
    sectionId?: number
    optionId?: number
    status?: import('@/types/finance').StudentFinancialStatus
    sort?: import('@/types/finance').StudentFinancialSort
    minDebt?: number
    minRisk?: number
    page?: number
    limit?: number
  }) =>
    apiClient
      .get('/finance/students', { params })
      .then(r => r.data.data as StudentsFinancialListResponse),

  exportStudentsFinancialPrint: async (params?: {
    classId?: number
    sectionId?: number
    optionId?: number
    status?: import('@/types/finance').StudentFinancialStatus
    sort?: import('@/types/finance').StudentFinancialSort
    minDebt?: number
    minRisk?: number
    format?: 'json' | 'csv'
  }) => {
    const format = params?.format ?? 'json'
    if (format === 'csv') {
      const res = await apiClient.get('/finance/students/export/print', {
        params: { ...params, format: 'csv' },
        responseType: 'blob',
      })
      return { type: 'csv' as const, blob: res.data as Blob }
    }
    const res = await apiClient.get('/finance/students/export/print', { params })
    return { type: 'json' as const, report: res.data.data as StudentsFinancialPrintReport }
  },

  // ── Catalogue ──────────────────────────────────────────────────────────────
  getFeeStructures: (params?: { classId?: number }) =>
    apiClient
      .get('/finance/fee-structures', { params })
      .then((r) => asFeeStructureList(r.data.data)),

  getFeeCategories: () =>
    apiClient
      .get('/finance/fee-categories')
      .then((r) => {
        const d = r.data.data
        return (Array.isArray(d) ? d : (d?.items ?? [])) as FeeCategoryItem[]
      }),

  /** Lecture KYC — route admin autorisée pour FINANCE (OpenAPI finance.json). */
  getPaymentProfile: () =>
    apiClient
      .get('/admin/finance/payment-profile')
      .then((r) => normalizePaymentProfile((r.data.data ?? {}) as Record<string, unknown>) as PaymentProfile),

  /** Config devise école (USD/CDF) — lecture FINANCE autorisée. */
  getCurrencyConfig: () =>
    apiClient
      .get('/admin/finance/currency-config')
      .then((r) => r.data.data as import('@/types/finance-reporting').SchoolCurrencyConfig),

  getMoratoriums: (params?: { status?: string }) =>
    apiClient.get('/finance/moratoriums', { params }).then(r => r.data.data),

  // ── Clôture journalière ───────────────────────────────────────────────────
  getClosingPreview: () =>
    apiClient.get('/finance/closing/preview').then(r => r.data.data),

  finalizeClosing: (payload: { notes?: string }) =>
    apiClient.post('/finance/closing/finalize', payload).then(r => r.data.data),

  // ── Remboursements ─────────────────────────────────────────────────────────
  getRefunds: (params?: { status?: string; page?: number; limit?: number }) =>
    apiClient.get('/finance/refunds', { params }).then(r => r.data.data),

  createRefund: (payload: { paymentId: number; amount: number; reason: string }) =>
    apiClient.post('/finance/refunds', payload).then(r => r.data.data),

  getRefund: (id: number) =>
    apiClient.get(`/finance/refunds/${id}`).then(r => r.data.data),

  processRefund: (id: number, payload: { notes?: string }) =>
    apiClient.post(`/finance/refunds/${id}/process`, payload).then(r => r.data.data),

  syncRefundGateway: (id: number) =>
    apiClient.post(`/finance/refunds/${id}/sync-gateway`).then(r => r.data.data),

  /**
   * Correction immédiate guichet (espèces, session caisse ouverte) —
   * soft-reverse de lignes mois sans suppression ni validation admin.
   */
  correctPaymentLines: (paymentId: number, payload: { paymentFeeIds: number[]; reason: string }) =>
    apiClient
      .post(`/finance/payments/${paymentId}/correct-lines`, payload)
      .then((r) => r.data.data as {
        paymentId: number
        correctionKey: string
        amountReversed: number
        remainingActiveLines: number
        status: string
        avoirPaymentId?: number | null
        receiptNumber?: string | null
        originalReceiptNumber?: string
        rectificationLabel?: string
        pdfBase64?: string | null
        pdfFilename?: string | null
        feeLines: Array<{
          id: number
          feeStructureId: number
          monthYear: string | null
          amount: number
          reversedAt: string | null
          reversalReason: string | null
        }>
      }),

  // ── Exports CSV ────────────────────────────────────────────────────────────
  exportPayments: async (): Promise<Blob> => {
    const res = await apiClient.get('/finance/exports/payments', { responseType: 'blob' })
    return res.data as Blob
  },

  exportDebtors: async (): Promise<Blob> => {
    const res = await apiClient.get('/finance/exports/debtors', { responseType: 'blob' })
    return res.data as Blob
  },

  exportCashSession: async (sessionId: number): Promise<Blob> => {
    const res = await apiClient.get(`/finance/exports/cash-sessions/${sessionId}`, { responseType: 'blob' })
    return res.data as Blob
  },

  /** Rapport Z PDF — généré depuis les encaissements de la session. */
  exportCashSessionReport: async (sessionId: number): Promise<Blob> => {
    const res = await apiClient.get(`/finance/cash-sessions/${sessionId}/report`, {
      responseType: 'blob',
    })
    return res.data as Blob
  },

  getMonthlySituation: (params: { from: string; to: string; reportMonth?: string }) =>
    apiClient
      .get('/finance/reports/monthly-situation', { params })
      .then((r) => r.data.data as import('@/types/finance').MonthlySituationReport),

  exportMonthlySituationPdf: async (params: {
    from: string
    to: string
    reportMonth?: string
  }): Promise<Blob> => {
    const { blob } = await fetchMonthlySituationExport('/finance/reports/monthly-situation/pdf', params, 'pdf')
    return blob
  },

  exportMonthlySituationXlsx: async (params: {
    from: string
    to: string
    reportMonth?: string
  }): Promise<{ blob: Blob; filename: string }> => {
    const month = (params.reportMonth ?? '').replace('-', '')
    return fetchMonthlySituationExport(
      '/finance/reports/monthly-situation/xlsx',
      params,
      'xlsx',
      `situation-financiere-${month || 'periode'}.xlsx`,
    )
  },

  listExpenses: (params?: {
    from?: string
    to?: string
    kind?: string
    status?: string
    limit?: number
  }) =>
    apiClient
      .get('/finance/expenses', { params })
      .then(
        (r) =>
          r.data.data as {
            items: import('@/types/finance').FinanceExpense[]
            count: number
          },
      ),

  createExpense: (payload: import('@/types/finance').CreateExpensePayload) =>
    apiClient
      .post('/finance/expenses', payload)
      .then((r) => r.data.data as import('@/types/finance').FinanceExpense),

  createExpensesBatch: (payload: import('@/types/finance').CreateExpenseBatchPayload) =>
    apiClient
      .post('/finance/expenses/batch', payload)
      .then(
        (r) =>
          r.data.data as {
            items: import('@/types/finance').FinanceExpense[]
            count: number
            total: number
          },
      ),

  postExpense: (id: number) =>
    apiClient
      .post(`/finance/expenses/${id}/post`)
      .then((r) => r.data.data as import('@/types/finance').FinanceExpense),

  voidExpense: (id: number, reason?: string) =>
    apiClient
      .post(`/finance/expenses/${id}/void`, reason ? { reason } : {})
      .then((r) => r.data.data as import('@/types/finance').FinanceExpense),

  submitCashSessionToPromoter: (sessionId: number, payload?: { note?: string }) =>
    apiClient
      .post(`/finance/cash-sessions/${sessionId}/submit-to-promoter`, payload ?? {})
      .then((r) => r.data.data),

  exportAccountingJournal: async (params?: {
    startDate?: string
    endDate?: string
    method?: string
    classId?: number
  }): Promise<Blob> => {
    const res = await apiClient.get('/finance/exports/accounting-journal', {
      params,
      responseType: 'blob',
    })
    return res.data as Blob
  },

  exportGeneralLedger: async (params?: {
    startDate?: string
    endDate?: string
  }): Promise<Blob> => {
    const res = await apiClient.get('/finance/exports/general-ledger', {
      params,
      responseType: 'blob',
    })
    return res.data as Blob
  },

  // ── Classes (vue financière) ───────────────────────────────────────────────
  getClasses: () =>
    apiClient.get('/finance/classes').then(r => {
      const raw = r.data?.data ?? r.data ?? []
      return dedupeClassList(Array.isArray(raw) ? raw : [])
    }),

  getClassDetail: (id: number) =>
    apiClient.get(`/finance/classes/${id}`).then(r => {
      const body = r.data as { data?: unknown } | Record<string, unknown>
      return (body && 'data' in body && body.data != null ? body.data : body) as {
        id: number
        name: string
        section?: { id: number; name: string }
        option?: { id: number; name: string }
      }
    }),

  getClassFinancialStatus: (id: number) =>
    apiClient.get(`/finance/classes/${id}/financial-status`).then(r => r.data),

  exportClassPayments: async (id: number): Promise<Blob> => {
    const res = await apiClient.get(`/finance/classes/${id}/export-payments`, { responseType: 'blob' })
    return res.data as Blob
  },

  getClassAudit: (id: number) =>
    apiClient.get(`/finance/classes/${id}/audit`).then(r => r.data),

  getClassStudents: (id: number) =>
    apiClient.get(`/finance/classes/${id}/students`).then(r => r.data.data) as Promise<{
      id: number; firstName: string; lastName: string; matricule?: string; gender?: string
      enrollments?: { totalAmount: number; paidAmount: number; balance: number }[]
    }[]>,

  // ── Déclarations multi-canaux (justificatifs SMS) ──────────────────────────
  getPaymentDeclarationSettings: (): Promise<{ paymentValidationMode: 'SEMI_AUTOMATIC' | 'INSTANT' }> =>
    apiClient
      .get('/finance/payment-declarations/settings')
      .then((r) => r.data.data as { paymentValidationMode: 'SEMI_AUTOMATIC' | 'INSTANT' }),

  updatePaymentDeclarationSettings: (
    paymentValidationMode: 'SEMI_AUTOMATIC' | 'INSTANT',
  ): Promise<{ paymentValidationMode: 'SEMI_AUTOMATIC' | 'INSTANT' }> =>
    apiClient
      .patch('/finance/payment-declarations/settings', { paymentValidationMode })
      .then((r) => r.data.data as { paymentValidationMode: 'SEMI_AUTOMATIC' | 'INSTANT' }),

  lookupPaymentDeclarationStudent: (code: string): Promise<PaymentDeclarationStudentLookup> =>
    apiClient
      .get('/finance/payment-declarations/lookup', { params: { code } })
      .then((r) => r.data.data as PaymentDeclarationStudentLookup),

  listPaymentDeclarations: (params?: {
    status?: 'PENDING' | 'APPROVED' | 'REJECTED'
    studentId?: number
    q?: string
    page?: number
    limit?: number
  }): Promise<PaymentDeclarationPage> =>
    apiClient
      .get('/finance/payment-declarations', { params })
      .then((r) => r.data.data as PaymentDeclarationPage),

  reviewPaymentDeclaration: (
    id: number,
    payload: {
      decision: 'APPROVE' | 'REJECT'
      rejectionReason?: string
      surplusDestination?: 'RESERVE_ADVANCE' | 'WITHDRAWAL_FEE'
      surplusStudentId?: number
    },
  ): Promise<PaymentDeclarationDto> =>
    apiClient
      .post(`/finance/payment-declarations/${id}/review`, payload)
      .then((r) => r.data.data as PaymentDeclarationDto),

  reprintPaymentDeclarationReceipt: (id: number, allocationId: number): Promise<PaymentDeclarationDto> =>
    apiClient
      .post(`/finance/payment-declarations/${id}/allocations/${allocationId}/reprint`)
      .then((r) => r.data.data as PaymentDeclarationDto),

  downloadPaymentDeclarationAllocationReceipt: async (id: number, allocationId: number): Promise<void> => {
    const res = await apiClient.get(
      `/finance/payment-declarations/${id}/allocations/${allocationId}/receipt`,
      { responseType: 'blob' },
    )
    const filename = parseContentDispositionFilename(
      res.headers['content-disposition'] as string | undefined,
      `recu-${allocationId}.pdf`,
    )
    downloadBlob(res.data as Blob, filename)
  },
}
