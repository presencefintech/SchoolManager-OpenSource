'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ClipboardCheck, Search, ShieldAlert } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  StatTile,
  btnGhost,
  formatDateTime,
  inputCls,
  pct,
  presenceBadge,
} from '@/components/teacher/ui'
import { cn } from '@/lib/utils'

type Tab = 'students' | 'stats' | 'contacts' | 'logistics'
const TABS: Array<{ id: Tab; label: string }> = [
  { id: 'students', label: 'Élèves' },
  { id: 'stats', label: 'Statistiques' },
  { id: 'contacts', label: 'Contacts parents' },
  { id: 'logistics', label: 'Logistique' },
]

export default function TeacherClassDetailPage() {
  const params = useParams<{ classId: string }>()
  const classId = Number(params.classId)
  const [tab, setTab] = useState<Tab>('students')

  const dash = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })
  const className = dash.data?.classes.find((c) => c.id === classId)?.name ?? `Classe #${classId}`

  return (
    <div className="space-y-6">
      <Link href="/teacher/classes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Mes classes
      </Link>
      <PageHeader
        title={className}
        actions={
          <Link href={`/teacher/attendance/sheet?classId=${classId}`} className={btnGhost}>
            <ClipboardCheck className="h-4 w-4" /> Feuille de présence
          </Link>
        }
      />
      <div className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={cn(
              'whitespace-nowrap border-b-2 px-3 py-2 text-sm font-medium',
              tab === t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-800',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'students' && <StudentsTab classId={classId} />}
      {tab === 'stats' && <StatsTab classId={classId} />}
      {tab === 'contacts' && <ContactsTab classId={classId} />}
      {tab === 'logistics' && <LogisticsTab classId={classId} />}
    </div>
  )
}

function StudentsTab({ classId }: { classId: number }) {
  const [search, setSearch] = useState('')
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'class-students', classId],
    queryFn: () => teacherMobileApi.classStudents(classId),
  })
  const rows = useMemo(() => {
    const needle = search.trim().toLowerCase()
    const all = q.data ?? []
    if (!needle) return all
    return all.filter((s) => `${s.lastName} ${s.firstName} ${s.matricule}`.toLowerCase().includes(needle))
  }, [q.data, search])

  if (q.isLoading) return <ListSkeleton rows={6} />
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger les élèves.')} onRetry={() => q.refetch()} />

  return (
    <div className="space-y-3">
      <div className="relative max-w-sm">
        <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
        <input
          className={cn(inputCls, 'pl-9')}
          placeholder="Rechercher un élève ou un matricule"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      {rows.length === 0 ? (
        <EmptyState>Aucun élève trouvé.</EmptyState>
      ) : (
        <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/teacher/students/${s.id}`}
              className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-950"
            >
              <div className="min-w-0">
                <p className="truncate font-medium">
                  {s.lastName} {s.firstName}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {s.matricule || '—'}
                  {s.lastScanAt ? ` · dernier pointage ${formatDateTime(s.lastScanAt)}` : ''}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {s.isSuspicious && (
                  <span title={s.fraudReasons.join(', ') || 'Pointage suspect'} className="text-rose-600">
                    <ShieldAlert className="h-4 w-4" />
                  </span>
                )}
                {presenceBadge(s.status)}
              </div>
            </Link>
          ))}
        </Card>
      )}
    </div>
  )
}

function StatsTab({ classId }: { classId: number }) {
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'class-stats', classId],
    queryFn: () => teacherMobileApi.classStats(classId),
  })
  if (q.isError) {
    const status = (q.error as { response?: { status?: number } })?.response?.status
    return (
      <ErrorState
        message={status === 403 ? 'Les statistiques de cette classe ne sont pas accessibles avec votre profil.' : apiErrorMessage(q.error)}
        onRetry={status === 403 ? undefined : () => q.refetch()}
      />
    )
  }
  const s = q.data
  if (!s) return <ListSkeleton rows={2} />
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <StatTile label="Effectif" value={s.studentCount ?? '—'} />
      <StatTile label="Pointages enregistrés" value={s.presentCount ?? '—'} tone="good" />
      <StatTile label="Profils incomplets" value={s.incompleteProfiles ?? '—'} tone={s.incompleteProfiles ? 'warn' : 'default'} />
      {s.attendanceRate != null && <StatTile label="Taux de présence" value={pct(s.attendanceRate)} tone="good" />}
      {s.averageGrade != null && <StatTile label="Moyenne de classe" value={s.averageGrade.toFixed(1)} />}
      {s.lateCount != null && <StatTile label="Retards" value={s.lateCount} tone="warn" />}
      {s.absentCount != null && <StatTile label="Absents" value={s.absentCount} tone="bad" />}
      {s.recoveryRate != null && <StatTile label="Recouvrement des frais" value={pct(s.recoveryRate)} tone={s.recoveryRate >= 60 ? 'good' : 'warn'} />}
      {s.totalDebt != null && <StatTile label="Impayés de la classe" value={s.totalDebt.toLocaleString('fr-FR')} tone={s.totalDebt > 0 ? 'bad' : 'default'} />}
    </div>
  )
}

function ContactsTab({ classId }: { classId: number }) {
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'class-contacts', classId],
    queryFn: () => teacherMobileApi.classContacts(classId),
  })
  if (q.isLoading) return <ListSkeleton />
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error, 'Contacts indisponibles.')} onRetry={() => q.refetch()} />
  const rows = q.data ?? []
  if (rows.length === 0) return <EmptyState>Aucun contact parent enregistré pour cette classe.</EmptyState>
  return (
    <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
      {rows.map((c) => (
        <div key={c.studentId} className="space-y-1 px-4 py-3">
          <p className="font-medium">
            {c.studentName} <span className="text-xs font-normal text-slate-500">{c.matricule}</span>
          </p>
          {c.parents.length === 0 && !c.emergencyPhone && <p className="text-xs text-slate-400">Aucun parent renseigné.</p>}
          {c.parents.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 text-sm">
              <span className="min-w-0 truncate">
                {p.name}
                {p.relationship ? <span className="text-xs text-slate-500"> · {p.relationship}</span> : null}
                {p.isPrimary ? <span className="ml-1 text-xs text-teal-700">principal</span> : null}
              </span>
              {p.phone ? (
                <a href={`tel:${p.phone}`} className="shrink-0 text-teal-700 hover:underline">
                  {p.phone}
                </a>
              ) : (
                <span className="text-xs text-slate-400">Pas de numéro</span>
              )}
            </div>
          ))}
          {c.emergencyPhone && (
            <div className="flex items-center justify-between gap-3 text-sm text-slate-500">
              <span>Urgence{c.emergencyName ? ` · ${c.emergencyName}` : ''}</span>
              <a href={`tel:${c.emergencyPhone}`} className="hover:underline">
                {c.emergencyPhone}
              </a>
            </div>
          )}
        </div>
      ))}
    </Card>
  )
}

const LOGISTICS_LABELS: Record<string, string> = {
  level: 'Niveau',
  classCode: 'Code',
  academicYear: 'Année scolaire',
  section: 'Section',
  option: 'Option',
  teacher: 'Enseignant titulaire',
  'capacity.studentCount': 'Élèves inscrits',
  'capacity.maxStudents': 'Capacité maximale',
  'capacity.seatsAvailable': 'Places disponibles',
  'genderDistribution.F': 'Filles',
  'genderDistribution.M': 'Garçons',
}

/** Aplatit un niveau d'objets : `{ section: { name } }` devient « Section : name ». */
function flattenLogistics(data: Record<string, unknown>): Array<[string, string]> {
  const out: Array<[string, string]> = []
  for (const [k, v] of Object.entries(data)) {
    if (k === 'classId' || k === 'className' || v == null) continue
    if (typeof v === 'object') {
      const obj = v as Record<string, unknown>
      if (typeof obj.name === 'string' && obj.name.trim()) {
        out.push([LOGISTICS_LABELS[k] ?? k, obj.name])
        continue
      }
      for (const [k2, v2] of Object.entries(obj)) {
        if (v2 == null || typeof v2 === 'object' || String(v2).trim() === '') continue
        out.push([LOGISTICS_LABELS[`${k}.${k2}`] ?? `${k} · ${k2}`, String(v2)])
      }
    } else if (String(v).trim() !== '') {
      out.push([LOGISTICS_LABELS[k] ?? k, String(v)])
    }
  }
  return out
}

function LogisticsTab({ classId }: { classId: number }) {
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'class-logistics', classId],
    queryFn: () => teacherMobileApi.classLogistics(classId),
  })
  if (q.isLoading) return <ListSkeleton rows={2} />
  if (q.isError) return <ErrorState message={apiErrorMessage(q.error, 'Logistique indisponible.')} onRetry={() => q.refetch()} />
  const entries = flattenLogistics(q.data ?? {})
  if (entries.length === 0) return <EmptyState>Aucune information logistique pour cette classe.</EmptyState>
  return (
    <Card>
      <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
        {entries.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
            <dt className="text-slate-500">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}
