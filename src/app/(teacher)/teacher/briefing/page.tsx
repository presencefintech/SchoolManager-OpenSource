'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Download, FileText, Newspaper } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import {
  Badge,
  Card,
  EmptyState,
  ErrorState,
  ListSkeleton,
  PageHeader,
  StatTile,
  btnGhost,
  downloadBlob,
  inputCls,
  pct,
} from '@/components/teacher/ui'

function sheetBadge(status: string | null) {
  switch ((status ?? '').toUpperCase()) {
    case 'SEALED':
      return <Badge tone="green">Scellée</Badge>
    case 'SUBMITTED':
      return <Badge tone="sky">Soumise</Badge>
    case 'DRAFT':
      return <Badge tone="amber">Brouillon</Badge>
    default:
      return <Badge tone="slate">Pas de feuille</Badge>
  }
}

const SIGNAL_LABELS: Record<string, string> = {
  LATE: 'Retard annoncé',
  PICKUP: 'Remise anticipée',
  ABSENCE: 'Absence annoncée',
}

export default function TeacherBriefingPage() {
  const [date, setDate] = useState('')
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'briefing', date],
    queryFn: () => teacherMobileApi.dailyBriefing(date || undefined),
  })

  const pdf = useMutation({
    mutationFn: () => teacherMobileApi.dailyBriefingPdf(date || undefined),
    onSuccess: (blob) => downloadBlob(blob, `briefing-${date || q.data?.sessionDate || 'jour'}.pdf`),
  })

  const b = q.data

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Newspaper className="h-6 w-6 text-teal-600" />}
        title="Briefing du jour"
        subtitle={b ? `${b.sessionDateLabel} · ${b.schoolName}` : 'Synthèse de vos présences et des signaux parents.'}
        actions={
          <>
            <input type="date" className={`${inputCls} w-auto`} value={date} onChange={(e) => setDate(e.target.value)} />
            <button type="button" className={btnGhost} onClick={() => pdf.mutate()} disabled={pdf.isPending}>
              <Download className="h-4 w-4" /> {pdf.isPending ? 'Génération…' : 'PDF'}
            </button>
          </>
        }
      />
      {pdf.isError && <ErrorState message={apiErrorMessage(pdf.error, 'Export PDF impossible.')} />}

      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger le briefing.')} onRetry={() => q.refetch()} />
      ) : !b ? (
        <EmptyState>Aucune donnée pour cette date.</EmptyState>
      ) : (
        <>
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Taux de présence" value={pct(b.totals.rate)} tone="good" />
            <StatTile label="Présents" value={`${b.totals.present} / ${b.totals.enrolled}`} tone="good" />
            <StatTile label="Retards" value={b.totals.late} tone="warn" />
            <StatTile label="Absents" value={b.totals.absent} tone="bad" />
            <StatTile label="Non pointés" value={b.totals.unmarked} tone={b.totals.unmarked ? 'warn' : 'default'} />
            <StatTile label="Feuilles scellées" value={`${b.totals.sealedSheets} / ${b.totals.classes}`} />
          </section>

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Par classe</h2>
            {b.classes.length === 0 ? (
              <EmptyState>Aucune classe à afficher.</EmptyState>
            ) : (
              <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
                {b.classes.map((c) => (
                  <div key={c.classId} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                    <div>
                      <p className="font-medium">{c.className}</p>
                      <p className="text-xs text-slate-500">
                        {c.present} présents · {c.late} retards · {c.absent} absents · {c.unmarked} non pointés / {c.enrolled}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="tabular-nums text-sm font-medium">{pct(c.rate)}</span>
                      {sheetBadge(c.sheetStatus)}
                      <Link href={`/teacher/attendance/sheet?classId=${c.classId}`} className="text-sm text-teal-700 hover:underline">
                        <FileText className="inline h-4 w-4" /> Feuille
                      </Link>
                    </div>
                  </div>
                ))}
              </Card>
            )}
          </section>

          {b.parentNotices.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Absences annoncées par les parents</h2>
              <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
                {b.parentNotices.map((n, i) => (
                  <div key={`${n.studentId}-${i}`} className="px-4 py-3">
                    <p className="font-medium">
                      {n.studentName}
                      {n.className ? <span className="font-normal text-slate-500"> · {n.className}</span> : null}
                    </p>
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                      {n.reasonLabel}
                      {n.note ? ` — ${n.note}` : ''}
                    </p>
                  </div>
                ))}
              </Card>
            </section>
          )}

          {b.parentSignals.length > 0 && (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Signaux des parents</h2>
              <Card className="divide-y divide-slate-100 p-0 dark:divide-slate-800">
                {b.parentSignals.map((s, i) => (
                  <div key={`${s.studentId}-${i}`} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                    <span>{s.message}</span>
                    <Badge tone="amber">{SIGNAL_LABELS[s.kind.toUpperCase()] ?? s.kind}</Badge>
                  </div>
                ))}
              </Card>
            </section>
          )}
        </>
      )}
    </div>
  )
}
