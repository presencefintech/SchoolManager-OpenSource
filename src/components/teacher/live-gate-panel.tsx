'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { Activity, Clock3, Radio, Users } from 'lucide-react'
import { useTeacherGateRealtime } from '@/lib/teacher/use-teacher-gate-realtime'
import { cn } from '@/lib/utils'

function formatTime(iso: string) {
  try {
    return new Date(iso).toLocaleTimeString('fr-FR', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
  } catch {
    return '—'
  }
}

function statusDot(status: string) {
  if (status === 'LATE') return 'bg-amber-500'
  if (status === 'ABSENT') return 'bg-rose-500'
  return 'bg-emerald-500'
}

type LiveGatePanelProps = {
  className?: string
  compact?: boolean
  classNamesById?: Record<number, string>
}

export function LiveGatePanel({
  className,
  compact = false,
  classNamesById = {},
}: LiveGatePanelProps) {
  const { status, lastUpdate, passages, stats, byClass, sessionPresent, sessionLate } =
    useTeacherGateRealtime()

  const present = stats?.present ?? sessionPresent
  const late = stats?.late ?? sessionLate
  const absent = stats?.absent

  return (
    <section
      className={cn(
        'space-y-4 rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900',
        className,
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold tracking-tight">
            <Radio className="h-5 w-5 text-teal-600" />
            Live Gate
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Passages en direct (Socket.io) — sans recharger la page.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium',
              status === 'live'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200'
                : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300',
            )}
          >
            <span
              className={cn(
                'h-1.5 w-1.5 rounded-full',
                status === 'live' ? 'animate-pulse bg-emerald-500' : 'bg-slate-400',
              )}
            />
            {status === 'live' ? 'En direct' : status === 'connecting' ? 'Connexion…' : 'Hors ligne'}
          </span>
          <Link
            href="/teacher/attendance"
            className="rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-700"
          >
            Ouvrir le pointage
          </Link>
        </div>
      </div>

      <div className={cn('grid gap-3', compact ? 'sm:grid-cols-3' : 'sm:grid-cols-4')}>
        <StatCard
          icon={<Users className="h-4 w-4 text-emerald-600" />}
          label="Présents"
          value={present}
        />
        <StatCard
          icon={<Clock3 className="h-4 w-4 text-amber-600" />}
          label="Retards"
          value={late}
        />
        {!compact && (
          <StatCard
            icon={<Activity className="h-4 w-4 text-slate-500" />}
            label="Absents (jour)"
            value={absent ?? '—'}
          />
        )}
        <StatCard
          icon={<Radio className="h-4 w-4 text-teal-600" />}
          label="Flux session"
          value={passages.length}
        />
      </div>

      {byClass.length > 0 && (
        <div>
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Répartition (flux live)
          </p>
          <div className="flex flex-wrap gap-2">
            {byClass.slice(0, 8).map((row) => (
              <span
                key={row.classId}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs dark:border-slate-700 dark:bg-slate-950"
              >
                <span className="font-medium">
                  {classNamesById[row.classId] ?? `Classe #${row.classId}`}
                </span>
                <span className="ml-1.5 tabular-nums text-teal-700 dark:text-teal-300">
                  {row.count}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Derniers passages
          </p>
          {lastUpdate && (
            <p className="text-[11px] text-slate-400">
              MAJ {lastUpdate.toLocaleTimeString('fr-FR')}
            </p>
          )}
        </div>
        {passages.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-6 text-center text-sm text-slate-500 dark:border-slate-700">
            En attente du prochain badge…
          </p>
        ) : (
          <ul className={cn('space-y-1.5', compact ? 'max-h-48 overflow-y-auto' : 'max-h-80 overflow-y-auto')}>
            {passages.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-xl border border-slate-100 px-3 py-2 dark:border-slate-800"
              >
                <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', statusDot(p.status))} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{p.studentName}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {p.classId != null
                      ? classNamesById[p.classId] ?? `Classe #${p.classId}`
                      : 'Classe —'}{' '}
                    · {p.status}
                  </p>
                </div>
                <time className="shrink-0 text-[11px] tabular-nums text-slate-400">
                  {formatTime(p.scannedAt)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60">
      <div className="flex items-center gap-1.5 text-xs text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-2xl font-semibold tabular-nums">{value}</p>
    </div>
  )
}
