import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import {
  isExportContentType,
  parseContentDispositionFilename,
  readBlobErrorMessage,
} from '@/lib/download-blob'

export type PickupChild = {
  id: number
  name: string
  className: string
  status: string
}

export type PickupAdult = {
  id: number
  name: string
  lastName: string
  firstName: string
  prenom: string | null
  postnom: string | null
  phone: string
  photoUrl: string | null
  idDocumentType: string | null
  idDocumentNumber: string | null
  relationship: string | null
  status: string
  parentId: number | null
  children: PickupChild[]
  card: {
    id: number
    status: string
    printedAt: string | null
    reprintCount: number
  } | null
  canPrint: boolean
}

export type PickupHousehold = {
  student: PickupChild
  household: PickupChild[]
  adults: PickupAdult[]
}

export type PickupAdultPayload = {
  lastName: string
  firstName: string
  prenom?: string
  postnom?: string
  phone: string
  relationship: string
  idDocumentType?: string
  idDocumentNumber: string
  studentIds: number[]
}

async function fetchPdf(
  request: Promise<{ data: Blob; headers: Record<string, unknown> }>,
  fallbackFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  try {
    const res = await request
    const contentType = res.headers['content-type'] as string | undefined
    if (!isExportContentType(contentType, 'pdf')) {
      throw new Error(await readBlobErrorMessage(res.data))
    }
    return {
      blob: res.data,
      filename: parseContentDispositionFilename(
        res.headers['content-disposition'] as string | undefined,
        fallbackFilename,
      ),
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
      throw new Error(await readBlobErrorMessage(error.response.data))
    }
    throw error
  }
}

export const pickupApi = {
  getHousehold: (studentId: number) =>
    apiClient
      .get<{ success: boolean; data: PickupHousehold }>(`/admin/enrollments/${studentId}/pickup`)
      .then((r) => r.data.data),

  createAdult: (studentId: number, payload: PickupAdultPayload) =>
    apiClient
      .post<{ success: boolean; data: PickupAdult }>(
        `/admin/enrollments/${studentId}/pickup/adults`,
        payload,
      )
      .then((r) => r.data.data),

  updateAdult: (adultId: number, payload: Partial<PickupAdultPayload>) =>
    apiClient
      .patch<{ success: boolean; data: PickupAdult }>(`/admin/pickup/adults/${adultId}`, payload)
      .then((r) => r.data.data),

  setChildren: (adultId: number, studentIds: number[]) =>
    apiClient
      .put<{ success: boolean; data: PickupAdult }>(`/admin/pickup/adults/${adultId}/children`, {
        studentIds,
      })
      .then((r) => r.data.data),

  revokeAdult: (adultId: number) =>
    apiClient.post(`/admin/pickup/adults/${adultId}/revoke`).then((r) => r.data),

  uploadPhoto: (adultId: number, file: File) => {
    const fd = new FormData()
    fd.append('photo', file)
    return apiClient
      .post<{ success: boolean; data: PickupAdult }>(`/admin/pickup/adults/${adultId}/photo`, fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data.data)
  },

  downloadAdultCardPdf: (adultId: number, reissue = false) =>
    fetchPdf(
      apiClient.get<Blob>(`/admin/pickup/adults/${adultId}/card/pdf`, {
        params: reissue ? { reissue: '1' } : undefined,
        responseType: 'blob',
        timeout: 60_000,
      }),
      `carte-remise-${adultId}.pdf`,
    ),

  downloadStudentCardsPdf: (studentId: number) =>
    fetchPdf(
      apiClient.get<Blob>(`/admin/enrollments/${studentId}/pickup/cards/pdf`, {
        responseType: 'blob',
        timeout: 60_000,
      }),
      `cartes-remise-eleve-${studentId}.pdf`,
    ),
}
