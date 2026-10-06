'use client'

import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronLeft, ChevronRight, RefreshCw, ScrollText } from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import {
  currentAcademicYear,
  formatAuditScore,
  formatDateTime,
} from '@/components/admin/grades/grades-utils'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { cn } from '@/lib/utils'
import { TERM_LABELS } from '@/types/teacher-grades'

const PAGE_SIZE = 25
const selectCls =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400'

export default function AdminGradesAuditLogsPage() {
  const [classId, setClassId] = useState<number | ''>('')
  const [subjectId, setSubjectId] = useState<number | ''>('')
  const [studentId, setStudentId] = useState('')
  const [teacherUserId, setTeacherUserId] = useState('')
  const [page, setPage] = useState(1)

  const contextQuery = useQuery({
    queryKey: ['admin', 'grades', 'context'],
    queryFn: () => adminGradesApi.context(),
  })

  const filters = useMemo(
    () => ({
      classId: typeof classId === 'number' ? classId : undefined,
      subjectId: typeof subjectId === 'number' ? subjectId : undefined,
      studentId: studentId.trim() ? Number(studentId) : undefined,
      teacherUserId: teacherUserId.trim() ? Number(teacherUserId) : undefined,
      page,
      limit: PAGE_SIZE,
    }),
    [classId, subjectId, studentId, teacherUserId, page],
  )

  const logsQuery = useQuery({
    queryKey: ['admin', 'grades', 'audit-logs', filters],
    queryFn: () =>
      adminGradesApi.listAuditLogs({
        ...filters,
        studentId:
          filters.studentId && Number.isFinite(filters.studentId)
            ? filters.studentId
            : undefined,
        teacherUserId:
          filters.teacherUserId && Number.isFinite(filters.teacherUserId)
            ? filters.teacherUserId
            : undefined,
      }),
  })

  const totalPages = Math.max(
    1,
    Math.ceil((logsQuery.data?.total ?? 0) / PAGE_SIZE),
  )
  const items = logsQuery.data?.items ?? []

  return (
    <>
      <AdminModuleHero
        eyebrow="Notes · Audit"
        title="Journal des modifications"
        subtitle={`Piste d’audit GradeAuditLog — litiges parent / école (${currentAcademicYear()})`}
        actions={
          <button
            type="button"
            onClick={() => void logsQuery.refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
          >
            <RefreshCw size={14} className={cn(logsQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
        metrics={[
          {
            label: 'Entrées (filtre)',
            value: logsQuery.data?.total ?? '—',
            loading: logsQuery.isLoading,
            icon: ScrollText,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm">
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Classe</span>
            <select
              className={cn(selectCls, 'mt-1')}
              value={classId}
              onChange={(e) => {
                setPage(1)
                setClassId(e.target.value ? Number(e.target.value) : '')
              }}
            >
              <option value="">Toutes</option>
              {(contextQuery.data?.classes ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Matière</span>
            <select
              className={cn(selectCls, 'mt-1')}
              value={subjectId}
              onChange={(e) => {
                setPage(1)
                setSubjectId(e.target.value ? Number(e.target.value) : '')
              }}
            >
              <option value="">Toutes</option>
              {(contextQuery.data?.subjects ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Élève (ID)</span>
            <input
              className={cn(selectCls, 'mt-1')}
              value={studentId}
              onChange={(e) => {
                setPage(1)
                setStudentId(e.target.value)
              }}
              placeholder="ex. 42"
            />
          </label>
          <label className="block">
            <span className="text-xs font-medium text-zinc-600">Enseignant / auteur (userId)</span>
            <input
              className={cn(selectCls, 'mt-1')}
              value={teacherUserId}
              onChange={(e) => {
                setPage(1)
                setTeacherUserId(e.target.value)
              }}
              placeholder="userId enseignant"
            />
          </label>
        </div>

        <div className="rounded-2xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Élève</th>
                  <th className="px-4 py-3 font-semibold">Classe / Matière</th>
                  <th className="px-4 py-3 font-semibold">Évaluation</th>
                  <th className="px-4 py-3 font-semibold">Avant → Après</th>
                  <th className="px-4 py-3 font-semibold">Auteur</th>
                  <th className="px-4 py-3 font-semibold">Motif</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {logsQuery.isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                      Chargement du journal…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center text-zinc-400">
                      Aucune modification trouvée pour ces filtres.
                    </td>
                  </tr>
                ) : (
                  items.map((log) => (
                    <tr key={log.id} className="hover:bg-zinc-50/70 align-top">
                      <td className="px-4 py-3 whitespace-nowrap text-zinc-600">
                        {formatDateTime(log.createdAt)}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{log.student.fullName}</p>
                        <p className="text-xs text-zinc-500">
                          {log.student.matricule ?? `ID ${log.student.id}`}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-800">{log.evaluation.className}</p>
                        <p className="text-xs text-zinc-500">{log.evaluation.subjectName}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-zinc-800">{log.evaluation.title}</p>
                        <p className="text-xs text-zinc-500">
                          {TERM_LABELS[log.evaluation.term]} · {log.evaluation.academicYear}
                        </p>
                      </td>
                      <td className="px-4 py-3 tabular-nums">
                        <span className="text-zinc-500">
                          {formatAuditScore(log.previousScore, log.previousIsAbsent)}
                        </span>
                        <span className="mx-1.5 text-zinc-300">→</span>
                        <span className="font-semibold text-zinc-900">
                          {formatAuditScore(log.newScore, log.newIsAbsent)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-zinc-900">{log.changedBy.fullName}</p>
                        <p className="text-xs text-zinc-500">
                          {log.changedBy.role} · #{log.changedByUserId}
                        </p>
                        {log.evaluation.teacher ? (
                          <p className="text-xs text-zinc-400 mt-0.5">
                            Ens. {log.evaluation.teacher.fullName}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-zinc-600 max-w-[200px]">
                        {log.reason || '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between gap-3 border-t border-zinc-100 px-4 py-3">
            <p className="text-xs text-zinc-500">
              Page {page} / {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                <ChevronLeft size={14} /> Préc.
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium disabled:opacity-40"
              >
                Suiv. <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
