'use client'

import { Award, ChevronRight, Download, Printer, Users } from 'lucide-react'
import { DecisionBadge } from './decision-badge'
import { placeLabelFor } from './deliberation-copy'
import type { DeliberationBulletinRow } from '@/lib/admin/api/deliberations.api'
import { cn } from '@/lib/utils'

type Props = {
  bulletins: DeliberationBulletinRow[]
  emptyHint?: string
  printingEnabled: boolean
  onSelectStudent: (studentId: number) => void
  onPrintStudent: (studentId: number) => void
  onDownloadStudent: (studentId: number) => void
}

export function DeliberationResultsTable({
  bulletins,
  emptyHint,
  printingEnabled,
  onSelectStudent,
  onPrintStudent,
  onDownloadStudent,
}: Props) {
  if (bulletins.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-white px-6 py-14 text-center">
        <Users className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-medium text-slate-700">
          Aucun résultat pour le moment
        </p>
        <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
          {emptyHint ??
            'Lancez la délibération pour établir les rangs et les décisions du conseil de classe.'}
        </p>
      </div>
    )
  }

  const sorted = [...bulletins].sort((a, b) => {
    const ra = a.rank.position ?? 9999
    const rb = b.rank.position ?? 9999
    if (ra !== rb) return ra - rb
    return a.student.fullName.localeCompare(b.student.fullName, 'fr')
  })

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3.5 border-b border-slate-100 bg-[#f8fafc]">
        <Award size={16} className="text-[#1e3a5f]" />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-slate-900">
            Tableau des résultats du conseil de classe
          </h2>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Cliquez sur une ligne pour le détail · actions d’impression à droite
          </p>
        </div>
        <span className="ml-auto text-xs text-slate-500 tabular-nums shrink-0">
          {sorted.length} élève(s)
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500">
              <th className="px-5 py-3 font-semibold">Élève</th>
              <th className="px-4 py-3 font-semibold text-right">Pourcentage</th>
              <th className="px-4 py-3 font-semibold">Rang</th>
              <th className="px-4 py-3 font-semibold">Décision</th>
              <th className="px-4 py-3 font-semibold text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sorted.map((row) => {
              const needsReview =
                row.deliberation.anomaly?.isAnomalous === true
              return (
                <tr
                  key={row.meta.studentId}
                  className={cn(
                    'transition-colors group',
                    needsReview
                      ? 'bg-amber-50/40 hover:bg-amber-50'
                      : 'hover:bg-slate-50',
                  )}
                >
                  <td
                    className="px-5 py-3.5 cursor-pointer"
                    onClick={() => onSelectStudent(row.meta.studentId)}
                  >
                    <p className="font-medium text-slate-900">
                      {row.student.fullName}
                    </p>
                    {row.student.matricule ? (
                      <p className="text-xs text-slate-500 mt-0.5">
                        Matricule {row.student.matricule}
                      </p>
                    ) : null}
                  </td>
                  <td
                    className="px-4 py-3.5 text-right tabular-nums font-semibold text-slate-800 cursor-pointer"
                    onClick={() => onSelectStudent(row.meta.studentId)}
                  >
                    {row.totals.percentage != null
                      ? `${row.totals.percentage.toFixed(1)} %`
                      : '—'}
                  </td>
                  <td
                    className="px-4 py-3.5 tabular-nums text-slate-700 cursor-pointer"
                    onClick={() => onSelectStudent(row.meta.studentId)}
                  >
                    {placeLabelFor(row)}
                  </td>
                  <td
                    className="px-4 py-3.5 cursor-pointer"
                    onClick={() => onSelectStudent(row.meta.studentId)}
                  >
                    <DecisionBadge
                      decision={row.deliberation.decision}
                      label={row.deliberation.decisionLabel}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        disabled={!printingEnabled}
                        title={
                          printingEnabled
                            ? 'Imprimer le bulletin'
                            : 'Impression désactivée par la plateforme'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          onPrintStudent(row.meta.studentId)
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Printer size={14} />
                      </button>
                      <button
                        type="button"
                        disabled={!printingEnabled}
                        title={
                          printingEnabled
                            ? 'Télécharger le bulletin'
                            : 'Téléchargement désactivé par la plateforme'
                        }
                        onClick={(e) => {
                          e.stopPropagation()
                          onDownloadStudent(row.meta.studentId)
                        }}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Download size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => onSelectStudent(row.meta.studentId)}
                        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-[#1e3a5f]"
                        aria-label="Voir le détail"
                      >
                        <ChevronRight size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}
