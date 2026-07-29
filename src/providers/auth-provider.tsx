'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import {
  clearAuthStorage,
  persistAuthSession,
  persistUserProfile,
  markAuthHydrated,
  AUTH_SCHOOL_ID_KEY,
} from '@/lib/api/auth-storage'
import { ROLE_HOME, type AuthUser, type LoginPayload } from '@/types/auth'

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
      try {
        const res = await fetch('/api/auth/session', { credentials: 'include' })
        if (res.ok) {
          const data = await res.json().catch(() => ({}))
          if (data.user) {
            persistUserProfile(data.user)
            setUser(data.user)
            setToken('http-only')
            if (data.user.schoolId != null) {
              localStorage.setItem(AUTH_SCHOOL_ID_KEY, String(data.user.schoolId))
            }
          }
        } else {
          clearAuthStorage()
        }
      } catch {
        clearAuthStorage()
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
