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
          enableWhatsapp: boolean
          enableSms: boolean
          enablePush: boolean
          smsBalance: number | null
          allowSmsOverdraft: boolean
        },
    ),

  getMessaging: () =>
    apiClient.get('/admin/schools/messaging').then(
      (r) =>
        r.data.data as {
          enableWhatsapp: boolean
          enableSms: boolean
          enablePush: boolean
          smsBalance: number | null
          allowSmsOverdraft: boolean
        },
    ),

  updateMessaging: (payload: {
    enableWhatsapp?: boolean
    enableSms?: boolean
    enablePush?: boolean
  }) =>
    apiClient.put('/admin/schools/messaging', payload).then(
      (r) =>
        r.data.data as {
          enableWhatsapp: boolean
          enableSms: boolean
          enablePush: boolean
          smsBalance: number | null
          allowSmsOverdraft: boolean
        },
    ),

  updateBranding: (
    payload: Partial<
      Pick<
        SchoolBranding,
        'address' | 'phone' | 'email' | 'city' | 'logoUrl' | 'slogan' | 'devise' | 'legalFooter' | 'cardTheme' | 'uiTheme'
      > & { documentAccentColor?: string | null }
    >,
  ) =>
    apiClient.put('/admin/schools/branding', payload).then(r => r.data.data as SchoolBranding),

  getStaffAccess: () =>
    apiClient.get('/admin/staff-access').then(
      (r) =>
        r.data.data as {
          policy: StaffAccessPolicy
          defaults: StaffAccessPolicy
          configurableRoles: Array<keyof StaffAccessPolicy>
          catalog: StaffAccessCatalogItem[]
        },
    ),

  getStaffAccessOverview: () =>
    apiClient.get('/admin/staff-access/overview').then((r) => r.data.data as StaffAccessOverview),

  updateStaffAccess: (payload: Partial<StaffAccessPolicy>) =>
    apiClient
      .put('/admin/staff-access', payload)
      .then((r) => r.data.data as { policy: StaffAccessPolicy }),

  getMemberStaffAccess: (userId: number) =>
    apiClient.get(`/admin/staff/${userId}/access`).then((r) => r.data.data),

  updateMemberStaffAccess: (userId: number, payload: Partial<StaffRoleCapabilities> | { reset: true }) =>
    'reset' in payload && payload.reset
      ? apiClient.delete(`/admin/staff/${userId}/access`).then((r) => r.data.data)
      : apiClient.patch(`/admin/staff/${userId}/access`, payload).then((r) => r.data.data),

  getMyStaffAccess: () =>
    apiClient.get('/admin/staff-access/me').then(
      (r) =>
        r.data.data as {
          role: string
          caps: StaffRoleCapabilities & { locked?: boolean }
          items?: StaffAccessItem[]
          schoolModules?: StaffAccessOverview['schoolModules']
        },
    ),
}

export type StaffRoleCapabilities = {
  seeFinanceAmounts: boolean
  seePaymentHistory: boolean
  seeParentContacts: boolean
  exportLists: boolean
  accessFinanceRead: boolean
  attributeFees: boolean
  manageEnrollments: boolean
  inviteParents: boolean
  importData: boolean
  composeAnnouncements: boolean
  publishAnnouncements: boolean
  manageStructure: boolean
  viewReports: boolean
}

export type StaffAccessPolicy = {
  IT: StaffRoleCapabilities
  DIRECTOR: StaffRoleCapabilities
  TEACHER: StaffRoleCapabilities
}

export type StaffAccessCatalogItem = {
  key: keyof StaffRoleCapabilities
  label: string
  hint: string
  group?: string
  dependsOn?: keyof StaffRoleCapabilities
}

export type StaffAccountView = {
  state: 'active' | 'deactivated' | 'blocked' | 'pending'
  isActive: boolean
  status: string
  locked: boolean
  lockReason?: 'self' | 'privileged' | 'role' | null
  canDeactivate: boolean
  canBlock: boolean
  canActivate: boolean
  last?: {
    action: 'deactivate' | 'block' | 'activate'
    reason: string | null
    at: string
    actorId: number | null
    actorName: string | null
  } | null
}

export type StaffAccessItem = StaffAccessCatalogItem & {
  schoolDefault: boolean
  enabled: boolean
  source: 'locked' | 'school' | 'grant' | 'deny'
}

export type StaffAccessOverview = {
  catalog: StaffAccessCatalogItem[]
  configurableRoles: Array<keyof StaffAccessPolicy>
  defaults: StaffAccessPolicy
  policy: StaffAccessPolicy
  roles?: Record<
    string,
    { effective: StaffRoleCapabilities; customized: boolean; items: StaffAccessItem[] }
  >
  schoolModules?: {
    readonly?: boolean
    items?: Array<{ key: string; label: string; enabled: boolean; impactOff?: string }>
    disabledCount?: number
  }
  members: Array<{
    id: number
    firstName: string | null
    lastName: string | null
    role: string
    email: string | null
    isActive: boolean
    status: string
    access: {
      effective: StaffRoleCapabilities
      customized: boolean
      items: StaffAccessItem[]
    }
    account: StaffAccountView
  }>
}
