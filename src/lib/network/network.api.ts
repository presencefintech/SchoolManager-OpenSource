import { apiClient } from '@/lib/api/client'

export type NetworkCampus = {
  id: number
  name: string
  city: string | null
  isPaymentHub: boolean
}

export type NetworkCampusesResponse = {
  networkId: number
  networkName: string
  networkCode: string | null
  campuses: NetworkCampus[]
}

export type CampusRevenueBreakdown = {
  schoolId: number
  schoolName: string
  isPaymentHub: boolean
  revenueUsd: number
  collectionRate: number
  feesPaid: number
  feesBalance: number
  activeEnrollment: number
  attendanceRate: number
  presentToday: number
}

export type NetworkConsolidatedAnalytics = {
  networkId: number
  networkName: string
  networkCode: string | null
  generatedAt: string
  campuses: CampusRevenueBreakdown[]
  totals: {
    revenueUsd: number
    collectionRate: number
    activeEnrollment: number
    attendanceRate: number
  }
  cashFlowByMonth: Array<{ month: string; usd: number; cdf: number }>
  attendanceComparison: Array<{
    schoolId: number
    schoolName: string
    attendanceRate: number
    presentToday: number
    activeEnrollment: number
  }>
}

export const networkApi = {
  getAnalytics: (networkId?: number) =>
    apiClient
      .get<{ success: boolean; data: NetworkConsolidatedAnalytics }>('/network/analytics', {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  listCampuses: (networkId?: number) =>
    apiClient
      .get<{ success: boolean; data: NetworkCampusesResponse }>('/network/campuses', {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  listCampusClasses: (schoolId: number, networkId?: number) =>
    apiClient
      .get<{
        success: boolean
        data: {
          schoolId: number
          schoolName: string
          classes: Array<{ id: number; name: string; level?: string | null }>
        }
      }>(`/network/campuses/${schoolId}/classes`, {
        params: networkId ? { networkId } : undefined,
      })
      .then((r) => r.data.data),

  transferStudent: (
    studentId: number,
    body: { targetSchoolId: number; targetClassId: number; reason?: string },
  ) =>
    apiClient
      .post<{
        success: boolean
        data: {
          studentId: number
          matricule: string
          sourceSchoolName: string
          targetSchoolName: string
          targetClassName: string
          transferLogId: number
          note: string
        }
        message?: string
      }>(`/network/students/${studentId}/transfer`, body)
      .then((r) => r.data),
}
