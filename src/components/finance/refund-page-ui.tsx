'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

export const REFUND_STATUS_STYLES: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: 'En attente',  cls: 'bg-amber-500/15 text-amber-800 ring-1 ring-amber-500/25' },
  APPROVED:   { label: 'Approuvé',    cls: 'bg-sky-500/15 text-sky-800 ring-1 ring-sky-500/25' },
  REJECTED:   { label: 'Rejeté',      cls: 'bg-rose-500/15 text-rose-800 ring-1 ring-rose-500/25' },
  PROCESSING: { label: 'En cours',    cls: 'bg-violet-500/15 text-violet-800 ring-1 ring-violet-500/25' },
  PROCESSED:  { label: 'Traité',      cls: 'bg-emerald-500/15 text-emerald-800 ring-1 ring-emerald-500/25' },
  FAILED:     { label: 'Échoué',      cls: 'bg-red-500/20 text-red-900 ring-1 ring-red-500/30' },
  CANCELLED:  { label: 'Annulé',      cls: 'bg-slate-500/10 text-slate-600 ring-1 ring-slate-400/20' },
  SYNCED:     { label: 'Synchronisé', cls: 'bg-indigo-500/15 text-indigo-800 ring-1 ring-indigo-500/25' },
}

const STAT_TONES = {
  slate:   'from-slate-100/90 to-slate-50/80 border-slate-200/80 text-slate-800',
  indigo:  'from-indigo-100/80 to-violet-50/70 border-indigo-200/70 text-indigo-900',
  amber:   'from-amber-100/90 to-orange-50/70 border-amber-200/80 text-amber-900',
  sky:     'from-sky-100/90 to-cyan-50/70 border-sky-200/80 text-sky-900',
  rose:    'from-rose-100/90 to-pink-50/70 border-rose-200/80 text-rose-900',
  emerald: 'from-emerald-100/90 to-teal-50/70 border-emerald-200/80 text-emerald-900',
} as const

export function RefundPageShell({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('relative -mx-2 sm:-mx-0', className)}>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-3xl">
        <div className="absolute -top-24 -right-16 h-56 w-56 rounded-full bg-violet-400/10 blur-3xl" />
        <div className="absolute top-1/3 -left-20 h-48 w-48 rounded-full bg-emerald-400/10 blur-3xl" />
        <div className="absolute bottom-0 right-1/4 h-40 w-40 rounded-full bg-sky-400/10 blur-3xl" />
      </div>
      <div className="relative space-y-6">{children}</div>
    </div>
  )
}

export function RefundPanel({
  children,
  className,
  accent = 'indigo',
}: {
  children: ReactNode
  className?: string
  accent?: 'indigo' | 'emerald' | 'violet'
}) {
  const accentBar =
    accent === 'emerald' ? 'from-emerald-400 via-teal-400 to-cyan-400'
      : accent === 'violet' ? 'from-violet-500 via-purple-500 to-fuchsia-500'
        : 'from-indigo-500 via-violet-500 to-purple-500'

  return (
    <div className={cn(
      'overflow-hidden rounded-2xl border border-slate-200/70',
      'bg-gradient-to-br from-slate-50/95 via-white/60 to-indigo-50/40',
      'shadow-lg shadow-slate-300/20 ring-1 ring-white/50 backdrop-blur-sm',
      className,
    )}>
      <div className={cn('h-1 bg-gradient-to-r', accentBar)} />
      {children}
    </div>
  )
}

export function RefundPanelHeader({
  title,
  subtitle,
  icon: Icon,
  badge,
}: {
  title: string
  subtitle?: string
  icon?: React.ElementType
  badge?: ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200/60 bg-slate-100/40 px-5 py-3.5">
      <div className="flex items-center gap-2.5 min-w-0">
        {Icon && (
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-indigo-600">
            <Icon size={15} />
          </div>
        )}
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-800">{title}</h2>
          {subtitle && <p className="text-xs text-slate-500 truncate">{subtitle}</p>}
        </div>
      </div>
      {badge}
    </div>
  )
}

export function RefundStat({
  label,
  value,
  tone = 'slate',
}: {
  label: string
  value: string
  tone?: keyof typeof STAT_TONES
}) {
  return (
    <div className={cn(
      'rounded-2xl border bg-gradient-to-br px-4 py-3.5 shadow-sm',
      STAT_TONES[tone],
    )}>
      <p className="text-[10px] font-semibold uppercase tracking-wider opacity-70">{label}</p>
      <p className="mt-1 text-lg font-bold tabular-nums">{value}</p>
    </div>
  )
}

export function RefundFilterBar({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200/60 bg-slate-100/50 p-2.5 backdrop-blur-sm">
      {children}
    </div>
  )
}

export function RefundFilterPills({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: { value: string; label: string }[]
}) {
  return (
    <div className="flex flex-wrap gap-1 rounded-xl bg-slate-200/50 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={cn(
            'rounded-lg px-3 py-1.5 text-sm font-medium transition-all',
            value === opt.value
              ? 'bg-gradient-to-r from-indigo-500 to-violet-500 text-white shadow-md shadow-indigo-500/25'
              : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-800',
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export function RefundSearchInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={cn(
        'min-w-[200px] flex-1 rounded-xl border border-slate-200/80 pl-9',
        'bg-slate-50/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400',
        'focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-300/60',
      )}
    />
  )
}

export function RefundStatusBadge({ status }: { status: string }) {
  const cfg = REFUND_STATUS_STYLES[status] ?? { label: status, cls: 'bg-slate-500/10 text-slate-600' }
  return (
    <span className={cn('inline-flex text-[11px] px-2 py-0.5 rounded-full font-medium', cfg.cls)}>
      {cfg.label}
    </span>
  )
}

export function RefundDetailBlock({
  title,
  children,
  tone = 'slate',
}: {
  title?: string
  children: ReactNode
  tone?: 'slate' | 'sky' | 'violet' | 'amber'
}) {
  const tones = {
    slate:  'border-slate-200/70 bg-slate-100/50',
    sky:    'border-sky-200/60 bg-sky-50/60',
    violet: 'border-violet-200/60 bg-violet-50/50',
    amber:  'border-amber-200/60 bg-amber-50/50',
  }[tone]

  return (
    <div className={cn('rounded-xl border px-3 py-2.5 text-xs', tones)}>
      {title && <p className="mb-1 font-semibold text-slate-700">{title}</p>}
      {children}
    </div>
  )
}

export function RefundInfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-100/40 px-3 py-2">
      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

export function RefundActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
  className,
}: {
  children: ReactNode
  onClick?: () => void
  disabled?: boolean
  variant?: 'primary' | 'danger' | 'sky'
  className?: string
}) {
  const variants = {
    primary: 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-emerald-500/25',
    danger:  'bg-gradient-to-r from-rose-500 to-red-500 hover:from-rose-600 hover:to-red-600 shadow-rose-500/25',
    sky:     'bg-gradient-to-r from-sky-500 to-indigo-500 hover:from-sky-600 hover:to-indigo-600 shadow-sky-500/25',
  }[variant]

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'inline-flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-sm font-medium text-white shadow-md transition-all disabled:opacity-50',
        variants,
        className,
      )}
    >
      {children}
    </button>
  )
}
