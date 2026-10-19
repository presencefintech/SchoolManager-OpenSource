'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  AlertCircle, CheckCircle2, ChevronDown, Download, Layers, Loader2, RefreshCw, Upload, XCircle,
} from 'lucide-react'
import { importApi, type ImportPackResult } from '@/lib/admin/api/import.api'
import { useImportStatus } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { cn } from '@/lib/utils'

/** Aligné sur multer import.routes (15 Mo). */
const MAX_PACK_BYTES = 15 * 1024 * 1024

function PackJobRow({ job, label }: { job: ImportPackResult['jobs'][number]; label: string }) {
  const { data } = useImportStatus(job.jobId)
  const status = data?.status ?? 'PENDING'
  const done = status === 'COMPLETED' || status === 'PARTIAL' || status === 'FAILED'
  const progress = data?.progress ?? 0

  return (
    <li className="rounded-xl border border-zinc-100 bg-zinc-50/60 px-3 py-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          {status === 'COMPLETED' && <CheckCircle2 size={14} className="shrink-0 text-emerald-500" />}
          {status === 'PARTIAL' && <AlertCircle size={14} className="shrink-0 text-amber-500" />}
          {status === 'FAILED' && <XCircle size={14} className="shrink-0 text-red-500" />}
          {!done && <RefreshCw size={14} className="shrink-0 animate-spin text-blue-500" />}
          <span className="truncate text-sm font-medium text-zinc-800">{label}</span>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-zinc-500">
          {data ? `${data.imported} / ${data.totalRows}` : `${job.totalRows} ligne(s)`}
          {data && data.failed > 0 ? <span className="ml-1.5 text-red-600">· {data.failed} échec(s)</span> : null}
        </span>
      </div>
      <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-zinc-200">
        <div
          className={cn(
            'h-full rounded-full transition-all duration-500',
            status === 'FAILED' ? 'bg-red-500' : status === 'PARTIAL' ? 'bg-amber-400' : done ? 'bg-emerald-500' : 'bg-blue-500',
          )}
          style={{ width: `${done ? 100 : progress}%` }}
        />
      </div>
      {data?.errors && data.errors.length > 0 && (
        <ul className="mt-2 max-h-24 space-y-0.5 overflow-y-auto text-[11px] text-red-700">
          {data.errors.slice(0, 10).map((err, i) => (
            <li key={`${err.row}-${i}`}>
              Ligne {err.row}
              {err.field ? ` · ${err.field}` : ''} : {err.message}
            </li>
          ))}
        </ul>
      )}
    </li>
  )
}

/**
 * Import « classeur complet » : un seul .xlsx, un onglet par type
 * (Structure → Frais → Élèves → Parents → Encaissements), traité dans l'ordre recommandé.
 */
export function ImportPackPanel({ schoolId, canUpload }: { schoolId?: number; canUpload: boolean }) {
  const [open, setOpen] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)
  const [result, setResult] = useState<ImportPackResult | null>(null)

  const catalog = useQuery({
    queryKey: ['admin', 'import', 'catalog'],
    queryFn: importApi.getCatalog,
    enabled: open,
    staleTime: 10 * 60_000,
  })

  const template = useMutation({
    mutationFn: importApi.downloadPackTemplate,
    onSuccess: ({ blob, filename }) => triggerBlobDownload(blob, filename),
    onError: (err) => setFileError(getApiErrorMessage(err)),
  })

  const upload = useMutation({
    mutationFn: (file: File) => importApi.uploadPack(file, schoolId),
    onSuccess: (data) => setResult(data),
    onError: (err) => setFileError(getApiErrorMessage(err)),
  })

  const labelBySlug = new Map(catalog.data?.types.map((t) => [t.slug, t.label]) ?? [])
  const orderedTypes = [...(catalog.data?.types ?? [])].sort((a, b) => a.recommendedOrder - b.recommendedOrder)

  const handleFile = (file: File) => {
    setFileError(null)
    setResult(null)
    if (!/\.xlsx$/i.test(file.name)) {
      setFileError('Le classeur complet doit être un fichier .xlsx (plusieurs onglets).')
      return
    }
    if (file.size > MAX_PACK_BYTES) {
      setFileError('Classeur trop volumineux — maximum 15 Mo.')
      return
    }
    upload.mutate(file)
  }

  const busy = upload.isPending || template.isPending

  return (
    <section className="rounded-2xl border border-zinc-100 bg-white shadow-sm">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left"
      >
        <span className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
            <Layers size={17} />
          </span>
          <span>
            <span className="block text-sm font-semibold text-zinc-900">Classeur complet (tout en un)</span>
            <span className="block text-xs text-zinc-500">
              Un seul fichier Excel avec un onglet par type — idéal pour démarrer une nouvelle école
            </span>
          </span>
        </span>
        <ChevronDown size={16} className={cn('shrink-0 text-zinc-400 transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <div className="space-y-4 border-t border-zinc-100 px-5 py-4">
          <div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Onglets traités dans cet ordre
            </p>
            {catalog.isLoading ? (
              <p className="text-xs text-zinc-400">Chargement du catalogue…</p>
            ) : catalog.isError ? (
              <p className="text-xs text-red-600">{getApiErrorMessage(catalog.error)}</p>
            ) : (
              <ol className="flex flex-wrap items-center gap-1.5">
                {orderedTypes.map((t, i) => (
                  <li key={t.slug} className="flex items-center gap-1.5" title={t.description}>
                    <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                      {i + 1}. {t.label}
                    </span>
                    {i < orderedTypes.length - 1 && <span className="text-zinc-300">→</span>}
                  </li>
                ))}
              </ol>
            )}
          </div>

          <p className="rounded-xl border border-amber-100 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            Les élèves importés via le classeur ne passent pas par l’analyse à voyants (doublons).
            Pour une liste d’élèves à vérifier, utilisez plutôt l’import « Élèves » ci-dessous.
          </p>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => { setFileError(null); template.mutate() }}
              disabled={busy}
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-50"
            >
              {template.isPending ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
              Télécharger le modèle complet
            </button>

            <label
              className={cn(
                'inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-medium shadow-sm transition-colors',
                busy || !canUpload
                  ? 'cursor-not-allowed bg-zinc-100 text-zinc-400'
                  : 'cursor-pointer bg-emerald-600 text-white hover:bg-emerald-500',
              )}
            >
              {upload.isPending ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
              {upload.isPending
                ? 'Envoi du classeur…'
                : !canUpload
                  ? 'Choisir un établissement d’abord'
                  : 'Importer le classeur (.xlsx)'}
              <input
                type="file"
                accept=".xlsx"
                className="hidden"
                disabled={busy || !canUpload}
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) handleFile(f)
                  e.target.value = ''
                }}
              />
            </label>
          </div>

          {fileError && (
            <p className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
              {fileError}
            </p>
          )}

          {result && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-500">
                <span className="font-semibold text-zinc-800">{result.fileName}</span> —{' '}
                {result.jobs.length} onglet(s) en cours d’import
              </p>
              <ul className="space-y-2">
                {result.jobs.map((job) => (
                  <PackJobRow key={job.jobId} job={job} label={labelBySlug.get(job.type) ?? job.type} />
                ))}
              </ul>
              {result.skipped.length > 0 && (
                <p className="text-[11px] text-zinc-400">Onglets ignorés : {result.skipped.join(', ')}</p>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
