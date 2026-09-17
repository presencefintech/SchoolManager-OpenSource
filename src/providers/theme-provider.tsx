'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import {
  applyThemePrefs,
  cycleAppearance,
  DEFAULT_THEME,
  persistThemePrefs,
  readThemePrefs,
  THEME_STORAGE_KEY,
  type Accent,
  type Appearance,
  type Contrast,
  type Density,
  type MotionPref,
  type Radius,
  type SidebarStyle,
  type Atmosphere,
  type ThemePrefs,
} from '@/lib/theme/preferences'

type ThemeContextValue = ThemePrefs & {
  setAppearance: (appearance: Appearance) => void
  setAccent: (accent: Accent) => void
  setDensity: (density: Density) => void
  setRadius: (radius: Radius) => void
  setContrast: (contrast: Contrast) => void
  setMotion: (motion: MotionPref) => void
  setSidebar: (sidebar: SidebarStyle) => void
  setAtmosphere: (atmosphere: Atmosphere) => void
  setPrefs: (prefs: ThemePrefs) => void
  resetTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [prefs, setPrefsState] = useState<ThemePrefs>(DEFAULT_THEME)

  const setPrefs = useCallback((next: ThemePrefs) => {
    setPrefsState(next)
    persistThemePrefs(next)
    applyThemePrefs(next)
  }, [])

  useEffect(() => {
    const initial = readThemePrefs()
    setPrefsState(initial)
    applyThemePrefs(initial)

    const mqDark = window.matchMedia('(prefers-color-scheme: dark)')
    const mqMotion = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMedia = () => applyThemePrefs(readThemePrefs())
    mqDark.addEventListener('change', onMedia)
    mqMotion.addEventListener('change', onMedia)

    const onStorage = (e: StorageEvent) => {
      if (e.key !== THEME_STORAGE_KEY) return
      const next = readThemePrefs()
      setPrefsState(next)
      applyThemePrefs(next)
    }
    window.addEventListener('storage', onStorage)

    const onKey = (e: KeyboardEvent) => {
      if (!(e.altKey && e.shiftKey && e.key.toLowerCase() === 'd')) return
      e.preventDefault()
      const current = readThemePrefs()
      const next = { ...current, appearance: cycleAppearance(current.appearance) }
      setPrefsState(next)
      persistThemePrefs(next)
      applyThemePrefs(next)
    }
    window.addEventListener('keydown', onKey)

    return () => {
      mqDark.removeEventListener('change', onMedia)
      mqMotion.removeEventListener('change', onMedia)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('keydown', onKey)
    }
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({
      ...prefs,
      setAppearance: (appearance) => setPrefs({ ...prefs, appearance }),
      setAccent: (accent) => setPrefs({ ...prefs, accent }),
      setDensity: (density) => setPrefs({ ...prefs, density }),
      setRadius: (radius) => setPrefs({ ...prefs, radius }),
      setContrast: (contrast) => setPrefs({ ...prefs, contrast }),
      setMotion: (motion) => setPrefs({ ...prefs, motion }),
      setSidebar: (sidebar) => setPrefs({ ...prefs, sidebar }),
      setAtmosphere: (atmosphere) => setPrefs({ ...prefs, atmosphere }),
      setPrefs,
      resetTheme: () => setPrefs({ ...DEFAULT_THEME }),
    }),
    [prefs, setPrefs],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider')
  return ctx
}
