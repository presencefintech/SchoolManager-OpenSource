import { apiClient } from '@/lib/api/client'
import { toFeeWaiverOutcome } from '@/lib/finance/fee-waiver'
import type { FeeWaiverOutcome } from '@/types/finance'

export type SponsorType = 'NGO' | 'COMPANY' | 'INDIVIDUAL'

export type Sponsor = {
  id: number
  schoolId: number
  name: string
  type: SponsorType
  contactName: string | null
  contactPhone: string | null
  contactEmail: string | null
  notes: string | null
  isActive: boolean
  createdAt: string
}

export type SponsorSummary = {
  sponsor: Sponsor
  activeScholarships: number
  studentsCovered: number
  totalSubsidized: number
}

export type ScholarshipItem = {
  id: number
  studentId: number
  student: { id: number; firstName: string; lastName: string; matricule: string } | null
  sponsorId: number
  sponsor: { id: number; name: string; type: SponsorType }
  notes: string | null
  createdAt: string
  active: boolean
  feeAssignment: {
    id: number
    type: 'ASSIGN' | 'OVERRIDE' | 'EXEMPT'
    feeStructureId: number | null
    feeStructureName: string | null
    amount: number | null
    currency: string | null
    validFrom: string
    validTo: string | null
  }
}

export type CreateScholarshipInput = {
  studentId: number
  sponsorId: number
  feeStructureId: number
  type: 'EXEMPT' | 'OVERRIDE'
  amountOverride?: number
  percentOverride?: number
  reason: string
  validFrom?: string
  validTo?: string
  notes?: string
}

export const financeScholarshipApi = {
  listSponsors: () =>
    apiClient
      .get<{ success: boolean; data: Sponsor[] }>('/admin/finance/sponsors')
      .then((r) => r.data.data),

  createSponsor: (input: { name: string; type?: SponsorType; contactName?: string; contactPhone?: string; contactEmail?: string; notes?: string }) =>
    apiClient
      .post<{ success: boolean; data: Sponsor }>('/admin/finance/sponsors', input)
      .then((r) => r.data.data),

  sponsorSummary: (sponsorId: number) =>
    apiClient
      .get<{ success: boolean; data: SponsorSummary }>(`/admin/finance/sponsors/${sponsorId}/summary`)
      .then((r) => r.data.data),

  listScholarships: (params?: { sponsorId?: number; studentId?: number }) =>
    apiClient
      .get<{ success: boolean; data: ScholarshipItem[] }>('/admin/finance/scholarships', { params })
      .then((r) => r.data.data),

  /** 201 = bourse créée ; 202 = bourse transmise au Promoteur (remise à valider). */
  createScholarship: (input: CreateScholarshipInput): Promise<FeeWaiverOutcome<ScholarshipItem>> =>
    apiClient
      .post('/admin/finance/scholarships', input)
      .then((r) => toFeeWaiverOutcome<ScholarshipItem>(r)),

  endScholarship: (id: number) =>
    apiClient
      .post<{ success: boolean; data: ScholarshipItem }>(`/admin/finance/scholarships/${id}/end`)
      .then((r) => r.data.data),
}
