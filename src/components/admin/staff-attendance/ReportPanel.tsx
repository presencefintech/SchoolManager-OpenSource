'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { FileDown, FileSpreadsheet, Loader2, AlertTriangle, BarChart3 } from 'lucide-react'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import { Skeleton } from '@/components/ui/skeleton'
import { currentMonthValue, formatDateFr, isCurrentMonth } from '@/lib/admin/staff-attendance.utils'
import { exportRowsToCsv } from '@/lib/finance/export-csv'

export function ReportPanel({ onOpenCalendar }: { onOpenCalendar: (staffId: number) => void }) {
  const [month, setMonth] = useState(currentMonthValue())
  const [pdfError, setPdfError] = useState('')

  const reportQuery = useQuery({
    queryKey: staffAttendanceKeys.report(month),
    queryFn: () => staffAttendanceApi.getReport(month),
    staleTime: 20_000,
  })

  const correctionsQuery = useQuery({
    queryKey: staffAttendanceKeys.corrections(month),
    queryFn: () => staffAttendanceApi.listCorrections(month),
    staleTime: 20_000,
  })

  const pdfMut = useMutation({
    mutationFn: () => staffAttendanceApi.downloadReportPdf(month),
    onSuccess: ({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const a = Object.assign(document.createElement('a'), { href: url, download: filename })
      a.click()
      URL.revokeObjectURL(url)
    },
  })

  async function onDownload() {
    setPdfError('')
    try {
      await pdfMut.mutateAsync()
    } catch (err) {
      setPdfError(err instanceof Error ? err.message : 'Impossible de générer le rapport PDF.')
    }
  }

  const rows = reportQuery.data ?? []
  const corrections = correctionsQuery.data ?? []
  const provisional = isCurrentMonth(month)

  function onExportCsv() {
    exportRowsToCsv(
      rows.map((r) => ({
        'Nom': `${r.firstName} ${r.lastName}`,
        'Jours dus': r.totals.present + r.totals.onMission,
        'Présents': r.totals.present,
        'Retards': r.totals.late,
        'Minutes de retard': r.totals.lateMinutesTotal,
        'Absents': r.totals.absent,
        'Congés': r.totals.onLeave,
        'Missions': r.totals.onMission,
        'Départs anticipés': r.totals.leftEarly,
        'Jours corrigés': r.totals.correctedDays,
      })),
      `rapport-presence-personnel-${month}.csv`,
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Rapport mensuel</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Totaux par employé — pour la paie et la comptabilité.</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={month}
            max={currentMonthValue()}
            onChange={(e) => setMonth(e.target.value)}
            className="px-3 py-2 rounded-xl border border-zinc-200 text-sm"
          />
          <button
            type="button"
            onClick={onExportCsv}
            disabled={rows.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 disabled:text-zinc-300"
          >
            <FileSpreadsheet size={14} />
            Export CSV
          </button>
          <button
            type="button"
            onClick={onDownload}
            disabled={pdfMut.isPending}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
          >
            {pdfMut.isPending ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            Télécharger le PDF
          </button>
        </div>
      </div>

      {provisional && (
        <div className="flex items-center gap-2 text-xs font-medium text-red-700 bg-red-50 rounded-lg px-3 py-2">
          <AlertTriangle size={13} />
          Provisoire — mois en cours : à ne pas remettre à la comptabilité.
        </div>
      )}
      {pdfError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{pdfError}</p>}

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {reportQuery.isLoading ? (
          <div className="p-6 space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
            <BarChart3 size={28} className="text-zinc-200" />
            Aucun employé actif
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Employé</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Jours dus</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Présents</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Retards</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Min. retard</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Absents</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Congés</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-3 py-3">Missions</th>
                  <th className="text-right text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Corrigés</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {rows.map((row) => (
                  <tr key={row.staffMemberId} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenCalendar(row.staffMemberId)}
                        className="text-sm font-medium text-zinc-900 hover:text-emerald-700 hover:underline"
                      >
                        {row.firstName} {row.lastName}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums font-semibold text-zinc-800">
                      {row.totals.present + row.totals.onMission}
                    </td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-zinc-600">{row.totals.present}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-amber-700">{row.totals.late}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-zinc-600">{row.totals.lateMinutesTotal}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-red-700">{row.totals.absent}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-indigo-700">{row.totals.onLeave}</td>
                    <td className="px-3 py-3 text-right text-sm tabular-nums text-sky-700">{row.totals.onMission}</td>
                    <td className="px-4 py-3 text-right text-sm tabular-nums text-violet-700">{row.totals.correctedDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-800">Corrections du mois ({corrections.length})</h3>
        </div>
        {correctionsQuery.isLoading ? (
          <div className="p-6 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
        ) : corrections.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-zinc-400">Aucune correction ce mois-ci.</p>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {corrections.map((c) => (
              <li key={c.id} className="px-4 py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm text-zinc-800">
                    <button type="button" onClick={() => onOpenCalendar(c.staffMemberId)} className="font-medium hover:text-emerald-700 hover:underline">
                      #{c.staffMemberId}
                    </button>{' '}
                    · {formatDateFr(c.date)} · {c.mode === 'TIMES' ? 'Heures saisies' : 'Présence attestée'}
                    {c.mode === 'TIMES' && (c.arrivalTime || c.departureTime) && (
                      <span className="text-zinc-400"> ({c.arrivalTime ?? '—'} → {c.departureTime ?? '—'})</span>
                    )}
                  </p>
                  <p className="text-xs text-zinc-500 mt-0.5">{c.reason}</p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">par {c.authorName} · {new Date(c.updatedAt).toLocaleString('fr-FR')}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
