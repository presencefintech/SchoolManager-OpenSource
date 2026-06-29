import { apiClient } from '@/lib/api/client'
import type { OptionRef, SectionRef } from '@/types/admin'

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const wrapped = data as { data?: T[] }
  return wrapped?.data ?? []
}

export const structureApi = {
  listSections: () =>
    apiClient.get('/admin/structure/sections').then((r) => asList<SectionRef>(r.data)),

  createSection: (payload: { name: string; code?: string }) =>
    apiClient.post('/admin/structure/sections', payload).then((r) => (r.data?.data ?? r.data) as SectionRef),

  listOptions: (sectionId?: number) =>
    apiClient
      .get('/admin/structure/options', { params: sectionId ? { sectionId } : undefined })
      .then((r) => asList<OptionRef>(r.data)),

  createOption: (payload: { sectionId: number; name: string; code?: string }) =>
    apiClient.post('/admin/structure/options', payload).then((r) => (r.data?.data ?? r.data) as OptionRef),
}
