import { apiClient } from '@/lib/api/client'
import type {
  AttendanceSettings,
  PatchAttendanceSettingsPayload,
  SchoolBranding,
  AttendanceReadiness,
  AttendanceProvisionResult,
} from '@/types/admin'

export const schoolsApi = {
  getAttendanceSettings: () =>
    apiClient.get('/admin/schools/attendance-settings').then(r => r.data.data as AttendanceSettings),

  updateAttendanceSettings: (payload: PatchAttendanceSettingsPayload) =>
    apiClient.put('/admin/schools/attendance-settings', payload).then(r => r.data.data as AttendanceSettings),

  getAttendanceReadiness: () =>
    apiClient
      .get('/admin/schools/attendance-readiness')
      .then(r => r.data.data as AttendanceReadiness),

  provisionAttendanceSettings: () =>
    apiClient
      .post('/admin/schools/attendance-settings/provision')
      .then(r => r.data.data as AttendanceProvisionResult),

  getBranding: () =>
    apiClient.get('/admin/schools/branding').then(r => r.data.data as SchoolBranding),

  getEntitlements: () =>
    apiClient.get('/admin/schools/entitlements').then(
      (r) =>
        r.data.data as {
          status: string
          features: Record<string, boolean>
          cardPrintingAllowed: boolean
          contractExpiry: string | null
          subscriptionTier: string
          studentCapacity: number | null
        },
    ),

  updateBranding: (
    payload: Partial<
      Pick<
        SchoolBranding,
        'address' | 'phone' | 'email' | 'city' | 'logoUrl' | 'slogan' | 'devise' | 'legalFooter' | 'cardTheme'
      > & { documentAccentColor?: string | null }
    >,
  ) =>
    apiClient.put('/admin/schools/branding', payload).then(r => r.data.data as SchoolBranding),
}
