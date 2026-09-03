import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
    './src/providers/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        canvas: 'rgb(var(--pf-canvas) / <alpha-value>)',
        surface: 'rgb(var(--pf-surface) / <alpha-value>)',
        ink: 'rgb(var(--pf-fg) / <alpha-value>)',
        muted: 'rgb(var(--pf-muted) / <alpha-value>)',
        line: 'rgb(var(--pf-border) / <alpha-value>)',
        brand: 'rgb(var(--pf-accent) / <alpha-value>)',
      },
    },
  },
  plugins: [],
}

export default config
