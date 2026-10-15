'use client'

import { useCallback, useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  ArrowLeft, CheckCircle2, ImagePlus, Loader2, Upload, XCircle, AlertTriangle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useBatchStudentPhotos } from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import type { BatchPhotoFileResult, BatchPhotosResult } from '@/lib/admin/api/students.api'

const ACCEPT =
  'image/jpeg,image/png,image/webp,image/gif,application/zip,.jpg,.jpeg,.png,.webp,.gif,.zip'

export default function BatchPhotosPage() {
  const toast = useToast()
  const mutation = useBatchStudentPhotos()
  const [files, setFiles] = useState<File[]>([])
  const [dragging, setDragging] = useState(false)
  const [enrollBiometrics, setEnrollBiometrics] = useState(true)
  const [result, setResult] = useState<BatchPhotosResult | null>(null)

  const totalSizeMb = useMemo(
    () => files.reduce((acc, f) => acc + f.size, 0) / (1024 * 1024),
    [files],
  )

  const addFiles = useCallback((list: FileList | File[]) => {
    const next = Array.from(list).filter((f) => {
      const n = f.name.toLowerCase()
      return (
        f.type.startsWith('image/') ||
        f.type === 'application/zip' ||
        n.endsWith('.zip') ||
        n.endsWith('.jpg') ||
        n.endsWith('.jpeg') ||
        n.endsWith('.png') ||
        n.endsWith('.webp') ||
        n.endsWith('.gif')
      )
    })
    setFiles((prev) => {
      const map = new Map(prev.map((f) => [`${f.name}:${f.size}`, f]))
      for (const f of next) map.set(`${f.name}:${f.size}`, f)
      return Array.from(map.values())
    })
    setResult(null)
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      setDragging(false)
      if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
    },
    [addFiles],
  )

  async function handleUpload() {
    if (!files.length) {
      toast.error('Aucun fichier', 'Ajoutez des photos ou un ZIP.')
      return
    }
    try {
      const data = await mutation.mutateAsync({ files, enrollBiometrics })
      setResult(data)
      const bio = data.biometricEnrolledCount
        ? ` · ${data.biometricEnrolledCount} FACE`
        : ''
      toast.success(
        'Import terminé',
        `${data.matchedCount} associée(s) · ${data.unmatchedCount} non reconnue(s)${bio}`,
      )
      if (data.matchedCount > 0) setFiles([])
    } catch (err) {
      toast.error('Import impossible', getApiErrorMessage(err))
    }
  }

  const matched = result?.results.filter((r) => r.status === 'matched') ?? []
  const problems =
    result?.results.filter((r) => r.status === 'unmatched' || r.status === 'failed') ?? []

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-5">
          <Link
            href="/admin/students"
            className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800 mb-3"
          >
            <ArrowLeft size={13} /> Élèves
          </Link>
          <h1 className="text-xl font-semibold text-zinc-900">Import batch photos</h1>
          <p className="text-sm text-zinc-500 mt-1">
            Nommez les fichiers <span className="font-mono text-zinc-700">104.jpg</span> (N° Court)
            ou <span className="font-mono text-zinc-700">ERU2-2026-0042.png</span> (matricule).
            ZIP accepté.
          </p>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-6 space-y-5">
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cn(
            'rounded-2xl border-2 border-dashed bg-white p-8 text-center transition-colors',
            dragging ? 'border-emerald-400 bg-emerald-50/40' : 'border-zinc-200',
          )}
        >
          <ImagePlus className="mx-auto text-emerald-600 mb-3" size={28} />
          <p className="text-sm font-medium text-zinc-800">Glissez-déposez photos ou ZIP</p>
          <p className="text-xs text-zinc-400 mt-1">JPEG, PNG, WebP, GIF · max ~80 fichiers</p>
          <label className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 cursor-pointer">
            <Upload size={13} />
            Choisir des fichiers
            <input
              type="file"
              accept={ACCEPT}
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </label>
        </div>

        {files.length > 0 && (
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <div className="flex items-center justify-between gap-3 mb-3">
              <p className="text-sm font-medium text-zinc-800">
                {files.length} fichier(s) · {totalSizeMb.toFixed(1)} Mo
              </p>
              <button
                type="button"
                onClick={() => setFiles([])}
                className="text-xs text-zinc-500 hover:text-zinc-800"
              >
                Vider
              </button>
            </div>
            <ul className="max-h-40 overflow-y-auto space-y-1 mb-4">
              {files.map((f) => (
                <li key={`${f.name}:${f.size}`} className="text-xs font-mono text-zinc-500 truncate">
                  {f.name}
                </li>
              ))}
            </ul>
            <label className="flex items-start gap-2 mb-4 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={enrollBiometrics}
                onChange={(e) => setEnrollBiometrics(e.target.checked)}
                className="mt-0.5 rounded border-zinc-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span className="text-xs text-zinc-600">
                <span className="font-medium text-zinc-800">Enrôler la biométrie FACE</span>
                {' '}après matching (visage détecté → <span className="font-mono">READY</span>).
                Échec visage = photo OK, biométrie signalée à part.
              </span>
            </label>
            <button
              type="button"
              disabled={mutation.isPending}
              onClick={() => void handleUpload()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {mutation.isPending ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Upload size={14} />
              )}
              {mutation.isPending ? 'Association en cours…' : 'Lancer le matching'}
            </button>
          </div>
        )}

        {result && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Associées', value: result.matchedCount, icon: CheckCircle2, color: 'emerald' },
                { label: 'Biométrie FACE', value: result.biometricEnrolledCount ?? 0, icon: CheckCircle2, color: 'emerald' },
                { label: 'Non reconnues', value: result.unmatchedCount, icon: AlertTriangle, color: 'amber' },
                { label: 'Échecs', value: result.failedCount, icon: XCircle, color: 'red' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div
                  key={label}
                  className="bg-white rounded-xl border border-zinc-200 px-4 py-3 flex items-center gap-3"
                >
                  <Icon
                    size={16}
                    className={cn(
                      color === 'emerald' && 'text-emerald-600',
                      color === 'amber' && 'text-amber-600',
                      color === 'red' && 'text-red-600',
                      color === 'zinc' && 'text-zinc-500',
                    )}
                  />
                  <div>
                    <p className="text-[10px] uppercase text-zinc-400 tracking-wide">{label}</p>
                    <p className="text-lg font-bold tabular-nums text-zinc-900">{value}</p>
                  </div>
                </div>
              ))}
            </div>

            {matched.length > 0 && (
              <ResultGrid title="Photos associées" items={matched} tone="ok" />
            )}
            {problems.length > 0 && (
              <ResultGrid title="Non associées / erreurs" items={problems} tone="warn" />
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ResultGrid({
  title,
  items,
  tone,
}: {
  title: string
  items: BatchPhotoFileResult[]
  tone: 'ok' | 'warn'
}) {
  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4">
      <h2 className="text-sm font-semibold text-zinc-800 mb-3">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((r) => (
          <div
            key={`${r.fileName}-${r.status}-${r.studentId ?? ''}`}
            className={cn(
              'flex items-start gap-3 rounded-xl border p-3',
              tone === 'ok' ? 'border-emerald-100 bg-emerald-50/40' : 'border-amber-100 bg-amber-50/40',
            )}
          >
            <div className="w-14 h-14 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0 ring-1 ring-zinc-200">
              {r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.photoUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="h-full w-full flex items-center justify-center text-zinc-400">
                  <ImagePlus size={18} />
                </div>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-mono text-zinc-600 truncate">{r.fileName}</p>
              {r.studentName && (
                <p className="text-sm font-medium text-zinc-900 truncate">{r.studentName}</p>
              )}
              {r.matchKind && (
                <p className="text-[11px] text-zinc-500">
                  via {r.matchKind === 'numeroCourt' ? 'N° Court' : 'matricule'}
                  {r.matchKey ? ` · ${r.matchKey}` : ''}
                </p>
              )}
              {r.biometricStatus && (
                <p
                  className={cn(
                    'text-[11px] mt-0.5',
                    r.biometricStatus === 'READY' && 'text-emerald-700',
                    r.biometricStatus === 'FAILED' && 'text-amber-700',
                    r.biometricStatus === 'UNAVAILABLE' && 'text-zinc-500',
                    r.biometricStatus === 'SKIPPED' && 'text-zinc-400',
                  )}
                >
                  FACE · {r.biometricStatus}
                  {r.biometricReason ? ` — ${r.biometricReason}` : ''}
                </p>
              )}
              {r.reason && <p className="text-[11px] text-amber-700 mt-0.5">{r.reason}</p>}
              {r.studentId != null && (
                <Link
                  href={`/admin/students/${r.studentId}`}
                  className="text-[11px] text-emerald-700 hover:underline"
                >
                  Voir fiche →
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
