'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Archive, ArrowLeft, Check, Lock, Send } from 'lucide-react'
import { apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { teacherAssignmentsApi, type Submission } from '@/lib/teacher/api/school-work.api'
import {
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  StatTile,
  btnGhost,
  btnPrimary,
  formatDate,
  formatDateTime,
  inputCls,
} from '@/components/teacher/ui'
import { SubmissionStatusBadge, WorkStatusBadge } from '@/components/teacher/work-status'

export default function TeacherAssignmentDetailPage() {
  const params = useParams<{ assignmentId: string }>()
  const id = Number(params.assignmentId)
  const qc = useQueryClient()
  const [grading, setGrading] = useState<Submission | null>(null)

  const detail = useQuery({ queryKey: ['teacher', 'assignments', 'detail', id], queryFn: () => teacherAssignmentsApi.get(id) })
  const subs = useQuery({ queryKey: ['teacher', 'assignments', 'subs', id], queryFn: () => teacherAssignmentsApi.submissions(id) })

  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['teacher', 'assignments'] })
  }
  const publish = useMutation({ mutationFn: () => teacherAssignmentsApi.publish(id), onSuccess: refresh })
  const close = useMutation({ mutationFn: () => teacherAssignmentsApi.close(id), onSuccess: refresh })
  const archive = useMutation({ mutationFn: () => teacherAssignmentsApi.archive(id), onSuccess: refresh })

  const a = detail.data
  const actionError = publish.error ?? close.error ?? archive.error

  return (
    <div className="space-y-6">
      <Link href="/teacher/assignments" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Devoirs
      </Link>

      {detail.isLoading ? (
        <ListSkeleton rows={3} />
      ) : detail.isError || !a ? (
        <ErrorState message={apiErrorMessage(detail.error, 'Devoir introuvable.')} onRetry={() => detail.refetch()} />
      ) : (
        <>
          <PageHeader
            title={a.title}
            subtitle={[a.subject, a.className, a.dueDate ? `à rendre pour le ${formatDate(a.dueDate)}` : null].filter(Boolean).join(' · ')}
            actions={
              <>
                <WorkStatusBadge status={a.status} />
                {a.status === 'DRAFT' && (
                  <button type="button" className={btnPrimary} disabled={publish.isPending} onClick={() => publish.mutate()}>
                    <Send className="h-4 w-4" /> Publier
                  </button>
                )}
                {a.status === 'PUBLISHED' && (
                  <button type="button" className={btnGhost} disabled={close.isPending} onClick={() => close.mutate()}>
                    <Lock className="h-4 w-4" /> Clôturer
                  </button>
                )}
                {a.status !== 'ARCHIVED' && a.status !== 'DRAFT' && (
                  <button type="button" className={btnGhost} disabled={archive.isPending} onClick={() => archive.mutate()}>
                    <Archive className="h-4 w-4" /> Archiver
                  </button>
                )}
              </>
            }
          />
          {actionError && <ErrorState message={apiErrorMessage(actionError, 'Action impossible.')} />}
          {a.description && <Card className="whitespace-pre-wrap text-sm">{a.description}</Card>}

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <StatTile label="Élèves" value={a.stats.total} />
            <StatTile label="En attente" value={a.stats.pending} tone={a.stats.pending ? 'warn' : 'default'} />
            <StatTile label="Rendus" value={a.stats.submitted} />
            <StatTile label="Notés" value={a.stats.graded} tone="good" />
            <StatTile label="Excusés" value={a.stats.excused} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Rendus</h2>
            {subs.isLoading ? (
              <ListSkeleton />
            ) : subs.isError ? (
              <ErrorState message={apiErrorMessage(subs.error, 'Rendus indisponibles.')} onRetry={() => subs.refetch()} />
            ) : (subs.data?.items.length ?? 0) === 0 ? (
              <EmptyState>Aucun rendu pour l’instant.</EmptyState>
            ) : (
              <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
                {subs.data!.items.map((s) => (
                  <div key={s.id || s.studentId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{s.studentName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {s.matricule}
                        {s.submittedAt ? ` · rendu le ${formatDateTime(s.submittedAt)}` : ''}
                        {s.parentComment ? ` · « ${s.parentComment} »` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      {s.grade != null && (
                        <span className="tabular-nums text-sm font-semibold">
                          {s.grade} / {s.maxGrade ?? 20}
                        </span>
                      )}
                      <SubmissionStatusBadge status={s.status} />
                      <button type="button" className={btnGhost} onClick={() => setGrading(s)}>
                        <Check className="h-4 w-4" /> {s.grade != null ? 'Modifier la note' : 'Noter'}
                      </button>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>
        </>
      )}

      {grading && (
        <GradeDialog
          assignmentId={id}
          submission={grading}
          onClose={() => setGrading(null)}
          onSaved={() => {
            setGrading(null)
            refresh()
          }}
        />
      )}
    </div>
  )
}

function GradeDialog({
  assignmentId,
  submission,
  onClose,
  onSaved,
}: {
  assignmentId: number
  submission: Submission
  onClose: () => void
  onSaved: () => void
}) {
  const [grade, setGrade] = useState(submission.grade != null ? String(submission.grade) : '')
  const [maxGrade, setMaxGrade] = useState(String(submission.maxGrade ?? 20))
  const [comment, setComment] = useState(submission.teacherComment ?? '')
  const [paper, setPaper] = useState(submission.paperValidated)
  const [error, setError] = useState<string | null>(null)

  const save = useMutation({
    mutationFn: () =>
      teacherAssignmentsApi.grade({
        assignmentId,
        studentId: submission.studentId,
        grade: Number(grade),
        maxGrade: Number(maxGrade),
        teacherComment: comment.trim() || undefined,
        paperValidated: paper,
      }),
    onSuccess: onSaved,
    onError: (err) => setError(apiErrorMessage(err, 'Enregistrement impossible.')),
  })

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const g = Number(grade)
    const m = Number(maxGrade)
    if (!Number.isFinite(g) || g < 0) return setError('Note invalide.')
    if (!Number.isFinite(m) || m <= 0) return setError('Barème invalide.')
    if (g > m) return setError('La note dépasse le barème.')
    setError(null)
    save.mutate()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" role="dialog" aria-modal="true">
      <form onSubmit={submit} className="w-full max-w-md space-y-4 rounded-xl bg-white p-5 shadow-xl dark:bg-slate-900">
        <h2 className="text-lg font-semibold">Noter {submission.studentName}</h2>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Note</span>
            <input className={inputCls} inputMode="decimal" value={grade} onChange={(e) => setGrade(e.target.value)} autoFocus />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-slate-500">Sur</span>
            <input className={inputCls} inputMode="decimal" value={maxGrade} onChange={(e) => setMaxGrade(e.target.value)} />
          </label>
        </div>
        <label className="block text-sm">
          <span className="mb-1 block text-slate-500">Commentaire (facultatif)</span>
          <textarea rows={3} className={inputCls} value={comment} onChange={(e) => setComment(e.target.value)} />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={paper} onChange={(e) => setPaper(e.target.checked)} />
          Copie papier validée
        </label>
        {error && <ErrorState message={error} />}
        <div className="flex justify-end gap-2">
          <button type="button" className={btnGhost} onClick={onClose}>
            Annuler
          </button>
          <button type="submit" className={btnPrimary} disabled={save.isPending}>
            {save.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </div>
      </form>
    </div>
  )
}
