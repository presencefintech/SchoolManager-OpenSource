'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import {
  clearAuthStorage,
  persistAuthSession,
  persistUserProfile,
  markAuthHydrated,
} from '@/lib/api/auth-storage'
import { ROLE_HOME, isWebRole, type AuthUser, type LoginPayload } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    async function bootstrap() {
      const applyUser = (data: { user?: AuthUser }) => {
        if (!data.user) return
        persistUserProfile(data.user)
        setUser(data.user)
        setToken('http-only')
      }

      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        if (res.ok) {
          applyUser(await res.json().catch(() => ({})))
          return
        }

        if (res.status === 401) {
          const refreshed = await fetch('/api/auth/refresh', {
            method: 'POST',
            credentials: 'include',
          })
          if (refreshed.ok) {
            const retry = await fetch('/api/auth/session', { credentials: 'include' })
            if (retry.ok) {
              applyUser(await retry.json().catch(() => ({})))
              return
            }
          }
          clearAuthStorage()
        }
      } catch {
        /* réseau / 5xx : ne pas détruire une session encore valide */
      } finally {
        setIsLoading(false)
        markAuthHydrated()
      }
    }
    void bootstrap()

    function onTokenRefreshed() {
      setToken('http-only')
    }
    window.addEventListener('auth:token-refreshed', onTokenRefreshed)
    return () => window.removeEventListener('auth:token-refreshed', onTokenRefreshed)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data = await authApi.login(payload)
      if (!isWebRole(data.user.role)) {
        await authApi.logout().catch(() => {})
        clearAuthStorage()
        throw new Error(
          'Ce type de compte n’est pas pris en charge par le portail web.',
        )
      }
      persistAuthSession(data)
      setToken('http-only')
      setUser(data.user)
      router.push(ROLE_HOME[data.user.role])
    },
    [router],
  )

  const logout = useCallback(async () => {
    await authApi.logout()
    clearAuthStorage()
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  const refreshUser = useCallback(async () => {
    try {
      const res = await fetch('/api/auth/session', { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json().catch(() => ({}))
      if (data.user) {
        persistUserProfile(data.user)
        setUser(data.user)
      }
    } catch {
      /* session indisponible — ignoré */
    }
  }, [])

  useEffect(() => {
    function onVerificationRequired() {
      void refreshUser()
    }
    window.addEventListener('auth:email-verification-required', onVerificationRequired)
    return () => window.removeEventListener('auth:email-verification-required', onVerificationRequired)
  }, [refreshUser])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
