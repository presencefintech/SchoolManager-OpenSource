'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BookCheck, Plus } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import { teacherAssignmentsApi } from '@/lib/teacher/api/school-work.api'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  btnPrimary,
  formatDate,
  inputCls,
} from '@/components/teacher/ui'
import { WorkStatusBadge } from '@/components/teacher/work-status'

const FILTERS = [
  { id: '', label: 'Tous' },
  { id: 'DRAFT', label: 'Brouillons' },
  { id: 'PUBLISHED', label: 'Publiés' },
  { id: 'CLOSED', label: 'Clôturés' },
]

export default function TeacherAssignmentsPage() {
  const [status, setStatus] = useState('')
  const [classId, setClassId] = useState('')

  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })
  const usage = useQuery({ queryKey: ['teacher', 'assignments', 'usage'], queryFn: teacherAssignmentsApi.usage })
  const q = useQuery({
    queryKey: ['teacher', 'assignments', status, classId],
    queryFn: () =>
      teacherAssignmentsApi.list({
        status: status || undefined,
        classId: classId ? Number(classId) : undefined,
      }),
  })

  const quota = usage.data
  const used = Number(quota?.assignmentsCreated ?? NaN)
  const limit = Number(quota?.assignmentsLimit ?? NaN)

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<BookCheck className="h-6 w-6 text-teal-600" />}
        title="Devoirs"
        subtitle={
          Number.isFinite(used) && Number.isFinite(limit) && limit > 0
            ? `${used} / ${limit} devoirs ce mois-ci.`
            : 'Créez, publiez et corrigez les devoirs de vos classes.'
        }
        actions={
          <Link href="/teacher/assignments/new" className={btnPrimary}>
            <Plus className="h-4 w-4" /> Nouveau devoir
          </Link>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setStatus(f.id)}
            className={`rounded-full px-3 py-1 text-sm ${
              status === f.id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
            }`}
          >
            {f.label}
          </button>
        ))}
        <select className={`${inputCls} ml-auto w-auto`} value={classId} onChange={(e) => setClassId(e.target.value)}>
          <option value="">Toutes les classes</option>
          {classes.data?.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger les devoirs.')} onRetry={() => q.refetch()} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState>Aucun devoir pour ces filtres.</EmptyState>
      ) : (
        <div className="space-y-2">
          {q.data!.items.map((a) => (
            <Link key={a.id} href={`/teacher/assignments/${a.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-teal-400">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{a.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[a.subject, a.className].filter(Boolean).join(' · ')}
                    {a.dueDate ? ` · pour le ${formatDate(a.dueDate)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{a.submissionCount} rendu(s)</span>
                  <WorkStatusBadge status={a.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
