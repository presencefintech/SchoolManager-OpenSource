'use client'

import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, Loader2, AlertTriangle, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import { extractValidationMessages } from '@/lib/admin/staff-attendance.utils'
import { FormErrorBlock } from './FormErrorBlock'

const WARNING_STYLE: Record<string, string> = {
  ALERT_NEVER_SENT: 'bg-red-50 text-red-700 border-red-200',
  SEND_TIME_BEFORE_LATE_LIMIT: 'bg-amber-50 text-amber-800 border-amber-200',
  NO_RECIPIENT: 'bg-red-50 text-red-700 border-red-200',
}

export function AlertSettingsPanel() {
  const qc = useQueryClient()
  const settingsQuery = useQuery({
    queryKey: staffAttendanceKeys.alertSettings(),
    queryFn: () => staffAttendanceApi.getAlertSettings(),
    staleTime: 15_000,
  })

  const [enabled, setEnabled] = useState(false)
  const [sendTime, setSendTime] = useState('09:00')
  const [extraRecipientIds, setExtraRecipientIds] = useState<number[]>([])
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (settingsQuery.data) {
      setEnabled(settingsQuery.data.enabled)
      setSendTime(settingsQuery.data.sendTime)
      setExtraRecipientIds(settingsQuery.data.extraRecipientIds)
    }
  }, [settingsQuery.data])

  const saveMut = useMutation({
    mutationFn: () => staffAttendanceApi.updateAlertSettings({ enabled, sendTime, extraRecipientIds }),
    onSuccess: (data) => {
      qc.setQueryData(staffAttendanceKeys.alertSettings(), data)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    },
  })

  async function onSave() {
    setError('')
    setValidationDetails([])
    try {
      await saveMut.mutateAsync()
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  function toggleRecipient(id: number) {
    setExtraRecipientIds((ids) => (ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < 3 ? [...ids, id] : ids))
  }

  const data = settingsQuery.data
  const candidates = (data?.recipients ?? []).filter((r) => !r.isDefault && r.hasPhone)
  const defaultRecipients = (data?.recipients ?? []).filter((r) => r.isDefault)

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-sm font-semibold text-zinc-800">Alerte matinale</h2>
        <p className="text-xs text-zinc-400 mt-0.5">
          Un message quotidien avec les absents et les retards, envoyé à la direction (app, push, WhatsApp ou SMS).
        </p>
      </div>

      {data?.warnings.map((w) => (
        <div key={w.code} className={cn('flex items-start gap-2 text-xs font-medium rounded-lg px-3 py-2.5 border', WARNING_STYLE[w.code] ?? 'bg-zinc-50 text-zinc-600 border-zinc-200')}>
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <div className="space-y-1.5">
            <p>{w.message}</p>
            {w.code === 'ALERT_NEVER_SENT' && w.suggestedTime && (
              <button
                type="button"
                onClick={() => setSendTime(w.suggestedTime as string)}
                className="inline-block px-2 py-1 rounded-md bg-white border border-current text-[11px] font-semibold hover:bg-red-100"
              >
                Utiliser {w.suggestedTime}
              </button>
            )}
          </div>
        </div>
      ))}

      <div className="bg-white rounded-2xl border border-zinc-200 p-5 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Bell size={15} className="text-zinc-400" />
            <span className="text-sm font-medium text-zinc-800">Alerte activée</span>
          </div>
          <button
            type="button"
            onClick={() => setEnabled((v) => !v)}
            className={cn('relative w-11 h-6 rounded-full transition-colors', enabled ? 'bg-emerald-600' : 'bg-zinc-200')}
          >
            <span className={cn('absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform', enabled && 'translate-x-5')} />
          </button>
        </div>

        <div>
          <label className="block text-xs font-medium text-zinc-600 mb-1">Heure d'envoi</label>
          <input
            type="time"
            min="06:00"
            max="12:00"
            value={sendTime}
            onChange={(e) => setSendTime(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
          />
          <p className="text-[11px] text-zinc-400 mt-1">Entre 06:00 et 12:00, heure locale de l'école.</p>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-600 mb-2">Destinataires par défaut</p>
          <div className="flex flex-wrap gap-1.5">
            {defaultRecipients.length === 0 ? (
              <span className="text-xs text-zinc-400">Aucun</span>
            ) : (
              defaultRecipients.map((r) => (
                <span key={r.id} className="text-xs px-2 py-1 rounded-lg bg-zinc-100 text-zinc-600">
                  {r.firstName} {r.lastName}
                </span>
              ))
            )}
          </div>
        </div>

        <div>
          <p className="text-xs font-medium text-zinc-600 mb-2">Destinataires supplémentaires (0 à 3)</p>
          {candidates.length === 0 ? (
            <p className="text-xs text-zinc-400 flex items-center gap-1.5"><Users size={12} /> Aucun compte avec téléphone disponible.</p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {candidates.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => toggleRecipient(r.id)}
                  disabled={!extraRecipientIds.includes(r.id) && extraRecipientIds.length >= 3}
                  className={cn(
                    'px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-colors disabled:opacity-40',
                    extraRecipientIds.includes(r.id)
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : 'border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                  )}
                >
                  {r.firstName} {r.lastName}
                </button>
              ))}
            </div>
          )}
        </div>

        {data?.lastProcessedOn && (
          <p className="text-[11px] text-zinc-400">Dernière alerte : {new Date(data.lastProcessedOn).toLocaleDateString('fr-FR')}</p>
        )}

        <FormErrorBlock message={error} details={validationDetails} />
        {saved && <p className="text-xs text-emerald-600">Réglages enregistrés.</p>}

        <button
          type="button"
          onClick={onSave}
          disabled={saveMut.isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
        >
          {saveMut.isPending && <Loader2 size={14} className="animate-spin" />}
          Enregistrer
        </button>
      </div>
    </div>
  )
}
