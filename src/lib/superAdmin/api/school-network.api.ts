import { apiClient } from '@/lib/api/client'
import type { NetworkClearing, NetworkContext } from '@/types/finance'

export type SchoolNetworkMember = {
  id: number
  name: string
  city: string | null
  active: boolean
  isPaymentHub: boolean
  studentCount: number
}

export type SchoolNetworkHealth = {
  hasHub: boolean
  hasMultipleSites: boolean
  isActive: boolean
  hasFinanceOnHub: boolean
  readyForCrossSite: boolean
  warnings: string[]
}

export type SchoolNetworkGroup = {
  id: number
  uuid: string
  name: string
  slug: string
  active: boolean
  createdAt: string
  schools: SchoolNetworkMember[]
  paymentHubId: number | null
  paymentHubName: string | null
  health: SchoolNetworkHealth
  crossSiteLast30d: { amount: number; count: number; currency: string }
}

export type SchoolNetworkOption = {
  id: number
  name: string
  city: string | null
  groupId: number | null
  groupName: string | null
  isPaymentHub: boolean
  studentCount: number
}

export type SchoolNetworkOverview = {
  group: SchoolNetworkGroup
  hubFinanceUsers: Array<{
    id: number
    email: string | null
    firstName: string | null
    lastName: string | null
  }>
  clearing30d: {
    period: { from: string; to: string }
    currency: string
    localCollected: { amount: number; count: number }
    crossSiteTotal: { amount: number; count: number }
    positions: Array<{
      enrollmentSchoolId: number
      enrollmentSchoolName: string
      amountDueToCampus: number
      paymentCount: number
    }>
    summaryLabel: string
  } | null
}

export const schoolNetworkApi = {
  listGroups: () =>
    apiClient
      .get<{ success: boolean; data: { count: number; groups: SchoolNetworkGroup[] } }>(
        '/superadmin/school-networks',
      )
      .then((r) => r.data.data.groups),

  listSchoolOptions: () =>
    apiClient
      .get<{ success: boolean; data: { count: number; schools: SchoolNetworkOption[] } }>(
        '/superadmin/school-networks/schools',
      )
      .then((r) => r.data.data.schools),

  getOverview: (groupId: number) =>
    apiClient
      .get<{ success: boolean; data: SchoolNetworkOverview }>(
        `/superadmin/school-networks/${groupId}/overview`,
      )
      .then((r) => r.data.data),

  createGroup: (body: { name: string; slug?: string }) =>
    apiClient
      .post<{ success: boolean; data: SchoolNetworkGroup }>('/superadmin/school-networks', body)
      .then((r) => r.data.data),

  updateGroup: (groupId: number, body: { name?: string; active?: boolean }) =>
    apiClient
      .patch<{ success: boolean; data: SchoolNetworkGroup }>(
        `/superadmin/school-networks/${groupId}`,
        body,
      )
      .then((r) => r.data.data),

  assignSchool: (body: { groupId: number; schoolId: number; isPaymentHub?: boolean }) =>
    apiClient
      .post<{ success: boolean; data: SchoolNetworkGroup }>(
        '/superadmin/school-networks/assign',
        body,
      )
      .then((r) => r.data.data),

  unassignSchool: (schoolId: number) =>
    apiClient.delete(`/superadmin/school-networks/schools/${schoolId}`).then((r) => r.data),

  setPaymentHub: (schoolId: number) =>
    apiClient
      .post<{ success: boolean; data: SchoolNetworkGroup }>(
        `/superadmin/school-networks/schools/${schoolId}/payment-hub`,
      )
      .then((r) => r.data.data),
}

export const adminNetworkApi = {
  getContext: () =>
    apiClient
      .get<{ success: boolean; data: NetworkContext }>('/admin/finance/network')
      .then((r) => r.data.data),

  getClearing: (params?: { from?: string; to?: string }) =>
    apiClient
      .get<{ success: boolean; data: NetworkClearing }>('/admin/finance/network/clearing', {
        params,
      })
      .then((r) => r.data.data),
}
