import axios, { type AxiosError } from 'axios'
import { clearAuthStorage, getAuthSchoolId, getAuthToken } from '@/lib/api/auth-storage'

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

apiClient.interceptors.response.use(
  (res) => res,
  (error: AxiosError) => {
    if (error.response?.status === 401 && typeof window !== 'undefined') {
      const token = localStorage.getItem('auth_token')
      const url = error.config?.url ?? ''
      // Ne déconnecter que si : pas de token (session expirée) ou c'est le endpoint d'auth lui-même
      const isAuthEndpoint = url.includes('/auth/')
      if (!token || isAuthEndpoint) {
        localStorage.clear()
        document.cookie = 'auth_token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        document.cookie = 'auth_role=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT'
        clearAuthStorage()
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(error)
  },
)

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as { message?: string } | undefined
    return data?.message ?? 'Une erreur inattendue est survenue'
  }
  return 'Une erreur inattendue est survenue'
}
