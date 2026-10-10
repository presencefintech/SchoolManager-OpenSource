'use client'

import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  Briefcase,
  FileBadge,
  Loader2,
  Printer,
  RefreshCw,
  Route,
  Download,
} from 'lucide-react'
import {
  studentOrientationApi,
  type LeavingCertificateData,
  type OrientationRecommendation,
} from '@/lib/admin/api/student-orientation.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { cn } from '@/lib/utils'
import { useToast } from '@/providers/toast-provider'
import { useAuth } from '@/providers/auth-provider'
import type { UserRole } from '@/types/auth'

type Props = {
  studentId: number
  studentName?: string
  schoolName?: string
}

const CYCLE_LABELS: Record<string, string> = {
  EDUCATION_BASE: 'Éducation de base',
  HUMANITES: 'Humanités',
  MATERNELLE: 'Maternelle',
  PRIMAIRE: 'Primaire',
  SECONDAIRE: 'Secondaire',
}

const PATHWAY_LABELS: Record<string, string> = {
  SCIENTIFIQUE: 'Scientifique',
  LITTERAIRE: 'Littéraire',
  TECHNIQUE: 'Technique',
  COMMERCIALE: 'Commerciale',
  PEDAGOGIQUE: 'Pédagogique',
  UNIVERSITE: 'Université',
  INPP: 'INPP',
  CENTRE_FORMATION: 'Centre de formation',
  AUTRE: 'Autre',
}

function canManageOrientation(role?: UserRole | null): boolean {
  return role === 'ADMIN' || role === 'SUPER_ADMIN' || role === 'DIRECTOR'
}

function labelCycle(cycle?: string | null): string {
  if (!cycle) return '—'
  return CYCLE_LABELS[cycle] ?? cycle.replace(/_/g, ' ')
}

function labelPathway(code?: string | null): string {
  if (!code) return '—'
  return PATHWAY_LABELS[code] ?? code.replace(/_/g, ' ')
}

function fmtPct(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  return `${Number(value).toFixed(1)} %`
}

function fmtDate(iso?: string | null): string {
  if (!iso) return '—'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleDateString('fr-FR')
}

function termLabel(term: string): string {
  const map: Record<string, string> = {
    T1: '1er trim.',
    T2: '2e trim.',
    T3: '3e trim.',
    S1: '1er sem.',
    S2: '2e sem.',
  }
  return map[term] ?? term
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildLeavingCertificateHtml(
  cert: LeavingCertificateData,
  schoolName: string,
): string {
  const cursusRows = cert.cursus
    .map(
      (t) =>
        `<tr>
          <td>${escapeHtml(t.academicYear)}</td>
          <td>${escapeHtml(termLabel(t.term))}</td>
          <td>${escapeHtml(t.className ?? '—')}</td>
          <td>${escapeHtml(t.optionName ?? '—')}</td>
          <td style="text-align:right">${escapeHtml(fmtPct(t.finalPercentage))}</td>
          <td style="text-align:right">${t.classRank != null ? `${t.classRank}${t.classSize != null ? ` / ${t.classSize}` : ''}` : '—'}</td>
          <td>${escapeHtml(t.decision ?? '—')}</td>
        </tr>`,
    )
    .join('')

  const checks = cert.certificationChecks
    .map(
      (c) =>
        `<li><strong>${escapeHtml(c.code)}</strong> — ${c.ok ? 'OK' : 'À surveiller'} : ${escapeHtml(c.detail)}</li>`,
    )
    .join('')

  const rationale = (cert.orientation.rationale ?? [])
    .map((r) => `<li>${escapeHtml(r)}</li>`)
    .join('')

  const dob = cert.student.dateOfBirth
    ? new Date(cert.student.dateOfBirth).toLocaleDateString('fr-FR')
    : '—'

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>Certificat de fréquentation — ${escapeHtml(cert.student.fullName)}</title>
  <style>
    @page { size: A4; margin: 18mm; }
    body { font-family: "Times New Roman", Georgia, serif; color: #18181b; font-size: 12pt; line-height: 1.45; }
    h1 { font-size: 16pt; text-align: center; margin: 0 0 4pt; text-transform: uppercase; letter-spacing: 0.04em; }
    h2 { font-size: 11pt; margin: 18pt 0 6pt; border-bottom: 1px solid #d4d4d8; padding-bottom: 3pt; }
    .header { text-align: center; margin-bottom: 18pt; }
    .school { font-size: 13pt; font-weight: 700; }
    .muted { color: #52525b; font-size: 10pt; }
    .meta { margin: 12pt 0; }
    .meta p { margin: 2pt 0; }
    table { width: 100%; border-collapse: collapse; font-size: 10pt; margin-top: 6pt; }
    th, td { border: 1px solid #a1a1aa; padding: 4pt 6pt; vertical-align: top; }
    th { background: #f4f4f5; text-align: left; font-size: 9pt; text-transform: uppercase; }
    ul { margin: 4pt 0 0 16pt; padding: 0; }
    .seal { margin-top: 22pt; font-size: 9pt; color: #3f3f46; word-break: break-all; }
    .footer { margin-top: 28pt; display: flex; justify-content: space-between; font-size: 10pt; }
    .sign { width: 40%; text-align: center; }
    .sign .line { margin-top: 42pt; border-top: 1px solid #18181b; padding-top: 4pt; }
    @media print { .no-print { display: none !important; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="school">${escapeHtml(schoolName)}</div>
    <p class="muted">République Démocratique du Congo</p>
    <h1>Certificat de fréquentation</h1>
    <p class="muted">Attestation de sortie / fin de cursus · Année ${escapeHtml(cert.academicYear)}</p>
  </div>

  <div class="meta">
    <p>Je soussigné(e), Directeur / Préfet des études, certifie que :</p>
    <p><strong>${escapeHtml(cert.student.fullName)}</strong></p>
    <p>Matricule : <strong>${escapeHtml(cert.student.matricule)}</strong></p>
    <p>Né(e) le ${escapeHtml(dob)}${cert.student.placeOfBirth ? ` à ${escapeHtml(cert.student.placeOfBirth)}` : ''}</p>
    <p>a fréquenté régulièrement cet établissement${cert.entryYear ? ` depuis ${escapeHtml(cert.entryYear)}` : ''}
      (cycle : ${escapeHtml(labelCycle(cert.currentCycle))}).</p>
    <p>Moyenne globale pluriannuelle : <strong>${escapeHtml(fmtPct(cert.globalAveragePercentage))}</strong></p>
    <p>Conduite moyenne : <strong>${cert.conductAverage != null ? `${cert.conductAverage}/20` : '—'}</strong>
      · Application : <strong>${cert.applicationAverage != null ? `${cert.applicationAverage}/20` : '—'}</strong></p>
  </div>

  <h2>Parcours scolaire</h2>
  <table>
    <thead>
      <tr>
        <th>Année</th><th>Période</th><th>Classe</th><th>Option</th>
        <th>%</th><th>Rang</th><th>Décision</th>
      </tr>
    </thead>
    <tbody>${cursusRows || '<tr><td colspan="7">Aucun trimestre archivé</td></tr>'}</tbody>
  </table>

  <h2>Orientation recommandée</h2>
  <p>Option / filière : <strong>${escapeHtml(cert.orientation.suggestedOption ?? 'Non déterminée')}</strong>
    (${escapeHtml(labelPathway(cert.orientation.suggestedPathway ?? cert.orientation.suggestedPathwayCode))})</p>
  <p>Poursuite : <strong>${escapeHtml(labelPathway(cert.orientation.postSecondaryPathway ?? cert.orientation.postSecondaryPathwayCode))}</strong>
    · Confiance : ${escapeHtml(confidenceDisplay(cert.orientation.confidence))}</p>
  ${rationale ? `<ul>${rationale}</ul>` : ''}

  <h2>Contrôles de certification</h2>
  <ul>${checks || '<li>Aucun contrôle</li>'}</ul>

  <div class="seal">
    <div>N° certificat : ${cert.certificateId} · UUID : ${escapeHtml(cert.uuid)}</div>
    <div>Statut : ${escapeHtml(cert.validationStatus)} · Émis le ${escapeHtml(fmtDate(cert.generatedAt))}</div>
    <div>Jeton de vérification : ${escapeHtml(cert.verifyToken)}</div>
    <div>Empreinte : ${escapeHtml(cert.securityHash)}</div>
  </div>

  <div class="footer">
    <div class="sign"><div class="line">Cachet de l'établissement</div></div>
    <div class="sign"><div class="line">Signature du Directeur / Préfet</div></div>
  </div>
</body>
</html>`
}

function openPrintWindow(html: string): void {
  const win = window.open('', '_blank', 'noopener,noreferrer,width=900,height=1000')
  if (!win) {
    throw new Error('Fenêtre d’impression bloquée par le navigateur.')
  }
  win.document.open()
  win.document.write(html)
  win.document.close()
  win.focus()
  setTimeout(() => {
    win.print()
  }, 250)
}

function confidenceDisplay(value?: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—'
  const pct = value <= 1 ? value * 100 : value
  return `${pct.toFixed(0)} %`
}

export function StudentAdministrativeCareerPanel({
  studentId,
  studentName,
  schoolName = 'Établissement scolaire',
}: Props) {
  const toast = useToast()
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const canWrite = canManageOrientation(user?.role)
  const printAnchorRef = useRef<HTMLDivElement | null>(null)

  const [latestOrientation, setLatestOrientation] =
    useState<OrientationRecommendation | null>(null)
  const [certificate, setCertificate] = useState<LeavingCertificateData | null>(null)
  const [persistValidated, setPersistValidated] = useState(false)

  const queryKey = useMemo(
    () => ['admin', 'students', studentId, 'career-profile'] as const,
    [studentId],
  )

  const careerQuery = useQuery({
    queryKey,
    queryFn: () => studentOrientationApi.getCareerProfile(studentId),
    enabled: studentId > 0,
    staleTime: 30_000,
  })

  const orientMutation = useMutation({
    mutationFn: () => studentOrientationApi.generateOrientation(studentId),
    onSuccess: async (data) => {
      setLatestOrientation(data)
      toast.success('Orientation calculée', data.suggestedOption ?? 'Profil mis à jour')
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error('Orientation impossible', getApiErrorMessage(err)),
  })

  const certMutation = useMutation({
    mutationFn: () =>
      studentOrientationApi.issueLeavingCertificate(studentId, { persistValidated }),
    onSuccess: async (data) => {
      setCertificate(data)
      toast.success(
        persistValidated ? 'Certificat validé' : 'Certificat généré (brouillon)',
        `N° ${data.certificateId}`,
      )
      await queryClient.invalidateQueries({ queryKey })
    },
    onError: (err) => toast.error('Certificat impossible', getApiErrorMessage(err)),
  })

  const history = careerQuery.data?.history
  const profile = careerQuery.data?.profile
  const discipline = careerQuery.data?.discipline
  const orientationView = latestOrientation
  const suggestedOption =
    orientationView?.suggestedOption ?? profile?.suggestedOption ?? null
  const suggestedPathway =
    orientationView?.suggestedPathway ??
    orientationView?.suggestedPathwayCode ??
    profile?.suggestedPathway ??
    profile?.suggestedPathwayCode ??
    null
  const confidence =
    orientationView?.confidence ?? profile?.orientationConfidence ?? null
  const currentCycle =
    orientationView?.currentCycle ?? profile?.currentCycle ?? null
  const rationale =
    orientationView?.rationale ??
    (profile?.metadata &&
    typeof profile.metadata === 'object' &&
    Array.isArray((profile.metadata as { rationale?: unknown }).rationale)
      ? ((profile.metadata as { rationale: string[] }).rationale)
      : [])

  function handlePrintCertificate() {
    if (!certificate) return
    try {
      openPrintWindow(buildLeavingCertificateHtml(certificate, schoolName))
    } catch (err) {
      toast.error('Impression impossible', getApiErrorMessage(err))
    }
  }

  function handleDownloadCertificate() {
    if (!certificate) return
    const html = buildLeavingCertificateHtml(certificate, schoolName)
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' })
    const safeMat = certificate.student.matricule.replace(/[^a-zA-Z0-9_-]/g, '_')
    triggerBlobDownload(blob, `certificat-frequentation-${safeMat}.html`)
    toast.success('Fichier téléchargé', 'Ouvrez-le puis imprimez en PDF si besoin.')
  }

  return (
    <div
      id="administrative-career"
      className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 space-y-5"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
            <Briefcase size={14} className="text-indigo-600" />
            Administratif &amp; carrière
          </h2>
          <p className="text-xs text-zinc-500 mt-1">
            Fiche d&apos;orientation, profil carrière et certificat de fréquentation
            {studentName ? ` — ${studentName}` : ''}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void careerQuery.refetch()}
          className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-50"
          title="Actualiser"
        >
          <RefreshCw size={13} className={careerQuery.isFetching ? 'animate-spin' : ''} />
        </button>
      </div>

      {careerQuery.isLoading ? (
        <p className="text-sm text-zinc-400 flex items-center gap-2">
          <Loader2 size={14} className="animate-spin" /> Chargement du profil…
        </p>
      ) : careerQuery.isError ? (
        <p className="text-sm text-rose-600">
          {getApiErrorMessage(careerQuery.error) || 'Profil carrière indisponible.'}
        </p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatTile
              label="Cycle actuel"
              value={labelCycle(currentCycle)}
            />
            <StatTile
              label="Option recommandée"
              value={suggestedOption ?? 'Non calculée'}
              emphasize
            />
            <StatTile
              label="Confiance"
              value={confidenceDisplay(confidence)}
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Filière</p>
              <p className="text-sm font-medium text-zinc-800">{labelPathway(suggestedPathway)}</p>
              {orientationView?.postSecondaryPathway || orientationView?.postSecondaryPathwayCode ? (
                <p className="text-xs text-zinc-500 mt-1">
                  Poursuite :{' '}
                  {labelPathway(
                    orientationView.postSecondaryPathway ??
                      orientationView.postSecondaryPathwayCode,
                  )}
                </p>
              ) : null}
              {profile?.entryYear ? (
                <p className="text-xs text-zinc-500 mt-1">Entrée : {profile.entryYear}</p>
              ) : null}
              {profile?.lastComputedAt ? (
                <p className="text-xs text-zinc-400 mt-1">
                  Dernier calcul : {fmtDate(profile.lastComputedAt)}
                </p>
              ) : null}
            </div>
            <div className="rounded-lg border border-zinc-100 bg-zinc-50/70 px-3 py-2.5">
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1">Discipline</p>
              <p className="text-sm text-zinc-800">
                Conduite{' '}
                <span className="font-semibold">
                  {discipline?.averageConductNote != null
                    ? `${discipline.averageConductNote}/20`
                    : '—'}
                </span>
                {' · '}
                Application{' '}
                <span className="font-semibold">
                  {discipline?.averageApplicationNote != null
                    ? `${discipline.averageApplicationNote}/20`
                    : '—'}
                </span>
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Absences : {discipline?.totalAbsences ?? 0}
                {discipline?.unjustifiedAbsences
                  ? ` (${discipline.unjustifiedAbsences} NJ)`
                  : ''}
                {' · '}
                Sanctions : {discipline?.sanctionCount ?? 0}
                {discipline?.unresolvedSanctionCount
                  ? ` (${discipline.unresolvedSanctionCount} ouvertes)`
                  : ''}
              </p>
              <p className="text-xs text-zinc-500 mt-1">
                Moyenne globale : {fmtPct(history?.globalAveragePercentage)}
                {history?.yearsCovered?.length
                  ? ` · ${history.yearsCovered.length} année(s)`
                  : ''}
              </p>
            </div>
          </div>

          {rationale.length > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1.5">
                Recommandations
              </p>
              <ul className="space-y-1">
                {rationale.map((line, i) => (
                  <li key={`${i}-${line.slice(0, 24)}`} className="text-sm text-zinc-700 flex gap-2">
                    <span className="text-indigo-400 mt-1.5 shrink-0">•</span>
                    <span>{line}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {(orientationView?.clusterScores?.length ?? 0) > 0 && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1.5">
                Scores par filière
              </p>
              <div className="overflow-x-auto rounded-lg border border-zinc-100">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wide">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Option</th>
                      <th className="text-right px-3 py-2 font-medium">Score</th>
                      <th className="text-right px-3 py-2 font-medium">Moy.</th>
                      <th className="text-right px-3 py-2 font-medium">N</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {orientationView!.clusterScores.map((c) => (
                      <tr key={c.code}>
                        <td className="px-3 py-2 text-zinc-800">{c.optionLabel}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {c.score.toFixed(1)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-700">
                          {fmtPct(c.averagePercentage)}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-500">
                          {c.sampleCount}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-1.5">
              Historique d&apos;orientation (trimestres)
            </p>
            {!history?.terms?.length ? (
              <p className="text-sm text-zinc-400">
                Aucun trimestre délibéré / archivé pour cet élève.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-zinc-100 max-h-56 overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-zinc-50 text-zinc-500 uppercase tracking-wide sticky top-0">
                    <tr>
                      <th className="text-left px-3 py-2 font-medium">Année</th>
                      <th className="text-left px-3 py-2 font-medium">Pér.</th>
                      <th className="text-left px-3 py-2 font-medium">Classe</th>
                      <th className="text-left px-3 py-2 font-medium">Option</th>
                      <th className="text-right px-3 py-2 font-medium">%</th>
                      <th className="text-left px-3 py-2 font-medium">Décision</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-50">
                    {history.terms.map((t, idx) => (
                      <tr key={`${t.academicYear}-${t.term}-${t.deliberationId ?? idx}`}>
                        <td className="px-3 py-2 text-zinc-800">{t.academicYear}</td>
                        <td className="px-3 py-2 text-zinc-600">{termLabel(t.term)}</td>
                        <td className="px-3 py-2 text-zinc-700">{t.className ?? '—'}</td>
                        <td className="px-3 py-2 text-zinc-700">{t.optionName ?? '—'}</td>
                        <td className="px-3 py-2 text-right tabular-nums text-zinc-800">
                          {fmtPct(t.finalPercentage)}
                        </td>
                        <td className="px-3 py-2 text-zinc-600">{t.decision ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-zinc-100 pt-4">
            <button
              type="button"
              disabled={!canWrite || orientMutation.isPending}
              onClick={() => void orientMutation.mutateAsync()}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
                canWrite
                  ? 'bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50'
                  : 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
              )}
              title={
                canWrite
                  ? 'Recalcule et enregistre le profil carrière'
                  : 'Réservé Admin / Préfet'
              }
            >
              {orientMutation.isPending ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Route size={13} />
              )}
              Recalculer l&apos;orientation
            </button>
          </div>

          <div className="rounded-xl border border-indigo-100 bg-indigo-50/40 p-4 space-y-3">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-semibold text-zinc-800 flex items-center gap-1.5">
                  <FileBadge size={14} className="text-indigo-600" />
                  Certificat de fréquentation
                </h3>
                <p className="text-xs text-zinc-500 mt-0.5">
                  Attestation de sortie scellée (HMAC) — génération officielle.
                </p>
              </div>
              {canWrite && (
                <label className="inline-flex items-center gap-2 text-xs text-zinc-600">
                  <input
                    type="checkbox"
                    checked={persistValidated}
                    onChange={(e) => setPersistValidated(e.target.checked)}
                    className="rounded border-zinc-300"
                  />
                  Valider à l&apos;émission
                </label>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={!canWrite || certMutation.isPending}
                onClick={() => void certMutation.mutateAsync()}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold',
                  canWrite
                    ? 'bg-zinc-900 text-white hover:bg-zinc-800 disabled:opacity-50'
                    : 'bg-zinc-100 text-zinc-400 cursor-not-allowed',
                )}
              >
                {certMutation.isPending ? (
                  <Loader2 size={13} className="animate-spin" />
                ) : (
                  <FileBadge size={13} />
                )}
                Générer le certificat
              </button>
              {certificate && (
                <>
                  <button
                    type="button"
                    onClick={handlePrintCertificate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    <Printer size={13} /> Imprimer
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadCertificate}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
                  >
                    <Download size={13} /> Télécharger
                  </button>
                </>
              )}
            </div>

            {certificate && (
              <div
                ref={printAnchorRef}
                className="rounded-lg border border-zinc-200 bg-white p-4 text-sm space-y-2"
              >
                <p className="font-semibold text-zinc-900">
                  {certificate.student.fullName}{' '}
                  <span className="font-normal text-zinc-500">
                    · {certificate.student.matricule}
                  </span>
                </p>
                <p className="text-xs text-zinc-600">
                  Année {certificate.academicYear}
                  {' · '}
                  Statut{' '}
                  <span
                    className={cn(
                      'font-semibold',
                      certificate.validationStatus === 'VALIDATED'
                        ? 'text-emerald-700'
                        : 'text-amber-700',
                    )}
                  >
                    {certificate.validationStatus}
                  </span>
                  {' · '}
                  N° {certificate.certificateId}
                </p>
                <p className="text-xs text-zinc-600">
                  Orientation : {certificate.orientation.suggestedOption ?? '—'}
                  {' · '}
                  Moyenne : {fmtPct(certificate.globalAveragePercentage)}
                </p>
                <ul className="text-xs text-zinc-500 space-y-0.5">
                  {certificate.certificationChecks.map((c) => (
                    <li key={c.code}>
                      <span className={c.ok ? 'text-emerald-600' : 'text-amber-600'}>
                        {c.ok ? '✓' : '!'}
                      </span>{' '}
                      {c.code} — {c.detail}
                    </li>
                  ))}
                </ul>
                <p className="text-[10px] text-zinc-400 break-all">
                  Vérif. {certificate.verifyToken}
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

function StatTile({
  label,
  value,
  emphasize,
}: {
  label: string
  value: string
  emphasize?: boolean
}) {
  return (
    <div className="rounded-lg border border-zinc-100 bg-zinc-50/80 px-3 py-2.5">
      <p className="text-[11px] uppercase tracking-wide text-zinc-400 mb-0.5">{label}</p>
      <p
        className={cn(
          'text-sm font-semibold truncate',
          emphasize ? 'text-indigo-700' : 'text-zinc-900',
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}
