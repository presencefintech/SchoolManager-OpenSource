'use client'

import Link from 'next/link'
import { AlertTriangle, Inbox, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { studentDisplayName } from '@/lib/parent/api'
import { useSelectedStudent } from '@/lib/parent/hooks'

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn('rounded-2xl border border-line bg-surface p-4 shadow-sm', className)}>{children}</div>
  )
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: React.ReactNode
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="truncate text-xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}

export function EmptyState({ title, hint, action }: { title: string; hint?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-6 py-10 text-center">
      <Inbox className="h-8 w-8 text-zinc-400" />
      <p className="font-medium">{title}</p>
      {hint && <p className="max-w-sm text-sm text-zinc-500">{hint}</p>}
      {action}
    </div>
  )
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/40 dark:text-amber-100"
    >
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
      <div className="flex-1">
        <p>{message ?? 'Impossible de charger les données.'}</p>
        {onRetry && (
          <button type="button" onClick={onRetry} className="mt-1 font-medium underline underline-offset-2">
            Réessayer
          </button>
        )}
      </div>
    </div>
  )
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('h-4 w-4 animate-spin', className)} />
}

export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full rounded-2xl" />
      ))}
    </div>
  )
}

const TONES = {
  green: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200',
  amber: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-200',
  red: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200',
  slate: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200',
} as const

export function Pill({ tone = 'slate', children }: { tone?: keyof typeof TONES; children: React.ReactNode }) {
  return (
    <span className={cn('inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone])}>
      {children}
    </span>
  )
}

export function statusTone(status?: string): keyof typeof TONES {
  switch ((status ?? '').toUpperCase()) {
    case 'PAID':
    case 'CONFIRMED':
    case 'RECONCILED':
    case 'SUCCEEDED':
    case 'PRESENT':
    case 'ON_TIME':
    case 'ACCEPTED':
    case 'APPROVED':
      return 'green'
    case 'PENDING':
    case 'PROCESSING':
    case 'LATE':
    case 'CREATED':
      return 'amber'
    case 'REJECTED':
    case 'FAILED':
    case 'ABSENT':
    case 'CANCELLED':
    case 'SUSPICIOUS':
    case 'EXPIRED':
      return 'red'
    default:
      return 'slate'
  }
}

export function Avatar({ name, src, size = 40 }: { name: string; src?: string; size?: number }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('')
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      width={size}
      height={size}
      className="shrink-0 rounded-full object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-300"
      style={{ width: size, height: size }}
    >
      {initials || '?'}
    </div>
  )
}

/** Bandeau de choix de l'enfant actif (équivalent `parent_student_picker`). */
export function StudentSwitcher() {
  const { students, student, select } = useSelectedStudent()
  if (students.length < 2) return null
  return (
    <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Choisir un enfant">
      {students.map((s) => {
        const active = s.id === student?.id
        return (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => select(s.id)}
            className={cn(
              'flex shrink-0 items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition',
              active
                ? 'border-transparent bg-teal-600 text-white'
                : 'border-line bg-surface text-zinc-600 hover:bg-slate-50 dark:hover:bg-slate-900',
            )}
          >
            <Avatar name={studentDisplayName(s)} src={s.photo} size={22} />
            {s.prenom || s.firstName || studentDisplayName(s)}
          </button>
        )
      })}
    </div>
  )
}

/** État « aucun enfant lié », avec lien vers la liaison par code école. */
export function NoStudent() {
  return (
    <EmptyState
      title="Aucun enfant lié"
      hint="Liez votre enfant avec le code fourni par l'école pour accéder à ses informations."
      action={
        <Link
          href="/parent/students/claim"
          className="mt-1 rounded-lg bg-teal-600 px-4 py-2 text-sm font-medium text-white"
        >
          Lier un enfant
        </Link>
      }
    />
  )
}
