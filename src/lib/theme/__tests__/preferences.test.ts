import {
  cycleAppearance,
  DEFAULT_THEME,
  isDarkAppearance,
  parseThemePrefs,
} from '../preferences'

describe('theme preferences', () => {
  it('ignore les valeurs inconnues et complète les champs', () => {
    expect(parseThemePrefs({ appearance: 'neon', accent: 'pink' })).toEqual(DEFAULT_THEME)
  })

  it('conserve un thème riche valide', () => {
    expect(
      parseThemePrefs({
        appearance: 'dark',
        accent: 'rose',
        density: 'compact',
        radius: 'sharp',
        contrast: 'high',
        motion: 'reduced',
        sidebar: 'tinted',
        atmosphere: 'aurora-glow',
      }),
    ).toEqual({
      appearance: 'dark',
      accent: 'rose',
      density: 'compact',
      radius: 'sharp',
      contrast: 'high',
      motion: 'reduced',
      sidebar: 'tinted',
      atmosphere: 'aurora-glow',
    })
  })

  it('conserve un fond animé et ignore un id inconnu', () => {
    expect(parseThemePrefs({ atmosphere: 'mesh-gradient-soft' }).atmosphere).toBe(
      'mesh-gradient-soft',
    )
    expect(parseThemePrefs({ atmosphere: 'lava' }).atmosphere).toBe('none')
  })

  it('résout system selon le media', () => {
    expect(isDarkAppearance('light', true)).toBe(false)
    expect(isDarkAppearance('dark', false)).toBe(true)
    expect(isDarkAppearance('system', true)).toBe(true)
    expect(isDarkAppearance('system', false)).toBe(false)
  })

  it('cycle clair → sombre → système', () => {
    expect(cycleAppearance('light')).toBe('dark')
    expect(cycleAppearance('dark')).toBe('system')
    expect(cycleAppearance('system')).toBe('light')
  })
})
