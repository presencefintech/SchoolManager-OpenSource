'use client'

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RowAction {
  id: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

/** Marge minimale entre le menu et les bords de la fenêtre (px). */
const VIEWPORT_GAP = 8
const MENU_WIDTH = 220

type MenuPosition = { top: number; left: number; maxHeight: number }

/**
 * Menu « … » d'une ligne de tableau.
 * Rendu dans un portail en `position: fixed` : jamais rogné par un conteneur
 * `overflow-hidden` / `overflow-x-auto` (tableaux défilants). S'ouvre vers le haut
 * quand la place manque en bas, défile s'il dépasse la hauteur disponible.
 */
export function RowActionsMenu({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [position, setPosition] = useState<MenuPosition | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuId = useId()

  const close = useCallback((restoreFocus = false) => {
    setOpen(false)
    setPosition(null)
    if (restoreFocus) triggerRef.current?.focus()
  }, [])

  /** Place le menu sous (ou au-dessus du) bouton, d'après la hauteur réelle mesurée. */
  const place = useCallback(() => {
    const trigger = triggerRef.current
    if (!trigger) return
    const rect = trigger.getBoundingClientRect()
    const menuHeight = menuRef.current?.scrollHeight ?? 0
    const spaceBelow = window.innerHeight - rect.bottom - VIEWPORT_GAP
    const spaceAbove = rect.top - VIEWPORT_GAP
    const above = menuHeight > spaceBelow && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, (above ? spaceAbove : spaceBelow) - 4)
    const height = Math.min(menuHeight, maxHeight)
    const left = Math.min(
      Math.max(VIEWPORT_GAP, rect.right - MENU_WIDTH),
      window.innerWidth - MENU_WIDTH - VIEWPORT_GAP,
    )
    const top = above ? rect.top - 4 - height : rect.bottom + 4
    setPosition({ top, left, maxHeight })
  }, [])

  // Rendu caché pour la mesure, puis placement réel avant affichage (pas de flash)
  useLayoutEffect(() => {
    if (open) place()
  }, [open, place])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node
      if (triggerRef.current?.contains(target) || menuRef.current?.contains(target)) return
      close()
    }
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        close(true)
      }
    }
    // Position fixe : tout défilement (page ou tableau) ou redimensionnement referme le menu
    const onScrollOrResize = (e: Event) => {
      if (menuRef.current && e.target instanceof Node && menuRef.current.contains(e.target)) return
      close()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [open, close])

  // Focus sur la première action disponible à l'ouverture (navigation clavier)
  useEffect(() => {
    if (!open || !position) return
    menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true })
  }, [open, position])

  const onMenuKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp' && e.key !== 'Home' && e.key !== 'End') return
    e.preventDefault()
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    if (!items.length) return
    const index = items.indexOf(document.activeElement as HTMLButtonElement)
    const next =
      e.key === 'Home' ? 0
      : e.key === 'End' ? items.length - 1
      : e.key === 'ArrowDown' ? (index + 1) % items.length
      : (index - 1 + items.length) % items.length
    items[next]?.focus()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={(e) => {
          e.stopPropagation()
          if (open) close()
          else setOpen(true)
        }}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-lg border p-1.5 text-zinc-500 transition-colors',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400',
          open ? 'border-zinc-300 bg-zinc-100' : 'border-zinc-200 hover:bg-zinc-50',
        )}
      >
        <MoreHorizontal size={14} />
      </button>
      {open &&
        createPortal(
          <div
            ref={menuRef}
            id={menuId}
            role="menu"
            aria-label={label}
            onKeyDown={onMenuKeyDown}
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'fixed',
              width: MENU_WIDTH,
              top: position?.top ?? 0,
              left: position?.left ?? 0,
              maxHeight: position?.maxHeight,
              visibility: position ? 'visible' : 'hidden',
            }}
            className="z-[90] overflow-y-auto overscroll-contain rounded-xl border border-zinc-200 bg-white py-1 shadow-lg"
          >
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={() => {
                  close()
                  a.onClick()
                }}
                className={cn(
                  'block w-full px-3 py-2 text-left text-xs font-medium leading-snug',
                  'hover:bg-zinc-50 focus:bg-zinc-50 focus:outline-none disabled:opacity-40',
                  a.danger ? 'text-red-600' : 'text-zinc-700',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
