'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  ClipboardList,
  Download,
  Loader2,
  Play,
  Printer,
  RefreshCw,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { currentAcademicYear } from '@/components/admin/grades/grades-utils'
import { AnomalyPanel } from './anomaly-panel'
import { DeliberationProgressModal } from './progress-modal'
import { DeliberationResultsTable } from './results-table'
import { StudentDetailModal } from './student-detail-modal'
import {
  downloadProcesVerbal,
  downloadSingleBulletinHtml,
  printCertifiedBulletins,
} from './export-utils'
import { toStudentBulletinProps } from './bulletin-mapper'
import { printOfficialBulletin } from './print-bulletin'
import {
  adminDeliberationsApi,
  type BulkJobProgress,
  type DeliberateBatchSyncResult,
  type DeliberationBulletinRow,
  type GradeAnomalyReport,
} from '@/lib/admin/api/deliberations.api'
import { adminGradesApi } from '@/lib/admin/api/grades.api'
import { getApiErrorMessage } from '@/lib/api/client'
import { getAuthSchoolId } from '@/lib/api/auth-storage'
import { useAuth } from '@/providers/auth-provider'
import { TERM_LABELS, type SchoolTerm } from '@/types/teacher-grades'
import { cn } from '@/lib/utils'

const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]
const PREFET_ROLES = new Set(['ADMIN', 'SUPER_ADMIN', 'DIRECTOR'])

function isSyncResult(value: unknown): value is DeliberateBatchSyncResult {
  return (
    !!value &&
    typeof value === 'object' &&
    (value as { mode?: string }).mode === 'sync' &&
    Array.isArray((value as DeliberateBatchSyncResult).bulletins)
  )
}

export function DeliberationsWorkspace() {
  const { user } = useAuth()
  const schoolId = useMemo(() => {
    const fromUser = user?.schoolId != null ? Number(user.schoolId) : 0
    if (fromUser > 0) return fromUser
    const fromStorage = Number(getAuthSchoolId() ?? 0)
    return fromStorage > 0 ? fromStorage : 0
  }, [user?.schoolId])

  const canValidate = PREFET_ROLES.has(user?.role ?? '')

  const [academicYear, setAcademicYear] = useState(currentAcademicYear())
  const [classId, setClassId] = useState<number | ''>('')
  const [term, setTerm] = useState<SchoolTerm>('FIRST_TERM')

  const [bulletins, setBulletins] = useState<DeliberationBulletinRow[]>([])
  const [anomalyReport, setAnomalyReport] = useState<GradeAnomalyReport | null>(
    null,
  )
  const [stats, setStats] = useState<{
    processed: number
    skippedNoGrades: number
  } | null>(null)

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [confirmValidate, setConfirmValidate] = useState(false)
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(
    null,
  )

  const [progressOpen, setProgressOpen] = useState(false)
  const [progress, setProgress] = useState<BulkJobProgress | null>(null)
  const [progressMode, setProgressMode] = useState<'deliberation' | 'zip'>(
    'deliberation',
  )
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const contextQuery = useQuery({
    queryKey: ['admin', 'grades', 'context'],
    queryFn: () => adminGradesApi.context(),
  })

  const capabilitiesQuery = useQuery({
    queryKey: ['admin', 'deliberations', 'capabilities', schoolId],
    queryFn: () => adminDeliberationsApi.capabilities(schoolId || undefined),
    enabled: schoolId > 0,
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const printingEnabled =
    capabilitiesQuery.data?.isBulletinPrintingEnabled !== false
  const zipEnabled = capabilitiesQuery.data?.isZipExportEnabled === true

  const [zipBusy, setZipBusy] = useState(false)

  const classes = contextQuery.data?.classes ?? []
  const selectedClass = classes.find((c) => c.id === classId)
  const selectedStudent =
    bulletins.find((b) => b.meta.studentId === selectedStudentId) ?? null

  const exportCtx = useMemo(
    () => ({
      className: selectedClass?.name ?? `Classe ${classId || ''}`,
      academicYear,
      termLabel: TERM_LABELS[term],
    }),
    [selectedClass?.name, classId, academicYear, term],
  )

  const hasResults = bulletins.length > 0
  const flaggedCount = anomalyReport?.flaggedCount ?? 0
  const validatedCount = bulletins.filter(
    (b) => b.deliberation.validatedAt != null,
  ).length

  const stopPolling = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => () => stopPolling(), [stopPolling])

  const applySyncResult = useCallback((result: DeliberateBatchSyncResult) => {
    setBulletins(result.bulletins)
    setAnomalyReport(result.anomalyReport)
    setStats({
      processed: result.processed,
      skippedNoGrades: result.skippedNoGrades,
    })
  }, [])

  const loadSyncSnapshot = useCallback(
    async (opts: { validate?: boolean } = {}) => {
      if (!schoolId || classId === '') {
        throw new Error('Veuillez sélectionner une classe.')
      }
      const result = await adminDeliberationsApi.deliberateBatch({
        schoolId,
        classId: Number(classId),
        academicYear,
        term,
        async: false,
        validate: opts.validate === true,
      })
      if (!isSyncResult(result)) {
        throw new Error('Impossible de charger les résultats de la classe.')
      }
      applySyncResult(result)
      return result
    },
    [schoolId, classId, academicYear, term, applySyncResult],
  )

  const pollJob = useCallback(
    (
      jobId: string,
      options?: {
        mode?: 'deliberation' | 'zip'
        onCompleted?: (progress: BulkJobProgress) => Promise<void> | void
      },
    ) => {
      stopPolling()
      setProgressMode(options?.mode ?? 'deliberation')
      setProgressOpen(true)
      setProgress(null)

      const tick = async () => {
        try {
          const p = await adminDeliberationsApi.jobProgress(jobId)
          setProgress(p)
          if (p.status === 'completed') {
            stopPolling()
            if (options?.onCompleted) {
              await options.onCompleted(p)
            } else {
              const snapshot = await loadSyncSnapshot()
              setSuccess(
                snapshot.anomalyReport.flaggedCount > 0
                  ? `Délibération terminée. ${snapshot.anomalyReport.flaggedCount} dossier(s) nécessitent un contrôle de cohérence avant validation.`
                  : `Délibération terminée pour ${snapshot.processed} élève(s). Vous pouvez procéder à la validation officielle.`,
              )
            }
            setBusy(false)
            setZipBusy(false)
          } else if (p.status === 'failed') {
            stopPolling()
            setError(
              options?.mode === 'zip'
                ? 'La génération de l’archive ZIP a échoué. Vérifiez les notes et les droits SuperAdmin, puis réessayez.'
                : 'Le traitement de la classe n’a pas pu aboutir. Vérifiez les notes puis réessayez.',
            )
            setBusy(false)
            setZipBusy(false)
          }
        } catch (e) {
          stopPolling()
          setError(getApiErrorMessage(e))
          setBusy(false)
          setZipBusy(false)
        }
      }

      void tick()
      pollRef.current = setInterval(() => {
        void tick()
      }, 1500)
    },
    [loadSyncSnapshot, stopPolling],
  )

  const runBatch = async () => {
    setError('')
    setSuccess('')
    if (!schoolId) {
      setError('Établissement non identifié. Veuillez vous reconnecter.')
      return
    }
    if (classId === '') {
      setError('Sélectionnez une classe pour lancer la délibération.')
      return
    }

    setBusy(true)
    try {
      const enqueued = await adminDeliberationsApi.deliberateBatch({
        schoolId,
        classId: Number(classId),
        academicYear,
        term,
        async: true,
        validate: false,
      })

      if (enqueued.mode === 'async' && enqueued.queued && enqueued.jobId) {
        pollJob(enqueued.jobId)
        return
      }

      const sync = await loadSyncSnapshot()
      setSuccess(
        sync.anomalyReport.flaggedCount > 0
          ? `Délibération terminée. ${sync.anomalyReport.flaggedCount} dossier(s) à contrôler avant validation.`
          : `Délibération terminée pour ${sync.processed} élève(s).`,
      )
      setBusy(false)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setBusy(false)
      setProgressOpen(false)
    }
  }

  const runValidate = async () => {
    setConfirmValidate(false)
    setError('')
    setSuccess('')
    if (!schoolId || classId === '') {
      setError('Sélectionnez une classe avant de valider.')
      return
    }
    if (!canValidate) {
      setError(
        'Seuls le Préfet des études, le Directeur ou l’Administrateur peuvent valider officiellement.',
      )
      return
    }

    setBusy(true)
    try {
      const result = await adminDeliberationsApi.validateBatch({
        schoolId,
        classId: Number(classId),
        academicYear,
        term,
        async: false,
      })
      if (!isSyncResult(result)) {
        if (result.mode === 'async' && result.jobId && result.queued) {
          pollJob(result.jobId)
          return
        }
        throw new Error('La validation n’a pas pu être confirmée.')
      }
      applySyncResult(result)
      setSuccess(
        'Délibération validée officiellement. Les décisions sont désormais verrouillées et les bulletins certifiés.',
      )
    } catch (e) {
      setError(getApiErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  const handleDownloadPv = () => {
    setError('')
    if (!hasResults) {
      setError('Lancez d’abord une délibération pour générer le procès-verbal.')
      return
    }
    try {
      downloadProcesVerbal(bulletins, exportCtx)
      setSuccess('Procès-verbal téléchargé.')
    } catch (e) {
      setError(getApiErrorMessage(e))
    }
  }

  const handlePrintBulletins = () => {
    setError('')
    if (!printingEnabled) {
      setError(
        'L’impression des bulletins est désactivée pour cet établissement. Contactez le support plateforme.',
      )
      return
    }
    if (!hasResults) {
      setError('Aucun bulletin à imprimer — lancez d’abord la délibération.')
      return
    }
    try {
      printCertifiedBulletins(bulletins, exportCtx)
    } catch (e) {
      setError(e instanceof Error ? e.message : getApiErrorMessage(e))
    }
  }

  const handlePrintStudent = (studentId: number) => {
    setError('')
    if (!printingEnabled) {
      setError('Impression des bulletins désactivée par la plateforme.')
      return
    }
    const row = bulletins.find((b) => b.meta.studentId === studentId)
    if (!row) return
    try {
      printOfficialBulletin(
        toStudentBulletinProps(row, {
          schoolName: row.school?.name ?? undefined,
        }),
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : getApiErrorMessage(e))
    }
  }

  const handleDownloadStudent = (studentId: number) => {
    setError('')
    if (!printingEnabled) {
      setError('Téléchargement des bulletins désactivé par la plateforme.')
      return
    }
    const row = bulletins.find((b) => b.meta.studentId === studentId)
    if (!row) return
    downloadSingleBulletinHtml(row, exportCtx)
  }

  const handleZipExport = async () => {
    setError('')
    setSuccess('')
    if (!zipEnabled) {
      setError(
        'L’export ZIP groupé n’est pas autorisé pour cet établissement. Un SuperAdmin doit activer cette capacité.',
      )
      return
    }
    if (!schoolId || classId === '') {
      setError('Sélectionnez une classe avant l’export ZIP.')
      return
    }
    setZipBusy(true)
    try {
      const result = await adminDeliberationsApi.exportClassZip({
        schoolId,
        classId: Number(classId),
        academicYear,
        term,
        async: true,
      })

      if (result.mode === 'async' && result.jobId) {
        pollJob(result.jobId, {
          mode: 'zip',
          onCompleted: async () => {
            const downloaded = await adminDeliberationsApi.downloadZipArtifact(
              result.jobId,
            )
            setSuccess(
              downloaded.count > 0
                ? `Archive ZIP téléchargée (${downloaded.count} bulletin(s)).`
                : `Archive ZIP téléchargée (${downloaded.filename}).`,
            )
            setProgressOpen(false)
            void capabilitiesQuery.refetch()
          },
        })
        return
      }

      if (result.mode === 'sync') {
        setSuccess(
          result.count > 0
            ? `Archive ZIP téléchargée (${result.count} bulletin(s)).`
            : 'Archive ZIP téléchargée.',
        )
      }
      void capabilitiesQuery.refetch()
      setZipBusy(false)
    } catch (e) {
      setError(getApiErrorMessage(e))
      setZipBusy(false)
      setProgressOpen(false)
    }
  }

  return (
    <>
      <AdminModuleHero
        eyebrow="Conseil de classe"
        title="Délibération de classe"
        subtitle="Établissez les rangs, contrôlez l’harmonisation des cotations, puis validez officiellement les décisions"
        actions={
          <button
            type="button"
            onClick={() => void contextQuery.refetch()}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15"
          >
            <RefreshCw
              size={14}
              className={cn(contextQuery.isFetching && 'animate-spin')}
            />
            Actualiser
          </button>
        }
        metrics={[
          {
            label: 'Élèves délibérés',
            value: stats?.processed ?? (hasResults ? bulletins.length : '—'),
            icon: Users,
          },
          {
            label: 'Dossiers à contrôler',
            value: flaggedCount || '—',
            icon: ClipboardList,
            valueClassName: flaggedCount > 0 ? 'text-amber-300' : 'text-white',
          },
          {
            label: 'Décisions validées',
            value: hasResults ? validatedCount : '—',
            icon: ShieldCheck,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Année académique
              </span>
              <input
                value={academicYear}
                onChange={(e) => setAcademicYear(e.target.value)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f]"
                placeholder="2025-2026"
              />
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Classe
              </span>
              <select
                value={classId === '' ? '' : String(classId)}
                onChange={(e) =>
                  setClassId(e.target.value ? Number(e.target.value) : '')
                }
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f]"
              >
                <option value="">Sélectionner…</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                    {c.studentCount != null ? ` (${c.studentCount})` : ''}
                  </option>
                ))}
              </select>
            </label>

            <label className="block">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Trimestre
              </span>
              <select
                value={term}
                onChange={(e) => setTerm(e.target.value as SchoolTerm)}
                className="mt-1.5 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-[#1e3a5f]/25 focus:border-[#1e3a5f]"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>
                    {TERM_LABELS[t]}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-col justify-end">
              <button
                type="button"
                disabled={busy || classId === '' || !schoolId}
                onClick={() => void runBatch()}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#1e3a5f] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#162d4a] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {busy && !progressOpen ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} />
                )}
                Lancer la délibération
              </button>
            </div>
          </div>

          {selectedClass ? (
            <p className="mt-3 text-xs text-slate-500">
              Classe sélectionnée :{' '}
              <span className="font-medium text-slate-700">
                {selectedClass.name}
              </span>
              {' · '}
              {TERM_LABELS[term]} · {academicYear}
            </p>
          ) : null}
        </section>

        {/* Exports */}
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <p className="text-xs text-slate-500 sm:mr-auto">
                Documents officiels du conseil de classe
                {!printingEnabled ? (
                  <span className="ml-2 text-amber-700 font-medium">
                    · Impression coupée par la plateforme
                  </span>
                ) : null}
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={!hasResults}
                  onClick={handleDownloadPv}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Download size={15} className="text-[#1e3a5f]" />
                  Télécharger le Procès-Verbal de délibération
                </button>
                <button
                  type="button"
                  disabled={!hasResults || !printingEnabled}
                  onClick={handlePrintBulletins}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-45 disabled:cursor-not-allowed"
                >
                  <Printer size={15} className="text-[#1e3a5f]" />
                  Imprimer les bulletins certifiés
                </button>
                <button
                  type="button"
                  disabled={
                    !zipEnabled ||
                    zipBusy ||
                    classId === '' ||
                    !schoolId
                  }
                  onClick={() => void handleZipExport()}
                  title={
                    zipEnabled
                      ? 'Télécharger l’archive ZIP de la classe'
                      : 'Export ZIP non autorisé — activation SuperAdmin requise'
                  }
                  className={cn(
                    'inline-flex items-center gap-2 rounded-xl px-3.5 py-2 text-sm font-semibold disabled:opacity-45 disabled:cursor-not-allowed',
                    zipEnabled
                      ? 'bg-[#1e3a5f] text-white hover:bg-[#162d4a]'
                      : 'border border-slate-200 bg-slate-100 text-slate-500',
                  )}
                >
                  {zipBusy ? (
                    <Loader2 size={15} className="animate-spin" />
                  ) : (
                    <Archive size={15} />
                  )}
                  Export ZIP de la classe
                </button>
              </div>
            </div>
            {!zipEnabled ? (
              <p className="text-[11px] text-slate-500">
                L’export ZIP groupé nécessite une autorisation explicite du
                SuperAdmin pour cet établissement.
              </p>
            ) : null}
          </div>
        </section>

        {error ? (
          <div
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            role="alert"
          >
            {error}
          </div>
        ) : null}
        {success ? (
          <div
            className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900"
            role="status"
          >
            {success}
          </div>
        ) : null}

        {anomalyReport ? (
          <AnomalyPanel
            report={anomalyReport}
            bulletins={bulletins}
            onSelectStudent={setSelectedStudentId}
          />
        ) : null}

        <DeliberationResultsTable
          bulletins={bulletins}
          printingEnabled={printingEnabled}
          onSelectStudent={setSelectedStudentId}
          onPrintStudent={handlePrintStudent}
          onDownloadStudent={handleDownloadStudent}
        />

        {/* Validation Préfet — zone sécurisée */}
        <section className="rounded-2xl border-2 border-[#1e3a5f]/20 bg-gradient-to-br from-[#f8fafc] via-white to-[#eef2ff] p-5 shadow-sm">
          <div className="flex flex-col lg:flex-row lg:items-center gap-5">
            <div className="flex items-start gap-3 min-w-0 flex-1">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#1e3a5f] text-white shadow-md ring-4 ring-[#1e3a5f]/10">
                <ShieldCheck size={20} />
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-widest text-[#1e3a5f]/70">
                  Acte officiel
                </p>
                <h2 className="text-base font-semibold text-slate-900 mt-0.5">
                  Validation officielle du Préfet des études
                </h2>
                <p className="mt-1.5 text-sm text-slate-600 leading-relaxed max-w-2xl">
                  Cette action verrouille les décisions du conseil de classe et
                  certifie les bulletins. Contrôlez d’abord l’harmonisation des
                  cotations, puis confirmez explicitement.
                </p>
                {!canValidate ? (
                  <p className="mt-2 text-xs font-medium text-amber-800">
                    Votre profil ne permet pas d’engager la validation
                    officielle.
                  </p>
                ) : null}
              </div>
            </div>
            <button
              type="button"
              disabled={busy || !canValidate || classId === '' || !schoolId}
              onClick={() => setConfirmValidate(true)}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold shadow-md disabled:opacity-50 disabled:cursor-not-allowed shrink-0',
                canValidate
                  ? 'bg-emerald-700 text-white hover:bg-emerald-800 ring-2 ring-emerald-700/20'
                  : 'bg-slate-200 text-slate-500',
              )}
            >
              <ShieldCheck size={17} />
              Valider officiellement la délibération
            </button>
          </div>
        </section>
      </div>

      <DeliberationProgressModal
        open={progressOpen}
        progress={progress}
        className={selectedClass?.name}
        mode={progressMode}
        onClose={() => {
          if (
            progress?.status === 'completed' ||
            progress?.status === 'failed'
          ) {
            setProgressOpen(false)
          }
        }}
      />

      <StudentDetailModal
        open={selectedStudentId != null}
        row={selectedStudent}
        onClose={() => setSelectedStudentId(null)}
      />

      <ConfirmDialog
        open={confirmValidate}
        title="Confirmer la validation officielle ?"
        description="Vous allez verrouiller les décisions de délibération pour toute la classe. Cette action engage la responsabilité du Préfet des études et ne doit pas être réalisée par erreur."
        impact={[
          `Classe : ${selectedClass?.name ?? '—'}`,
          `Année : ${academicYear}`,
          `Période : ${TERM_LABELS[term]}`,
          flaggedCount > 0
            ? `${flaggedCount} dossier(s) encore signalé(s) pour contrôle de cohérence`
            : 'Aucun écart de cotation signalé',
          `${bulletins.length || 0} élève(s) concernés`,
        ]}
        confirmLabel="Oui, valider et verrouiller"
        cancelLabel="Annuler"
        variant="danger"
        loading={busy}
        onConfirm={() => void runValidate()}
        onCancel={() => setConfirmValidate(false)}
      />
    </>
  )
}
