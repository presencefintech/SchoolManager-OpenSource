'use client'

import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { authApi } from '@/lib/api/auth'
import { ROLE_HOME, type AuthUser, type LoginPayload, type LoginResponse } from '@/types/auth'

interface AuthContextValue {
  user: AuthUser | null
  token: string | null
  isLoading: boolean
  login: (payload: LoginPayload) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

function setCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; SameSite=Lax`
}

function deleteCookie(name: string) {
  document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const storedToken = localStorage.getItem('auth_token')
    const storedUser = localStorage.getItem('auth_user')
    if (storedToken && storedUser) {
      try {
        setToken(storedToken)
        setUser(JSON.parse(storedUser) as AuthUser)
      } catch {
        localStorage.clear()
      }
    }
    setIsLoading(false)
  }, [])

  const login = useCallback(
    async (payload: LoginPayload) => {
      const data: LoginResponse = await authApi.login(payload)
      localStorage.setItem('auth_token', data.token)
      localStorage.setItem('auth_refresh_token', data.refreshToken)
      localStorage.setItem('auth_user', JSON.stringify(data.user))
      localStorage.setItem('auth_school_id', String(data.user.schoolId))
      setCookie('auth_token', data.token)
      setCookie('auth_role', data.user.role)
      setToken(data.token)
      setUser(data.user)
      router.push(ROLE_HOME[data.user.role])
    },
    [router],
  )

  const logout = useCallback(async () => {
    const refreshToken = localStorage.getItem('auth_refresh_token') ?? undefined
    await authApi.logout(refreshToken)
    localStorage.clear()
    deleteCookie('auth_token')
    deleteCookie('auth_role')
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
