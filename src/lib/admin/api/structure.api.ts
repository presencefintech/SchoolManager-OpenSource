import { apiClient } from '@/lib/api/client'
import type { OptionRef, SectionRef } from '@/types/admin'

function asList<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[]
  const wrapped = data as { data?: T[] }
  return wrapped?.data ?? []
}

function asSections(data: unknown): SectionRef[] {
  return asList<SectionRef>(data).map((s) => ({
    ...s,
    id: Number(s.id),
    name: String(s.name ?? ''),
    code: s.code ?? null,
    requiresOption: typeof s.requiresOption === 'boolean' ? s.requiresOption : undefined,
  })).filter((s) => Number.isFinite(s.id) && s.id > 0)
}

export const structureApi = {
  listSections: () =>
    apiClient.get('/admin/structure/sections').then((r) => asSections(r.data)),

  createSection: (payload: { name: string; code?: string }) =>
    apiClient.post('/admin/structure/sections', payload).then((r) => {
      const s = (r.data?.data ?? r.data) as SectionRef
      return {
        ...s,
        id: Number(s.id),
        name: String(s.name ?? ''),
        code: s.code ?? null,
        requiresOption: typeof s.requiresOption === 'boolean' ? s.requiresOption : undefined,
      }
    }),

  listOptions: (sectionId?: number) =>
    apiClient
      .get('/admin/structure/options', { params: sectionId ? { sectionId } : undefined })
      .then((r) => asList<OptionRef>(r.data)),

  createOption: (payload: { sectionId: number; name: string; code?: string }) =>
    apiClient.post('/admin/structure/options', payload).then((r) => (r.data?.data ?? r.data) as OptionRef),
}
