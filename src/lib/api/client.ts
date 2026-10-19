import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { getAuthSchoolId, redirectToLogin } from '@/lib/api/auth-storage'
import { extractApiErrorPayload, mapSecurityErrorCode, resolveApiErrorMessage } from '@/lib/auth/security-errors'
import { isAuthSessionFailure } from '@/lib/auth/session-failure'
import {
  extractFeeAlreadyPaidDetails,
  formatFeeAlreadyPaidMessage,
} from '@/lib/finance/fee-already-paid'

type RetryConfig = InternalAxiosRequestConfig & { _retry?: boolean }

export const apiClient = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 30_000,
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

  // Le cookie `auth_school_id` (posé par le serveur, synchrone dès la redirection)
  // fait foi — `localStorage.auth_user` n'est resynchronisé qu'après coup via
  // AuthProvider.bootstrap(), donc son rôle peut rester périmé juste après un
  // changement de session (impersonation, sortie d'impersonation).
  const schoolId = getAuthSchoolId()
  if (schoolId) {
    config.headers['x-school-id'] = schoolId
  } else {
    delete config.headers['x-school-id']
  }
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

    const sessionDead = isAuthSessionFailure(error.response.data, error.response.status)

    if (isAuthEndpoint) {
      if (sessionDead) redirectToLogin()
      return Promise.reject(error)
    }

    if (originalRequest._retry) {
      if (sessionDead) redirectToLogin()
      return Promise.reject(error)
    }

    originalRequest._retry = true

    try {
      await getOrRefreshToken()
      return apiClient(originalRequest)
    } catch {
      if (sessionDead) redirectToLogin()
      return Promise.reject(error)
    }
  },
)

/** `message` brut renvoyé par le backend (sans reformulation), si c'est une chaîne. */
export function getBackendMessage(error: unknown): string | undefined {
  if (!axios.isAxiosError(error)) return undefined
  const msg = (error.response?.data as { message?: unknown } | undefined)?.message
  return typeof msg === 'string' ? msg : undefined
}

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    if (!error.response && (error.code === 'ECONNABORTED' || /timeout/i.test(error.message))) {
      const isUpload =
        typeof FormData !== 'undefined' && error.config?.data instanceof FormData
      return isUpload
        ? 'Délai dépassé — le serveur met trop de temps à répondre. Réessayez avec un fichier plus léger.'
        : 'Délai dépassé — le serveur met trop de temps à répondre. Réessayez dans quelques secondes.'
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
    const alreadyPaid = extractFeeAlreadyPaidDetails(error)
    if (alreadyPaid) return formatFeeAlreadyPaidMessage(alreadyPaid)
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
  if (error && typeof error === 'object' && 'response' in error) {
    const data = (error as { response?: { data?: unknown } }).response?.data
    if (data) {
      const resolved = resolveApiErrorMessage(data)
      if (resolved !== 'Une erreur inattendue est survenue') return resolved
    }
  }
  if (error instanceof Error && error.message && error.message !== 'Network Error') {
    const fromCode = mapSecurityErrorCode(error.message)
    if (fromCode) return fromCode
    return error.message
  }
  return 'Une erreur inattendue est survenue'
}
