export type Appearance = 'light' | 'dark' | 'system'
export type Accent =
  | 'emerald'
  | 'teal'
  | 'navy'
  | 'indigo'
  | 'violet'
  | 'amber'
  | 'copper'
  | 'rose'
  | 'slate'
export type Density = 'comfortable' | 'compact'
export type Radius = 'soft' | 'rounded' | 'sharp'
export type Contrast = 'standard' | 'high'
export type MotionPref = 'system' | 'reduced'
export type SidebarStyle = 'plain' | 'tinted'

export type ThemePrefs = {
  appearance: Appearance
  accent: Accent
  density: Density
  radius: Radius
  contrast: Contrast
  motion: MotionPref
  sidebar: SidebarStyle
}

export const THEME_STORAGE_KEY = 'pf-theme'

export const ACCENTS: Array<{
  id: Accent
  label: string
  hint: string
  swatch: string
  themeColor: string
}> = [
  { id: 'emerald', label: 'Émeraude', hint: 'Presence', swatch: '#059669', themeColor: '#059669' },
  { id: 'teal', label: 'Lagune', hint: 'RDC / Kin', swatch: '#0f766e', themeColor: '#0f766e' },
  { id: 'navy', label: 'Marine', hint: 'Institution', swatch: '#1d4ed8', themeColor: '#1d4ed8' },
  { id: 'indigo', label: 'Indigo', hint: 'Console', swatch: '#4f46e5', themeColor: '#4f46e5' },
  { id: 'violet', label: 'Violet', hint: 'Direction', swatch: '#7c3aed', themeColor: '#7c3aed' },
  { id: 'amber', label: 'Prestige', hint: 'Or scolaire', swatch: '#d97706', themeColor: '#d97706' },
  { id: 'copper', label: 'Cuivre', hint: 'Cahier', swatch: '#c2410c', themeColor: '#c2410c' },
  { id: 'rose', label: 'Caisse', hint: 'Guichet', swatch: '#e11d48', themeColor: '#e11d48' },
  { id: 'slate', label: 'Graphite', hint: 'Neutre', swatch: '#475569', themeColor: '#0f172a' },
]

export const APPEARANCES: Array<{ id: Appearance; label: string; hint: string }> = [
  { id: 'light', label: 'Clair', hint: 'Fonds clairs, lisible en journée' },
  { id: 'dark', label: 'Sombre', hint: 'Moins de fatigue le soir' },
  { id: 'system', label: 'Système', hint: 'Suit Windows / macOS' },
]

export const DENSITIES: Array<{ id: Density; label: string; hint: string }> = [
  { id: 'comfortable', label: 'Confort', hint: 'Espacements généreux' },
  { id: 'compact', label: 'Compact', hint: 'Plus de lignes à l’écran' },
]

export const RADII: Array<{ id: Radius; label: string; hint: string }> = [
  { id: 'soft', label: 'Doux', hint: 'Coins très arrondis' },
  { id: 'rounded', label: 'Standard', hint: 'Look SchoolManager' },
  { id: 'sharp', label: 'Net', hint: 'Plus institutionnel' },
]

export const CONTRASTS: Array<{ id: Contrast; label: string; hint: string }> = [
  { id: 'standard', label: 'Standard', hint: 'Équilibre quotidien' },
  { id: 'high', label: 'Contraste', hint: 'Textes et bords plus marqués' },
]

export const MOTIONS: Array<{ id: MotionPref; label: string; hint: string }> = [
  { id: 'system', label: 'Animations', hint: 'Transitions fluides' },
  { id: 'reduced', label: 'Calme', hint: 'Moins de mouvement' },
]

export const SIDEBARS: Array<{ id: SidebarStyle; label: string; hint: string }> = [
  { id: 'plain', label: 'Sobre', hint: 'Menu blanc / zinc' },
  { id: 'tinted', label: 'Teinté', hint: 'Menu à la couleur d’accent' },
]

export const DEFAULT_THEME: ThemePrefs = {
  appearance: 'system',
  accent: 'emerald',
  density: 'comfortable',
  radius: 'rounded',
  contrast: 'standard',
  motion: 'system',
  sidebar: 'plain',
}

function pick<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback
}

export function parseThemePrefs(raw: unknown): ThemePrefs {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_THEME }
  const o = raw as Record<string, unknown>
  return {
    appearance: pick(o.appearance, APPEARANCES.map((a) => a.id), DEFAULT_THEME.appearance),
    accent: pick(o.accent, ACCENTS.map((a) => a.id), DEFAULT_THEME.accent),
    density: pick(o.density, DENSITIES.map((a) => a.id), DEFAULT_THEME.density),
    radius: pick(o.radius, RADII.map((a) => a.id), DEFAULT_THEME.radius),
    contrast: pick(o.contrast, CONTRASTS.map((a) => a.id), DEFAULT_THEME.contrast),
    motion: pick(o.motion, MOTIONS.map((a) => a.id), DEFAULT_THEME.motion),
    sidebar: pick(o.sidebar, SIDEBARS.map((a) => a.id), DEFAULT_THEME.sidebar),
  }
}

export function readThemePrefs(): ThemePrefs {
  if (typeof window === 'undefined') return { ...DEFAULT_THEME }
  try {
    const raw = window.localStorage.getItem(THEME_STORAGE_KEY)
    return parseThemePrefs(raw ? JSON.parse(raw) : null)
  } catch {
    return { ...DEFAULT_THEME }
  }
}

export function persistThemePrefs(prefs: ThemePrefs) {
  window.localStorage.setItem(THEME_STORAGE_KEY, JSON.stringify(prefs))
}

export function isDarkAppearance(appearance: Appearance, mediaDark?: boolean): boolean {
  if (appearance === 'dark') return true
  if (appearance === 'light') return false
  if (typeof mediaDark === 'boolean') return mediaDark
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function applyThemePrefs(prefs: ThemePrefs) {
  if (typeof document === 'undefined') return
  const dark = isDarkAppearance(prefs.appearance)
  const root = document.documentElement
  root.classList.toggle('dark', dark)
  root.dataset.accent = prefs.accent
  root.dataset.density = prefs.density
  root.dataset.radius = prefs.radius
  root.dataset.contrast = prefs.contrast
  root.dataset.motion = prefs.motion
  root.dataset.sidebar = prefs.sidebar
  root.style.colorScheme = dark ? 'dark' : 'light'
  const reduce =
    prefs.motion === 'reduced' ||
    (prefs.motion === 'system' && window.matchMedia('(prefers-reduced-motion: reduce)').matches)
  root.classList.toggle('reduce-motion', reduce)
  const accent = ACCENTS.find((a) => a.id === prefs.accent)
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', dark ? '#09090b' : (accent?.themeColor ?? '#059669'))
}

export function cycleAppearance(current: Appearance): Appearance {
  const order: Appearance[] = ['light', 'dark', 'system']
  return order[(order.indexOf(current) + 1) % order.length] ?? 'system'
}

export const THEME_BOOT_SCRIPT = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p={};try{p=JSON.parse(localStorage.getItem(k)||'{}')||{}}catch(e){}var a=p.appearance||'system';var c=p.accent||'emerald';var dark=a==='dark'||(a!=='light'&&window.matchMedia('(prefers-color-scheme: dark)').matches);var r=document.documentElement;r.classList.toggle('dark',dark);r.setAttribute('data-accent',c);r.setAttribute('data-density',p.density||'comfortable');r.setAttribute('data-radius',p.radius||'rounded');r.setAttribute('data-contrast',p.contrast||'standard');r.setAttribute('data-motion',p.motion||'system');r.setAttribute('data-sidebar',p.sidebar||'plain');r.style.colorScheme=dark?'dark':'light';var motion=p.motion||'system';if(motion==='reduced'||(motion==='system'&&window.matchMedia('(prefers-reduced-motion: reduce)').matches))r.classList.add('reduce-motion')}catch(e){}})();`
