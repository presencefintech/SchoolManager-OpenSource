'use client'

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
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

const MENU_WIDTH = 220
const GAP = 4
const MARGIN = 8

/**
 * Menu d'actions de ligne. Rendu dans un portail en position fixe : il n'est donc jamais
 * coupé par le conteneur à défilement du tableau et s'ouvre vers le haut près du bas de l'écran.
 */
export function RowActionsMenu({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number; maxHeight: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const place = useCallback(() => {
    const btn = btnRef.current
    if (!btn) return
    const r = btn.getBoundingClientRect()
    const vw = window.innerWidth
    const vh = window.innerHeight
    const menuH = menuRef.current?.offsetHeight ?? actions.length * 36 + 8
    const spaceBelow = vh - r.bottom - MARGIN
    const spaceAbove = r.top - MARGIN
    const openUp = spaceBelow < menuH && spaceAbove > spaceBelow
    const maxHeight = Math.max(120, openUp ? spaceAbove - GAP : spaceBelow - GAP)
    const height = Math.min(menuH, maxHeight)
    const top = openUp ? r.top - GAP - height : r.bottom + GAP
    const left = Math.min(Math.max(MARGIN, r.right - MENU_WIDTH), vw - MENU_WIDTH - MARGIN)
    setPos({ top, left, maxHeight })
  }, [actions.length])

  useLayoutEffect(() => {
    if (!open) return
    place()
    // 2e passe : la hauteur réelle du menu n'est connue qu'après le premier rendu.
    const raf = requestAnimationFrame(place)
    return () => cancelAnimationFrame(raf)
  }, [open, place])

  useEffect(() => {
    if (!open) return
    function onDoc(e: MouseEvent) {
      const t = e.target as Node
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return
      setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    const close = () => setOpen(false)
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    window.addEventListener('resize', close)
    window.addEventListener('scroll', close, true)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('resize', close)
      window.removeEventListener('scroll', close, true)
    }
  }, [open])

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={menuRef}
            role="menu"
            style={{
              position: 'fixed',
              top: pos?.top ?? -9999,
              left: pos?.left ?? -9999,
              width: MENU_WIDTH,
              maxHeight: pos?.maxHeight,
              visibility: pos ? 'visible' : 'hidden',
            }}
            className="z-[60] overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-lg py-1"
          >
            {actions.map((a) => (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                disabled={a.disabled}
                onClick={(e) => {
                  e.stopPropagation()
                  setOpen(false)
                  a.onClick()
                }}
                className={cn(
                  'w-full text-left px-3 py-2 text-xs font-medium hover:bg-zinc-50 disabled:opacity-40',
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
