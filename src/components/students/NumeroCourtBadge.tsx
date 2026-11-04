'use client'

import { useCallback, useState, useTransition } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Hash, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  numeroCourt?: number | null
  /** Base path for click-to-search (default admin élèves). */
  searchHref?: string
  className?: string
  /** Compact pill for dense tables / guichet. */
  size?: 'sm' | 'md'
  /** If false, only copies — no navigation. */
  navigateOnClick?: boolean
}

/**
 * Badge interactif N° Court — clic → copie + navigation soft `?q=` (sans reload brutal).
 */
export function NumeroCourtBadge({
  numeroCourt,
  searchHref = '/admin/students',
  className,
  size = 'md',
  navigateOnClick = true,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)
  const [, startTransition] = useTransition()

  const code = numeroCourt != null && Number.isFinite(numeroCourt) ? Number(numeroCourt) : null
  const valid = code != null && code >= 1 && code <= 9999

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      if (!valid || code == null) return

      const q = String(code)

      void (async () => {
        try {
          await navigator.clipboard.writeText(q)
          setCopied(true)
          window.setTimeout(() => setCopied(false), 1400)
        } catch {
          /* clipboard may be denied — navigation still proceeds */
        }
      })()

      if (!navigateOnClick) return

      const base = searchHref.split('?')[0] || '/admin/students'
      const target = `${base}?q=${encodeURIComponent(q)}`
      const alreadyOnList = pathname === base

      startTransition(() => {
        // replace sur la même liste → pas d’historique empilé / moins de stutter
        if (alreadyOnList) {
          router.replace(target, { scroll: false })
        } else {
          router.push(target, { scroll: false })
        }
      })
    },
    [valid, code, navigateOnClick, router, searchHref, pathname],
  )

  if (!valid) return null

  return (
    <button
      type="button"
      onClick={onClick}
      title={`Copier et rechercher N° Court ${code}`}
      className={cn(
        'inline-flex items-center gap-1 rounded-full border font-mono tabular-nums transition-colors',
        'border-emerald-200/80 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 hover:border-emerald-300',
        'focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-300',
        'shrink-0 max-w-full',
        size === 'sm' ? 'px-1.5 py-0.5 text-[10px] leading-none' : 'px-2 py-0.5 text-[11px] leading-tight',
        className,
      )}
    >
      {copied ? (
        <Check size={size === 'sm' ? 9 : 11} className="text-emerald-600 shrink-0" />
      ) : (
        <Hash size={size === 'sm' ? 9 : 11} className="shrink-0" />
      )}
      <span className="font-semibold tracking-tight whitespace-nowrap">
        N° Court&nbsp;:&nbsp;{code}
      </span>
    </button>
  )
}
