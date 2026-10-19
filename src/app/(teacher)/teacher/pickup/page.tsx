'use client'

import { FormEvent, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { CheckCircle2, Phone, ScanLine, UserCheck } from 'lucide-react'
import { CameraScanField } from '@/components/teacher/camera-scan-field'
import { HardwareScanField } from '@/components/teacher/hardware-scan-field'
import { apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { teacherPickupApi, type PickupPreview } from '@/lib/teacher/api/attendance-sheet.api'
import { Badge, Card, ErrorState, PageHeader, btnGhost, btnPrimary, formatDateTime, inputCls } from '@/components/teacher/ui'
import { cn } from '@/lib/utils'

type Mode = 'camera' | 'reader' | 'manual'

export default function TeacherPickupPage() {
  const [mode, setMode] = useState<Mode>('camera')
  const [manual, setManual] = useState('')
  const [payload, setPayload] = useState<string | null>(null)
  const [preview, setPreview] = useState<PickupPreview | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [done, setDone] = useState<{ names: string[]; at: string | null } | null>(null)

  const previewMutation = useMutation({
    mutationFn: (qr: string) => teacherPickupApi.preview(qr),
    onSuccess: (data, qr) => {
      setPayload(qr)
      setPreview(data)
      setDone(null)
      setSelected(new Set(data.children.filter((c) => !c.alreadyReleasedToday).map((c) => c.id)))
    },
  })

  const confirm = useMutation({
    mutationFn: () => teacherPickupApi.confirm(payload!, [...selected]),
    onSuccess: (res) => {
      setDone({ names: res.children.map((c) => c.name), at: res.releasedAt })
      setPreview(null)
      setPayload(null)
    },
  })

  const reset = () => {
    setPreview(null)
    setPayload(null)
    setDone(null)
    setSelected(new Set())
    previewMutation.reset()
    confirm.reset()
  }

  const onScan = async (qr: string) => {
    if (previewMutation.isPending || preview) return
    await previewMutation.mutateAsync(qr.trim()).catch(() => undefined)
  }

  const onManual = (e: FormEvent) => {
    e.preventDefault()
    if (manual.trim()) void onScan(manual)
  }

  const toggle = (id: number) =>
    setSelected((s) => {
      const next = new Set(s)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })

  const error = previewMutation.error ?? confirm.error

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<UserCheck className="h-6 w-6 text-teal-600" />}
        title="Remise des élèves"
        subtitle="Scannez la carte de l’adulte autorisé, puis cochez les enfants à remettre."
      />

      {!preview && !done && (
        <Card className="space-y-4">
          <div className="flex flex-wrap gap-2">
            {(
              [
                ['camera', 'Caméra'],
                ['reader', 'Douchette'],
                ['manual', 'Saisie'],
              ] as Array<[Mode, string]>
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={cn(
                  'rounded-full px-3 py-1 text-sm',
                  mode === id ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300',
                )}
              >
                {label}
              </button>
            ))}
          </div>
          {mode === 'camera' && <CameraScanField onScan={onScan} enabled={!previewMutation.isPending} />}
          {mode === 'reader' && <HardwareScanField onScan={onScan} busy={previewMutation.isPending} />}
          {mode === 'manual' && (
            <form onSubmit={onManual} className="flex gap-2">
              <input
                className={inputCls}
                placeholder="Code de la carte de remise"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              />
              <button type="submit" className={btnPrimary} disabled={previewMutation.isPending || !manual.trim()}>
                <ScanLine className="h-4 w-4" /> Vérifier
              </button>
            </form>
          )}
          {previewMutation.isPending && <p className="text-sm text-slate-500">Vérification de la carte…</p>}
        </Card>
      )}

      {error && <ErrorState message={apiErrorMessage(error, 'Carte invalide ou remise impossible.')} />}

      {preview && (
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            {preview.adult.photoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview.adult.photoUrl} alt="" className="h-16 w-16 rounded-full object-cover" />
            )}
            <div>
              <p className="text-lg font-semibold">{preview.adult.name}</p>
              <p className="flex items-center gap-2 text-sm text-slate-500">
                {preview.adult.relationship}
                {preview.adult.phone && (
                  <span className="inline-flex items-center gap-1">
                    <Phone className="h-3.5 w-3.5" />
                    {preview.adult.phone}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="divide-y divide-slate-100 rounded-lg border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
            {preview.children.length === 0 && <p className="p-4 text-sm text-slate-500">Aucun enfant rattaché à cette carte.</p>}
            {preview.children.map((c) => (
              <label key={c.id} className={cn('flex items-center gap-3 px-4 py-3', c.alreadyReleasedToday && 'opacity-60')}>
                <input
                  type="checkbox"
                  disabled={c.alreadyReleasedToday}
                  checked={selected.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.className}</p>
                </div>
                {c.alreadyReleasedToday && <Badge tone="slate">Déjà remis aujourd’hui</Badge>}
              </label>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            <button type="button" className={btnPrimary} disabled={selected.size === 0 || confirm.isPending} onClick={() => confirm.mutate()}>
              <CheckCircle2 className="h-4 w-4" />
              {confirm.isPending ? 'Enregistrement…' : `Confirmer la remise (${selected.size})`}
            </button>
            <button type="button" className={btnGhost} onClick={reset}>
              Annuler
            </button>
          </div>
        </Card>
      )}

      {done && (
        <Card className="space-y-3 border-emerald-300 bg-emerald-50 dark:bg-emerald-950/30">
          <p className="flex items-center gap-2 font-semibold text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="h-5 w-5" /> Remise enregistrée
          </p>
          <p className="text-sm">
            {done.names.join(', ') || 'Élèves'} {done.at ? `· ${formatDateTime(done.at)}` : ''}
          </p>
          <button type="button" className={btnPrimary} onClick={reset}>
            Nouvelle remise
          </button>
        </Card>
      )}
    </div>
  )
}
