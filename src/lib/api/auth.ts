import { apiClient } from './client'
import type { AuthUser, LoginPayload, LoginResponse } from '@/types/auth'

export type { AuthUser, LoginPayload, LoginResponse }

export const authApi = {
  login: (payload: LoginPayload) =>
    apiClient
      .post<LoginResponse & { status: string }>('/auth/login', payload)
      .then((r) => r.data),

  profile: () =>
    apiClient
      .get<{ status: string; user: AuthUser }>('/auth/profile')
      .then((r) => r.data.user),

  logout: (refreshToken?: string) =>
    apiClient.post('/auth/logout', { refreshToken }).catch(() => null),

  refreshToken: (refreshToken: string) =>
    apiClient
      .post<LoginResponse & { status: string }>('/auth/refresh-token', { refreshToken })
      .then((r) => r.data),
}
