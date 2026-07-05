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
    const data = await res.json()
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
        const data = await r.json()
        return data.user as AuthUser
      }),

  logout: () =>
    fetch('/api/auth/logout', { method: 'POST', credentials: 'include' }).catch(() => null),

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

  resendVerificationEmail: () =>
    fetch('/api/auth/resend-verification-email', { method: 'POST', credentials: 'include' }).then(
      async (r) => {
        const data = await r.json().catch(() => ({}))
        if (!r.ok) throw Object.assign(new Error(data.message ?? 'Envoi impossible'), { response: { data } })
        return data
      },
    ),

  refreshToken: () =>
    fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' }).then((r) => {
      if (!r.ok) throw new Error('Refresh échoué')
      return r.json()
    }),
}
