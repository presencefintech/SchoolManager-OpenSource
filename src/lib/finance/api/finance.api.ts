import { apiClient } from '@/lib/api/client'
import type { StudentFeeScheduleDto } from '@/types/finance'

export const financeRoleApi = {
  // ── Dashboard & Analytics ──────────────────────────────────────────────────
  getExecutiveDashboard: () =>
    apiClient.get('/finance/payments/analytics/executive').then(r => r.data.data),

  getCollectionAnalytics: (sessionId?: number) =>
    apiClient.get('/finance/payments/analytics/collection', { params: { sessionId } }).then(r => r.data.data),

  getDailyCashReport: () =>
    apiClient.get('/finance/payments/reports/daily-cash').then(r => r.data.data),

  getGuichetDashboard: () =>
    apiClient.get('/finance/dashboard/guichet').then(r => r.data.data),

  checkIntegrity: () =>
    apiClient.get('/finance/payments/audit/integrity').then(r => r.data.data),

  // ── Sessions de caisse ─────────────────────────────────────────────────────
  openSession: (payload: { openingFloat: number; openNotes?: string }) =>
    apiClient.post('/finance/cash-sessions/open', payload).then(r => r.data.data),

  getCurrentSession: () =>
    apiClient.get('/finance/cash-sessions/current').then(r => r.data.data),

  getSessionSummary: (id: number) =>
    apiClient.get(`/finance/cash-sessions/${id}/summary`).then(r => r.data.data),

  closeSession: (id: number, payload: { closingCounted: number; closeNotes?: string }) =>
    apiClient.post(`/finance/cash-sessions/${id}/close`, payload).then(r => r.data.data),

  // ── Paiements ──────────────────────────────────────────────────────────────
  processPayment: (payload: {
    studentId: number
    amount: number
    method: 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'
    sessionId: number
    reference?: string
    comment?: string
    feeStructureId?: number
  }) =>
    apiClient.post('/finance/payments/process', payload).then(r => r.data.data),

  verifyPaymentStep: (payload: { verificationId: number; action: 'FINANCE' | 'REJECT'; notes?: string }) =>
    apiClient.post(`/finance/payments/${payload.verificationId}/verify-step`, {
      action: payload.action,
      notes: payload.notes,
    }).then(r => r.data.data),

  verifyExternal: (providerRef: string) =>
    apiClient.post(`/finance/payments/verify/${providerRef}`).then(r => r.data.data),

  getPendingPayments: () =>
    apiClient.get('/finance/payments/pending').then(r => r.data.data),

  // ── Reçus ──────────────────────────────────────────────────────────────────
  downloadReceipt: async (paymentId: number): Promise<Blob> => {
    const res = await apiClient.get(`/finance/payments/receipts/${paymentId}/download`, { responseType: 'blob' })
    return res.data as Blob
  },

  getThermalReceipt: (paymentId: number) =>
    apiClient.get(`/finance/payments/receipts/${paymentId}/thermal`).then(r => r.data.data),

  // ── Débiteurs & Risques ────────────────────────────────────────────────────
  getDebtors: (minDebt?: number) =>
    apiClient.get('/finance/payments/debtors/list', { params: { minDebt } }).then(r => r.data.data),

  getHighRisk: () =>
    apiClient.get('/finance/payments/risks/high-risk').then(r => r.data.data),

  triggerDebtReminders: () =>
    apiClient.post('/finance/debt-reminders/trigger').then(r => r.data.data),

  // ── Transactions & Recherche ───────────────────────────────────────────────
  searchTransactions: (params: { status?: string; studentId?: number; startDate?: string; endDate?: string; limit?: number; page?: number }) =>
    apiClient.get('/finance/payments/transactions/search', { params }).then(r => r.data.data),

  getStudentProfile: (id: number) =>
    apiClient.get(`/finance/payments/student/${id}/profile`).then(r => r.data.data),

  // ── Élèves (finance) ───────────────────────────────────────────────────────
  searchStudents: (query: string) =>
    apiClient.get('/finance/students/search', { params: { q: query, limit: 15 } }).then(r => {
      const d = r.data.data
      return (Array.isArray(d) ? d : (d?.results ?? [])) as { id: number; name: string; matricule: string; className: string | null }[]
    }),

  getStudentWallet: (id: number) =>
    apiClient.get(`/finance/students/${id}/wallet`).then(r => r.data.data),

  getStudentFeeSchedule: (studentId: number, sessionId?: number) =>
    apiClient
      .get(`/finance/students/${studentId}/fee-schedule`, {
        params: sessionId != null && sessionId > 0 ? { sessionId } : undefined,
      })
      .then(r => r.data.data as StudentFeeScheduleDto),

  // ── Catalogue ──────────────────────────────────────────────────────────────
  getFeeStructures: (params?: { classId?: number }) =>
    apiClient.get('/finance/fee-structures', { params }).then(r => r.data.data as { id: number; label: string; amount: number; description?: string }[]),

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

  // ── Classes (vue financière) ───────────────────────────────────────────────
  getClasses: () =>
    apiClient.get('/finance/classes').then(r => r.data.data),

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
}
