import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import {
  getAuthRefreshToken,
  getAuthSchoolId,
  getAuthToken,
  redirectToLogin,
  updateAuthTokens,
} from '@/lib/api/auth-storage'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config
  const token = getAuthToken()
  if (token) config.headers.Authorization = `Bearer ${token}`
  const schoolId = getAuthSchoolId()
  if (schoolId) config.headers['x-school-id'] = schoolId
  return config
})

/** Une seule requête refresh en vol — les 401 concurrents partagent la même promesse. */
let refreshPromise: Promise<string> | null = null

async function refreshAccessToken(): Promise<string> {
  const refreshToken = getAuthRefreshToken()
  if (!refreshToken) throw new Error('NO_REFRESH_TOKEN')

  const { data } = await axios.post<{ token?: string; refreshToken?: string }>(
    '/api/v1/auth/refresh-token',
    { refreshToken },
    { headers: { 'Content-Type': 'application/json' } },
  )

  const newToken = data.token
  if (!newToken) throw new Error('NO_TOKEN_IN_REFRESH_RESPONSE')

  updateAuthTokens(newToken, data.refreshToken)
  window.dispatchEvent(new CustomEvent('auth:token-refreshed', { detail: { token: newToken } }))
  return newToken
}

function getOrRefreshToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = refreshAccessToken().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

apiClient.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const originalRequest = error.config as RetryConfig | undefined

    if (
      error.response?.status !== 401 ||
      typeof window === 'undefined' ||
      !originalRequest
    ) {
      return Promise.reject(error)
    }

    const url = originalRequest.url ?? ''
    const isAuthEndpoint =
      url.includes('/auth/login') ||
      url.includes('/auth/refresh-token') ||
      url.includes('/auth/logout')

    if (isAuthEndpoint || originalRequest._retry) {
      redirectToLogin()
      return Promise.reject(error)
    }

    if (!getAuthRefreshToken()) {
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      const newToken = await getOrRefreshToken()
      originalRequest.headers.Authorization = `Bearer ${newToken}`
      return apiClient(originalRequest)
    } catch {
      redirectToLogin()
      return Promise.reject(error)
    }
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? 'Une erreur inattendue est survenue'
  }
  return 'Une erreur inattendue est survenue'
}
