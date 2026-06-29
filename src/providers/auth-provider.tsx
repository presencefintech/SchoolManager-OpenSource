'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { clearAuthStorage, persistAuthSession, resyncAuthFromCookies } from '@/lib/api/auth-storage'
import { ROLE_HOME, type AuthUser, type LoginPayload, type LoginResponse } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const { token: syncedToken, user: syncedUser } = resyncAuthFromCookies()
    if (syncedToken) setToken(syncedToken)
    if (syncedUser) setUser(syncedUser)
    setIsLoading(false)

    function onTokenRefreshed(e: Event) {
      const detail = (e as CustomEvent<{ token: string }>).detail
      if (detail?.token) setToken(detail.token)
    }
    window.addEventListener('auth:token-refreshed', onTokenRefreshed)
    return () => window.removeEventListener('auth:token-refreshed', onTokenRefreshed)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data: LoginResponse = await authApi.login(payload)
      persistAuthSession(data)
      setToken(data.token)
      setUser(data.user)
      router.push(ROLE_HOME[data.user.role])
    },
    [router],
  )

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('auth_refresh_token') ?? undefined
    await authApi.logout(refreshToken)
    clearAuthStorage()
    setToken(null)
    setUser(null)
    router.push('/login')
  }, [router])

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}
