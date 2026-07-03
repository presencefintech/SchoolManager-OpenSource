import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAuthSchoolId, redirectToLogin } from '@/lib/api/auth-storage'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config
  const schoolId = getAuthSchoolId()
  if (schoolId) config.headers['x-school-id'] = schoolId
  return config
})

let refreshPromise: Promise<void> | null = null

async function refreshAccessToken(): Promise<void> {
  const res = await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })
  if (!res.ok) throw new Error('REFRESH_FAILED')
  window.dispatchEvent(new CustomEvent('auth:token-refreshed'))
}

function getOrRefreshToken(): Promise<void> {
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
      url.includes('/auth/refresh') ||
      url.includes('/auth/logout')

    if (isAuthEndpoint || originalRequest._retry) {
      redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      await getOrRefreshToken()
      return apiClient(originalRequest)
    } catch {
      redirectToLogin()
      return Promise.reject(error)
    }
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response && error.code === 'ERR_NETWORK') {
      return 'Connexion au serveur impossible (réseau ou proxy). Réessayez dans quelques secondes.'
    }
    const data = error.response?.data as {
      message?: string | string[]
      errors?: { field?: string; message?: string }[]
    } | undefined
    if (data?.errors?.length) {
      const fieldErrors = data.errors
        .map(e => (e.field ? `${e.field}: ${e.message}` : e.message))
        .filter(Boolean)
        .join(' · ')
      if (fieldErrors) return fieldErrors
    }
    const msg = data?.message
    if (Array.isArray(msg)) return msg.join(' · ')
    if (typeof msg === 'string' && msg) return msg
    if (error.response?.status === 409) {
      return 'Une session caisse est déjà ouverte pour ce guichet.'
    }
  }
  if (error instanceof Error && error.message && error.message !== 'Network Error') {
    return error.message
  }
  return 'Une erreur inattendue est survenue'
}
