'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ListChecks, Plus } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import { teacherQuizzesApi } from '@/lib/teacher/api/school-work.api'
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
]

export default function TeacherQuizzesPage() {
  const [status, setStatus] = useState('')
  const [classId, setClassId] = useState('')

  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })
  const q = useQuery({
    queryKey: ['teacher', 'quizzes', status, classId],
    queryFn: () =>
      teacherQuizzesApi.list({ status: status || undefined, classId: classId ? Number(classId) : undefined }),
  })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<ListChecks className="h-6 w-6 text-teal-600" />}
        title="QCM"
        subtitle="Quiz à choix multiples pour vos classes, avec statistiques par question."
        actions={
          <Link href="/teacher/quizzes/new" className={btnPrimary}>
            <Plus className="h-4 w-4" /> Nouveau QCM
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
        <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger les QCM.')} onRetry={() => q.refetch()} />
      ) : (q.data?.items.length ?? 0) === 0 ? (
        <EmptyState>Aucun QCM pour ces filtres.</EmptyState>
      ) : (
        <div className="space-y-2">
          {q.data!.items.map((z) => (
            <Link key={z.id} href={`/teacher/quizzes/${z.id}`}>
              <Card className="flex flex-wrap items-center justify-between gap-3 transition hover:border-teal-400">
                <div className="min-w-0">
                  <p className="truncate font-semibold">{z.title}</p>
                  <p className="truncate text-sm text-slate-500">
                    {[z.className, `${z.questionCount} question(s)`, z.dueDate ? `jusqu'au ${formatDate(z.dueDate)}` : null]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-slate-500">{z.submissionCount} participation(s)</span>
                  <WorkStatusBadge status={z.status} />
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
