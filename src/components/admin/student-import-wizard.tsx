'use client'

import { Fragment, useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ChevronRight, Download, FileSpreadsheet,
  Loader2, RefreshCw, RotateCcw, Upload, XCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { importApi } from '@/lib/admin/api'
import type {
  ImportReportEntry, StudentDecision, StudentImportAnalysis, StudentRowAnalysis, StudentRowLevel,
} from '@/lib/admin/api'
import { useImportStatus, useImportUpload } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'

const PAGE_SIZE = 50
const MAX_FILE_BYTES = 10 * 1024 * 1024

type Filter = 'all' | StudentRowLevel | 'warn'

const LEVEL_CFG: Record<StudentRowLevel, { dot: string; label: string; ring: string; text: string }> = {
  green: { dot: 'bg-emerald-500', label: 'Prêt', ring: 'ring-emerald-200 bg-emerald-50', text: 'text-emerald-700' },
  orange: { dot: 'bg-amber-500', label: 'Doublon possible', ring: 'ring-amber-200 bg-amber-50', text: 'text-amber-700' },
  red: { dot: 'bg-red-500', label: 'Rejeté', ring: 'ring-red-200 bg-red-50', text: 'text-red-700' },
}

const REASON_LABEL: Record<string, string> = {
  SAME_MATRICULE: 'Même matricule',
  EXACT_NAME: 'Même nom',
  SIMILAR_NAME: 'Nom très proche',
  SAME_PHONE_AND_BIRTH: 'Même téléphone et même naissance',
}

function decisionLabel(level: StudentRowLevel, d: StudentDecision): string {
  if (level === 'green') return d === 'create' ? 'Importer' : 'Ne pas importer'
  switch (d) {
    case 'skip': return 'Ignorer'
    case 'fill': return 'Compléter les champs vides'
    case 'update': return 'Mettre à jour la fiche'
    case 'create': return 'Créer quand même'
  }
}

function rowName(r: StudentRowAnalysis): string {
  return formatStudentFullName({
    lastName: r.student.lastName,
    postnom: r.student.postnom,
    firstName: r.student.firstName ?? '',
  }) || '—'
}

function csvCell(v: string | number): string {
  const s = String(v ?? '')
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

function downloadReport(fileName: string, entries: ImportReportEntry[]) {
  const sev: Record<string, string> = { error: 'Erreur', warning: 'Avertissement', skipped: 'Ignoré' }
  const lines = [
    ['Ligne', 'Gravité', 'Champ', 'Message'].join(';'),
    ...entries.map((e) => [e.row, sev[e.severity ?? 'error'] ?? 'Erreur', e.field, e.message].map(csvCell).join(';')),
  ]
  const blob = new Blob(['﻿' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' })
  triggerBlobDownload(blob, `rapport-import-${fileName.replace(/\.[^.]+$/, '')}.csv`)
}

function Dot({ level }: { level: StudentRowLevel }) {
  return <span className={cn('inline-block w-2.5 h-2.5 rounded-full shrink-0', LEVEL_CFG[level].dot)} />
}

function RowDetail({ r }: { r: StudentRowAnalysis }) {
  const m = r.match
  return (
    <div className="px-4 py-3 bg-zinc-50/70 border-t border-zinc-100 text-xs space-y-3">
      {r.errors.length > 0 && (
        <ul className="space-y-0.5 text-red-700">
          {r.errors.map((e, i) => <li key={i}>✕ {e.message}</li>)}
        </ul>
      )}
      {m && (
        <div className="space-y-2">
          <p className="text-zinc-600">
            <span className="font-semibold text-zinc-800">{REASON_LABEL[m.reason] ?? m.reason}</span>
            {' · '}ressemblance {Math.round(m.score * 100)} %
            {' · '}
            {m.source === 'file' ? `ligne ${m.fileRow} du même fichier` : 'déjà dans l’école'}
          </p>
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-3">
              <p className="text-[10px] uppercase tracking-wide text-zinc-400 mb-1">Dans votre fichier</p>
              <p className="font-semibold text-zinc-800">{rowName(r)}</p>
              <p className="text-zinc-500">{r.student.className}</p>
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50/40 p-3">
              <p className="text-[10px] uppercase tracking-wide text-amber-600 mb-1">
                {m.source === 'file' ? 'Ligne précédente' : 'Fiche existante'}
              </p>
              <p className="font-semibold text-zinc-800">{m.fullName}</p>
              <p className="text-zinc-500">
                {m.className ?? '—'}{m.matricule ? ` · ${m.matricule}` : ''}
              </p>
            </div>
          </div>
          {m.changes.length > 0 && (
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-zinc-400">
                  <th className="py-1 font-medium">Champ</th>
                  <th className="py-1 font-medium">Fiche existante</th>
                  <th className="py-1 font-medium">Fichier</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {m.changes.map((c) => (
                  <tr key={c.field} className="border-t border-zinc-100">
                    <td className="py-1 text-zinc-500">{c.label}</td>
                    <td className="py-1 text-zinc-700">{c.existing ?? <span className="text-zinc-300">vide</span>}</td>
                    <td className="py-1 text-zinc-700">{c.incoming}</td>
                    <td className="py-1 text-right">
                      {c.kind === 'new' && <span className="text-emerald-600">à compléter</span>}
                      {c.kind === 'different' && <span className="text-amber-600">différent</span>}
                      {c.kind === 'same' && <span className="text-zinc-300">identique</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
      {r.warnings.length > 0 && (
        <ul className="space-y-0.5">
          {r.warnings.map((w, i) => (
            <li key={i} className={cn(w.code === 'CHECK' ? 'text-amber-700' : 'text-zinc-500')}>
              {w.code === 'CHECK' ? '⚠' : '·'} {w.message}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}

export function StudentImportWizard({
  schoolId,
  canUpload,
  studentsHref = '/admin/students',
}: {
  schoolId?: number
  canUpload: boolean
  studentsHref?: string
}) {
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState<StudentImportAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [decisions, setDecisions] = useState<Record<number, StudentDecision>>({})
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [jobId, setJobId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const upload = useImportUpload()
  const { data: job } = useImportStatus(jobId)
  const isDone = !!job && ['COMPLETED', 'PARTIAL', 'FAILED'].includes(job.status)

  const reset = useCallback(() => {
    setFile(null)
    setAnalysis(null)
    setDecisions({})
    setFilter('all')
    setPage(1)
    setExpanded(new Set())
    setJobId(null)
    setError(null)
    upload.reset()
  }, [upload])

  const handleFile = useCallback(
    async (f: File) => {
      setError(null)
      if (!/\.(xlsx|csv)$/i.test(f.name)) return setError('Format invalide — uniquement .xlsx ou .csv')
      if (f.size > MAX_FILE_BYTES) return setError('Fichier trop volumineux — maximum 10 Mo')
      setAnalyzing(true)
      setAnalysis(null)
      try {
        const result = await importApi.analyzeStudents(f, schoolId)
        setFile(f)
        setAnalysis(result)
        setDecisions(Object.fromEntries(result.rows.map((r) => [r.row, r.defaultDecision])))
        setFilter(result.summary.orange + result.summary.red > 0 ? 'orange' : 'all')
        setPage(1)
        setExpanded(new Set())
      } catch (err) {
        setError(getApiErrorMessage(err))
      } finally {
        setAnalyzing(false)
      }
    },
    [schoolId],
  )

  const rows = analysis?.rows ?? []

  const effective = useCallback(
    (r: StudentRowAnalysis): StudentDecision => decisions[r.row] ?? r.defaultDecision,
    [decisions],
  )

  const plan = useMemo(() => {
    const p = { create: 0, fill: 0, update: 0, skip: 0, blocked: 0 }
    for (const r of rows) {
      if (r.allowedDecisions.length === 0) p.blocked++
      else p[effective(r)]++
    }
    return p
  }, [rows, effective])

  const filtered = useMemo(() => {
    switch (filter) {
      case 'all': return rows
      case 'warn': return rows.filter((r) => r.level === 'green' && r.warnings.length > 0)
      default: return rows.filter((r) => r.level === filter)
    }
  }, [rows, filter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  function setDecision(row: number, d: StudentDecision) {
    setDecisions((prev) => ({ ...prev, [row]: d }))
  }

  function bulk(level: 'orange' | 'red', d: StudentDecision) {
    setDecisions((prev) => {
      const next = { ...prev }
      for (const r of rows) if (r.level === level && r.allowedDecisions.includes(d)) next[r.row] = d
      return next
    })
  }

  function toggle(row: number) {
    setExpanded((prev) => {
      const n = new Set(prev)
      if (n.has(row)) n.delete(row)
      else n.add(row)
      return n
    })
  }

  async function launchImport() {
    if (!file || !analysis) return
    setError(null)
    try {
      const res = await upload.mutateAsync({
        type: 'students',
        file,
        schoolId,
        studentOptions: { decisions, fileHash: analysis.fileHash },
      })
      setJobId(res.jobId)
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const importCount = plan.create + plan.fill + plan.update

  /* ───────── Étape 3 : suivi du lot ───────── */
  if (jobId) {
    const report = (job?.errors ?? []) as ImportReportEntry[]
    const bySeverity = (s: string) => report.filter((e) => (e.severity ?? 'error') === s)
    const errs = bySeverity('error')
    const warns = bySeverity('warning')
    const skips = bySeverity('skipped')
    return (
      <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-5 space-y-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            {job?.status === 'COMPLETED' && <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />}
            {job?.status === 'PARTIAL' && <AlertCircle size={16} className="text-amber-500 shrink-0" />}
            {job?.status === 'FAILED' && <XCircle size={16} className="text-red-500 shrink-0" />}
            {!isDone && <RefreshCw size={16} className="text-blue-500 animate-spin shrink-0" />}
            <span className="text-sm font-semibold text-zinc-800 truncate">{job?.fileName ?? file?.name}</span>
          </div>
          <span className="text-xs text-zinc-500 shrink-0">
            {isDone ? 'Terminé' : `En cours… ${job?.progress ?? 0} %`}
          </span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-1.5 overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', isDone ? 'bg-emerald-500' : 'bg-blue-500')}
            style={{ width: `${job?.progress ?? 0}%` }}
          />
        </div>
        {job && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {([
              ['Lignes', job.totalRows, 'text-zinc-800'],
              ['Importés', job.imported, 'text-emerald-600'],
              ['Ignorés', job.skipped ?? 0, 'text-amber-600'],
              ['Rejetés', job.failed, job.failed > 0 ? 'text-red-600' : 'text-zinc-400'],
              ['À compléter', job.warnings ?? 0, 'text-sky-600'],
            ] as [string, number, string][]).map(([label, val, cls]) => (
              <div key={label} className="text-center bg-zinc-50 rounded-xl py-3 border border-zinc-100">
                <p className={cn('text-2xl font-bold tabular-nums', cls)}>{val}</p>
                <p className="text-xs text-zinc-400 mt-0.5">{label}</p>
              </div>
            ))}
          </div>
        )}
        {isDone && (
          <>
            {(warns.length > 0 || errs.length > 0 || skips.length > 0) && (
              <div className="space-y-3">
                {([
                  ['Rejetés', errs, 'text-red-700', 'border-red-100'],
                  ['Ignorés', skips, 'text-amber-700', 'border-amber-100'],
                  ['Avertissements', warns, 'text-sky-700', 'border-sky-100'],
                ] as [string, ImportReportEntry[], string, string][]).filter(([, l]) => l.length > 0).map(([title, list, cls, border]) => (
                  <details key={title} className={cn('rounded-xl border bg-white', border)} open={title === 'Rejetés'}>
                    <summary className={cn('cursor-pointer px-3 py-2 text-sm font-medium', cls)}>
                      {title} ({list.length})
                    </summary>
                    <div className="max-h-64 overflow-y-auto">
                      <table className="w-full text-xs">
                        <tbody className="divide-y divide-zinc-50">
                          {list.slice(0, 500).map((e, i) => (
                            <tr key={i}>
                              <td className="px-3 py-1.5 font-mono text-zinc-400 w-14">{e.row}</td>
                              <td className="px-3 py-1.5 font-mono text-zinc-500 w-28">{e.field}</td>
                              <td className="px-3 py-1.5 text-zinc-700">{e.message}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {list.length > 500 && (
                        <p className="px-3 py-2 text-xs text-zinc-400">… {list.length - 500} autres dans le rapport CSV.</p>
                      )}
                    </div>
                  </details>
                ))}
              </div>
            )}
            <div className="flex flex-wrap gap-3">
              {report.length > 0 && (
                <button
                  onClick={() => downloadReport(job?.fileName ?? 'import', report)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-700 hover:bg-zinc-50"
                >
                  <Download size={14} /> Télécharger le rapport (CSV)
                </button>
              )}
              <Link
                href={studentsHref}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-medium"
              >
                Voir les élèves
              </Link>
              <button onClick={reset} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm text-zinc-500 hover:text-zinc-800">
                <RotateCcw size={14} /> Nouvel import
              </button>
            </div>
          </>
        )}
      </div>
    )
  }

  /* ───────── Étape 1 : dépôt du fichier ───────── */
  if (!analysis) {
    return (
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault()
          setDragOver(false)
          const f = e.dataTransfer.files[0]
          if (f && canUpload) void handleFile(f)
        }}
        className={cn(
          'bg-white rounded-2xl border-2 border-dashed p-10 text-center transition-all',
          dragOver ? 'border-emerald-400 bg-emerald-50/50' : error ? 'border-red-300 bg-red-50/30' : 'border-zinc-200',
        )}
      >
        <FileSpreadsheet size={32} className={cn('mx-auto mb-3', error ? 'text-red-300' : 'text-zinc-300')} />
        {error ? (
          <p className="text-sm font-medium text-red-600 mb-4">{error}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-zinc-700 mb-1">Glissez la liste des élèves ou cliquez pour parcourir</p>
            <p className="text-xs text-zinc-400 mb-4">
              Le fichier est d’abord analysé, rien n’est enregistré avant votre validation — .xlsx ou .csv, 10 Mo max
            </p>
          </>
        )}
        <label
          className={cn(
            'inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shadow-sm',
            analyzing || !canUpload
              ? 'bg-zinc-100 text-zinc-400 cursor-not-allowed'
              : 'bg-emerald-600 text-white hover:bg-emerald-500 cursor-pointer',
          )}
        >
          {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {analyzing ? 'Analyse en cours…' : !canUpload ? 'Choisir un établissement d’abord' : error ? 'Réessayer' : 'Choisir un fichier'}
          <input
            type="file"
            className="hidden"
            accept=".xlsx,.csv"
            disabled={analyzing || !canUpload}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
              e.target.value = ''
            }}
          />
        </label>
      </div>
    )
  }

  /* ───────── Étape 2 : revue à voyants ───────── */
  const s = analysis.summary
  const cards: { id: Filter; label: string; value: number; cls: string }[] = [
    { id: 'all', label: 'Lignes', value: s.total, cls: 'bg-zinc-50 text-zinc-800 ring-zinc-200' },
    { id: 'green', label: 'Prêts', value: s.green, cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    { id: 'orange', label: 'Doublons possibles', value: s.orange, cls: 'bg-amber-50 text-amber-700 ring-amber-200' },
    { id: 'red', label: 'Rejetés', value: s.red, cls: 'bg-red-50 text-red-700 ring-red-200' },
    { id: 'warn', label: 'Prêts, à compléter', value: s.greenWithWarnings, cls: 'bg-sky-50 text-sky-700 ring-sky-200' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-zinc-600 truncate">
          <span className="font-semibold text-zinc-800">{analysis.fileName}</span> — vérifiez avant d’importer
        </p>
        <button onClick={reset} className="text-xs text-zinc-400 hover:text-zinc-700 inline-flex items-center gap-1">
          <RotateCcw size={12} /> Changer de fichier
        </button>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {cards.map((c) => (
          <button
            key={c.id}
            onClick={() => { setFilter(c.id); setPage(1) }}
            className={cn(
              'rounded-xl p-3 text-left ring-1 transition-all',
              c.cls,
              filter === c.id ? 'ring-2 shadow-sm' : 'opacity-80 hover:opacity-100',
            )}
          >
            <p className="text-2xl font-bold tabular-nums">{c.value}</p>
            <p className="text-xs mt-0.5">{c.label}</p>
          </button>
        ))}
      </div>

      {(s.orange > 0 || s.red > 0) && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-white border border-zinc-200 px-4 py-3 text-xs text-zinc-600">
          <span className="font-medium text-zinc-700">Décisions groupées :</span>
          {s.orange > 0 && (
            <label className="flex items-center gap-1.5">
              <Dot level="orange" /> Doublons possibles
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) bulk('orange', e.target.value as StudentDecision); e.target.value = '' }}
                className="border border-zinc-200 rounded-lg px-2 py-1 bg-white"
              >
                <option value="">Appliquer à tous…</option>
                <option value="skip">Ignorer</option>
                <option value="fill">Compléter les champs vides</option>
                <option value="create">Créer quand même</option>
              </select>
            </label>
          )}
          {s.red > 0 && (
            <label className="flex items-center gap-1.5">
              <Dot level="red" /> Doublons stricts
              <select
                defaultValue=""
                onChange={(e) => { if (e.target.value) bulk('red', e.target.value as StudentDecision); e.target.value = '' }}
                className="border border-zinc-200 rounded-lg px-2 py-1 bg-white"
              >
                <option value="">Appliquer à tous…</option>
                <option value="skip">Ignorer</option>
                <option value="fill">Compléter les champs vides</option>
              </select>
            </label>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="w-8 px-3 py-2" />
              <th className="text-left px-2 py-2 font-medium w-14">Ligne</th>
              <th className="text-left px-2 py-2 font-medium">Élève</th>
              <th className="text-left px-2 py-2 font-medium hidden md:table-cell">Classe</th>
              <th className="text-left px-2 py-2 font-medium">Contrôle</th>
              <th className="text-left px-2 py-2 font-medium w-56">Décision</th>
              <th className="w-8" />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {pageRows.map((r) => {
              const open = expanded.has(r.row)
              const checks = r.warnings.filter((w) => w.code === 'CHECK').length
              const missing = r.warnings.filter((w) => w.code === 'MISSING').length
              const detail = r.errors.length > 0 || r.match != null || r.warnings.length > 0
              return (
                <Fragment key={r.row}>
                  <tr className={cn(r.level === 'red' && 'bg-red-50/30', r.level === 'orange' && 'bg-amber-50/30')}>
                    <td className="px-3 py-2"><Dot level={r.level} /></td>
                    <td className="px-2 py-2 font-mono text-xs text-zinc-400">{r.row}</td>
                    <td className="px-2 py-2 font-medium text-zinc-900">{rowName(r)}</td>
                    <td className="px-2 py-2 text-zinc-600 hidden md:table-cell">{r.student.className || '—'}</td>
                    <td className="px-2 py-2 text-xs">
                      {r.errors.length > 0 ? (
                        <span className="text-red-700">{r.errors[0].message}</span>
                      ) : r.match ? (
                        <span className={LEVEL_CFG[r.level].text}>
                          {r.match.strict ? 'Doublon de ' : 'Ressemble à '}
                          <b>{r.match.fullName}</b> ({Math.round(r.match.score * 100)} %)
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-2">
                          {checks > 0 && (
                            <span className="inline-flex items-center gap-1 text-amber-700">
                              <AlertTriangle size={12} /> {checks} à vérifier
                            </span>
                          )}
                          {missing > 0 && <span className="text-zinc-400">{missing} champ(s) vide(s)</span>}
                          {checks === 0 && missing === 0 && <span className="text-emerald-600">OK</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {r.allowedDecisions.length > 1 ? (
                        <select
                          value={effective(r)}
                          onChange={(e) => setDecision(r.row, e.target.value as StudentDecision)}
                          className="w-full border border-zinc-200 rounded-lg px-2 py-1 text-xs bg-white"
                        >
                          {r.allowedDecisions.map((d) => (
                            <option key={d} value={d}>{decisionLabel(r.level, d)}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-zinc-400">
                          {r.allowedDecisions.length === 0 ? 'Corriger le fichier' : decisionLabel(r.level, r.allowedDecisions[0])}
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2">
                      {detail && (
                        <button onClick={() => toggle(r.row)} className="text-zinc-400 hover:text-zinc-700" aria-label="Détails">
                          {open ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                        </button>
                      )}
                    </td>
                  </tr>
                  {open && (
                    <tr>
                      <td colSpan={7} className="p-0"><RowDetail r={r} /></td>
                    </tr>
                  )}
                </Fragment>
              )
            })}
            {pageRows.length === 0 && (
              <tr><td colSpan={7} className="px-5 py-10 text-center text-zinc-400">Aucune ligne dans ce filtre.</td></tr>
            )}
          </tbody>
        </table>
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-3 px-5 py-3 border-t border-zinc-100 text-sm">
            <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} className="px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40">
              Précédent
            </button>
            <span className="text-zinc-500">Page {page} / {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} className="px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40">
              Suivant
            </button>
          </div>
        )}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="sticky bottom-0 bg-white/95 backdrop-blur border border-zinc-200 rounded-2xl p-4 flex flex-wrap items-center justify-between gap-3 shadow-sm">
        <p className="text-sm text-zinc-600">
          <b className="text-emerald-700">{plan.create}</b> création(s)
          {plan.fill > 0 && <> · <b className="text-sky-700">{plan.fill}</b> fiche(s) complétée(s)</>}
          {plan.update > 0 && <> · <b className="text-amber-700">{plan.update}</b> mise(s) à jour</>}
          {' · '}<b>{plan.skip}</b> ignorée(s)
          {plan.blocked > 0 && <> · <b className="text-red-700">{plan.blocked}</b> à corriger dans le fichier</>}
        </p>
        <button
          onClick={launchImport}
          disabled={upload.isPending || importCount === 0}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-200 disabled:text-zinc-400 text-white text-sm font-medium"
        >
          {upload.isPending ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
          {upload.isPending ? 'Envoi…' : `Importer ${importCount} élève(s)`}
        </button>
      </div>
    </div>
  )
}
