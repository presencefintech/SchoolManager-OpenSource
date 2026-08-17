'use client'

import { useRef, useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Upload, Trash2, FileText, Image, RefreshCw, X, CheckCircle, Paperclip } from 'lucide-react'
import { cn } from '@/lib/utils'
import { adminFilesApi } from '@/lib/admin/api'
import { getApiErrorMessage } from '@/lib/api/client'

const fadeUp = { hidden: { opacity: 0, y: 14 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } }

const STORAGE_KEY = 'admin_uploaded_files'

type UploadedFile = { url: string; publicId: string; name: string; size: number; type: string; folder: string }

function loadFiles(): UploadedFile[] {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') } catch { return [] }
}

function saveFiles(files: UploadedFile[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files))
}

const FOLDERS = [
  { value: 'documents', label: 'Documents' },
  { value: 'photos', label: 'Photos' },
  { value: 'receipts', label: 'Reçus' },
  { value: 'contracts', label: 'Contrats' },
  { value: 'reports', label: 'Rapports' },
]

function fileIcon(type: string) {
  if (type.startsWith('image/')) return Image
  return FileText
}

function fmtSize(bytes: number) {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`
}

export default function FilesPage() {
  const [uploads, setUploads] = useState<UploadedFile[]>(loadFiles)
  const [uploading, setUploading] = useState(false)
  const [uploadErr, setUploadErr] = useState('')
  const [uploadOk, setUploadOk] = useState('')
  const [folder, setFolder] = useState('documents')
  const [deleting, setDeleting] = useState<string | null>(null)
  const [deleteErr, setDeleteErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)

  useEffect(() => { saveFiles(uploads) }, [uploads])

  const inputCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white'

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return
    const file = files[0]
    if (file.size > 5 * 1024 * 1024) { setUploadErr('Fichier trop volumineux (max 5 Mo)'); return }
    setUploading(true)
    setUploadErr('')
    setUploadOk('')
    try {
      const result = await adminFilesApi.upload(file, { folder })
      setUploads(prev => [...prev, { url: result.url, publicId: result.publicId, name: file.name, size: file.size, type: file.type, folder }])
      setUploadOk(`"${file.name}" uploadé avec succès`)
      if (inputRef.current) inputRef.current.value = ''
    } catch (err) { setUploadErr(getApiErrorMessage(err)) }
    finally { setUploading(false) }
  }

  async function handleDelete(publicId: string) {
    if (!confirm('Supprimer ce fichier ?')) return
    setDeleting(publicId)
    setDeleteErr('')
    try {
      await adminFilesApi.delete(publicId)
      setUploads(prev => prev.filter(f => f.publicId !== publicId))
    } catch (err) { setDeleteErr(getApiErrorMessage(err)) }
    finally { setDeleting(null) }
  }

  return (
    <div className="min-h-screen bg-[#f5f7fb]">
      <div className="bg-white border-b border-zinc-200">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-5">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Fichiers</h1>
            <p className="text-sm text-zinc-400 mt-0.5">Upload et gestion des documents de l'établissement</p>
          </div>
          <button onClick={() => inputRef.current?.click()} disabled={uploading}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold disabled:opacity-50 transition-colors">
            <Upload size={14} />
            Uploader
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-8 py-8 grid grid-cols-[1fr_360px] gap-6">
        <div className="space-y-4">
          <motion.div variants={fadeUp} initial="hidden" animate="show"
            className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
            <h2 className="text-sm font-semibold text-zinc-900 mb-4">Envoyer un fichier</h2>

            <div className="mb-4">
              <label className="block text-xs font-medium text-zinc-500 mb-1.5">Dossier de destination</label>
              <select value={folder} onChange={e => setFolder(e.target.value)} className={inputCls}>
                {FOLDERS.map(f => (
                  <option key={f.value} value={f.value}>{f.label}</option>
                ))}
              </select>
            </div>

            <div
              onDragOver={e => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={e => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files) }}
              onClick={() => inputRef.current?.click()}
              className={cn(
                'border-2 border-dashed rounded-xl py-10 text-center cursor-pointer transition-colors',
                dragging ? 'border-emerald-400 bg-emerald-50' : 'border-zinc-200 hover:border-emerald-300 hover:bg-zinc-50',
              )}
            >
              <Paperclip size={24} className={cn('mx-auto mb-2', dragging ? 'text-emerald-500' : 'text-zinc-300')} />
              <p className="text-sm font-medium text-zinc-500">
                {uploading ? 'Upload en cours…' : 'Glissez un fichier ici ou cliquez pour choisir'}
              </p>
              <p className="text-xs text-zinc-400 mt-1">Formats acceptés · Max 5 Mo</p>
            </div>

            <input ref={inputRef} type="file" className="hidden"
              onChange={e => handleFiles(e.target.files)} />

            {uploadOk && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-100">
                <CheckCircle size={13} className="text-emerald-600 flex-shrink-0" />
                <p className="text-xs text-emerald-700">{uploadOk}</p>
              </div>
            )}
            {uploadErr && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-red-50 border border-red-100">
                <X size={13} className="text-red-500 flex-shrink-0" />
                <p className="text-xs text-red-700">{uploadErr}</p>
              </div>
            )}
          </motion.div>

          {deleteErr && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 border border-red-100">
              <X size={14} className="text-red-500" />
              <p className="text-sm text-red-700">{deleteErr}</p>
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)]">
          <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText size={14} className="text-zinc-400" />
              <h2 className="text-sm font-semibold text-zinc-900">Fichiers uploadés</h2>
            </div>
            {uploads.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 text-zinc-500 font-medium">
                {uploads.length}
              </span>
            )}
          </div>

          {uploads.length === 0 ? (
            <div className="py-14 text-center">
              <Upload size={26} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-xs text-zinc-400">Aucun fichier dans cette session</p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-50">
              {uploads.map((f) => {
                const Icon = fileIcon(f.type)
                return (
                  <motion.div key={f.publicId} variants={fadeUp} initial="hidden" animate="show"
                    className="flex items-start gap-3 px-4 py-4">
                    <div className="w-8 h-8 rounded-lg bg-zinc-100 flex items-center justify-center flex-shrink-0">
                      <Icon size={14} className="text-zinc-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-900 truncate">{f.name}</p>
                      <p className="text-xs text-zinc-400">{fmtSize(f.size)} · {f.folder}</p>
                      {f.url && (
                        <a href={f.url} target="_blank" rel="noreferrer"
                          className="text-xs text-emerald-600 hover:underline truncate block mt-0.5">
                          Ouvrir le fichier
                        </a>
                      )}
                    </div>
                    <button
                      onClick={() => handleDelete(f.publicId)}
                      disabled={deleting === f.publicId}
                      className="p-1.5 rounded-lg text-zinc-300 hover:text-red-500 hover:bg-red-50 transition-colors disabled:opacity-50"
                    >
                      {deleting === f.publicId ? <RefreshCw size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </button>
                  </motion.div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
