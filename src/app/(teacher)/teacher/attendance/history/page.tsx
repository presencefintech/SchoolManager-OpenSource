'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, History } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  btnGhost,
  formatDateTime,
  inputCls,
  presenceBadge,
} from '@/components/teacher/ui'

const PAGE_SIZE = 50

export default function TeacherAttendanceHistoryPage() {
  const [classId, setClassId] = useState('')
  const [status, setStatus] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })
  const q = useQuery({
    queryKey: ['teacher', 'history', classId, status, from, to, page],
    queryFn: () =>
      teacherMobileApi.attendanceHistory({
        classId: classId ? Number(classId) : undefined,
        status: status || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        limit: PAGE_SIZE,
      }),
  })

  const reset = (fn: () => void) => {
    fn()
    setPage(1)
  }
  const rows = q.data ?? []

  return (
    <div className="space-y-6">
      <Link href="/teacher/attendance" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pointage
      </Link>
      <PageHeader
        icon={<History className="h-6 w-6 text-teal-600" />}
        title="Historique de présence"
        subtitle="Pointages enregistrés dans vos classes."
      />

      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} w-auto`} value={classId} onChange={(e) => reset(() => setClassId(e.target.value))}>
          <option value="">Toutes les classes</option>
          {classes.data?.classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <select className={`${inputCls} w-auto`} value={status} onChange={(e) => reset(() => setStatus(e.target.value))}>
          <option value="">Tous les statuts</option>
          <option value="PRESENT">Présent</option>
          <option value="LATE">Retard</option>
          <option value="ABSENT">Absent</option>
        </select>
        <input type="date" className={`${inputCls} w-auto`} value={from} onChange={(e) => reset(() => setFrom(e.target.value))} aria-label="Du" />
        <input type="date" className={`${inputCls} w-auto`} value={to} onChange={(e) => reset(() => setTo(e.target.value))} aria-label="Au" />
      </div>

      {q.isLoading ? (
        <ListSkeleton rows={6} />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, "Impossible de charger l'historique.")} onRetry={() => q.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyState>Aucun pointage pour ces filtres.</EmptyState>
      ) : (
        <>
          <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
            {rows.map((r, i) => (
              <div key={r.id || i} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate font-medium">{r.studentName}</p>
                  <p className="truncate text-xs text-slate-500">
                    {[r.className, formatDateTime(r.at), r.method].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {presenceBadge(r.status)}
              </div>
            ))}
          </Card>
          <div className="flex items-center justify-between">
            <button type="button" className={btnGhost} disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              Précédent
            </button>
            <span className="text-sm text-slate-500">Page {page}</span>
            <button type="button" className={btnGhost} disabled={rows.length < PAGE_SIZE} onClick={() => setPage((p) => p + 1)}>
              Suivant
            </button>
          </div>
        </>
      )}
    </div>
  )
}
