'use client'

import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ACCENTS,
  APPEARANCES,
  CONTRASTS,
  DENSITIES,
  MOTIONS,
  RADII,
  SIDEBARS,
} from '@/lib/theme/preferences'
import { useTheme } from '@/providers/theme-provider'

const ICONS = { light: Sun, dark: Moon, system: Monitor } as const

export function ThemePreview() {
  const { accent } = useTheme()
  const swatch = ACCENTS.find((a) => a.id === accent)?.swatch ?? '#059669'

  return (
    <div className="rounded-2xl border border-zinc-200 overflow-hidden bg-zinc-100">
      <div className="flex h-28">
        <div className="w-[72px] p-2 space-y-1.5 bg-white border-r border-zinc-200">
          <div className="h-1.5 w-10 rounded-full bg-zinc-200" />
          <div className="h-5 rounded-lg" style={{ background: swatch, opacity: 0.9 }} />
          <div className="h-4 rounded-md bg-zinc-100" />
          <div className="h-4 rounded-md bg-zinc-100" />
        </div>
        <div className="flex-1 p-2 space-y-2">
          <div
            className="h-8 rounded-lg"
            style={{ background: `linear-gradient(90deg, #0f172a, ${swatch})` }}
          />
          <div className="grid grid-cols-3 gap-1.5">
            <div className="h-10 rounded-lg bg-white border border-zinc-200" />
            <div className="h-10 rounded-lg bg-white border border-zinc-200" />
            <div className="h-10 rounded-lg bg-white border border-zinc-200" />
          </div>
        </div>
      </div>
    </div>
  )
}

function ChoiceRow<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: Array<{ id: T; label: string; hint: string }>
  value: T
  onChange: (id: T) => void
}) {
  return (
    <div>
      <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-2">{label}</p>
      <div className={cn('grid gap-2', options.length > 2 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-2')}>
        {options.map((opt) => {
          const active = value === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => onChange(opt.id)}
              className={cn(
                'rounded-2xl border px-3 py-2.5 text-left transition-all',
                active
                  ? 'border-[rgb(var(--pf-accent))] bg-[rgb(var(--pf-accent-soft))] ring-1 ring-[rgb(var(--pf-accent)/0.25)]'
                  : 'border-zinc-200 hover:border-zinc-300 bg-white',
              )}
            >
              <span className="block text-sm font-semibold text-zinc-900">{opt.label}</span>
              <span className="block text-[11px] text-zinc-500 mt-0.5">{opt.hint}</span>
            </button>
          )
        })}
      </div>
    </div>
  )
}

export function ThemeStudio() {
  const theme = useTheme()

  return (
    <section className="rounded-2xl border border-slate-200/90 bg-white shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Palette size={18} className="text-[rgb(var(--pf-accent))] flex-shrink-0" />
          <div>
            <h2 className="text-sm font-semibold text-zinc-900">Apparence</h2>
            <p className="text-xs text-zinc-500 mt-0.5">
              Thème, palette, densité et accessibilité — mémorisé sur cet appareil.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => theme.resetTheme()}
          className="text-xs font-medium text-zinc-500 hover:text-zinc-800 shrink-0"
        >
          Réinitialiser
        </button>
      </div>
      <div className="p-6 space-y-7">
        <ThemePreview />

        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Mode</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {APPEARANCES.map((opt) => {
              const Icon = ICONS[opt.id]
              const active = theme.appearance === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => theme.setAppearance(opt.id)}
                  className={cn(
                    'flex items-start gap-3 rounded-2xl border px-3.5 py-3 text-left transition-all',
                    active
                      ? 'border-[rgb(var(--pf-accent))] bg-[rgb(var(--pf-accent))] text-white shadow-md'
                      : 'border-zinc-200 bg-zinc-50/80 hover:border-zinc-300 hover:bg-white',
                  )}
                >
                  <Icon size={16} className="mt-0.5 flex-shrink-0" />
                  <span>
                    <span className="block text-sm font-semibold">{opt.label}</span>
                    <span className={cn('block text-[11px] mt-0.5', active ? 'text-white/70' : 'text-zinc-500')}>
                      {opt.hint}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>
          <p className="text-[11px] text-zinc-400 mt-2">
            Raccourci : <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono">Alt</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono">Shift</kbd>
            {' + '}
            <kbd className="px-1.5 py-0.5 rounded bg-zinc-100 font-mono">D</kbd>
            {' '}pour cycler clair / sombre / système.
          </p>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-3">Palette</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {ACCENTS.map((opt) => {
              const active = theme.accent === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => theme.setAccent(opt.id)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition-all',
                    active
                      ? 'border-[rgb(var(--pf-accent))] ring-1 ring-[rgb(var(--pf-accent)/0.3)] bg-white'
                      : 'border-zinc-200 hover:border-zinc-300',
                  )}
                >
                  <span
                    className="h-8 w-8 rounded-xl shadow-inner ring-1 ring-black/5 flex-shrink-0"
                    style={{ background: opt.swatch }}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-zinc-900">{opt.label}</span>
                    <span className="block text-[11px] text-zinc-500">{opt.hint}</span>
                  </span>
                  {active && <Check size={16} className="text-zinc-900 flex-shrink-0" />}
                </button>
              )
            })}
          </div>
        </div>

        <ChoiceRow label="Densité" options={DENSITIES} value={theme.density} onChange={theme.setDensity} />
        <ChoiceRow label="Coins" options={RADII} value={theme.radius} onChange={theme.setRadius} />
        <ChoiceRow label="Menu" options={SIDEBARS} value={theme.sidebar} onChange={theme.setSidebar} />
        <ChoiceRow label="Contraste" options={CONTRASTS} value={theme.contrast} onChange={theme.setContrast} />
        <ChoiceRow label="Mouvement" options={MOTIONS} value={theme.motion} onChange={theme.setMotion} />
      </div>
    </section>
  )
}
