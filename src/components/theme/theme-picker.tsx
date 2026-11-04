'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Monitor, Moon, Palette, Sun } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ACCENTS, APPEARANCES, ATMOSPHERES, DENSITIES } from '@/lib/theme/preferences'
import { useTheme } from '@/providers/theme-provider'

const APPEARANCE_ICON = {
  light: Sun,
  dark: Moon,
  system: Monitor,
} as const

const PANEL_WIDTH = 300

export function ThemePicker({ compact = false }: { compact?: boolean }) {
  const { appearance, accent, density, atmosphere, setAppearance, setAccent, setDensity, setAtmosphere } = useTheme()
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState({ top: 8, left: 8 })
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    if (!open) return
    const button = rootRef.current?.querySelector('button')
    if (!button) return
    const rect = button.getBoundingClientRect()
    const left = Math.min(
      Math.max(8, rect.right + 8),
      window.innerWidth - PANEL_WIDTH - 8,
    )
    const estimatedHeight = Math.min(window.innerHeight * 0.72, 560)
    const spaceBelow = window.innerHeight - rect.bottom
    const top =
      spaceBelow < estimatedHeight && rect.top > estimatedHeight
        ? Math.max(8, rect.top - estimatedHeight - 8)
        : Math.min(rect.bottom + 8, window.innerHeight - 120)
    setPos({ top, left: compact ? left : Math.max(8, rect.left) })
  }, [open, compact])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const target = e.target as Node
      if (rootRef.current?.contains(target) || panelRef.current?.contains(target)) return
      setOpen(false)
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

  const panel = open ? (
    <div
      ref={panelRef}
      role="dialog"
      aria-label="Thème de la plateforme"
      style={{ top: pos.top, left: pos.left }}
      className="fixed z-[80] w-[300px] max-h-[min(72vh,560px)] overflow-y-auto rounded-2xl border border-zinc-200/90 bg-white p-3 shadow-xl shadow-zinc-900/10"
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
        Fond
      </p>
      <div className="grid grid-cols-1 gap-1 mb-3">
        {ATMOSPHERES.map((opt) => {
          const active = atmosphere === opt.id
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAtmosphere(opt.id)}
              className={cn(
                'flex items-center justify-between rounded-xl px-2.5 py-2 text-[11px] font-medium ring-1',
                active ? 'bg-zinc-900 text-white ring-zinc-900' : 'bg-zinc-50 text-zinc-600 ring-transparent',
              )}
            >
              <span>{opt.label}</span>
              <span className={active ? 'text-white/70' : 'text-zinc-400'}>{opt.hint}</span>
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
  ) : null

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={cn(
          'inline-flex items-center gap-2 rounded-xl text-sm transition-colors',
          compact
            ? 'p-1.5 text-zinc-600 hover:text-zinc-900 hover:bg-zinc-100'
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

      {typeof document !== 'undefined' && panel ? createPortal(panel, document.body) : null}
    </div>
  )
}
