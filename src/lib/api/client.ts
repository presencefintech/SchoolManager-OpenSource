import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAuthSchoolId, redirectToLogin } from '@/lib/api/auth-storage'
import { extractApiErrorPayload, resolveApiErrorMessage } from '@/lib/auth/security-errors'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 15_000,
  withCredentials: true,
})

apiClient.interceptors.request.use((config) => {
  if (typeof window === 'undefined') return config

  // FormData : retirer le Content-Type JSON par défaut pour que le navigateur
  // pose multipart + boundary (sinon multer / proxy cassent l’upload partout)
  const data = config.data
  if (typeof FormData !== 'undefined' && data instanceof FormData) {
    const headers = config.headers
    if (headers && typeof (headers as { delete?: (k: string) => void }).delete === 'function') {
      ;(headers as { delete: (k: string) => void }).delete('Content-Type')
      ;(headers as { delete: (k: string) => void }).delete('content-type')
    } else if (headers) {
      delete (headers as Record<string, unknown>)['Content-Type']
      delete (headers as Record<string, unknown>)['content-type']
    }
    if (config.timeout == null || config.timeout < 60_000) {
      config.timeout = 60_000
    }
  }

  try {
    const raw = localStorage.getItem('auth_user')
    const role = raw ? (JSON.parse(raw) as { role?: string }).role : undefined
    if (role === 'SUPER_ADMIN') {
      delete config.headers['x-school-id']
      return config
    }
  } catch {
    /* ignore malformed auth_user */
  }
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
    if (typeof window !== 'undefined' && error.response) {
      const { code } = extractApiErrorPayload(error.response.data)
      if (code === 'EMAIL_NOT_VERIFIED') {
        window.dispatchEvent(new CustomEvent('auth:email-verification-required'))
      }
    }

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
    if (!error.response && (error.code === 'ECONNABORTED' || /timeout/i.test(error.message))) {
      return 'Délai dépassé — le serveur met trop de temps à répondre. Réessayez avec un fichier plus léger.'
    }
    if (!error.response && error.code === 'ERR_NETWORK') {
      return 'Connexion au serveur impossible (réseau ou proxy). Réessayez dans quelques secondes.'
    }
    const data = error.response?.data as {
      message?: string | string[]
      code?: string
      error?: string
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
    const code = data?.code ?? data?.error
    if (Array.isArray(msg)) return msg.join(' · ')
    const resolved = resolveApiErrorMessage(data)
    if (resolved !== 'Une erreur inattendue est survenue') return resolved
    if (typeof msg === 'string' && msg) return msg
    if (error.response?.status === 429) {
      return 'Trop de requêtes — patientez une minute avant de réessayer.'
    }
    if (error.response?.status === 503) {
      return (
        (typeof msg === 'string' && msg) ||
        'Service indisponible (503). Souvent une migration Prisma en attente sur Railway — réessayez après le redeploy.'
      )
    }
    if (code === 'FORBIDDEN_ROLE') {
      return 'Accès refusé — seuls les administrateurs peuvent modifier l\'identité de l\'établissement.'
    }
    if (code === 'SCHOOL_CONTEXT_MISSING') {
      return 'École non identifiée. Déconnectez-vous puis reconnectez-vous.'
    }
    if (error.response?.status === 409 && !code) {
      return 'Conflit : cette ressource existe déjà.'
    }
  }
  if (error instanceof Error && error.message && error.message !== 'Network Error') {
    return error.message
  }
  return 'Une erreur inattendue est survenue'
}
