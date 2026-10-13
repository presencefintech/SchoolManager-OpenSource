'use client'

import { useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle, ArrowRightFromLine, ArrowRightToLine, CheckCircle2, Clock, ShieldAlert, XCircle } from 'lucide-react'
import { parentApi, studentDisplayName, type AttendanceEntry } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Pill } from '@/components/parent/ui'
import { cn } from '@/lib/utils'

type StatusFilter = 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'
type Preset = '7' | '30' | '90' | '365' | 'custom'

const PRESETS: { value: Preset; label: string }[] = [
  { value: '7', label: '7 jours' },
  { value: '30', label: '30 jours' },
  { value: '90', label: '3 mois' },
  { value: '365', label: 'Année' },
  { value: 'custom', label: 'Période' },
]

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: 'ALL', label: 'Tout' },
  { value: 'PRESENT', label: 'Présent' },
  { value: 'LATE', label: 'Retards' },
  { value: 'ABSENT', label: 'Absences' },
]

const STATUS_META: Record<string, { label: string; tone: 'green' | 'amber' | 'red' | 'slate'; icon: typeof CheckCircle2 }> = {
  PRESENT: { label: 'Présent', tone: 'green', icon: CheckCircle2 },
  LATE: { label: 'En retard', tone: 'amber', icon: Clock },
  ABSENT: { label: 'Absent', tone: 'red', icon: XCircle },
  EXITED: { label: 'Sorti', tone: 'slate', icon: ArrowRightFromLine },
}

const METHOD_LABEL: Record<string, string> = {
  QR_CODE: 'QR code',
  NFC: 'Badge NFC',
  BIOMETRIC: 'Biométrie',
  FACIAL: 'Reconnaissance faciale',
  MANUAL: 'Saisie manuelle',
}

const MAX_PAGES = 6
const PAGE_SIZE = 100

const dayKey = (iso: string) => {
  const d = new Date(iso)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function toInputDate(d: Date): string {
  return dayKey(d.toISOString())
}

async function fetchAll(studentId: number, from: string, to: string, status?: 'PRESENT' | 'LATE' | 'ABSENT') {
  const rows: AttendanceEntry[] = []
  let total = 0
  for (let page = 1; page <= MAX_PAGES; page++) {
    const res = await parentApi.attendance(studentId, { page, limit: PAGE_SIZE, from, to, status })
    rows.push(...(res.data ?? []))
    total = res.pagination?.total ?? rows.length
    if (rows.length >= total || (res.data ?? []).length < PAGE_SIZE) break
  }
  return { rows, total }
}

/** Historique détaillé des présences / retards / absences d'un enfant. */
export default function StudentAttendancePage() {
  const { studentId: raw } = useParams<{ studentId: string }>()
  const studentId = Number(raw)
  const { students } = useSelectedStudent()
  const student = students.find((s) => s.id === studentId)

  const [preset, setPreset] = useState<Preset>('30')
  const [status, setStatus] = useState<StatusFilter>('ALL')
  const today = useMemo(() => new Date(), [])
  const [customFrom, setCustomFrom] = useState(() => toInputDate(new Date(Date.now() - 30 * 86_400_000)))
  const [customTo, setCustomTo] = useState(() => toInputDate(today))

  const range = useMemo(() => {
    if (preset === 'custom') {
      const from = new Date(`${customFrom}T00:00:00`)
      const to = new Date(`${customTo}T23:59:59.999`)
      return { from: from.toISOString(), to: to.toISOString() }
    }
    const to = new Date()
    to.setHours(23, 59, 59, 999)
    const from = new Date()
    from.setDate(from.getDate() - Number(preset))
    from.setHours(0, 0, 0, 0)
    return { from: from.toISOString(), to: to.toISOString() }
  }, [preset, customFrom, customTo])

  const invalidRange = preset === 'custom' && (!customFrom || !customTo || customFrom > customTo)
  const apiStatus = status === 'ALL' ? undefined : status

  const history = useQuery({
    queryKey: [...parentKeys.attendance(studentId), range.from, range.to, apiStatus ?? 'ALL'],
    queryFn: () => fetchAll(studentId, range.from, range.to, apiStatus),
    enabled: Number.isFinite(studentId) && !invalidRange,
  })

  const rows = useMemo(() => history.data?.rows ?? [], [history.data])

  const stats = useMemo(() => {
    const days = new Map<string, Set<string>>()
    for (const r of rows) {
      if (r.direction === 'EXIT') continue
      const set = days.get(dayKey(r.scannedAt)) ?? new Set<string>()
      set.add(r.status)
      days.set(dayKey(r.scannedAt), set)
    }
    let present = 0
    let late = 0
    let absent = 0
    for (const set of days.values()) {
      if (set.has('ABSENT') && !set.has('PRESENT') && !set.has('LATE')) absent++
      else if (set.has('LATE')) late++
      else present++
    }
    const counted = present + late + absent
    return { present, late, absent, counted, rate: counted ? Math.round(((present + late) / counted) * 100) : null }
  }, [rows])

  const grouped = useMemo(() => {
    const byMonth = new Map<string, Map<string, AttendanceEntry[]>>()
    for (const r of rows) {
      const d = new Date(r.scannedAt)
      const month = d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' })
      const days = byMonth.get(month) ?? new Map<string, AttendanceEntry[]>()
      const k = dayKey(r.scannedAt)
      days.set(k, [...(days.get(k) ?? []), r])
      byMonth.set(month, days)
    }
    return [...byMonth.entries()]
  }, [rows])

  const truncated = !!history.data && history.data.total > rows.length

  return (
    <div className="space-y-4">
      <PageHeader
        title="Présences et retards"
        subtitle={[student ? studentDisplayName(student) : null, student?.className].filter(Boolean).join(' · ')}
      />

      <section aria-label="Période" className="space-y-3">
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Période">
          {PRESETS.map((p) => (
            <Chip key={p.value} active={preset === p.value} onClick={() => setPreset(p.value)}>
              {p.label}
            </Chip>
          ))}
        </div>
        {preset === 'custom' && (
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Du</span>
              <input
                type="date"
                value={customFrom}
                max={customTo || undefined}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2"
              />
            </label>
            <label className="text-sm">
              <span className="mb-1 block text-zinc-500">Au</span>
              <input
                type="date"
                value={customTo}
                min={customFrom || undefined}
                onChange={(e) => setCustomTo(e.target.value)}
                className="w-full rounded-xl border border-line bg-surface px-3 py-2"
              />
            </label>
          </div>
        )}
        {invalidRange && (
          <p role="alert" className="text-sm text-red-600">
            La date de début doit précéder la date de fin.
          </p>
        )}
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1" role="tablist" aria-label="Statut">
          {STATUS_FILTERS.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setStatus(s.value)}>
              {s.label}
            </Chip>
          ))}
        </div>
      </section>

      {history.isLoading ? (
        <ListSkeleton rows={5} />
      ) : history.isError ? (
        <ErrorState onRetry={() => void history.refetch()} />
      ) : (
        <>
          {status === 'ALL' && (
            <section aria-label="Résumé" className="grid grid-cols-2 gap-3 md:grid-cols-4">
              <Stat label="Assiduité" value={stats.rate != null ? `${stats.rate} %` : '—'} />
              <Stat label="Jours présent" value={String(stats.present)} tone="text-emerald-600" />
              <Stat label="Retards" value={String(stats.late)} tone="text-amber-600" />
              <Stat label="Absences" value={String(stats.absent)} tone="text-red-600" />
            </section>
          )}

          {rows.length === 0 ? (
            <EmptyState
              title="Aucun pointage sur cette période"
              hint="Essayez une période plus large ou retirez le filtre de statut."
            />
          ) : (
            <div className="space-y-5">
              {grouped.map(([month, days]) => (
                <section key={month} aria-label={month}>
                  <h2 className="mb-2 text-sm font-semibold uppercase capitalize tracking-wide text-zinc-500">{month}</h2>
                  <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                    {[...days.entries()].map(([k, entries]) => (
                      <li key={k} className="px-4 py-3">
                        <p className="mb-1.5 text-sm font-medium capitalize">
                          {new Date(`${k}T12:00:00`).toLocaleDateString('fr-FR', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                          })}
                        </p>
                        <ul className="space-y-1.5">
                          {entries.map((e) => (
                            <EntryRow key={e.id} entry={e} />
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
              {truncated && (
                <p className="text-center text-xs text-zinc-500">
                  {rows.length} pointages affichés sur {history.data?.total}. Réduisez la période pour tout voir.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}

function EntryRow({ entry: e }: { entry: AttendanceEntry }) {
  const meta = STATUS_META[e.status] ?? { label: e.status, tone: 'slate' as const, icon: Clock }
  const Icon = meta.icon
  const exit = e.direction === 'EXIT'
  const time = e.time ?? new Date(e.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  const suspicious = e.security?.isSuspicious
  return (
    <li className="flex items-center gap-3">
      <span aria-hidden className="text-zinc-400">
        {exit ? <ArrowRightFromLine className="h-4 w-4" /> : <ArrowRightToLine className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm">
          <span className="font-medium tabular-nums">{time}</span>
          <span className="text-zinc-500"> · {exit ? 'Sortie' : 'Arrivée'}</span>
        </p>
        <p className="truncate text-xs text-zinc-500">
          {[e.className, e.location?.roomName, e.method ? (METHOD_LABEL[e.method] ?? e.method) : null]
            .filter(Boolean)
            .join(' · ')}
        </p>
        {suspicious && (
          <p className="mt-0.5 flex items-center gap-1 text-xs text-red-600">
            <ShieldAlert className="h-3 w-3" /> Pointage signalé par l&apos;école
          </p>
        )}
      </div>
      {!exit && (
        <Pill tone={meta.tone}>
          <Icon className="mr-1 h-3 w-3" /> {meta.label}
        </Pill>
      )}
      {e.status === 'LATE' && <AlertTriangle className="sr-only" aria-label="Retard" />}
    </li>
  )
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <Card>
      <p className="text-xs text-zinc-500">{label}</p>
      <p className={cn('mt-1 text-xl font-bold', tone)}>{value}</p>
    </Card>
  )
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-3 py-1.5 text-sm transition',
        active ? 'border-transparent bg-teal-600 text-white' : 'border-line bg-surface text-zinc-600 hover:bg-slate-50',
      )}
    >
      {children}
    </button>
  )
}
