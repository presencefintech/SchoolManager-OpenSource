'use client'

import { useEffect, useRef, useState } from 'react'
import { MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface RowAction {
  id: string
  label: string
  onClick: () => void
  danger?: boolean
  disabled?: boolean
}

export function RowActionsMenu({ actions, label = 'Actions' }: { actions: RowAction[]; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={label}
        onClick={(e) => { e.stopPropagation(); setOpen((v) => !v) }}
        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50"
      >
        <MoreHorizontal size={14} />
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 z-30 min-w-[180px] rounded-xl border border-zinc-200 bg-white shadow-lg py-1">
          {actions.map((a) => (
            <button
              key={a.id}
              type="button"
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
        </div>
      )}
    </div>
  )
}
