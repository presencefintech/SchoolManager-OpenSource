import { apiClient } from '@/lib/api/client'

export type AnnouncementStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED'
export type AnnouncementAudience = 'ALL_PARENTS' | 'SELECTED_PARENTS' | 'BY_CLASS'

export type CreateAnnouncementPayload = {
  title: string
  body: string
  audience?: AnnouncementAudience
  requiresAgreement?: boolean
  classId?: number
  /** null / omit = globale ; sinon scoped section (DIRECTOR) */
  sectionId?: number | null
  userIds?: number[]
  publish?: boolean
  expiresAt?: string
}

export type AnnouncementEngagement = {
  readRate: number
  agreeRate: number | null
  healthScore: number
  pendingReads: number
  pendingAgreements: number
  medianTimeToReadMs: number | null
}

export type AnnouncementListItem = {
  id: number
  title: string
  body: string
  status: AnnouncementStatus
  audience: AnnouncementAudience
  requiresAgreement: boolean
  classId?: number | null
  sectionId?: number | null
  section?: { id: number; name: string; code?: string | null } | null
  createdById?: number
  createdBy?: {
    id: number
    firstName: string
    lastName: string
    role: string
  } | null
  publishedAt?: string | null
  expiresAt?: string | null
  createdAt?: string
  recipientCount?: number
  _count?: { recipients: number }
  engagement?: AnnouncementEngagement
}

export type AnnouncementListResponse = {
  items: AnnouncementListItem[]
  total: number
  page: number
  lastPage: number
}

export type AnnouncementInsights = {
  announcementCount: number
  avgHealthScore: number
  totalPendingReads: number
  totalPendingAgreements: number
  underperforming: Array<{
    id: number
    title: string
    healthScore: number
    pendingReads: number
    pendingAgreements: number
  }>
}

export const announcementsApi = {
  list: (params?: {
    page?: number
    limit?: number
    status?: AnnouncementStatus
    createdByRole?: 'ADMIN' | 'DIRECTOR' | 'SUPER_ADMIN'
    createdById?: number
    sectionId?: number
  }) =>
    apiClient
      .get<{ success: boolean; data: AnnouncementListResponse }>('/admin/announcements', {
        params,
      })
      .then((r) => r.data.data),

  create: (payload: CreateAnnouncementPayload) =>
    apiClient
      .post<{ success: boolean; data: AnnouncementListItem & { recipientCount?: number } }>(
        '/admin/announcements',
        payload
      )
      .then((r) => r.data.data),

  publish: (announcementId: number) =>
    apiClient
      .post<{ success: boolean; data: AnnouncementListItem }>(
        `/admin/announcements/${announcementId}/publish`
      )
      .then((r) => r.data.data),

  archive: (announcementId: number) =>
    apiClient
      .post<{ success: boolean; data: AnnouncementListItem }>(
        `/admin/announcements/${announcementId}/archive`
      )
      .then((r) => r.data.data),

  insights: () =>
    apiClient
      .get<{ success: boolean; data: AnnouncementInsights }>('/admin/announcements/insights')
      .then((r) => r.data.data),

  preview: (payload: {
    audience: AnnouncementAudience
    classId?: number
    sectionId?: number | null
    userIds?: number[]
  }) =>
    apiClient
      .post<{
        success: boolean
        data: {
          audience: AnnouncementAudience
          classId: number | null
          sectionId?: number | null
          recipientCount: number
          capped: boolean
          maxRecipients: number
        }
      }>('/admin/announcements/preview', payload)
      .then((r) => r.data.data),
}
