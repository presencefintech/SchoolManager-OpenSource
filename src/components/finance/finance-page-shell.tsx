'use client'

import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'

export function FinancePageShell({
  children,
  className,
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div className={cn('min-h-full px-8 py-8', className)}>
      <div className="mx-auto max-w-[1440px] space-y-6">{children}</div>
    </div>
  )
}

export function FinancePageHeader({
  title,
  subtitle,
  badge,
  actions,
  accent = 'emerald',
}: {
  title: string
  subtitle?: string
  badge?: ReactNode
  actions?: ReactNode
  accent?: 'emerald' | 'violet' | 'slate'
}) {
  const accentBar =
    accent === 'violet'
      ? 'from-violet-600 via-purple-600 to-fuchsia-600'
      : accent === 'slate'
        ? 'from-slate-700 via-slate-800 to-slate-900'
        : 'from-emerald-600 via-emerald-700 to-teal-800'

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.22 }}
      className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_2px_12px_rgba(0,0,0,0.06)]"
    >
      <div className={cn('h-1 bg-gradient-to-r', accentBar)} />
      <div className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-zinc-900 sm:text-2xl">{title}</h1>
            {badge}
          </div>
          {subtitle && (
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          )}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>}
      </div>
    </motion.div>
  )
}

export function FinancePanel({
  children,
  className,
  title,
  icon: Icon,
  headerRight,
}: {
  children: ReactNode
  className?: string
  title?: string
  icon?: React.ElementType
  headerRight?: ReactNode
}) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border border-zinc-200/70 bg-white shadow-[0_1px_4px_rgba(0,0,0,0.05)]',
        className,
      )}
    >
      {title && (
        <div className="flex items-center justify-between gap-3 border-b border-zinc-100 px-5 py-4">
          <div className="flex items-center gap-2">
            {Icon && <Icon size={15} className="text-zinc-400" />}
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          </div>
          {headerRight}
        </div>
      )}
      {children}
    </div>
  )
}

export function FinanceEmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: React.ElementType
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-zinc-100">
        <Icon size={26} className="text-zinc-300" />
      </div>
      <p className="text-sm font-semibold text-zinc-700">{title}</p>
      {description && <p className="mt-1 max-w-sm text-xs text-zinc-400">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
