'use client'

import { ClipboardCheck } from 'lucide-react'
import { pedagogicalAnomalyMessage } from './deliberation-copy'
import type {
  DeliberationBulletinRow,
  GradeAnomalyReport,
} from '@/lib/admin/api/deliberations.api'

type Props = {
  report: GradeAnomalyReport
  bulletins: DeliberationBulletinRow[]
  onSelectStudent?: (studentId: number) => void
}

export function AnomalyPanel({ report, bulletins, onSelectStudent }: Props) {
  const flagged = report.anomalies.filter((a) => a.isAnomalous)
  if (!report.flaggedCount || flagged.length === 0) return null

  const nameById = new Map(
    bulletins.map((b) => [b.meta.studentId, b.student.fullName] as const),
  )

  return (
    <section
      className="rounded-2xl border border-amber-200 bg-[#fffbeb] shadow-sm overflow-hidden"
      role="region"
      aria-label="Contrôle de cohérence des notes"
    >
      <div className="flex items-start gap-3 px-5 py-4 border-b border-amber-200/80 bg-amber-100/50">
        <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#b45309] text-white">
          <ClipboardCheck size={18} />
        </div>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-amber-950">
            Contrôle de cohérence des notes et de l’harmonisation des cotations
          </h2>
          <p className="mt-1 text-sm text-amber-950/80 leading-relaxed">
            {flagged.length} élève
            {flagged.length > 1 ? 's présentent' : ' présente'} un écart de
            notation significatif par rapport à la moyenne de la classe.
            Examinez ces dossiers avant la validation officielle.
          </p>
          {report.mean != null ? (
            <p className="mt-1.5 text-xs text-amber-900/70 tabular-nums">
              Moyenne de la classe : {report.mean.toFixed(1)} % ·{' '}
              {report.sampleSize} résultat
              {report.sampleSize > 1 ? 's' : ''} pris en compte
            </p>
          ) : null}
        </div>
      </div>

      <ul className="divide-y divide-amber-100/90">
        {flagged.map((a) => {
          const name = nameById.get(a.studentId) ?? 'Élève'
          return (
            <li key={a.studentId}>
              <button
                type="button"
                onClick={() => onSelectStudent?.(a.studentId)}
                className="w-full text-left flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 px-5 py-3.5 hover:bg-amber-50/80 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {name}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                    {pedagogicalAnomalyMessage(a, report.mean)}
                  </p>
                </div>
                <span className="rounded-lg bg-white px-2.5 py-1 text-xs font-semibold tabular-nums text-slate-800 ring-1 ring-amber-200 shrink-0">
                  {a.percentage.toFixed(1)} %
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
