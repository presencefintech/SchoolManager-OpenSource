'use client'

import { useState } from 'react'
import { Monitor, Plus, X, Loader2, Wifi, WifiOff, AlertTriangle, Link2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import type { StaffTerminalPayload, UnmatchedCode } from '@/types/staff-attendance'
import { extractValidationMessages } from '@/lib/admin/staff-attendance.utils'
import { Skeleton } from '@/components/ui/skeleton'
import { FormErrorBlock } from './FormErrorBlock'

const OFFLINE_THRESHOLD_MS = 10 * 60 * 1000

function isOffline(lastSeenAt: string | null): boolean {
  if (!lastSeenAt) return true
  return Date.now() - new Date(lastSeenAt).getTime() > OFFLINE_THRESHOLD_MS
}

function AssignModal({
  code,
  onClose,
  onAssigned,
}: {
  code: UnmatchedCode
  onClose: () => void
  onAssigned: () => void
}) {
  const [staffId, setStaffId] = useState('')
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const staffQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(true),
    queryFn: () => staffAttendanceApi.listStaff(true),
    staleTime: 30_000,
  })
  const assignMut = useMutation({
    mutationFn: () => staffAttendanceApi.assignUnmatched(code.code, Number(staffId)),
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!staffId) {
      setError('Sélectionnez un employé.')
      return
    }
    try {
      await assignMut.mutateAsync()
      onAssigned()
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  const staff = staffQuery.data ?? []

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Rattacher le code {code.code}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={onSubmit} className="p-6 space-y-4">
          <p className="text-xs text-zinc-500">
            {code.punchCount} pointage{code.punchCount !== 1 ? 's' : ''} reçu{code.punchCount !== 1 ? 's' : ''} du terminal « {code.terminal} »
            sans employé correspondant.
          </p>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1">Employé</label>
            <select
              value={staffId}
              onChange={(e) => setStaffId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
            >
              <option value="">— Sélectionner —</option>
              {staff.map((m) => (
                <option key={m.id} value={m.id}>{m.firstName} {m.lastName}</option>
              ))}
            </select>
          </div>
          <FormErrorBlock message={error} details={validationDetails} />
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
              Annuler
            </button>
            <button
              type="submit"
              disabled={assignMut.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium"
            >
              {assignMut.isPending && <Loader2 size={14} className="animate-spin" />}
              Rattacher
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function TerminalsPanel() {
  const qc = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<StaffTerminalPayload>({ protocol: 'ZKTECO_ADMS', serialNumber: '', name: '' })
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const [assignTarget, setAssignTarget] = useState<UnmatchedCode | null>(null)

  const terminalsQuery = useQuery({
    queryKey: staffAttendanceKeys.terminals(),
    queryFn: () => staffAttendanceApi.listTerminals(),
    staleTime: 15_000,
    refetchInterval: 30_000,
  })

  const unmatchedQuery = useQuery({
    queryKey: staffAttendanceKeys.unmatched(),
    queryFn: () => staffAttendanceApi.listUnmatched(),
    staleTime: 15_000,
  })

  const createMut = useMutation({
    mutationFn: (payload: StaffTerminalPayload) => staffAttendanceApi.createTerminal(payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffAttendanceKeys.terminals() }),
  })
  const toggleMut = useMutation({
    mutationFn: ({ id, active }: { id: number; active: boolean }) => staffAttendanceApi.updateTerminal(id, { active }),
    onSuccess: () => qc.invalidateQueries({ queryKey: staffAttendanceKeys.terminals() }),
  })

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setValidationDetails([])
    try {
      await createMut.mutateAsync(form)
      setShowForm(false)
      setForm({ protocol: 'ZKTECO_ADMS', serialNumber: '', name: '' })
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  const terminals = terminalsQuery.data ?? []
  const unmatched = unmatchedQuery.data ?? []

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-zinc-800">Terminaux biométriques</h2>
            <p className="text-xs text-zinc-400 mt-0.5">Boîtiers ZKTeco installés à l'école.</p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>

        {terminalsQuery.isLoading ? (
          <div className="space-y-2">{[...Array(2)].map((_, i) => <Skeleton key={i} className="h-16" />)}</div>
        ) : terminals.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2 text-sm text-zinc-400 bg-white rounded-2xl border border-zinc-100">
            <Monitor size={28} className="text-zinc-200" />
            Aucun terminal enregistré
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {terminals.map((t) => {
              const offline = !t.active ? false : isOffline(t.lastSeenAt)
              return (
                <div key={t.id} className="bg-white rounded-2xl border border-zinc-200 p-4 space-y-2">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-semibold text-zinc-900">{t.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{t.serialNumber}</p>
                    </div>
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full',
                        !t.active
                          ? 'bg-zinc-100 text-zinc-500'
                          : offline
                            ? 'bg-red-50 text-red-700'
                            : 'bg-emerald-50 text-emerald-700',
                      )}
                    >
                      {!t.active ? <WifiOff size={11} /> : offline ? <WifiOff size={11} /> : <Wifi size={11} />}
                      {!t.active ? 'Désactivé' : offline ? 'Hors ligne' : 'En ligne'}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Vu : {t.lastSeenAt ? new Date(t.lastSeenAt).toLocaleString('fr-FR') : 'jamais'}
                  </p>
                  {t.commandsFailed > 0 && (
                    <p className="text-xs text-amber-700 flex items-center gap-1">
                      <AlertTriangle size={11} /> {t.commandsFailed} commande{t.commandsFailed !== 1 ? 's' : ''} en échec
                    </p>
                  )}
                  <button
                    type="button"
                    onClick={() => toggleMut.mutate({ id: t.id, active: !t.active })}
                    disabled={toggleMut.isPending}
                    className="text-xs font-medium text-zinc-500 hover:text-emerald-700"
                  >
                    {t.active ? 'Désactiver' : 'Réactiver (renvoie tout le personnel)'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-zinc-800">Codes non rattachés</h2>
          {unmatched.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
              {unmatched.length}
            </span>
          )}
        </div>
        {unmatchedQuery.isLoading ? (
          <Skeleton className="h-20" />
        ) : unmatched.length === 0 ? (
          <p className="text-xs text-zinc-400">Aucun pointage orphelin.</p>
        ) : (
          <div className="bg-white rounded-2xl border border-amber-200 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100 bg-amber-50/50">
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2.5">Code</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2.5">Terminal</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2.5">Pointages</th>
                  <th className="text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide px-4 py-2.5">Premier / dernier</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {unmatched.map((u) => (
                  <tr key={u.code}>
                    <td className="px-4 py-2.5 text-sm font-mono font-semibold text-zinc-800">{u.code}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-500">{u.terminal}</td>
                    <td className="px-4 py-2.5 text-sm text-zinc-500">{u.punchCount}</td>
                    <td className="px-4 py-2.5 text-xs text-zinc-400">
                      {new Date(u.firstSeenAt).toLocaleDateString('fr-FR')} → {new Date(u.lastSeenAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => setAssignTarget(u)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Link2 size={12} /> Rattacher
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Nouveau terminal</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  placeholder="Ex. Entrée principale"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Numéro de série</label>
                <input
                  value={form.serialNumber}
                  onChange={(e) => setForm((f) => ({ ...f, serialNumber: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm font-mono"
                />
              </div>
              <FormErrorBlock message={error} details={validationDetails} />
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium"
                >
                  {createMut.isPending && <Loader2 size={14} className="animate-spin" />}
                  Ajouter
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {assignTarget && (
        <AssignModal
          code={assignTarget}
          onClose={() => setAssignTarget(null)}
          onAssigned={() => {
            setAssignTarget(null)
            qc.invalidateQueries({ queryKey: staffAttendanceKeys.unmatched() })
          }}
        />
      )}
    </div>
  )
}
