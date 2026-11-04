import { apiClient } from '@/lib/api/client'
import type { BankSyncResult, BankInspectResult } from '@/types/super-admin'

export const bankApi = {
  forceSync: (paymentId: number) =>
    apiClient
      .post<{ success: boolean; data: BankSyncResult }>(`/superadmin/bank/force-sync/${paymentId}`)
      .then((r) => r.data.data),

  inspect: (reference: string) =>
    apiClient
      .post<{ success: boolean; data: BankInspectResult }>('/superadmin/bank/inspect', { reference })
      .then((r) => r.data.data),
}
