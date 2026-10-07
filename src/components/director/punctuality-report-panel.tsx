'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { Activity, Clock, Download, Mail, RefreshCw, UserX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { Skeleton } from '@/components/ui/skeleton'
import { DirectorEmptyState, DirectorKpiCard } from '@/components/director/director-ui'

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

export function PunctualityReportPanel() {
  const [date, setDate] = useState(todayIso)
  const [feedback, setFeedback] = useState<string | null>(null)

  const reportQuery = useQuery({
    queryKey: ['director', 'presence', 'punctuality-report', date],
    queryFn: () => directorsApi.punctualityReport({ date }),
    staleTime: 30_000,
  })

  const pdfMut = useMutation({
    mutationFn: () => directorsApi.downloadPunctualityReportPdf({ date }),
    onSuccess: (fileName) => setFeedback(`PDF téléchargé : ${fileName}`),
    onError: (err) => setFeedback(getApiErrorMessage(err) || 'Échec export PDF'),
  })

  const deliverMut = useMutation({
    mutationFn: () => directorsApi.punctualityReportDeliver({ date }),
    onSuccess: (data) => {
      setFeedback(
        data.emailsSent > 0
          ? `Rapport envoyé (${data.emailsSent} e-mail${data.emailsSent > 1 ? 's' : ''}).`
          : 'Rapport généré — aucun destinataire e-mail configuré.',
      )
      void reportQuery.refetch()
    },
    onError: (err) => setFeedback(getApiErrorMessage(err) || 'Échec envoi'),
  })

  const report = reportQuery.data

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <label className="block text-xs font-medium text-zinc-600">
          Date du bilan
          <input
            type="date"
            value={date}
            onChange={(e) => {
              setDate(e.target.value)
              setFeedback(null)
            }}
            className="mt-1 block w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 sm:w-48"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => reportQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw
              size={12}
              className={cn(reportQuery.isFetching && 'animate-spin')}
            />
            Actualiser
          </button>
          <button
            type="button"
            disabled={pdfMut.isPending}
            onClick={() => {
              setFeedback(null)
              pdfMut.mutate()
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-800 hover:bg-emerald-100 disabled:opacity-60"
          >
            <Download size={12} />
            Export PDF
          </button>
          <button
            type="button"
            disabled={deliverMut.isPending}
            onClick={() => {
              setFeedback(null)
              deliverMut.mutate()
            }}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
          >
            <Mail size={12} />
            Générer &amp; e-mail
          </button>
        </div>
      </div>

      {feedback && (
        <p className="rounded-xl border border-zinc-200 bg-zinc-50 px-3 py-2 text-xs text-zinc-700">
          {feedback}
        </p>
      )}

      {reportQuery.isLoading ? (
        <div className="space-y-3">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-16" />
          ))}
        </div>
      ) : reportQuery.isError ? (
        <DirectorEmptyState
          icon={RefreshCw}
          title="Rapport indisponible"
          description={
            getApiErrorMessage(reportQuery.error) ||
            'Impossible de charger le bilan de ponctualité.'
          }
        />
      ) : !report ? (
        <DirectorEmptyState
          icon={RefreshCw}
          title="Aucune donnée"
          description="Le bilan de ponctualité n’a pas pu être compilé pour cette date."
        />
      ) : (
        <>
          <p className="text-xs text-zinc-500">
            {report.schoolName} · {report.sessionDateLabel} · généré{' '}
            {new Date(report.generatedAt).toLocaleString('fr-FR')}
          </p>

          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <DirectorKpiCard
              label="Taux de présence"
              value={`${report.totals.attendanceRate.toFixed(1)}%`}
              hint={`${report.totals.present}/${report.totals.totalStudents} élèves`}
              icon={Activity}
              tone="emerald"
            />
            <DirectorKpiCard
              label="Ponctualité"
              value={`${report.totals.punctualityRate.toFixed(1)}%`}
              hint={`${report.totals.onTime} à l’heure`}
              icon={Clock}
              tone="sky"
            />
            <DirectorKpiCard
              label="Retards"
              value={report.totals.late}
              hint="Arrivés en retard"
              icon={Clock}
              tone="amber"
            />
            <DirectorKpiCard
              label="Absents"
              value={report.totals.absent}
              hint="Non pointés"
              icon={UserX}
              tone="indigo"
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                Classement des classes
              </h3>
              {report.classRanking.length === 0 ? (
                <p className="text-xs text-zinc-500">Aucune classe active.</p>
              ) : (
                <div className="overflow-x-auto rounded-xl border border-zinc-100">
                  <table className="w-full min-w-[320px] text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/80">
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          #
                        </th>
                        <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Classe
                        </th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Ponctualité
                        </th>
                        <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Retards
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {report.classRanking.map((row, i) => (
                        <tr key={row.classId} className="hover:bg-zinc-50/80">
                          <td className="px-3 py-2 tabular-nums text-zinc-400">{i + 1}</td>
                          <td className="px-3 py-2 font-medium text-zinc-800">{row.className}</td>
                          <td className="px-3 py-2 text-right tabular-nums text-emerald-700">
                            {row.punctualityRate.toFixed(1)}%
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums text-amber-700">
                            {row.late}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div>
              <h3 className="mb-3 text-sm font-semibold text-zinc-800">
                Élèves en retard
              </h3>
              {report.latecomers.length === 0 ? (
                <p className="text-xs text-zinc-500">Aucun retard enregistré ce jour.</p>
              ) : (
                <ul className="max-h-80 space-y-2 overflow-y-auto">
                  {report.latecomers.map((row) => (
                    <li
                      key={`${row.studentId}-${row.scannedAt}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-zinc-100 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium text-zinc-900">
                          {row.studentName}
                        </p>
                        <p className="text-[11px] text-zinc-400">
                          {row.className ?? 'Sans classe'}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs tabular-nums text-amber-700">
                        {row.scannedAtLabel}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
