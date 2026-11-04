import { apiClient } from '@/lib/api/client'

export type ParentLookupChild = {
  id: number
  matricule: string | null
  fullName: string
}

export type ParentLookupResult = {
  found: boolean
  source: 'parent' | 'student_contact' | null
  phone: string
  parent: {
    id: number | null
    firstName: string
    lastName: string
    prenom: string | null
    postnom: string | null
    phone: string | null
    displayName: string
    childrenCount: number
    children: ParentLookupChild[]
  } | null
}

export const parentsApi = {
  lookupByPhone: (phone: string) =>
    apiClient
      .get<{ success: boolean; data: ParentLookupResult }>('/admin/parents/lookup', {
        params: { phone },
      })
      .then((r) => r.data.data),
}
