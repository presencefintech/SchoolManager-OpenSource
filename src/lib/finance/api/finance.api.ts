import { apiClient } from '@/lib/api/client'

export const financeRoleApi = {
  getExecutiveDashboard: () =>
    apiClient.get('/finance/payments/analytics/executive').then(r => r.data.data),

  getCollectionAnalytics: (sessionId?: number) =>
    apiClient.get('/finance/payments/analytics/collection', { params: { sessionId } }).then(r => r.data.data),

  getDailyCashReport: () =>
    apiClient.get('/finance/payments/reports/daily-cash').then(r => r.data.data),

  checkIntegrity: () =>
    apiClient.get('/finance/payments/audit/integrity').then(r => r.data.data),

  getDebtors: (minDebt?: number) =>
    apiClient.get('/finance/payments/debtors/list', { params: { minDebt } }).then(r => r.data.data),

  getHighRisk: () =>
    apiClient.get('/finance/payments/risks/high-risk').then(r => r.data.data),

  processPayment: (payload: {
    studentId: number
    amount: number
    method: 'CASH' | 'ORANGE_MONEY' | 'MPESA' | 'AIRTEL_MONEY' | 'BANK' | 'CARD'
    sessionId: number
    reference?: string
    comment?: string
    feeStructureId?: number
  }) =>
    apiClient.post('/finance/payments/payments/process', payload).then(r => r.data.data),

  verifyExternal: (providerRef: string) =>
    apiClient.post(`/finance/payments/payments/verify/${providerRef}`).then(r => r.data.data),

  searchTransactions: (params: { status?: string; studentId?: number; startDate?: string; endDate?: string; limit?: number; page?: number }) =>
    apiClient.get('/finance/payments/transactions/search', { params }).then(r => r.data.data),

  getStudentProfile: (id: number) =>
    apiClient.get(`/finance/payments/student/${id}/profile`).then(r => r.data.data),

  getClasses: () =>
    apiClient.get('/finance/classes').then(r => r.data.data),

  getClassFinancialStatus: (id: number) =>
    apiClient.get(`/finance/classes/${id}/financial-status`).then(r => r.data.data),

  getClassAudit: (id: number) =>
    apiClient.get(`/finance/classes/${id}/audit`).then(r => r.data.data),
}
