'use client'

import { BookOpen, Scale, X } from 'lucide-react'
import { DecisionBadge } from './decision-badge'
import { decisionMotivation, placeLabelFor } from './deliberation-copy'
import type { DeliberationBulletinRow } from '@/lib/admin/api/deliberations.api'

type Props = {
  open: boolean
  row: DeliberationBulletinRow | null
  onClose: () => void
}

export function StudentDetailModal({ open, row, onClose }: Props) {
  if (!open || !row) return null

  const domains = [...(row.domains ?? [])].sort(
    (a, b) => a.sortOrder - b.sortOrder,
  )
  const pct =
    row.totals.percentage != null
      ? `${row.totals.percentage.toFixed(1)} %`
      : '—'

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="student-detail-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-slate-500">
              Situation individuelle
            </p>
            <h3
              id="student-detail-title"
              className="mt-1 text-lg font-semibold text-slate-900 truncate"
            >
              {row.student.fullName}
            </h3>
            <p className="mt-0.5 text-xs text-slate-500">
              {row.student.matricule
                ? `Matricule ${row.student.matricule}`
                : 'Matricule non renseigné'}
              {row.classInfo?.name ? ` · ${row.classInfo.name}` : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
            aria-label="Fermer"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-5 space-y-5">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Moyenne
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {pct}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Rang
              </p>
              <p className="mt-1 text-xl font-semibold tabular-nums text-slate-900">
                {placeLabelFor(row)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3 flex flex-col justify-between">
              <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
                Décision
              </p>
              <div className="mt-1.5">
                <DecisionBadge
                  decision={row.deliberation.decision}
                  label={row.deliberation.decisionLabel}
                />
              </div>
            </div>
          </div>

          <section>
            <div className="flex items-center gap-2 mb-2.5">
              <BookOpen size={15} className="text-sky-800" />
              <h4 className="text-sm font-semibold text-slate-900">
                Répartition par domaine d’apprentissage
              </h4>
            </div>
            {domains.length === 0 ? (
              <p className="text-sm text-slate-500 rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center">
                La répartition détaillée n’est pas disponible pour cet élève.
              </p>
            ) : (
              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 overflow-hidden">
                {domains.map((d) => (
                  <li
                    key={`${d.domainId ?? d.name}-${d.sortOrder}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 bg-white"
                  >
                    <span className="text-sm text-slate-800">{d.name}</span>
                    <span className="text-sm font-semibold tabular-nums text-slate-900">
                      {d.percentage != null
                        ? `${d.percentage.toFixed(1)} %`
                        : '—'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="rounded-xl border border-sky-100 bg-sky-50/60 px-4 py-3.5">
            <div className="flex items-center gap-2 mb-1.5">
              <Scale size={15} className="text-sky-800" />
              <h4 className="text-sm font-semibold text-slate-900">
                Décision motivée
              </h4>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed">
              {decisionMotivation(row)}
            </p>
            {row.deliberation.validatedAt ? (
              <p className="mt-2 text-xs font-medium text-emerald-800">
                Décision officiellement validée le{' '}
                {new Date(row.deliberation.validatedAt).toLocaleDateString(
                  'fr-FR',
                  {
                    day: '2-digit',
                    month: 'long',
                    year: 'numeric',
                  },
                )}
                .
              </p>
            ) : (
              <p className="mt-2 text-xs text-amber-800">
                Proposition du conseil — en attente de validation officielle du
                Préfet des études.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  )
}
