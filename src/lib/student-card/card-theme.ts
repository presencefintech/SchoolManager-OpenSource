/**
 * Thème carte élève — miroir backend school-card-theme.util.ts
 */

export type SchoolCardThemePreset =
  | 'teal'
  | 'indigo'
  | 'forest'
  | 'crimson'
  | 'navy'
  | 'minimal'

export type SchoolCardTheme = {
  preset: SchoolCardThemePreset
  headerFrom: string
  headerTo: string
  accent: string
  accentSoft: string
  ink: string
  muted: string
}

export const SCHOOL_CARD_THEME_PRESETS: Record<
  SchoolCardThemePreset,
  Omit<SchoolCardTheme, 'preset'> & { label: string }
> = {
  teal: {
    label: 'Émeraude (défaut)',
    headerFrom: '#0b3d3a',
    headerTo: '#0f766e',
    accent: '#f59e0b',
    accentSoft: '#fef3c7',
    ink: '#0f172a',
    muted: '#64748b',
  },
  indigo: {
    label: 'Indigo',
    headerFrom: '#312e81',
    headerTo: '#4f46e5',
    accent: '#fbbf24',
    accentSoft: '#fef3c7',
    ink: '#0f172a',
    muted: '#64748b',
  },
  forest: {
    label: 'Forêt',
    headerFrom: '#14532d',
    headerTo: '#15803d',
    accent: '#ca8a04',
    accentSoft: '#fef9c3',
    ink: '#14532d',
    muted: '#64748b',
  },
  crimson: {
    label: 'Grenat',
    headerFrom: '#7f1d1d',
    headerTo: '#b91c1c',
    accent: '#f59e0b',
    accentSoft: '#fef3c7',
    ink: '#1c1917',
    muted: '#78716c',
  },
  navy: {
    label: 'Marine',
    headerFrom: '#0c1e3a',
    headerTo: '#1e3a5f',
    accent: '#d4a017',
    accentSoft: '#fef3c7',
    ink: '#0f172a',
    muted: '#64748b',
  },
  minimal: {
    label: 'Minimal',
    headerFrom: '#18181b',
    headerTo: '#3f3f46',
    accent: '#a1a1aa',
    accentSoft: '#f4f4f5',
    ink: '#18181b',
    muted: '#71717a',
  },
}

export const DEFAULT_SCHOOL_CARD_THEME: SchoolCardTheme = {
  preset: 'teal',
  headerFrom: SCHOOL_CARD_THEME_PRESETS.teal.headerFrom,
  headerTo: SCHOOL_CARD_THEME_PRESETS.teal.headerTo,
  accent: SCHOOL_CARD_THEME_PRESETS.teal.accent,
  accentSoft: SCHOOL_CARD_THEME_PRESETS.teal.accentSoft,
  ink: SCHOOL_CARD_THEME_PRESETS.teal.ink,
  muted: SCHOOL_CARD_THEME_PRESETS.teal.muted,
}

export function themeFromPreset(preset: SchoolCardThemePreset): SchoolCardTheme {
  const { label: _label, ...colors } = SCHOOL_CARD_THEME_PRESETS[preset]
  return { preset, ...colors }
}

export function resolveCardTheme(partial?: Partial<SchoolCardTheme> | null): SchoolCardTheme {
  if (!partial) return DEFAULT_SCHOOL_CARD_THEME
  const preset =
    partial.preset && partial.preset in SCHOOL_CARD_THEME_PRESETS
      ? partial.preset
      : DEFAULT_SCHOOL_CARD_THEME.preset
  const base = themeFromPreset(preset)
  return {
    preset,
    headerFrom: partial.headerFrom ?? base.headerFrom,
    headerTo: partial.headerTo ?? base.headerTo,
    accent: partial.accent ?? base.accent,
    accentSoft: partial.accentSoft ?? base.accentSoft,
    ink: partial.ink ?? base.ink,
    muted: partial.muted ?? base.muted,
  }
}
