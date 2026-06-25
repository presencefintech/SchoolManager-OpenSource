import { apiClient } from '@/lib/api/client'
import type {
  FeeSchoolStructure,
  FeeCategory,
  FeeHistoryEntry,
  FeeInvoice,
  BulkApplyResult,
  ReconcileResult,
  FeeType,
} from '@/types/super-admin'

export const feesApi = {
  getSchoolStructures: (schoolId: number, params?: { classId?: number; sessionId?: number }) =>
    apiClient
      .get<{ success: boolean; data: FeeSchoolStructure[] }>(
        `/superadmin/fees/schools/${schoolId}/structures`,
        { params }
      )
      .then((r) => r.data.data),

  getFeeHistory: (feeId: number) =>
    apiClient
      .get<{ success: boolean; data: FeeHistoryEntry[] }>(`/superadmin/fees/${feeId}/history`)
      .then((r) => r.data.data),

  getStudentInvoiceAudit: (schoolId: number, studentId: number) =>
    apiClient
      .get<{ success: boolean; data: FeeInvoice[] }>(
        `/superadmin/fees/schools/${schoolId}/students/${studentId}/audit`
      )
      .then((r) => r.data.data),

  upsertFee: (data: {
    id?: number
    schoolId: number
    name: string
    amount: number
    type: FeeType
    levelId?: number
  }) =>
    apiClient
      .post<{ success: boolean; data: FeeSchoolStructure }>('/superadmin/fees/upsert', data)
      .then((r) => r.data.data),

  deleteFee: (feeId: number) =>
    apiClient
      .delete<{ success: boolean; data: { message: string } }>(`/superadmin/fees/${feeId}`)
      .then((r) => r.data.data),

  createCategory: (data: { targetSchoolId: number; name: string; description?: string }) =>
    apiClient
      .post<{ success: boolean; data: FeeCategory }>('/superadmin/fees/categories', data)
      .then((r) => r.data.data),

  forceGenerateInvoice: (data: {
    studentId: number
    sessionId: number
    schoolId: number
    description?: string
  }) =>
    apiClient
      .post<{ success: boolean; data: FeeInvoice }>('/superadmin/fees/invoices/force-generate', data)
      .then((r) => r.data.data),

  applyGlobalDiscount: (data: {
    invoiceId: number
    amount: number
    reason: string
    schoolId: number
  }) =>
    apiClient
      .patch<{ success: boolean; data: FeeInvoice }>('/superadmin/fees/invoices/apply-global-discount', data)
      .then((r) => r.data.data),

  bulkApplyFees: (ids: number[]) =>
    apiClient
      .post<{ success: boolean; data: BulkApplyResult }>('/superadmin/fees/bulk-apply', { ids })
      .then((r) => r.data.data),

  applyFeeToEnrollment: (enrollmentId: number) =>
    apiClient
      .post<{ success: boolean; data: unknown }>(`/superadmin/fees/apply/${enrollmentId}`)
      .then((r) => r.data.data),

  reconcile: (enrollmentId: number) =>
    apiClient
      .post<{ success: boolean; data: ReconcileResult }>(`/superadmin/fees/reconcile/${enrollmentId}`)
      .then((r) => r.data.data),
}
