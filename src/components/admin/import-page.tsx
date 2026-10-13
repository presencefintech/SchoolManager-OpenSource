'use client'

import { useState, useCallback } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Upload, CheckCircle2, XCircle, AlertCircle,
  FileSpreadsheet, RefreshCw, RotateCcw, Building2, Download,
} from 'lucide-react'
import { useImportUpload, useImportStatus } from '@/lib/hooks/use-admin'
import { importApi } from '@/lib/admin/api'
import { superAdminApi } from '@/lib/superAdmin/api'
import { queryKeys } from '@/lib/query/keys'
import type { ImportType } from '@/lib/admin/api'
import { useAuth } from '@/providers/auth-provider'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { StudentImportWizard } from '@/components/admin/student-import-wizard'

const IMPORT_TYPES: {
  id: ImportType
  label: string
  desc: string
  required: string[]
  optional: string[]
}[] = [
  {
    id: 'students',
    label: 'Élèves',
    desc: 'Liste d’inscription : nom et classe suffisent. Analyse à voyants avant import',
    required: ['nom', 'classe'],
    optional: ['postnom', 'prenom', 'genre', 'dateNaissance', 'lieuNaissance', 'telephone', 'remarque', 'matricule', 'montantTotal', 'montantPaye'],
  },
  {
    id: 'parents',
    label: 'Parents',
    desc: 'Associer des parents à des élèves existants',
    required: ['prenom', 'nom', 'telephone', 'matriculeEleve'],
    optional: ['email', 'lien'],
  },
  {
    id: 'structure',
    label: 'Structure',
    desc: 'Sections, options et classes — à importer en premier',
    required: ['section', 'classe', 'niveau'],
    optional: ['option (défaut : Général)', 'anneeScolaire (défaut : année en cours)'],
  },
  {
    id: 'fees',
    label: 'Frais',
    desc: 'Catalogue des frais scolaires',
    required: ['categorie', 'montant'],
    optional: ['classe', 'periodicite', 'description'],
  },
]

const STATUS_CFG = {
  PENDING:    { label: 'En attente',  color: 'text-zinc-500',    bg: 'bg-zinc-100',     bar: 'bg-zinc-400' },
  PROCESSING: { label: 'En cours…',   color: 'text-blue-600',    bg: 'bg-blue-50',      bar: 'bg-blue-500' },
  COMPLETED:  { label: 'Terminé',     color: 'text-emerald-700', bg: 'bg-emerald-50',   bar: 'bg-emerald-500' },
  PARTIAL:    { label: 'Partiel',     color: 'text-amber-700',   bg: 'bg-amber-50',     bar: 'bg-amber-400' },
  FAILED:     { label: 'Échoué',      color: 'text-red-700',     bg: 'bg-red-50',       bar: 'bg-red-500' },
}

export function ImportPage() {
  const { user } = useAuth()
  const isSuperAdmin = user?.role === 'SUPER_ADMIN'

  const [type, setType] = useState<ImportType>('students')
  const [jobId, setJobId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [selectedSchoolId, setSelectedSchoolId] = useState<number | null>(null)
  const [preview, setPreview] = useState<{
    valid: number
    errors: { row: number; field?: string; message: string; code?: string }[]
    skippedExamples?: number
  } | null>(null)
  const [previewing, setPreviewing] = useState(false)

  const { data: schools = [] } = useQuery({
    queryKey: queryKeys.superadmin.schools({ list: 'all' }),
    queryFn: async () => {
      const { rows } = await superAdminApi.getSchools({ take: 200 })
      return rows
    },
    enabled: isSuperAdmin,
    staleTime: 60_000,
  })

  const upload = useImportUpload()
  const { data: job } = useImportStatus(jobId)

  const typeInfo = IMPORT_TYPES.find(t => t.id === type)!
  const status = job?.status
  const isDone = !!status && ['COMPLETED', 'PARTIAL', 'FAILED'].includes(status)
  const isProcessing = !!jobId && !isDone
  const statusCfg = status ? STATUS_CFG[status] : null

  const handleFile = useCallback(
    async (file: File) => {
      setFileError(null)
      if (!file.name.match(/\.(xlsx|csv)$/i)) {
        setFileError('Format invalide — uniquement .xlsx ou .csv')
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setFileError('Fichier trop volumineux — maximum 10 Mo')
        return
      }
      setJobId(null)
      setPreview(null)
      setPreviewing(true)
      try {
        const previewResult = await importApi.preview(
          type,
          file,
          isSuperAdmin && selectedSchoolId ? selectedSchoolId : undefined,
        )
        setPreview(previewResult)
        if ((previewResult.errors?.length ?? 0) > 0 && (previewResult.valid ?? 0) === 0) {
          setFileError('Prévisualisation : aucune ligne valide — corrigez le fichier avant import.')
          return
        }
        const res = await upload.mutateAsync({
          type,
          file,
          schoolId: isSuperAdmin && selectedSchoolId ? selectedSchoolId : undefined,
        })
        setJobId(res.jobId)
      } catch (err: unknown) {
        setFileError(getApiErrorMessage(err))
      } finally {
        setPreviewing(false)
      }
    },
    [type, upload, isSuperAdmin, selectedSchoolId],
  )

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragOver(false)
      const file = e.dataTransfer.files[0]
      if (file) handleFile(file)
    },
    [handleFile],
  )

  const reset = () => {
    setJobId(null)
    setFileError(null)
    setPreview(null)
    upload.reset()
  }

  const canUpload = !isSuperAdmin || selectedSchoolId !== null

  return (
    <div className="px-8 py-8 space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Import de données</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          Préférez le modèle Excel (.xlsx). Un CSV Excel français (point-virgule) est aussi accepté.
        </p>
      </div>

      <div className="grid grid-cols-4 gap-3">
        {IMPORT_TYPES.map(t => {
          const active = type === t.id
          return (
            <button
              key={t.id}
              onClick={() => { setType(t.id); reset() }}
              className={cn(
                'p-4 rounded-2xl border text-left transition-all',
                active
                  ? 'border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 shadow-sm'
                  : 'border-zinc-200 bg-white hover:border-zinc-300 hover:bg-zinc-50/70',
              )}
            >
              <p className={cn('text-sm font-semibold', active ? 'text-emerald-700' : 'text-zinc-800')}>
                {t.label}
              </p>
              <p className="text-[11px] text-zinc-400 mt-1 leading-snug">{t.desc}</p>
            </button>
          )
        })}
      </div>

      {isSuperAdmin && (
        <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
          <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3 flex items-center gap-1.5">
            <Building2 size={11} />
            Établissement cible
          </p>
          <select
            value={selectedSchoolId ?? ''}
            onChange={e => setSelectedSchoolId(e.target.value ? Number(e.target.value) : null)}
            className={cn(
              'w-full rounded-xl border px-3 py-2 text-sm text-zinc-800 bg-white transition-colors',
              'focus:outline-none focus:ring-2 focus:ring-emerald-300',
              selectedSchoolId ? 'border-emerald-300' : 'border-zinc-200',
            )}
          >
            <option value="">— Choisir un établissement —</option>
            {schools?.map(s => (
              <option key={s.id} value={s.id}>
                {s.name} · {s.city}
              </option>
            ))}
          </select>
          {!selectedSchoolId && (
            <p className="text-[11px] text-amber-500 mt-1.5">
              Sélectionnez un établissement avant d&apos;importer
            </p>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5">
        <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">
          Colonnes attendues — {typeInfo.label}
        </p>
        <div className="flex flex-wrap gap-1.5">
          {typeInfo.required.map(col => (
            <span
              key={col}
              className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-mono border border-emerald-100"
            >
              {col}
            </span>
          ))}
          {typeInfo.optional.map(col => (
            <span
              key={col}
              className="px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-500 text-xs font-mono border border-zinc-200"
            >
              {col}
            </span>
          ))}
        </div>
        {typeInfo.optional.length > 0 && (
          <p className="text-[10px] text-zinc-400 mt-2.5 flex items-center gap-3">
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded bg-emerald-50 border border-emerald-200" />
              Requis
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block w-2.5 h-2.5 rounded bg-zinc-100 border border-zinc-200" />
              Optionnel
            </span>
          </p>
        )}
        <button
          type="button"
          onClick={async () => {
            try {
              const { blob, filename } = await importApi.downloadTemplate(type)
              triggerBlobDownload(blob, filename)
            } catch (err) {
              setFileError(getApiErrorMessage(err))
            }
          }}
          className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
        >
          <Download size={13} />
          Télécharger le modèle Excel ({typeInfo.label})
        </button>
      </div>

      {type === 'students' ? (
        <StudentImportWizard
          schoolId={isSuperAdmin && selectedSchoolId ? selectedSchoolId : undefined}
          canUpload={canUpload}
          studentsHref={isSuperAdmin ? '/super-admin/students' : '/admin/students'}
        />
      ) : (
      <>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        className={cn(
          'bg-white rounded-2xl border-2 border-dashed transition-all p-10 text-center',
          dragOver
            ? 'border-emerald-400 bg-emerald-50/50 scale-[1.01]'
            : fileError
              ? 'border-red-300 bg-red-50/30'
              : 'border-zinc-200 hover:border-zinc-300',
        )}
      >
        <FileSpreadsheet
          size={32}
          className={cn('mx-auto mb-3', dragOver ? 'text-emerald-400' : fileError ? 'text-red-300' : 'text-zinc-300')}
        />

        {fileError ? (
          <p className="text-sm font-medium text-red-600 mb-4">{fileError}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 mb-1">
              Glissez votre fichier ici ou cliquez pour parcourir
            </p>
            <p className="text-xs text-zinc-400 mb-4">
              Prévisualisation puis import — .xlsx ou .csv — 10 Mo max
            </p>
          </>
        )}

        {preview && (
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3 text-left text-sm">
            <p className="font-medium text-zinc-800">
              Prévisualisation : {preview.valid} ligne(s) valide(s)
              {(preview.errors?.length ?? 0) > 0
                ? ` · ${preview.errors.length} erreur(s)`
                : ''}
            </p>
            {(preview.errors?.length ?? 0) > 0 && (
              <ul className="mt-2 max-h-28 overflow-y-auto space-y-1 text-xs text-rose-700">
                {preview.errors.slice(0, 8).map((err, i) => (
                  <li key={`${err.row}-${i}`}>
                    Ligne {err.row}
                    {err.field ? ` · ${err.field}` : ''} : {err.message}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <label
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all shadow-sm',
            upload.isPending || previewing || !canUpload
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : fileError
                ? 'bg-red-100 text-red-700 hover:bg-red-200 cursor-pointer'
                : 'bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer',
          )}
        >
          <Upload size={14} />
          {previewing
            ? 'Prévisualisation…'
            : upload.isPending
            ? 'Envoi en cours…'
            : !canUpload
              ? 'Choisir un établissement d\'abord'
              : fileError
                ? 'Réessayer'
                : 'Choisir un fichier'}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.csv"
            disabled={upload.isPending || previewing || !canUpload}
            onChange={e => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>

      <AnimatePresence>
        {jobId && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                {status === 'COMPLETED' && <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />}
                {status === 'PARTIAL'   && <AlertCircle  size={16} className="text-amber-500 flex-shrink-0" />}
                {status === 'FAILED'    && <XCircle      size={16} className="text-red-500 flex-shrink-0" />}
                {isProcessing           && <RefreshCw    size={16} className="text-blue-500 animate-spin flex-shrink-0" />}
                <span className="text-sm font-semibold text-zinc-800 truncate">
                  {job?.fileName ?? 'Traitement en cours…'}
                </span>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {statusCfg && (
                  <span className={cn('text-xs font-medium px-2.5 py-0.5 rounded-full', statusCfg.color, statusCfg.bg)}>
                    {statusCfg.label}
                  </span>
                )}
                {isDone && (
                  <button
                    onClick={reset}
                    className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                  >
                    <RotateCcw size={12} />
                    Nouvel import
                  </button>
                )}
              </div>
            </div>

            <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
              <motion.div
                className={cn('h-full rounded-full', statusCfg?.bar ?? 'bg-zinc-300')}
                initial={{ width: 0 }}
                animate={{ width: `${job?.progress ?? 0}%` }}
                transition={{ ease: 'easeOut', duration: 0.5 }}
              />
            </div>

            {job && (
              <div className="grid grid-cols-3 gap-3">
                {(
                  [
                    ['Total', job.totalRows, 'text-zinc-800'],
                    ['Importés', job.imported, 'text-emerald-600'],
                    ['Échecs', job.failed, job.failed > 0 ? 'text-red-600' : 'text-zinc-400'],
                  ] as [string, number, string][]
                ).map(([label, val, cls]) => (
                  <div key={label} className="text-center bg-zinc-50 rounded-xl py-3 border border-zinc-100">
                    <p className={cn('text-2xl font-bold tabular-nums', cls)}>{val}</p>
                    <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
                  </div>
                ))}
              </div>
            )}

            {job?.errors && job.errors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Lignes en erreur ({job.errors.length})
                </p>
                <div className="rounded-xl border border-red-100 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-red-50/60 border-b border-red-100">
                        <th className="text-left px-3 py-2 font-semibold text-zinc-500 w-16">Ligne</th>
                        <th className="text-left px-3 py-2 font-semibold text-zinc-500 w-36">Champ</th>
                        <th className="text-left px-3 py-2 font-semibold text-zinc-500">Message</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-50/80">
                      {job.errors.map((err, i) => (
                        <tr key={i} className="bg-white hover:bg-red-50/30 transition-colors">
                          <td className="px-3 py-2 font-mono text-zinc-400">{err.row}</td>
                          <td className="px-3 py-2 font-mono text-amber-600">{err.field}</td>
                          <td className="px-3 py-2 text-zinc-600">{err.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      </>
      )}
    </div>
  )
}
