'use client'

import { useState } from 'react'
import { Users, Plus, X, Loader2, Fingerprint, UserCheck, UserMinus, Pencil, Copy, Check, Search, Upload, Link2, Link2Off } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useStaff } from '@/lib/hooks/use-admin'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import type { AttendanceStaffMember, AttendanceStaffPayload, StaffAccountInput } from '@/types/staff-attendance'
import { extractValidationMessages } from '@/lib/admin/staff-attendance.utils'
import { Skeleton } from '@/components/ui/skeleton'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { FormErrorBlock } from './FormErrorBlock'
import { ImportStaffModal } from './ImportStaffModal'

function CopyCodeButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(code)
          setCopied(true)
          setTimeout(() => setCopied(false), 1500)
        } catch {
          /* presse-papier indisponible */
        }
      }}
      title="Copier le code terminal"
      className="p-1 rounded text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50"
    >
      {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
    </button>
  )
}

export function StaffPanel({ onOpenCalendar }: { onOpenCalendar: (staffId: number) => void }) {
  const qc = useQueryClient()
  const [activeFilter, setActiveFilter] = useState<'all' | 'active' | 'inactive'>('active')
  const [search, setSearch] = useState('')
  const [showImport, setShowImport] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<AttendanceStaffMember | null>(null)
  const emptyForm = {
    firstName: '', lastName: '', jobTitle: '', scheduleId: '', accountId: '',
    createAccount: false, email: '', password: '', phone: '', role: 'TEACHER' as StaffAccountInput['role'],
  }
  const [form, setForm] = useState(emptyForm)
  const [error, setError] = useState('')
  const [validationDetails, setValidationDetails] = useState<string[]>([])
  const [confirmTarget, setConfirmTarget] = useState<{ member: AttendanceStaffMember; action: 'deactivate' | 'reactivate' } | null>(null)
  const [confirmError, setConfirmError] = useState('')

  const staffQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(activeFilter === 'all' ? undefined : activeFilter === 'active'),
    queryFn: () => staffAttendanceApi.listStaff(activeFilter === 'all' ? undefined : activeFilter === 'active'),
    staleTime: 20_000,
  })

  const schedulesQuery = useQuery({
    queryKey: staffAttendanceKeys.schedules(),
    queryFn: () => staffAttendanceApi.listSchedules(),
    staleTime: 60_000,
  })

  /** Tous les employés pointés (sans filtre actif/inactif) : pour savoir quels comptes sont déjà liés. */
  const allStaffQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(),
    queryFn: () => staffAttendanceApi.listStaff(),
    staleTime: 20_000,
  })

  /** Comptes de connexion existants (« Personnel » / /admin/staff) — pour lier un employé pointé. */
  const accountsQuery = useStaff()

  function invalidateStaff() {
    qc.invalidateQueries({ queryKey: ['staff-attendance', 'staff'] })
  }

  const createMut = useMutation({
    mutationFn: (payload: AttendanceStaffPayload) => staffAttendanceApi.createStaff(payload),
    onSuccess: invalidateStaff,
  })
  const updateMut = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: Partial<AttendanceStaffPayload> }) =>
      staffAttendanceApi.updateStaff(id, payload),
    onSuccess: invalidateStaff,
  })
  const deactivateMut = useMutation({
    mutationFn: (id: number) => staffAttendanceApi.deactivateStaff(id),
    onSuccess: invalidateStaff,
  })
  const reactivateMut = useMutation({
    mutationFn: (id: number) => staffAttendanceApi.reactivateStaff(id),
    onSuccess: invalidateStaff,
  })

  function openCreate() {
    setEditing(null)
    setForm({ ...emptyForm, scheduleId: schedules[0] ? String(schedules[0].id) : '' })
    setError('')
    setValidationDetails([])
    setShowForm(true)
  }

  function openEdit(m: AttendanceStaffMember) {
    setEditing(m)
    setForm({
      ...emptyForm,
      firstName: m.firstName,
      lastName: m.lastName,
      jobTitle: m.jobTitle ?? '',
      scheduleId: m.scheduleId ? String(m.scheduleId) : '',
      accountId: m.userId ? String(m.userId) : '',
    })
    setError('')
    setValidationDetails([])
    setShowForm(true)
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    if (!form.scheduleId) {
      setError('Un horaire est requis.')
      return
    }
    const payload: AttendanceStaffPayload = {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      jobTitle: form.jobTitle.trim() || undefined,
      scheduleId: Number(form.scheduleId),
      // `null` explicite en édition pour pouvoir délier un compte déjà rattaché ; `undefined`
      // à la création quand aucun compte n'est choisi, pour ne pas envoyer le champ.
      userId: !editing && form.createAccount ? undefined : form.accountId ? Number(form.accountId) : editing ? null : undefined,
      account:
        !editing && form.createAccount
          ? {
              email: form.email.trim(),
              password: form.password,
              role: form.role,
              phone: form.phone.trim() || undefined,
            }
          : undefined,
    }
    try {
      if (editing) {
        await updateMut.mutateAsync({ id: editing.id, payload })
      } else {
        await createMut.mutateAsync(payload)
      }
      setShowForm(false)
    } catch (err) {
      setError(getApiErrorMessage(err))
      setValidationDetails(extractValidationMessages(err))
    }
  }

  async function confirmAction() {
    if (!confirmTarget) return
    setConfirmError('')
    try {
      if (confirmTarget.action === 'deactivate') {
        await deactivateMut.mutateAsync(confirmTarget.member.id)
      } else {
        await reactivateMut.mutateAsync(confirmTarget.member.id)
      }
      setConfirmTarget(null)
    } catch (err) {
      setConfirmError(getApiErrorMessage(err))
    }
  }

  const staff = staffQuery.data ?? []
  const schedules = schedulesQuery.data ?? []
  const accounts = accountsQuery.data ?? []
  // Comptes déjà liés à un AUTRE employé pointé (un compte = au plus un employé).
  const takenAccountIds = new Set(
    (allStaffQuery.data ?? []).filter((m) => m.userId != null && m.id !== editing?.id).map((m) => m.userId as number),
  )
  const linkableAccounts = accounts.filter((a) => !takenAccountIds.has(a.id))
  const linkedAccountById = new Map(accounts.map((a) => [a.id, a]))
  const q = search.trim().toLowerCase()
  const filteredStaff = q
    ? staff.filter((m) => `${m.firstName} ${m.lastName} ${m.jobTitle ?? ''}`.toLowerCase().includes(q))
    : staff

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-sm font-semibold text-zinc-800">Personnel pointé</h2>
          <p className="text-xs text-zinc-400 mt-0.5">
            Chaque employé créé reçoit un code terminal — à utiliser pour enrôler son empreinte ou son visage.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher…"
              className="pl-8 pr-3 py-1.5 w-40 rounded-lg border border-zinc-200 text-xs"
            />
          </div>
          <div className="inline-flex gap-1 p-1 bg-zinc-100 rounded-xl">
            {(['active', 'inactive', 'all'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setActiveFilter(f)}
                className={cn(
                  'px-3 py-1 rounded-lg text-xs font-medium transition-colors',
                  activeFilter === f ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
                )}
              >
                {f === 'active' ? 'Actifs' : f === 'inactive' ? 'Désactivés' : 'Tous'}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setShowImport(true)}
            disabled={schedules.length === 0}
            title={schedules.length === 0 ? "Créez d'abord un horaire" : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium border border-zinc-200 text-zinc-700 rounded-xl hover:bg-zinc-50 disabled:text-zinc-300"
          >
            <Upload size={14} /> Importer CSV
          </button>
          <button
            type="button"
            onClick={openCreate}
            disabled={schedules.length === 0}
            title={schedules.length === 0 ? "Créez d'abord un horaire" : undefined}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-zinc-200 disabled:text-zinc-400"
          >
            <Plus size={14} /> Ajouter
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-zinc-200 overflow-hidden">
        {staffQuery.isLoading ? (
          <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
        ) : filteredStaff.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
            <Users size={28} className="text-zinc-200" />
            {q ? 'Aucun résultat pour cette recherche' : `Aucun employé ${activeFilter === 'active' ? 'actif' : activeFilter === 'inactive' ? 'désactivé' : ''}`}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Employé</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Fonction</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Horaire</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-4 py-3">Code terminal</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filteredStaff.map((m) => (
                  <tr key={m.id} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => onOpenCalendar(m.id)}
                        className="text-sm font-medium text-zinc-900 hover:text-emerald-700 hover:underline"
                      >
                        {m.firstName} {m.lastName}
                      </button>
                      {!m.active && (
                        <span className="ml-2 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-100 text-zinc-500">
                          Désactivé
                        </span>
                      )}
                      {m.userId != null ? (
                        <span
                          title={`Compte lié : ${linkedAccountById.get(m.userId)?.email ?? `#${m.userId}`}`}
                          className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-sky-50 text-sky-700"
                        >
                          <Link2 size={9} /> Compte lié
                        </span>
                      ) : (
                        <span
                          title="Aucun compte de connexion lié"
                          className="ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-zinc-50 text-zinc-400"
                        >
                          <Link2Off size={9} /> Sans compte
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{m.jobTitle || '—'}</td>
                    <td className="px-4 py-3 text-sm text-zinc-500">{m.scheduleName || '—'}</td>
                    <td className="px-4 py-3">
                      <div className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-50 border border-zinc-100">
                        <Fingerprint size={12} className="text-zinc-400" />
                        <span className="text-xs font-mono font-semibold text-zinc-700">{m.terminalCode}</span>
                        <CopyCodeButton code={m.terminalCode} />
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          title="Modifier"
                          onClick={() => openEdit(m)}
                          className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50"
                        >
                          <Pencil size={14} />
                        </button>
                        {m.active ? (
                          <button
                            type="button"
                            title="Désactiver"
                            onClick={() => { setConfirmTarget({ member: m, action: 'deactivate' }); setConfirmError('') }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-700 hover:bg-amber-50"
                          >
                            <UserMinus size={14} />
                          </button>
                        ) : (
                          <button
                            type="button"
                            title="Réactiver"
                            onClick={() => { setConfirmTarget({ member: m, action: 'reactivate' }); setConfirmError('') }}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50"
                          >
                            <UserCheck size={14} />
                          </button>
                        )}
                      </div>
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
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">{editing ? "Modifier l'employé" : 'Nouvel employé'}</h2>
              <button onClick={() => setShowForm(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={onSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Prénom</label>
                  <input
                    value={form.firstName}
                    onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-600 mb-1">Nom</label>
                  <input
                    value={form.lastName}
                    onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))}
                    required
                    className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Fonction (optionnel)</label>
                <input
                  value={form.jobTitle}
                  onChange={(e) => setForm((f) => ({ ...f, jobTitle: e.target.value }))}
                  placeholder="Ex. Comptable, Gardien…"
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Horaire</label>
                <select
                  value={form.scheduleId}
                  onChange={(e) => setForm((f) => ({ ...f, scheduleId: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
                >
                  <option value="">— Sélectionner —</option>
                  {schedules.map((s) => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>
              {!editing && (
                <div className="rounded-xl border border-zinc-200 p-3 space-y-3">
                  <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={form.createAccount}
                      onChange={(e) => setForm((f) => ({ ...f, createAccount: e.target.checked, accountId: '' }))}
                      className="mt-0.5"
                    />
                    <span>
                      Créer aussi un compte de connexion
                      <span className="block text-[11px] text-zinc-400">
                        L&apos;employé apparaît dans « Personnel » avec un accès à l&apos;application. Sinon, il y apparaît quand même, sans compte.
                      </span>
                    </span>
                  </label>
                  {form.createAccount && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                          placeholder="E-mail"
                          required
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                        />
                        <select
                          value={form.role}
                          onChange={(e) => setForm((f) => ({ ...f, role: e.target.value as StaffAccountInput['role'] }))}
                          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
                        >
                          <option value="TEACHER">Enseignant</option>
                          <option value="FINANCE">Finance</option>
                          <option value="DIRECTOR">Directeur</option>
                          <option value="IT">Informatique</option>
                          <option value="MANAGER">Gérant</option>
                        </select>
                      </div>
                      <input
                        type="password"
                        value={form.password}
                        onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                        placeholder="Mot de passe (12 car. min., maj., min., chiffre, @$!%*?&)"
                        required
                        minLength={12}
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                      />
                      <input
                        value={form.phone}
                        onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                        placeholder="Téléphone (optionnel)"
                        className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}
              {(editing || !form.createAccount) && (
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Compte de connexion lié (optionnel)</label>
                <select
                  value={form.accountId}
                  onChange={(e) => setForm((f) => ({ ...f, accountId: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
                >
                  <option value="">— Aucun (employé sans connexion) —</option>
                  {linkableAccounts.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.firstName} {a.lastName} · {a.email ?? a.role}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-[11px] text-zinc-400">
                  Pour un employé qui a aussi un compte dans « Personnel » (ADMIN, enseignant…). Laissez vide pour un
                  employé pointé uniquement (ex. gardien sans accès à l'application).
                </p>
              </div>
              )}
              <FormErrorBlock message={error} details={validationDetails} />
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={createMut.isPending || updateMut.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium"
                >
                  {(createMut.isPending || updateMut.isPending) && <Loader2 size={14} className="animate-spin" />}
                  {editing ? 'Enregistrer' : 'Créer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={confirmTarget != null}
        title={confirmTarget?.action === 'deactivate' ? 'Désactiver cet employé ?' : 'Réactiver cet employé ?'}
        description={
          confirmTarget
            ? confirmTarget.action === 'deactivate'
              ? `${confirmTarget.member.firstName} ${confirmTarget.member.lastName} sera retiré des terminaux. L'historique de pointage est conservé.`
              : `${confirmTarget.member.firstName} ${confirmTarget.member.lastName} sera de nouveau envoyé aux terminaux.`
            : ''
        }
        impact={confirmError ? [confirmError] : []}
        variant={confirmTarget?.action === 'deactivate' ? 'danger' : 'default'}
        confirmLabel={confirmTarget?.action === 'deactivate' ? 'Désactiver' : 'Réactiver'}
        loading={deactivateMut.isPending || reactivateMut.isPending}
        onConfirm={confirmAction}
        onCancel={() => { setConfirmTarget(null); setConfirmError('') }}
      />

      {showImport && (
        <ImportStaffModal
          schedules={schedules}
          onClose={() => setShowImport(false)}
          onDone={() => {
            setShowImport(false)
            invalidateStaff()
          }}
        />
      )}
    </div>
  )
}
