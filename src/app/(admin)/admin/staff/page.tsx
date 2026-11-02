'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Users, Plus, Loader2, X, Mail, Phone, BookOpen,
  CheckCircle, TrendingUp, Layers, Settings2, Monitor, KeyRound,
  Ban, UserCheck, UserMinus, Fingerprint, AlertTriangle,
} from 'lucide-react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import {
  useStaff, useCreateStaff, useDeactivateStaff, useBlockStaff, useActivateStaff, useResetStaffPassword,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import type { CreateStaffPayload, RegeneratePasswordResult } from '@/types/admin'
import { staffAttendanceApi, staffAttendanceKeys } from '@/lib/admin/api/staff-attendance.api'
import { Skeleton } from '@/components/ui/skeleton'
import { AssignDirectorSectionsModal } from '@/components/admin/staff/AssignDirectorSectionsModal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { TempPasswordRevealModal } from '@/components/ui/temp-password-reveal-modal'

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  ADMIN:    { label: 'Admin',      cls: 'bg-indigo-50 text-indigo-700' },
  TEACHER:  { label: 'Enseignant', cls: 'bg-emerald-50 text-emerald-700' },
  FINANCE:  { label: 'Finance',    cls: 'bg-amber-50 text-amber-700' },
  DIRECTOR: { label: 'Directeur',  cls: 'bg-violet-50 text-violet-700' },
  IT:       { label: 'IT / Guichet', cls: 'bg-sky-50 text-sky-700' },
  MANAGER:  { label: 'Gérant',     cls: 'bg-rose-50 text-rose-700' },
}

type StaffRoleOption = CreateStaffPayload['role']

export default function StaffPage() {
  const qc = useQueryClient()
  const { data: staff, isLoading } = useStaff()
  const createMutation = useCreateStaff()
  const deactivateMutation = useDeactivateStaff()
  const blockMutation = useBlockStaff()
  const activateMutation = useActivateStaff()
  const resetPasswordMutation = useResetStaffPassword()
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [assignTarget, setAssignTarget] = useState<{
    id: number
    name: string
  } | null>(null)
  const [resetTarget, setResetTarget] = useState<{ id: number; name: string } | null>(null)
  const [resetError, setResetError] = useState('')
  const [resetResult, setResetResult] = useState<RegeneratePasswordResult | null>(null)
  const [accountTarget, setAccountTarget] = useState<{
    id: number
    name: string
    action: 'deactivate' | 'block' | 'activate'
  } | null>(null)
  const [accountReason, setAccountReason] = useState('')
  const [accountError, setAccountError] = useState('')
  const [form, setForm] = useState<CreateStaffPayload>({
    firstName: '', lastName: '', email: '', password: '', role: 'TEACHER',
  })
  const [createAccount, setCreateAccount] = useState(true)
  const [trackAttendance, setTrackAttendance] = useState(false)
  const [attendanceScheduleId, setAttendanceScheduleId] = useState('')
  const [attendanceWarning, setAttendanceWarning] = useState('')

  const schedulesQuery = useQuery({
    queryKey: staffAttendanceKeys.schedules(),
    queryFn: () => staffAttendanceApi.listSchedules(),
    staleTime: 60_000,
  })
  const schedules = schedulesQuery.data ?? []

  // Liste unifiée : les fiches pointage sans compte de connexion apparaissent aussi dans « Personnel ».
  const accountlessQuery = useQuery({
    queryKey: staffAttendanceKeys.staffList(true),
    queryFn: () => staffAttendanceApi.listStaff(true),
    staleTime: 20_000,
  })
  const accountless = (accountlessQuery.data ?? []).filter((m) => m.userId == null)

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAttendanceWarning('')
    try {
      const firstName = form.firstName.trim()
      const lastName = form.lastName.trim()
      // Sans compte, la fiche n'existe que par le pointage : un horaire est donc obligatoire.
      const needsSchedule = !createAccount || trackAttendance
      if (needsSchedule && !attendanceScheduleId) {
        setError('Choisissez un horaire.')
        return
      }
      let createdUserId: number | null = null
      if (!needsSchedule) {
        const created = await createMutation.mutateAsync(form)
        createdUserId = created?.id ?? null
      } else {
        // Une seule requête : fiche pointage (+ compte si demandé), créés ensemble côté serveur.
        const member = await staffAttendanceApi.createStaff({
          firstName,
          lastName,
          scheduleId: Number(attendanceScheduleId),
          account: createAccount
            ? { email: form.email.trim(), password: form.password, role: form.role, phone: form.phone?.trim() || undefined }
            : undefined,
        })
        createdUserId = member?.userId ?? null
        qc.invalidateQueries({ queryKey: ['staff-attendance', 'staff'] })
        qc.invalidateQueries({ queryKey: ['admin', 'staff'] })
      }
      setShowModal(false)
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER' })
      setCreateAccount(true)
      setTrackAttendance(false)
      setAttendanceScheduleId('')
      if (createAccount && form.role === 'DIRECTOR' && createdUserId) {
        setAssignTarget({
          id: createdUserId,
          name: `${firstName} ${lastName}`.trim(),
        })
      }
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function confirmAccountAction() {
    if (!accountTarget) return
    setAccountError('')
    try {
      if (accountTarget.action === 'deactivate') {
        if (accountReason.trim().length < 10) {
          setAccountError('Motif requis (10 caractères minimum).')
          return
        }
        await deactivateMutation.mutateAsync({ id: accountTarget.id, reason: accountReason.trim() })
      } else if (accountTarget.action === 'block') {
        if (accountReason.trim().length < 10) {
          setAccountError('Motif requis (10 caractères minimum).')
          return
        }
        await blockMutation.mutateAsync({ id: accountTarget.id, reason: accountReason.trim() })
      } else {
        await activateMutation.mutateAsync({ id: accountTarget.id, note: accountReason.trim() || undefined })
      }
      setAccountTarget(null)
      setAccountReason('')
    } catch (err) {
      setAccountError(getApiErrorMessage(err))
    }
  }

  async function confirmResetPassword() {
    if (!resetTarget) return
    setResetError('')
    try {
      const data = await resetPasswordMutation.mutateAsync(resetTarget.id)
      setResetTarget(null)
      setResetResult(data)
    } catch (err) {
      setResetError(getApiErrorMessage(err))
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Personnel</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{staff?.length ?? 0} membre{(staff?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-5">
        {attendanceWarning && (
          <div className="flex items-start gap-2 text-xs font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5">
            <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
            <p className="flex-1">{attendanceWarning}</p>
            <button type="button" onClick={() => setAttendanceWarning('')} className="flex-shrink-0 text-amber-600 hover:text-amber-900">
              <X size={14} />
            </button>
          </div>
        )}
        {!isLoading && staff && staff.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { label: 'Total membres', value: staff.length + accountless.length,                icon: Users,      bg: 'bg-indigo-50',  iconCls: 'text-indigo-600' },
              { label: 'Enseignants',   value: staff.filter(m => m.role === 'TEACHER').length,   icon: BookOpen,    bg: 'bg-emerald-50', iconCls: 'text-emerald-600' },
              { label: 'Directeurs',    value: staff.filter(m => m.role === 'DIRECTOR').length,  icon: Layers,      bg: 'bg-violet-50',  iconCls: 'text-violet-600' },
              { label: 'Finance',       value: staff.filter(m => m.role === 'FINANCE').length,   icon: TrendingUp,  bg: 'bg-amber-50',   iconCls: 'text-amber-600' },
              { label: 'IT / Guichet',  value: staff.filter(m => m.role === 'IT').length,        icon: Monitor,     bg: 'bg-sky-50',     iconCls: 'text-sky-600' },
              { label: 'Actifs',        value: staff.filter(m => m.status === 'ACTIVE').length,  icon: CheckCircle, bg: 'bg-blue-50',    iconCls: 'text-blue-600' },
            ].map(({ label, value, icon: Icon, bg, iconCls }) => (
              <div key={label} className="bg-white rounded-2xl border border-zinc-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon size={15} className={iconCls} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold text-zinc-900 leading-none tabular-nums mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : (staff?.length ?? 0) + accountless.length > 0 ? (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Nom</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Rôle</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Statut</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {(staff ?? []).map((member) => {
                  const roleCfg = ROLE_CFG[member.role] ?? { label: member.role, cls: 'bg-zinc-100 text-zinc-500' }
                  return (
                    <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-700">
                              {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-zinc-900">{member.firstName} {member.lastName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          {member.email && <p className="text-xs text-zinc-500 flex items-center gap-1"><Mail size={10} />{member.email}</p>}
                          {member.phone && <p className="text-xs text-zinc-500 flex items-center gap-1"><Phone size={10} />{member.phone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', roleCfg.cls)}>{roleCfg.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full',
                          member.account?.state === 'blocked'
                            ? 'bg-red-50 text-red-700'
                            : member.account?.state === 'deactivated' || member.status === 'SUSPENDED'
                              ? 'bg-zinc-100 text-zinc-600'
                              : member.account?.state === 'pending' || member.status === 'PENDING_VERIFICATION'
                                ? 'bg-amber-50 text-amber-700'
                                : 'bg-emerald-50 text-emerald-700'
                        )}>
                          {member.account?.state === 'blocked'
                            ? 'Bloqué'
                            : member.account?.state === 'deactivated' || member.status === 'SUSPENDED'
                              ? 'Désactivé'
                              : member.account?.state === 'pending' || member.status === 'PENDING_VERIFICATION'
                                ? 'En attente'
                                : 'Actif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center gap-1">
                          {/* Préfet, ou Gérant (casquette direction : sections optionnelles). */}
                          {(member.role === 'DIRECTOR' || member.role === 'MANAGER') && (
                            <button
                              type="button"
                              title="Affecter les sections"
                              onClick={() =>
                                setAssignTarget({
                                  id: member.id,
                                  name: `${member.firstName} ${member.lastName}`.trim(),
                                })
                              }
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-violet-700 hover:bg-violet-50 transition-colors"
                            >
                              <Settings2 size={14} />
                            </button>
                          )}
                          {member.role !== 'ADMIN' && (
                            <button
                              type="button"
                              title="Réinitialiser le mot de passe"
                              onClick={() =>
                                setResetTarget({
                                  id: member.id,
                                  name: `${member.firstName} ${member.lastName}`.trim(),
                                })
                              }
                              className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                            >
                              <KeyRound size={14} />
                            </button>
                          )}
                          {member.role !== 'ADMIN' && (
                            <>
                              {member.account?.canActivate && (
                                <button
                                  type="button"
                                  title="Réactiver le compte"
                                  onClick={() =>
                                    setAccountTarget({
                                      id: member.id,
                                      name: `${member.firstName} ${member.lastName}`.trim(),
                                      action: 'activate',
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-emerald-700 hover:bg-emerald-50 transition-colors"
                                >
                                  <UserCheck size={14} />
                                </button>
                              )}
                              {(member.account?.canDeactivate ?? member.status === 'ACTIVE') && (
                                <button
                                  type="button"
                                  title="Désactiver le compte"
                                  onClick={() =>
                                    setAccountTarget({
                                      id: member.id,
                                      name: `${member.firstName} ${member.lastName}`.trim(),
                                      action: 'deactivate',
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-amber-700 hover:bg-amber-50 transition-colors"
                                >
                                  <UserMinus size={14} />
                                </button>
                              )}
                              {(member.account?.canBlock ?? member.status === 'ACTIVE') && (
                                <button
                                  type="button"
                                  title="Bloquer le compte"
                                  onClick={() =>
                                    setAccountTarget({
                                      id: member.id,
                                      name: `${member.firstName} ${member.lastName}`.trim(),
                                      action: 'block',
                                    })
                                  }
                                  className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                  <Ban size={14} />
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
                {accountless.map((m) => (
                  <tr key={`att-${m.id}`} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-100 flex items-center justify-center flex-shrink-0">
                          <span className="text-xs font-bold text-zinc-500">
                            {(m.firstName?.[0] ?? '') + (m.lastName?.[0] ?? '')}
                          </span>
                        </div>
                        <p className="text-sm font-medium text-zinc-900">{m.firstName} {m.lastName}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-400">{m.jobTitle || '—'}</td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-zinc-100 text-zinc-600">Sans compte</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full bg-sky-50 text-sky-700">
                        <Fingerprint size={11} /> Pointage · {m.terminalCode}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-[11px] text-zinc-400">
                      Gérer dans Pointage du personnel
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
              <Users size={28} className="text-zinc-200" />
              Aucun membre du personnel
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Nouveau membre</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['firstName', 'lastName'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      {field === 'firstName' ? 'Prénom' : 'Nom'}
                    </label>
                    <input
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                ))}
              </div>
              <label className="flex items-start gap-2 text-sm text-zinc-700 cursor-pointer rounded-lg border border-zinc-200 p-3">
                <input
                  type="checkbox"
                  checked={createAccount}
                  onChange={(e) => setCreateAccount(e.target.checked)}
                  className="mt-0.5 rounded border-zinc-300"
                />
                <span>
                  Créer un compte de connexion
                  <span className="block text-[11px] text-zinc-400">
                    Décochez pour enregistrer seulement la personne (sans accès à l&apos;application). Elle sera suivie au pointage.
                  </span>
                </span>
              </label>
              {createAccount && (<>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Mot de passe</label>
                <input
                  type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={12}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as StaffRoleOption }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                >
                  <option value="TEACHER">Enseignant</option>
                  <option value="FINANCE">Finance</option>
                  <option value="DIRECTOR">Directeur (chef de section)</option>
                  <option value="IT">IT / Guichet (inscriptions)</option>
                  <option value="MANAGER">Gérant (caisse + guichet + direction)</option>
                </select>
                {form.role === 'MANAGER' && (
                  <p className="mt-1.5 text-[11px] text-zinc-500">
                    Exploitation quotidienne : encaisse, inscrit, dirige. Ni barèmes, ni paramétrage ; vous
                    validez ses remises et les paiements au-dessus du seuil. Toute l’école tant qu’aucune
                    section ne lui est affectée.
                  </p>
                )}
              </div>
              </>)}
              <div className="rounded-lg border border-zinc-200 p-3">
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={trackAttendance || !createAccount}
                    onChange={(e) => setTrackAttendance(e.target.checked)}
                    disabled={schedules.length === 0 || !createAccount}
                    className="rounded border-zinc-300"
                  />
                  <Fingerprint size={13} className="text-zinc-400" />
                  Suivre aussi au pointage du personnel
                </label>
                {schedules.length === 0 ? (
                  <p className="mt-1.5 text-[11px] text-zinc-400">
                    Créez d'abord un horaire dans Pointage du personnel → Horaires.
                  </p>
                ) : trackAttendance || !createAccount ? (
                  <div className="mt-2">
                    <select
                      value={attendanceScheduleId}
                      onChange={(e) => setAttendanceScheduleId(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
                    >
                      <option value="">— Horaire —</option>
                      {schedules.map((s) => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                ) : null}
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium transition-colors"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {assignTarget && (
        <AssignDirectorSectionsModal
          userId={assignTarget.id}
          userName={assignTarget.name}
          onClose={() => setAssignTarget(null)}
        />
      )}

      <ConfirmDialog
        open={accountTarget != null}
        title={
          accountTarget?.action === 'block'
            ? 'Bloquer ce compte ?'
            : accountTarget?.action === 'activate'
              ? 'Réactiver ce compte ?'
              : 'Désactiver ce compte ?'
        }
        description={
          accountTarget
            ? accountTarget.action === 'block'
              ? `${accountTarget.name} ne pourra plus se connecter. Toutes les sessions seront révoquées.`
              : accountTarget.action === 'activate'
                ? `${accountTarget.name} pourra de nouveau se connecter.`
                : `${accountTarget.name} n’aura plus accès à l’établissement. Les sessions actives seront coupées.`
            : ''
        }
        impact={accountError ? [accountError] : []}
        variant={accountTarget?.action === 'activate' ? 'default' : 'danger'}
        confirmLabel={
          accountTarget?.action === 'block'
            ? 'Bloquer'
            : accountTarget?.action === 'activate'
              ? 'Réactiver'
              : 'Désactiver'
        }
        reasonLabel={accountTarget?.action === 'activate' ? 'Note (optionnel)' : 'Motif'}
        reasonPlaceholder={
          accountTarget?.action === 'block'
            ? 'Ex. tentative de fraude, partage de compte…'
            : accountTarget?.action === 'deactivate'
              ? 'Ex. fin de contrat, départ…'
              : 'Optionnel'
        }
        reason={accountReason}
        onReasonChange={setAccountReason}
        confirmDisabled={
          accountTarget?.action !== 'activate' && accountReason.trim().length < 10
        }
        loading={deactivateMutation.isPending || blockMutation.isPending || activateMutation.isPending}
        onConfirm={confirmAccountAction}
        onCancel={() => {
          setAccountTarget(null)
          setAccountReason('')
          setAccountError('')
        }}
      />

      <ConfirmDialog
        open={resetTarget != null}
        title="Réinitialiser le mot de passe ?"
        description={
          resetTarget
            ? `Un nouveau mot de passe temporaire sera généré pour ${resetTarget.name}. Ses sessions actives seront déconnectées.`
            : ''
        }
        impact={resetError ? [resetError] : []}
        confirmLabel="Régénérer"
        loading={resetPasswordMutation.isPending}
        onConfirm={confirmResetPassword}
        onCancel={() => { setResetTarget(null); setResetError('') }}
      />

      {resetResult && (
        <TempPasswordRevealModal
          open
          userName={`${resetResult.user.firstName} ${resetResult.user.lastName}`.trim()}
          tempPassword={resetResult.tempPassword}
          onClose={() => setResetResult(null)}
        />
      )}
    </div>
  )
}
