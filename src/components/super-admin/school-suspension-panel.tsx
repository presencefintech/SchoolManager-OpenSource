'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AlertTriangle, Ban, ShieldCheck } from 'lucide-react'
import { superAdminApi } from '@/lib/superAdmin/api'
import { queryKeys } from '@/lib/query/keys'
import { cn } from '@/lib/utils'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import type { SchoolDetail, SchoolOperationalSuspension } from '@/types/super-admin'

const CODE_LABELS: Record<SchoolOperationalSuspension['code'], string> = {
  INSOLVENCY: 'Insolvabilité (contrat SaaS)',
  CONTRACT_BREACH: 'Manquement contractuel',
  OTHER: 'Autre motif',
}

export function SchoolSuspensionPanel({ school }: { school: SchoolDetail }) {
  const qc = useQueryClient()
  const [reason, setReason] = useState('')
  const [code, setCode] = useState<SchoolOperationalSuspension['code']>('INSOLVENCY')
  const [note, setNote] = useState('')
  const [open, setOpen] = useState(false)
  const [confirmSuspendOpen, setConfirmSuspendOpen] = useState(false)

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: queryKeys.superadmin.school(school.id) })
    void qc.invalidateQueries({ queryKey: ['superadmin', 'schools'] })
  }

  const suspend = useMutation({
    mutationFn: () => superAdminApi.suspendSchool(school.id, { reason: reason.trim(), code }),
    onSuccess: () => {
      setReason('')
      setOpen(false)
      invalidate()
    },
  })

  const reactivate = useMutation({
    mutationFn: () => superAdminApi.reactivateSchool(school.id, note.trim() ? { note: note.trim() } : undefined),
    onSuccess: () => {
      setNote('')
      setOpen(false)
      invalidate()
    },
  })

  const suspended = school.active === false
  const busy = suspend.isPending || reactivate.isPending
  const suspension = school.operationalSuspension

  return (
    <div
      className={cn(
        'rounded-2xl border p-5 space-y-4',
        suspended ? 'border-red-200 bg-red-50/40' : 'border-amber-200/80 bg-amber-50/30',
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            {suspended ? <Ban size={16} className="text-red-600" /> : <AlertTriangle size={16} className="text-amber-600" />}
            Contrat & suspension
          </h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Suspendre bloque la connexion et l&apos;accès métier (guichet, admin, mobile) pour cet établissement.
          </p>
        </div>
        <span
          className={cn(
            'text-[11px] font-semibold px-2.5 py-1 rounded-full',
            suspended ? 'bg-red-100 text-red-800' : 'bg-emerald-100 text-emerald-800',
          )}
        >
          {suspended ? 'Suspendue' : 'Opérationnelle'}
        </span>
      </div>

      {suspended && suspension ? (
        <div className="rounded-xl border border-red-200 bg-white px-4 py-3 text-sm space-y-1">
          <p className="font-medium text-red-900">{CODE_LABELS[suspension.code]}</p>
          <p className="text-slate-700">{suspension.reason}</p>
          <p className="text-xs text-slate-400">
            Depuis le {new Date(suspension.suspendedAt).toLocaleString('fr-FR')}
          </p>
        </div>
      ) : null}

      {!open ? (
        <div className="flex flex-wrap gap-2">
          {suspended ? (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500"
            >
              <ShieldCheck size={14} /> Réactiver l&apos;établissement
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-500"
            >
              <Ban size={14} /> Suspendre (insolvabilité)
            </button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
          {suspended ? (
            <>
              <label className="block text-xs font-medium text-slate-600">
                Note interne (optionnel)
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  placeholder="Ex. Règlement reçu, réactivation après accord…"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => reactivate.mutate()}
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Confirmer la réactivation
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  Annuler
                </button>
              </div>
            </>
          ) : (
            <>
              <label className="block text-xs font-medium text-slate-600">
                Motif
                <select
                  value={code}
                  onChange={(e) => setCode(e.target.value as SchoolOperationalSuspension['code'])}
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                >
                  <option value="INSOLVENCY">Insolvabilité (impayé contrat SaaS)</option>
                  <option value="CONTRACT_BREACH">Manquement contractuel</option>
                  <option value="OTHER">Autre</option>
                </select>
              </label>
              <label className="block text-xs font-medium text-slate-600">
                Détail (min. 10 caractères)
                <textarea
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  rows={3}
                  placeholder="Ex. Factures SaaS impayées depuis 60 jours malgré relances…"
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                />
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || reason.trim().length < 10}
                  onClick={() => setConfirmSuspendOpen(true)}
                  className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                >
                  Confirmer la suspension
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setOpen(false)}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600"
                >
                  Annuler
                </button>
              </div>
            </>
          )}
          {(suspend.isError || reactivate.isError) && (
            <p className="text-xs text-red-600">Action impossible. Vérifiez le motif ou réessayez.</p>
          )}
        </div>
      )}
      <ConfirmDialog
        open={confirmSuspendOpen}
        title={`Suspendre « ${school.name} » ?`}
        description="Les utilisateurs ne pourront plus se connecter ni utiliser l'application pour cet établissement."
        impact={[
          'Blocage immédiat des connexions (admin, finance, mobile)',
          'Accès métier interrompu jusqu\'à réactivation',
          CODE_LABELS[code],
        ]}
        confirmLabel="Suspendre"
        variant="danger"
        loading={suspend.isPending}
        onConfirm={() => {
          suspend.mutate(undefined, {
            onSuccess: () => setConfirmSuspendOpen(false),
          })
        }}
        onCancel={() => setConfirmSuspendOpen(false)}
      />
    </div>
  )
}
