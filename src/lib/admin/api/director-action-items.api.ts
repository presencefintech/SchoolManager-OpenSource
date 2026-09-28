import { apiClient } from '@/lib/api/client'

export type DirectorActionItemType = 'leave' | 'discipline' | 'meeting' | 'report'

export type DirectorActionItem = {
  type: DirectorActionItemType
  id: number
  label: string
  date: string
  href: string
}

export type DirectorActionItemsResponse = {
  counts: {
    leaves: number
    discipline: number
    meetings: number
    reports: number
    total: number
  }
  items: DirectorActionItem[]
}

export const directorActionItemsApi = {
  list: () =>
    apiClient
      .get<{ success: boolean; data: DirectorActionItemsResponse }>('/admin/director/action-items')
      .then((r) => r.data.data),
}
