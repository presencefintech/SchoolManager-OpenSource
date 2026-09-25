import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth'

export type { AuthUser, LoginPayload, LoginResponse }

export const authApi = {
  login: async (payload: LoginPayload): Promise<LoginResponse> => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Connexion échouée'), { response: { data } })
    }
    if (data.mfaRequired) {
      throw Object.assign(new Error('MFA requis'), { mfaRequired: true, userId: data.userId })
    }
    return {
      token: 'http-only',
      refreshToken: 'http-only',
      user: data.user as AuthUser,
    }
  },

  profile: () =>
    fetch('/api/auth/session', { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) throw new Error('Session invalide')
        const data = await r.json().catch(() => ({}))
        if (!data?.user) throw new Error('Session invalide')
        return data.user as AuthUser
      }),

  logout: () =>
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null),

  /** Ferme toutes les sessions du compte, sur tous les appareils (y compris celle-ci). */
  logoutAll: async () => {
    const res = await fetch('/api/auth/logout-all', { method: 'POST', credentials: 'include' })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Impossible de fermer les sessions'), { response: { data } })
    }
    return data
  },

  changePassword: async (payload: { oldPassword: string; newPassword: string }) => {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Modification impossible'), { response: { data } })
    }
    return data
  },

  changeEmail: async (payload: { email: string; currentPassword: string }) => {
    const res = await fetch('/api/auth/change-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Modification impossible'), { response: { data } })
    }
    return data
  },

  changePhone: async (payload: { phone: string; currentPassword: string }) => {
    const res = await fetch('/api/auth/change-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Modification impossible'), { response: { data } })
    }
    return data as {
      pendingPhone: string
      whatsappDeepLink: string | null
      smsSent: boolean
    }
  },

  verifyChangePhone: async (payload: { otp: string }) => {
    const res = await fetch('/api/auth/verify-change-phone', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      throw Object.assign(new Error(data.message ?? 'Validation impossible'), { response: { data } })
    }
    return data
  },

  resendVerificationEmail: () =>
    fetch('/api/auth/resend-verification-email', { method: 'POST', credentials: 'include' }).then(
      async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw Object.assign(new Error(data.message ?? 'Envoi impossible'), { response: { data } })
        return data
      },
    ),

  refreshToken: () =>
    fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then(async (r) => {
      if (!r.ok) throw new Error('Refresh échoué')
      return r.json().catch(() => ({}))
    }),
}
