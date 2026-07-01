'use client'

import type { ReactNode } from 'react'
import { X, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type AdminModalProps = {
  title: string
  subtitle?: string
  icon?: LucideIcon
  iconClassName?: string
  badge?: ReactNode
  onClose: () => void
  closeDisabled?: boolean
  children: ReactNode
  footer?: ReactNode
  size?: 'md' | 'lg' | 'xl'
  className?: string
}

const SIZE_CLASS = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
  xl: 'max-w-3xl',
} as const

export function AdminModal({
  title,
  subtitle,
  icon: Icon,
  iconClassName = 'text-emerald-600',
  badge,
  onClose,
  closeDisabled,
  children,
  footer,
  size = 'lg',
  className,
}: AdminModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-900/50 backdrop-blur-sm p-4">
      <div
        className={cn(
          'flex max-h-[92vh] w-full flex-col overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-2xl shadow-zinc-900/10',
          SIZE_CLASS[size],
          className,
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="relative shrink-0 border-b border-zinc-100 bg-gradient-to-r from-white via-emerald-50/30 to-white px-6 py-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                {Icon && (
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-zinc-200/80">
                    <Icon size={18} className={iconClassName} />
                  </span>
                )}
                <h2 className="text-lg font-semibold tracking-tight text-zinc-900">{title}</h2>
                {badge}
              </div>
              {subtitle && <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>}
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={closeDisabled}
              className="rounded-lg p-2 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 disabled:opacity-50"
              aria-label="Fermer"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>

        {footer && (
          <div className="shrink-0 border-t border-zinc-100 bg-zinc-50/50 px-6 py-4">{footer}</div>
        )}
      </div>
    </div>
  )
}
