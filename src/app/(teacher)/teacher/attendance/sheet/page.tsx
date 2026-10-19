'use client'

import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Suspense, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Download, Lock, Save, Send } from 'lucide-react'
import { apiErrorMessage, teacherMobileApi } from '@/lib/teacher/api/mobile.api'
import {
  LINE_STATUS_LABEL,
  teacherSheetApi,
  type LineStatus,
  type SheetLine,
} from '@/lib/teacher/api/attendance-sheet.api'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  btnGhost,
  btnPrimary,
  downloadBlob,
  formatDateTime,
  inputCls,
} from '@/components/teacher/ui'
import { cn } from '@/lib/utils'

const STATUS_ORDER: LineStatus[] = ['PRESENT', 'LATE', 'ABSENT', 'EXCUSED', 'UNIFORM_VIOLATION']

const STATUS_TONE: Record<LineStatus, string> = {
  PRESENT: 'bg-emerald-600 text-white',
  LATE: 'bg-amber-500 text-white',
  ABSENT: 'bg-rose-600 text-white',
  EXCUSED: 'bg-sky-600 text-white',
  UNIFORM_VIOLATION: 'bg-indigo-600 text-white',
}

function todayIso(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function SheetInner() {
  const search = useSearchParams()
  const qc = useQueryClient()
  const classes = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })

  const [classId, setClassId] = useState<number | null>(() => {
    const raw = Number(search.get('classId'))
    return Number.isFinite(raw) && raw > 0 ? raw : null
  })
  const [date, setDate] = useState(todayIso())
  const [lines, setLines] = useState<SheetLine[]>([])
  const [dirty, setDirty] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (classId == null && classes.data?.classes.length) setClassId(classes.data.classes[0].id)
  }, [classId, classes.data])

  const draft = useQuery({
    queryKey: ['teacher', 'sheet', classId, date],
    queryFn: () => teacherSheetApi.draft(classId!, date),
    enabled: classId != null,
  })

  useEffect(() => {
    if (draft.data) {
      setLines(draft.data.lines)
      setDirty(false)
    }
  }, [draft.data])

  const sheet = draft.data
  const locked = sheet?.status === 'SEALED' || sheet?.status === 'SUBMITTED'

  const counts = useMemo(() => {
    const c: Record<LineStatus, number> = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0, UNIFORM_VIOLATION: 0 }
    for (const l of lines) c[l.status] += 1
    return c
  }, [lines])

  const update = (studentId: number, patch: Partial<SheetLine>) => {
    setLines((ls) => ls.map((l) => (l.studentId === studentId ? { ...l, ...patch } : l)))
    setDirty(true)
    setMessage(null)
  }

  const markAll = (status: LineStatus) => {
    setLines((ls) => ls.map((l) => ({ ...l, status })))
    setDirty(true)
  }

  const invalidate = () => void qc.invalidateQueries({ queryKey: ['teacher', 'sheet'] })

  const save = useMutation({
    mutationFn: () => teacherSheetApi.saveDraft(classId!, lines, date),
    onSuccess: () => {
      setDirty(false)
      setMessage('Brouillon enregistré.')
      invalidate()
    },
  })

  const submit = useMutation({
    mutationFn: () => teacherSheetApi.submit(classId!, lines, date),
    onSuccess: () => {
      setMessage('Cahier d’appel soumis. Les parents concernés sont notifiés.')
      invalidate()
    },
  })

  const seal = useMutation({
    mutationFn: () => teacherSheetApi.seal(classId!, sheet!.id),
    onSuccess: () => {
      setMessage('Cahier d’appel scellé.')
      invalidate()
    },
  })

  const exportPdf = useMutation({
    mutationFn: () => teacherSheetApi.exportPdf(classId!, sheet!.id),
    onSuccess: (blob) => downloadBlob(blob, `cahier-appel-${date}.pdf`),
  })

  const missingReason = lines.some((l) => (l.status === 'ABSENT' || l.status === 'LATE') && !l.reasonCode.trim() && !l.note.trim())
  const actionError = save.error ?? submit.error ?? seal.error ?? exportPdf.error

  return (
    <div className="space-y-6">
      <Link href="/teacher/attendance" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Pointage
      </Link>
      <PageHeader
        title="Cahier d’appel"
        subtitle="Brouillon, soumission puis scellement de la séance."
        actions={
          <>
            <select
              className={`${inputCls} w-auto`}
              value={classId ?? ''}
              onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : null)}
            >
              {classes.data?.classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input type="date" className={`${inputCls} w-auto`} value={date} max={todayIso()} onChange={(e) => setDate(e.target.value)} />
          </>
        }
      />

      {classId == null ? (
        <EmptyState>Aucune classe assignée.</EmptyState>
      ) : draft.isLoading ? (
        <ListSkeleton rows={6} />
      ) : draft.isError || !sheet ? (
        <ErrorState message={apiErrorMessage(draft.error, 'Impossible d’ouvrir le cahier d’appel.')} onRetry={() => draft.refetch()} />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={sheet.status === 'SEALED' ? 'green' : sheet.status === 'SUBMITTED' ? 'sky' : 'amber'}>
              {sheet.status === 'SEALED' ? 'Scellé' : sheet.status === 'SUBMITTED' ? 'Soumis' : 'Brouillon'}
            </Badge>
            {sheet.submittedAt && <span className="text-xs text-slate-500">Soumis le {formatDateTime(sheet.submittedAt)}</span>}
            {sheet.sealedAt && <span className="text-xs text-slate-500">Scellé le {formatDateTime(sheet.sealedAt)}</span>}
            <span className="ml-auto flex flex-wrap gap-2 text-xs text-slate-500">
              {STATUS_ORDER.filter((s) => counts[s] > 0).map((s) => (
                <span key={s}>
                  {LINE_STATUS_LABEL[s]} : <strong>{counts[s]}</strong>
                </span>
              ))}
            </span>
          </div>

          {!locked && (
            <div className="flex flex-wrap gap-2">
              <button type="button" className={btnGhost} onClick={() => markAll('PRESENT')}>
                Tous présents
              </button>
            </div>
          )}

          {lines.length === 0 ? (
            <EmptyState>Aucun élève inscrit dans cette classe.</EmptyState>
          ) : (
            <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
              {lines.map((l) => {
                const needsReason = l.status === 'ABSENT' || l.status === 'LATE' || l.status === 'EXCUSED'
                return (
                  <div key={l.studentId} className="space-y-2 px-4 py-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate font-medium">{l.studentName}</p>
                        <p className="text-xs text-slate-500">{l.matricule}</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {STATUS_ORDER.map((s) => (
                          <button
                            key={s}
                            type="button"
                            disabled={locked}
                            onClick={() => update(l.studentId, { status: s })}
                            className={cn(
                              'rounded-full px-3 py-1.5 text-xs font-medium disabled:cursor-not-allowed',
                              l.status === s
                                ? STATUS_TONE[s]
                                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                            )}
                          >
                            {LINE_STATUS_LABEL[s]}
                          </button>
                        ))}
                      </div>
                    </div>
                    {needsReason && (
                      <div className="grid gap-2 sm:grid-cols-[200px_1fr]">
                        <input
                          className={inputCls}
                          placeholder="Code motif (ex. MALADIE)"
                          value={l.reasonCode}
                          disabled={locked}
                          onChange={(e) => update(l.studentId, { reasonCode: e.target.value })}
                        />
                        <input
                          className={inputCls}
                          placeholder="Commentaire"
                          value={l.note}
                          disabled={locked}
                          onChange={(e) => update(l.studentId, { note: e.target.value })}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </Card>
          )}

          {missingReason && !locked && (
            <p className="text-sm text-amber-700">Indiquez un motif ou un commentaire pour chaque absence et chaque retard.</p>
          )}
          {actionError && <ErrorState message={apiErrorMessage(actionError, 'Action impossible.')} />}
          {message && <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">{message}</p>}

          <div className="flex flex-wrap gap-2">
            {!locked && (
              <>
                <button type="button" className={btnGhost} disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
                  <Save className="h-4 w-4" /> Enregistrer le brouillon
                </button>
                <button
                  type="button"
                  className={btnPrimary}
                  disabled={lines.length === 0 || missingReason || submit.isPending}
                  onClick={() => submit.mutate()}
                >
                  <Send className="h-4 w-4" /> Soumettre
                </button>
              </>
            )}
            {sheet.status === 'SUBMITTED' && (
              <button type="button" className={btnPrimary} disabled={seal.isPending} onClick={() => seal.mutate()}>
                <Lock className="h-4 w-4" /> Sceller
              </button>
            )}
            {sheet.id > 0 && sheet.status !== 'DRAFT' && (
              <button type="button" className={btnGhost} disabled={exportPdf.isPending} onClick={() => exportPdf.mutate()}>
                <Download className="h-4 w-4" /> Exporter en PDF
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

export default function TeacherAttendanceSheetPage() {
  return (
    <Suspense fallback={<ListSkeleton rows={6} />}>
      <SheetInner />
    </Suspense>
  )
}
