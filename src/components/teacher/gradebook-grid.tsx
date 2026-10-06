'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { MessageSquare, Pencil, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { teacherGradesApi } from '@/lib/teacher/api/grades.api'
import type { GradebookEvaluationColumn, GradebookGrid } from '@/types/teacher-grades'
import { EVAL_TYPE_LABELS } from '@/types/teacher-grades'

type DraftCell = {
  score: string
  isAbsent: boolean
  comment: string
  dirty: boolean
}

type Props = {
  grid: GradebookGrid
  queryKey: unknown[]
  onEditEvaluation?: (evaluation: GradebookEvaluationColumn) => void
  onDeleteEvaluation?: (evaluation: GradebookEvaluationColumn) => void
  /** Permet de brancher l’API admin (`/admin/grades`) ou teacher. */
  upsertGrades?: (
    evaluationId: number,
    body: {
      grades: Array<{
        studentId: number
        score?: number | null
        isAbsent?: boolean
        comment?: string | null
      }>
      reason?: string | null
    },
  ) => Promise<{ evaluationId?: number; upserted: number }>
}


function cellKey(studentId: number, evaluationId: number) {
  return `${studentId}:${evaluationId}`
}

function parseScore(raw: string): number | null {
  const trimmed = raw.trim().replace(',', '.')
  if (!trimmed) return null
  const n = Number(trimmed)
  return Number.isFinite(n) ? n : null
}

export function GradebookGrid({
  grid,
  queryKey,
  onEditEvaluation,
  onDeleteEvaluation,
  upsertGrades,
}: Props) {
  const queryClient = useQueryClient()
  const inputRefs = useRef<Map<string, HTMLInputElement>>(new Map())
  const [drafts, setDrafts] = useState<Record<string, DraftCell>>({})
  const [activeEvalId, setActiveEvalId] = useState<number | null>(
    grid.evaluations[0]?.id ?? null,
  )
  const [commentStudentId, setCommentStudentId] = useState<number | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const saveGrades = upsertGrades ?? teacherGradesApi.upsertGrades

  useEffect(() => {
    const next: Record<string, DraftCell> = {}
    for (const student of grid.students) {
      for (const evaluation of grid.evaluations) {
        const cell = student.cells[String(evaluation.id)]
        next[cellKey(student.studentId, evaluation.id)] = {
          score: cell?.isAbsent ? '' : cell?.score != null ? String(cell.score) : '',
          isAbsent: cell?.isAbsent ?? false,
          comment: cell?.comment ?? '',
          dirty: false,
        }
      }
    }
    setDrafts(next)
    setActiveEvalId((prev) => {
      if (prev && grid.evaluations.some((e) => e.id === prev)) return prev
      return grid.evaluations[0]?.id ?? null
    })
  }, [grid])

  const dirtyByEval = useMemo(() => {
    const map = new Map<number, number>()
    for (const [key, draft] of Object.entries(drafts)) {
      if (!draft.dirty) continue
      const evaluationId = Number(key.split(':')[1])
      map.set(evaluationId, (map.get(evaluationId) ?? 0) + 1)
    }
    return map
  }, [drafts])

  const focusCell = useCallback((studentId: number, evaluationId: number) => {
    const el = inputRefs.current.get(cellKey(studentId, evaluationId))
    el?.focus()
    el?.select()
  }, [])

  const moveVertical = useCallback(
    (studentId: number, evaluationId: number, delta: number) => {
      const idx = grid.students.findIndex((s) => s.studentId === studentId)
      const next = grid.students[idx + delta]
      if (!next) return
      focusCell(next.studentId, evaluationId)
    },
    [focusCell, grid.students],
  )

  const saveMutation = useMutation({
    mutationFn: async (evaluationId: number) => {
      const evaluation = grid.evaluations.find((e) => e.id === evaluationId)
      const maxScore = evaluation?.maxScore ?? Infinity
      const grades = grid.students
        .map((student) => {
          const draft = drafts[cellKey(student.studentId, evaluationId)]
          if (!draft?.dirty) return null
          const score = draft.isAbsent ? null : parseScore(draft.score)
          if (!draft.isAbsent && draft.score.trim() !== '' && score == null) {
            throw new Error(`Note invalide pour ${student.fullName}`)
          }
          if (score != null && score > maxScore) {
            throw new Error(
              `Note ${score} > barème ${maxScore} (${student.fullName})`,
            )
          }
          return {
            studentId: student.studentId,
            isAbsent: draft.isAbsent,
            score,
            comment: draft.comment.trim() || null,
          }
        })
        .filter((g): g is NonNullable<typeof g> => g != null)

      if (grades.length === 0) return { upserted: 0 }
      return saveGrades(evaluationId, {
        grades,
        reason: 'Correction administrative',
      })
    },
    onSuccess: async () => {
      setSaveError(null)
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : (err as { response?: { data?: { message?: string } } })?.response?.data
              ?.message ?? 'Échec de l’enregistrement des notes.'
      setSaveError(message)
    },
  })

  const updateDraft = useCallback(
    (studentId: number, evaluationId: number, patch: Partial<DraftCell>) => {
      if (!grid.writable) return
      const key = cellKey(studentId, evaluationId)
      setDrafts((prev) => ({
        ...prev,
        [key]: {
          score: prev[key]?.score ?? '',
          isAbsent: prev[key]?.isAbsent ?? false,
          comment: prev[key]?.comment ?? '',
          dirty: true,
          ...patch,
        },
      }))
    },
    [grid.writable],
  )

  if (grid.evaluations.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-600 dark:border-slate-600 dark:bg-slate-900/40 dark:text-slate-300">
        Aucune évaluation pour cette période. Créez une interro, un TP, un devoir ou un examen
        pour commencer la saisie.
      </div>
    )
  }

  const commentStudent = grid.students.find((s) => s.studentId === commentStudentId)

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {grid.evaluations.map((evaluation) => {
          const dirtyCount = dirtyByEval.get(evaluation.id) ?? 0
          return (
            <div key={evaluation.id} className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setActiveEvalId(evaluation.id)}
                className={cn(
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition',
                  activeEvalId === evaluation.id
                    ? 'border-teal-600 bg-teal-600 text-white'
                    : 'border-slate-200 bg-white text-slate-700 hover:border-teal-300 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-200',
                )}
              >
                {EVAL_TYPE_LABELS[evaluation.type]} · {evaluation.title}
                <span className="ml-1 opacity-80">/{evaluation.maxScore}</span>
                {dirtyCount > 0 && (
                  <span className="ml-1 rounded bg-amber-400/90 px-1.5 py-0.5 text-[10px] text-amber-950">
                    {dirtyCount}
                  </span>
                )}
              </button>
              {grid.writable && onEditEvaluation && (
                <button
                  type="button"
                  title="Modifier"
                  onClick={() => onEditEvaluation(evaluation)}
                  className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              )}
              {grid.writable && onDeleteEvaluation && evaluation.status !== 'LOCKED' && (
                <button
                  type="button"
                  title="Supprimer"
                  onClick={() => onDeleteEvaluation(evaluation)}
                  className="rounded p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          )
        })}
        {activeEvalId != null && grid.writable && (
          <button
            type="button"
            disabled={saveMutation.isPending || !(dirtyByEval.get(activeEvalId) ?? 0)}
            onClick={() => saveMutation.mutate(activeEvalId)}
            className="ml-auto rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-40 dark:bg-teal-600"
          >
            {saveMutation.isPending ? 'Enregistrement…' : 'Enregistrer la colonne'}
          </button>
        )}
      </div>

      <p className="text-xs text-slate-500">
        Clavier : <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">Tab</kbd> /{' '}
        <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">Entrée</kbd> élève suivant ·{' '}
        <kbd className="rounded bg-slate-100 px-1 dark:bg-slate-800">Alt+A</kbd> absence
      </p>

      {saveError && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {saveError}
        </p>
      )}

      <div className="overflow-auto rounded-xl border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        <table className="min-w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10 bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500 dark:bg-slate-800">
            <tr>
              <th className="sticky left-0 z-20 min-w-[12rem] bg-slate-50 px-3 py-2 dark:bg-slate-800">
                Élève
              </th>
              {grid.evaluations.map((evaluation) => (
                <th
                  key={evaluation.id}
                  className={cn(
                    'min-w-[8.5rem] px-2 py-2',
                    activeEvalId === evaluation.id && 'bg-teal-50 dark:bg-teal-950/40',
                  )}
                >
                  <div className="font-semibold text-slate-700 dark:text-slate-200">
                    {EVAL_TYPE_LABELS[evaluation.type]}
                  </div>
                  <div className="normal-case tracking-normal text-slate-400">
                    /{evaluation.maxScore}
                  </div>
                </th>
              ))}
              <th className="min-w-[4.5rem] px-2 py-2">TJ</th>
              <th className="min-w-[4.5rem] px-2 py-2">Exam</th>
              <th className="min-w-[5rem] px-2 py-2">Moy.</th>
            </tr>
          </thead>
          <tbody>
            {grid.students.map((student) => (
              <tr
                key={student.studentId}
                className="border-t border-slate-100 dark:border-slate-800"
              >
                <td className="sticky left-0 z-10 bg-white px-3 py-1.5 dark:bg-slate-900">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-medium text-slate-900 dark:text-slate-50">
                        {student.fullName}
                      </div>
                      <div className="text-xs text-slate-400">{student.matricule}</div>
                    </div>
                    {activeEvalId != null && (
                      <button
                        type="button"
                        title="Commentaire"
                        onClick={() => setCommentStudentId(student.studentId)}
                        className={cn(
                          'rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-teal-600',
                          drafts[cellKey(student.studentId, activeEvalId)]?.comment &&
                            'text-teal-600',
                        )}
                      >
                        <MessageSquare className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </td>
                {grid.evaluations.map((evaluation) => {
                  const key = cellKey(student.studentId, evaluation.id)
                  const draft = drafts[key]
                  const locked = !grid.writable || evaluation.status === 'LOCKED'
                  return (
                    <td
                      key={evaluation.id}
                      className={cn(
                        'px-2 py-1',
                        activeEvalId === evaluation.id && 'bg-teal-50/50 dark:bg-teal-950/20',
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <input
                          ref={(el) => {
                            if (el) inputRefs.current.set(key, el)
                            else inputRefs.current.delete(key)
                          }}
                          type="text"
                          inputMode="decimal"
                          disabled={locked || draft?.isAbsent}
                          value={draft?.isAbsent ? '' : draft?.score ?? ''}
                          onChange={(e) =>
                            updateDraft(student.studentId, evaluation.id, {
                              score: e.target.value.replace(',', '.'),
                              isAbsent: false,
                            })
                          }
                          onFocus={() => setActiveEvalId(evaluation.id)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault()
                              moveVertical(student.studentId, evaluation.id, 1)
                            }
                            if (e.key === 'Tab' && !e.shiftKey) {
                              e.preventDefault()
                              moveVertical(student.studentId, evaluation.id, 1)
                            }
                            if (e.key === 'a' && (e.altKey || e.metaKey)) {
                              e.preventDefault()
                              updateDraft(student.studentId, evaluation.id, {
                                isAbsent: true,
                                score: '',
                              })
                            }
                          }}
                          className={cn(
                            'w-16 rounded border px-1.5 py-1 text-right tabular-nums',
                            draft?.dirty
                              ? 'border-amber-400 bg-amber-50'
                              : 'border-slate-200 bg-white dark:border-slate-600 dark:bg-slate-950',
                            locked && 'opacity-50',
                          )}
                          aria-label={`Note ${student.fullName} ${evaluation.title}`}
                        />
                        <button
                          type="button"
                          title="Marquer absent (Alt+A)"
                          disabled={locked}
                          onClick={() =>
                            updateDraft(student.studentId, evaluation.id, {
                              isAbsent: !draft?.isAbsent,
                              score: '',
                            })
                          }
                          className={cn(
                            'rounded px-1.5 py-1 text-[10px] font-semibold uppercase',
                            draft?.isAbsent
                              ? 'bg-rose-600 text-white'
                              : 'bg-slate-100 text-slate-500 dark:bg-slate-800',
                          )}
                        >
                          Abs
                        </button>
                      </div>
                    </td>
                  )
                })}
                <td className="px-2 py-1 tabular-nums text-slate-600">
                  {student.tj.onScale != null ? student.tj.onScale.toFixed(2) : '—'}
                </td>
                <td className="px-2 py-1 tabular-nums text-slate-600">
                  {student.examen.onScale != null ? student.examen.onScale.toFixed(2) : '—'}
                </td>
                <td className="px-2 py-1 font-semibold tabular-nums text-slate-900 dark:text-slate-50">
                  {student.provisionalAverage != null
                    ? student.provisionalAverage.toFixed(2)
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {commentStudent && activeEvalId != null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl dark:bg-slate-900">
            <h3 className="font-semibold">Commentaire — {commentStudent.fullName}</h3>
            <p className="mt-1 text-xs text-slate-500">
              Colonne active :{' '}
              {grid.evaluations.find((e) => e.id === activeEvalId)?.title}
            </p>
            <textarea
              className="mt-3 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-950"
              rows={4}
              maxLength={500}
              disabled={!grid.writable}
              value={drafts[cellKey(commentStudent.studentId, activeEvalId)]?.comment ?? ''}
              onChange={(e) =>
                updateDraft(commentStudent.studentId, activeEvalId, {
                  comment: e.target.value,
                })
              }
            />
            <div className="mt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setCommentStudentId(null)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
