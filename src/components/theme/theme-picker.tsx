'use client'

import { useEffect, useRef, useState } from 'react'
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCENTS, APPEARANCES, DENSITIES } from '@/lib/theme/preferences'
import { useTheme } from '@/providers/theme-provider'

const APPEARANCE_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { appearance, accent, density, setAppearance, setAccent, setDensity } = useTheme()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl text-sm transition-colors',
          compact
            ? 'p-1.5 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50'
            : 'w-full px-3 py-2 text-zinc-500 hover:text-zinc-800 hover:bg-zinc-50',
        )}
        aria-haspopup="dialog"
        aria-expanded={open}
        title="Apparence (Alt+Shift+D)"
      >
        <span
          className="h-2.5 w-2.5 rounded-full ring-2 ring-white shadow-sm"
          style={{ background: ACCENTS.find((a) => a.id === accent)?.swatch }}
        />
        <Palette size={compact ? 13 : 15} />
        {!compact && <span>Apparence</span>}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Thème de la plateforme"
          className={cn(
            'absolute z-[60] w-[300px] max-h-[min(72vh,560px)] overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xl shadow-zinc-900/10',
            compact ? 'bottom-full right-0 mb-2' : 'bottom-full left-0 mb-2',
          )}
        >
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Apparence
          </p>
          <div className="grid grid-cols-3 gap-1.5 mb-3">
            {APPEARANCES.map((opt) => {
              const Icon = APPEARANCE_ICON[opt.id]
              const active = appearance === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAppearance(opt.id)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-2 py-2.5 text-[11px] font-medium ring-1 transition-all',
                    active
                      ? 'bg-brand text-white ring-brand'
                      : 'bg-zinc-50 text-zinc-600 ring-transparent hover:bg-zinc-100',
                  )}
                >
                  <Icon size={14} />
                  {opt.label}
                </button>
              )
            })}
          </div>

          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Densité
          </p>
          <div className="grid grid-cols-2 gap-1.5 mb-3">
            {DENSITIES.map((opt) => {
              const active = density === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setDensity(opt.id)}
                  className={cn(
                    'rounded-xl px-2 py-2 text-[11px] font-medium ring-1',
                    active ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-zinc-50 text-zinc-600 ring-transparent',
                  )}
                >
                  {opt.label}
                </button>
              )
            })}
          </div>

          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-400">
            Accent
          </p>
          <div className="grid grid-cols-3 gap-1">
            {ACCENTS.map((opt) => {
              const active = accent === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setAccent(opt.id)}
                  title={`${opt.label} — ${opt.hint}`}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-medium',
                    active ? 'bg-zinc-50 ring-1 ring-zinc-200' : 'hover:bg-zinc-50',
                  )}
                >
                  <span className="relative h-6 w-6 rounded-full shadow-sm ring-2 ring-white" style={{ background: opt.swatch }}>
                    {active && <Check size={10} className="absolute inset-0 m-auto text-white" />}
                  </span>
                  {opt.label}
                </button>
              )
            })}
          </div>
          <p className="px-1 pt-2 text-[10px] text-zinc-400">
            Plus d’options dans Profil &amp; sécurité.
          </p>
        </div>
      )}
    </div>
  )
}
