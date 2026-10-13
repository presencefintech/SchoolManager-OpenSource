import { apiClient } from '@/lib/api/client'
import type { NetworkConsolidatedAnalytics } from '@/lib/network/network.api'

export type PromoterSchool = {
  id: number
  name: string
  city: string | null
  isPaymentHub: boolean
  active: boolean
}

export type MySchoolsResponse = {
  networkId: number | null
  networkName: string | null
  networkCode: string | null
  isNetworkPromoter: boolean
  isOwner: boolean
  schools: PromoterSchool[]
  activeSchoolId: number | null
}

export const adminNetworkApi = {
  getMySchools: () =>
    apiClient
      .get<{ success: boolean; data: MySchoolsResponse }>('/admin/network/my-schools')
      .then((r) => r.data.data),

  getConsolidatedDashboard: () =>
    apiClient
      .get<{ success: boolean; data: NetworkConsolidatedAnalytics }>(
        '/admin/network/consolidated-dashboard',
      )
      .then((r) => r.data.data),
}
