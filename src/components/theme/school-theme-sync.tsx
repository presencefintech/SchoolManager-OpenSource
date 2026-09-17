'use client'

import { useEffect, useRef } from 'react'
import { useAuth } from '@/providers/auth-provider'
import { useTheme } from '@/providers/theme-provider'
import { apiClient } from '@/lib/api/client'
import { parseThemePrefs } from '@/lib/theme/preferences'
import type { SchoolBranding } from '@/types/admin'

/**
 * Applique le fond / palette enregistrés pour l’établissement (une fois par session).
 */
export function SchoolThemeSync() {
  const { user } = useAuth()
  const { setPrefs } = useTheme()
  const appliedFor = useRef<number | null>(null)

  useEffect(() => {
    if (!user?.schoolId || user.role === 'SUPER_ADMIN') return
    if (appliedFor.current === user.schoolId) return
    let cancelled = false
    void apiClient
      .get('/admin/schools/branding')
      .then((r) => {
        if (cancelled) return
        const branding = r.data.data as SchoolBranding
        const school = branding?.uiTheme
        if (!school?.atmosphere) return
        const raw = window.localStorage.getItem('pf-theme')
        let local: unknown = {}
        try {
          local = raw ? JSON.parse(raw) : {}
        } catch {
          local = {}
        }
        const merged = parseThemePrefs({
          ...(local && typeof local === 'object' ? local : {}),
          atmosphere: school.atmosphere,
          ...(school.appearance ? { appearance: school.appearance } : {}),
          ...(school.accent ? { accent: school.accent } : {}),
        })
        appliedFor.current = user.schoolId
        setPrefs(merged)
      })
      .catch(() => {
        /* 403 / hors admin-finance : on garde le thème local */
      })
    return () => {
      cancelled = true
    }
  }, [user?.schoolId, user?.role, setPrefs])

  return null
}
