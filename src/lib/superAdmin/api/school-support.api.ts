export type PlatformCashPayment = {
  id: number
  amountUsd: number
  paidAt: string
  note: string | null
  recordedById: number
  recordedByName: string
  createdAt: string
}

export type SchoolSupportAction = {
  id: number
  action: string
  resource: string
  resourceId: number | null
  createdAt: string
  actorName: string
  payload: unknown
}

export type SchoolSupportPrimaryAdmin = {
  id: number
  name: string
  email: string | null
  phone: string | null
  mustChangePassword: boolean
  status?: string
}

export type SchoolSupportProfile = {
  id: number
  name: string
  hasPrimaryAdmin: boolean
  primaryAdmin: SchoolSupportPrimaryAdmin | null
}

async function parseJson<T>(res: Response): Promise<T> {
  const data = (await res.json().catch(() => ({}))) as T & { message?: string }
  if (!res.ok) {
    throw new Error(
      (data as { message?: string })?.message || `Erreur HTTP ${res.status}`,
    )
  }
  return data
}

export const schoolSupportApi = {
  getProfile: (schoolId: number) =>
    fetch(`/api/superadmin/schools/${schoolId}/support`, {
      credentials: 'include',
      cache: 'no-store',
    }).then((r) =>
      parseJson<{ success: boolean; school: SchoolSupportProfile }>(r).then((d) => d.school),
    ),

  listPayments: (schoolId: number, take = 50) =>
    fetch(`/api/superadmin/schools/${schoolId}/manual-payments?take=${take}`, {
      credentials: 'include',
      cache: 'no-store',
    }).then((r) =>
      parseJson<{ success: boolean; payments: PlatformCashPayment[] }>(r).then(
        (d) => d.payments,
      ),
    ),

  recordPayment: (
    schoolId: number,
    body: { amountUsd: number; paidAt: string; note?: string },
  ) =>
    fetch(`/api/superadmin/schools/${schoolId}/manual-payment`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).then((r) =>
      parseJson<{ success: boolean; payment: PlatformCashPayment }>(r).then(
        (d) => d.payment,
      ),
    ),

  resetPassword: (schoolId: number, userId?: number) =>
    fetch(`/api/superadmin/schools/${schoolId}/password-reset`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userId != null ? { userId } : {}),
    }).then((r) =>
      parseJson<{
        success: boolean
        tempPassword: string
        user: { id: number; firstName: string | null; lastName: string | null; email: string | null }
      }>(r),
    ),

  impersonate: (schoolId: number) =>
    fetch(`/api/superadmin/auth/impersonate`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ schoolId }),
      cache: 'no-store',
    }).then((r) =>
      parseJson<{
        success: boolean
        redirectTo: string
        user?: { email?: string; schoolId?: number }
        school?: { id: number; name: string }
      }>(r),
    ),

  exitImpersonation: () =>
    fetch(`/api/superadmin/auth/impersonate/exit`, {
      method: 'POST',
      credentials: 'include',
      cache: 'no-store',
    }).then((r) =>
      parseJson<{
        success: boolean
        redirectTo: string
        schoolId?: number
      }>(r),
    ),

  listActions: (schoolId: number, take = 40) =>
    fetch(`/api/superadmin/schools/${schoolId}/support-actions?take=${take}`, {
      credentials: 'include',
      cache: 'no-store',
    }).then((r) =>
      parseJson<{ success: boolean; actions: SchoolSupportAction[] }>(r).then(
        (d) => d.actions,
      ),
    ),
}
