'use client'

import { useEffect, useMemo, useState } from 'react'
import { AlertCircle, Check, X, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBulkRecordPresence, useStudents, useClasses } from '@/lib/hooks/use-admin'
import type { BulkPresencePayload } from '@/types/admin'
import { interpretBulkPresenceResult } from '@/lib/presence/presence-response.utils'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'

type RowStatus = 'PRESENT' | 'ABSENT' | 'LATE'

const ROW_STATUS_OPTIONS: { value: RowStatus; label: string; active: string }[] = [
  { value: 'PRESENT', label: 'Présent', active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'LATE', label: 'Retard', active: 'bg-amber-600 text-white border-amber-600' },
  { value: 'ABSENT', label: 'Absent', active: 'bg-red-600 text-white border-red-600' },
]

function createIdempotencyKey(): string {
  return crypto.randomUUID()
}

function RowSkeleton() {
  return <div className="h-12 rounded-xl bg-zinc-100 animate-pulse" />
}

export function BulkPresenceGrid({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const bulk = useBulkRecordPresence()
  const [classId, setClassId] = useState(0)
  const [sessionDate, setSessionDate] = useState('')
  const [statusByStudent, setStatusByStudent] = useState<Record<number, RowStatus>>({})
  const [submitting, setSubmitting] = useState(false)
  const [failedIds, setFailedIds] = useState<Set<number>>(new Set())
  const [duplicateIds, setDuplicateIds] = useState<Set<number>>(new Set())

  const { data: classesData, isFetching: classesLoading } = useClasses()
  const { data: studentsData, isFetching: studentsLoading } = useStudents(
    classId ? { classId, limit: 200 } : undefined
  )

  const classes = classesData ?? []
  const students = studentsData?.data ?? []

  useEffect(() => {
    if (!classId || students.length === 0) {
      setStatusByStudent({})
      return
    }
    setStatusByStudent((prev) => {
      const next: Record<number, RowStatus> = {}
      for (const s of students) {
        next[s.id] = prev[s.id] ?? 'PRESENT'
      }
      return next
    })
    setFailedIds(new Set())
    setDuplicateIds(new Set())
  }, [classId, students])

  const entryCount = useMemo(
    () => Object.keys(statusByStudent).length,
    [statusByStudent]
  )

  function setAll(status: RowStatus) {
    const next: Record<number, RowStatus> = {}
    for (const s of students) next[s.id] = status
    setStatusByStudent(next)
  }

  function setStudentStatus(studentId: number, status: RowStatus) {
    setStatusByStudent((prev) => ({ ...prev, [studentId]: status }))
    setFailedIds((prev) => {
      const next = new Set(prev)
      next.delete(studentId)
      return next
    })
    setDuplicateIds((prev) => {
      const next = new Set(prev)
      next.delete(studentId)
      return next
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!classId || entryCount === 0 || submitting) return

    const payload: BulkPresencePayload = {
      classId,
      sessionDate: sessionDate || undefined,
      idempotencyKey: createIdempotencyKey(),
      entries: Object.entries(statusByStudent).map(([studentId, status]) => ({
        studentId: Number(studentId),
        status,
      })),
    }

    setSubmitting(true)
    try {
      const { data, message, statusCode } = await bulk.mutateAsync(payload)
      const outcome = interpretBulkPresenceResult(data, statusCode, message)

      setFailedIds(new Set(outcome.failedStudentIds))
      setDuplicateIds(new Set(outcome.duplicateStudentIds))

      if (outcome.kind === 'full_success') {
        toast.success(outcome.title, outcome.detail)
        onClose()
        return
      }

      if (outcome.kind === 'all_duplicates') {
        toast.warning(outcome.title, outcome.detail)
        return
      }

      if (outcome.kind === 'all_failed') {
        toast.error(outcome.title, outcome.detail)
        return
      }

      toast.warning(outcome.title, outcome.detail)
    } catch (err) {
      toast.error('Enregistrement impossible', getApiErrorMessage(err))
    } finally {
      setSubmitting(false)
    }
  }

  const busy = submitting || bulk.isPending
  const hasRowIssues = failedIds.size > 0 || duplicateIds.size > 0
  const selectCls =
    'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white disabled:bg-zinc-50'

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 shrink-0">
          <div className="flex items-center gap-2">
            <Users size={18} className="text-emerald-600" />
            <h2 className="text-base font-semibold text-zinc-900">Cahier d&apos;appel</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="text-zinc-400 hover:text-zinc-600 transition-colors disabled:opacity-50"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={submit} className="flex flex-col min-h-0 flex-1">
          <div className="p-6 space-y-4 border-b border-zinc-100 shrink-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Classe</label>
                {classesLoading ? (
                  <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
                ) : (
                  <select
                    value={classId || ''}
                    onChange={(e) => setClassId(Number(e.target.value))}
                    disabled={busy}
                    className={selectCls}
                  >
                    <option value="">— Choisir une classe —</option>
                    {classes.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name ?? `Classe #${c.id}`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">
                  Date de session (optionnel)
                </label>
                <input
                  type="datetime-local"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  disabled={busy}
                  className={selectCls}
                />
              </div>
            </div>

            {classId > 0 && students.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAll('PRESENT')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50"
                >
                  Tout présent
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAll('LATE')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 disabled:opacity-50"
                >
                  Tout retard
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setAll('ABSENT')}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-50"
                >
                  Tout absent
                </button>
                <span className="text-xs text-zinc-400 self-center ml-auto">
                  {entryCount} élève(s)
                </span>
              </div>
            )}

            {hasRowIssues && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-900">
                <AlertCircle size={14} className="mt-0.5 shrink-0" />
                <p>
                  Lignes en <span className="font-semibold text-red-700">rouge</span> : échec serveur.
                  Lignes en <span className="font-semibold text-amber-700">ambre</span> : déjà pointé aujourd&apos;hui.
                  Corrigez puis réessayez.
                </p>
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 min-h-0">
            {!classId ? (
              <p className="text-sm text-zinc-400 text-center py-8">
                Sélectionnez une classe pour afficher la liste des élèves.
              </p>
            ) : studentsLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <RowSkeleton key={i} />
                ))}
              </div>
            ) : students.length === 0 ? (
              <p className="text-sm text-zinc-400 text-center py-8">Aucun élève dans cette classe.</p>
            ) : (
              <ul className="space-y-2">
                {students.map((student) => {
                  const status = statusByStudent[student.id] ?? 'PRESENT'
                  const isFailed = failedIds.has(student.id)
                  const isDuplicate = duplicateIds.has(student.id)
                  const name =
                    `${student.firstName ?? ''} ${student.lastName ?? ''}`.trim() ||
                    `Élève #${student.id}`
                  return (
                    <li
                      key={student.id}
                      className={cn(
                        'flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl border transition-colors',
                        isFailed && 'border-red-200 bg-red-50/80',
                        !isFailed && isDuplicate && 'border-amber-200 bg-amber-50/80',
                        !isFailed && !isDuplicate && 'border-zinc-100 hover:bg-zinc-50/80',
                      )}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-zinc-900 truncate">{name}</p>
                        {student.matricule && (
                          <p className="text-xs text-zinc-400">{student.matricule}</p>
                        )}
                        {isFailed && (
                          <p className="text-[10px] font-medium text-red-600 mt-0.5">Échec — vérifiez l&apos;élève</p>
                        )}
                        {isDuplicate && !isFailed && (
                          <p className="text-[10px] font-medium text-amber-700 mt-0.5">Déjà pointé aujourd&apos;hui</p>
                        )}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {ROW_STATUS_OPTIONS.map(({ value, label, active }) => (
                          <button
                            key={value}
                            type="button"
                            disabled={busy}
                            onClick={() => setStudentStatus(student.id, value)}
                            className={cn(
                              'px-2 py-1 rounded-lg text-[10px] sm:text-xs font-medium border transition-colors disabled:opacity-50',
                              status === value
                                ? active
                                : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                            )}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          <div className="p-6 border-t border-zinc-100 flex gap-3 shrink-0">
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors disabled:opacity-50"
            >
              {hasRowIssues ? 'Fermer' : 'Annuler'}
            </button>
            <button
              type="submit"
              disabled={busy || !classId || entryCount === 0}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
            >
              {busy ? (
                'Enregistrement…'
              ) : (
                <>
                  <Check size={16} />
                  Enregistrer {entryCount > 0 ? `(${entryCount})` : ''}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
