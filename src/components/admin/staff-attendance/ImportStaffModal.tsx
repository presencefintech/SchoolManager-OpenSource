'use client'

import { useState } from 'react'
import { X, Loader2, Upload, FileDown, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react'
import { useMutation } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi } from '@/lib/admin/api/staff-attendance.api'
import type { AttendanceStaffPayload, StaffImportResult, StaffSchedule } from '@/types/staff-attendance'

const TEMPLATE_HEADERS = ['prenom', 'nom', 'fonction', 'horaire']
const TEMPLATE_EXAMPLE = ['Jean', 'Mukendi', 'Gardien', 'Personnel administratif']

type ParsedRow = {
  line: number
  firstName: string
  lastName: string
  jobTitle: string
  scheduleName: string
  scheduleId: number | null
  error: string | null
}

const COLUMN_ALIASES: Record<string, keyof Omit<ParsedRow, 'line' | 'scheduleId' | 'error'>> = {
  prenom: 'firstName', firstname: 'firstName', 'prénom': 'firstName',
  nom: 'lastName', lastname: 'lastName',
  fonction: 'jobTitle', jobtitle: 'jobTitle', poste: 'jobTitle',
  horaire: 'scheduleName', schedule: 'scheduleName', schedulename: 'scheduleName',
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
}

/** Parseur CSV minimal : délimiteur `,` ou `;` auto-détecté, champs entre guillemets supportés. */
function parseCsv(text: string): string[][] {
  const delimiter = text.split('\n')[0]?.includes(';') ? ';' : ','
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const pushField = () => { row.push(field); field = '' }
  const pushRow = () => { pushField(); rows.push(row); row = [] }
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i++ }
      else if (c === '"') inQuotes = false
      else field += c
    } else if (c === '"') inQuotes = true
    else if (c === delimiter) pushField()
    else if (c === '\n') pushRow()
    else if (c !== '\r') field += c
  }
  if (field || row.length) pushRow()
  return rows.filter((r) => r.some((f) => f.trim() !== ''))
}

function parseRows(text: string, schedules: StaffSchedule[]): ParsedRow[] {
  const raw = parseCsv(text)
  if (raw.length === 0) return []
  const headers = raw[0].map(normalizeHeader)
  const colIndex: Partial<Record<string, number>> = {}
  headers.forEach((h, i) => {
    const mapped = COLUMN_ALIASES[h]
    if (mapped) colIndex[mapped] = i
  })
  const byName = new Map(schedules.map((s) => [s.name.trim().toLowerCase(), s.id]))

  return raw.slice(1).map((cells, i) => {
    const firstName = (colIndex.firstName != null ? cells[colIndex.firstName] : '')?.trim() ?? ''
    const lastName = (colIndex.lastName != null ? cells[colIndex.lastName] : '')?.trim() ?? ''
    const jobTitle = (colIndex.jobTitle != null ? cells[colIndex.jobTitle] : '')?.trim() ?? ''
    const scheduleName = (colIndex.scheduleName != null ? cells[colIndex.scheduleName] : '')?.trim() ?? ''
    const scheduleId = byName.get(scheduleName.toLowerCase()) ?? null

    let error: string | null = null
    if (!firstName || !lastName) error = 'Prénom et nom requis'
    else if (!scheduleName) error = 'Horaire manquant'
    else if (scheduleId == null) error = `Horaire « ${scheduleName} » introuvable`

    return { line: i + 2, firstName, lastName, jobTitle, scheduleName, scheduleId, error }
  })
}

function downloadTemplate() {
  const csv = [TEMPLATE_HEADERS.join(';'), TEMPLATE_EXAMPLE.join(';')].join('\r\n')
  const blob = new Blob([`﻿${csv}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = 'modele-import-personnel.csv'
  a.click()
  URL.revokeObjectURL(url)
}

export function ImportStaffModal({
  schedules,
  onClose,
  onDone,
}: {
  schedules: StaffSchedule[]
  onClose: () => void
  onDone: () => void
}) {
  const [rows, setRows] = useState<ParsedRow[] | null>(null)
  const [fileName, setFileName] = useState('')
  const [parseError, setParseError] = useState('')
  const [result, setResult] = useState<StaffImportResult | null>(null)
  const [submitError, setSubmitError] = useState('')

  const importMut = useMutation({
    mutationFn: (payload: AttendanceStaffPayload[]) => staffAttendanceApi.importStaff(payload),
  })

  function onFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError('')
    setResult(null)
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = parseRows(String(reader.result ?? ''), schedules)
        if (parsed.length === 0) {
          setParseError('Fichier vide ou colonnes non reconnues (attendu : prenom, nom, fonction, horaire).')
          setRows(null)
        } else {
          setRows(parsed)
        }
      } catch {
        setParseError('Impossible de lire ce fichier CSV.')
        setRows(null)
      }
    }
    reader.readAsText(file, 'utf-8')
  }

  const validRows = rows?.filter((r) => !r.error) ?? []
  const invalidRows = rows?.filter((r) => r.error) ?? []

  async function onImport() {
    if (validRows.length === 0) return
    setSubmitError('')
    try {
      const payload: AttendanceStaffPayload[] = validRows.map((r) => ({
        firstName: r.firstName,
        lastName: r.lastName,
        jobTitle: r.jobTitle || undefined,
        scheduleId: r.scheduleId as number,
      }))
      const data = await importMut.mutateAsync(payload)
      setResult(data)
    } catch (err) {
      setSubmitError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100 flex-shrink-0">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Importer le personnel (CSV)</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Colonnes attendues : prenom, nom, fonction (optionnel), horaire</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>

        <div className="p-6 space-y-4 overflow-y-auto min-h-0 flex-1">
          {result ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-sm font-medium">
                {result.failedCount === 0 ? (
                  <CheckCircle2 size={16} className="text-emerald-600" />
                ) : (
                  <AlertTriangle size={16} className="text-amber-600" />
                )}
                {result.createdCount} employé{result.createdCount !== 1 ? 's' : ''} créé{result.createdCount !== 1 ? 's' : ''}
                {result.failedCount > 0 && `, ${result.failedCount} échec${result.failedCount !== 1 ? 's' : ''}`}
              </div>
              {result.failedCount > 0 && (
                <ul className="divide-y divide-zinc-100 border border-zinc-100 rounded-lg overflow-hidden text-xs">
                  {result.results.filter((r) => !r.success).map((r) => (
                    <li key={r.index} className="px-3 py-2 flex items-center gap-2 text-red-600 bg-red-50/50">
                      <XCircle size={12} className="flex-shrink-0" />
                      Ligne {validRows[r.index]?.line ?? r.index + 2} — {r.error}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={downloadTemplate}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800"
              >
                <FileDown size={13} /> Télécharger le modèle CSV
              </button>

              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-zinc-200 rounded-xl py-8 cursor-pointer hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors">
                <Upload size={22} className="text-zinc-400" />
                <span className="text-sm text-zinc-600">{fileName || 'Choisir un fichier CSV'}</span>
                <input type="file" accept=".csv,text/csv" onChange={onFileSelected} className="hidden" />
              </label>

              {parseError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{parseError}</p>}

              {rows && (
                <div className="space-y-2">
                  <p className="text-xs text-zinc-500">
                    {validRows.length} ligne{validRows.length !== 1 ? 's' : ''} valide{validRows.length !== 1 ? 's' : ''}
                    {invalidRows.length > 0 && `, ${invalidRows.length} en erreur (ignorée${invalidRows.length !== 1 ? 's' : ''})`}
                  </p>
                  <div className="border border-zinc-100 rounded-lg overflow-hidden max-h-64 overflow-y-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-zinc-50 sticky top-0">
                        <tr>
                          <th className="text-left px-3 py-1.5 font-semibold text-zinc-500">Ligne</th>
                          <th className="text-left px-3 py-1.5 font-semibold text-zinc-500">Nom</th>
                          <th className="text-left px-3 py-1.5 font-semibold text-zinc-500">Horaire</th>
                          <th className="text-left px-3 py-1.5 font-semibold text-zinc-500">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-50">
                        {rows.map((r) => (
                          <tr key={r.line} className={cn(r.error && 'bg-red-50/40')}>
                            <td className="px-3 py-1.5 text-zinc-400">{r.line}</td>
                            <td className="px-3 py-1.5 text-zinc-800">{r.firstName} {r.lastName}</td>
                            <td className="px-3 py-1.5 text-zinc-500">{r.scheduleName}</td>
                            <td className="px-3 py-1.5">
                              {r.error ? (
                                <span className="text-red-600">{r.error}</span>
                              ) : (
                                <span className="text-emerald-600">OK</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {submitError && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{submitError}</p>}
            </>
          )}
        </div>

        <div className="flex gap-3 px-6 py-4 border-t border-zinc-100 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            {result ? 'Fermer' : 'Annuler'}
          </button>
          {result ? (
            <button
              type="button"
              onClick={onDone}
              className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium"
            >
              Voir le personnel
            </button>
          ) : (
            <button
              type="button"
              onClick={onImport}
              disabled={validRows.length === 0 || importMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium"
            >
              {importMut.isPending && <Loader2 size={14} className="animate-spin" />}
              Importer {validRows.length > 0 ? `(${validRows.length})` : ''}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
