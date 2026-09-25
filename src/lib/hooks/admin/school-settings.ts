import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { schoolsApi, attendanceNotificationsApi } from '@/lib/admin/api'
import { getAuthSchoolId } from '@/lib/api/auth-storage'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { PatchAttendanceSettingsPayload, SchoolBranding } from '@/types/admin'

// ── School Settings ────────────────────────────────────────────────

export function useAttendanceSettings() {
  return useQuery({
    queryKey: ['admin', 'schools', 'attendance-settings'],
    queryFn: schoolsApi.getAttendanceSettings,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: PatchAttendanceSettingsPayload) => schoolsApi.updateAttendanceSettings(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'schools'] }),
  })
}

export function useAttendanceNotificationDeliveries(params?: { status?: string; limit?: number }) {
  const schoolId = getAuthSchoolId()
  return useQuery({
    queryKey: ['admin', 'attendance-notifications', schoolId, params],
    queryFn: () => attendanceNotificationsApi.list(Number(schoolId), params),
    enabled: !!schoolId,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  })
}

export function useAttendanceReadiness() {
  return useQuery({
    queryKey: ['admin', 'schools', 'attendance-readiness'],
    queryFn: schoolsApi.getAttendanceReadiness,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useProvisionAttendanceSettings() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: schoolsApi.provisionAttendanceSettings,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools'] })
    },
  })
}

export function useSchoolBranding() {
  return useQuery({
    queryKey: ['admin', 'schools', 'branding'],
    queryFn: schoolsApi.getBranding,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateSchoolBranding() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (
      payload: Partial<
        Pick<
          SchoolBranding,
          'address' | 'phone' | 'email' | 'city' | 'logoUrl' | 'slogan' | 'devise' | 'legalFooter' | 'cardTheme' | 'uiTheme'
        > & { documentAccentColor?: string | null }
      >,
    ) => schoolsApi.updateBranding(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'branding'] })
      toast.success('Identité enregistrée', 'Logo et adresse mis à jour pour les reçus.')
    },
    onError: (err) => {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    },
  })
}

export function useSchoolMessaging() {
  return useQuery({
    queryKey: ['admin', 'schools', 'messaging'],
    queryFn: schoolsApi.getMessaging,
    staleTime: 60_000,
    refetchOnWindowFocus: false,
  })
}

export function useUpdateSchoolMessaging() {
  const qc = useQueryClient()
  const toast = useToast()
  return useMutation({
    mutationFn: (payload: {
      enableWhatsapp?: boolean
      enableSms?: boolean
      enablePush?: boolean
    }) => schoolsApi.updateMessaging(payload),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['admin', 'schools', 'messaging'] })
      void qc.invalidateQueries({ queryKey: ['admin', 'school-entitlements'] })
      toast.success('Canaux enregistrés', 'Les interrupteurs SMS / WhatsApp / Push sont à jour.')
    },
    onError: (err) => {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    },
  })
}
