'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Mail, UserPlus, Trash2, RefreshCw, Copy, Check } from 'lucide-react'
import { useInvitationStatus, useGenerateParentCode, useRevokeParentCode, useInviteStaff, useRevokeStaffInvitation, useResendStaffInvitation, useStudents } from '@/lib/hooks/use-admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import type { InviteStaffPayload, StaffInvitation } from '@/types/admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatPhoneToE164, isValidInternationalPhone } from '@/lib/phone/validation'
import { StaffInvitationRowActions } from '@/components/invitations/staff-invitation-row-actions'
import { staffApi } from '@/lib/admin/api/staff.api'

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700 transition-colors"
      title="Copier"
    >
      {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
    </button>
  )
}

function ParentCodesTab() {
  const { data, isLoading, refetch } = useInvitationStatus()
  const generateCode = useGenerateParentCode()
  const revokeCode = useRevokeParentCode()
  const [studentId, setStudentId] = useState('')
  const { data: studentsData, isLoading: studentsLoading } = useStudents({ limit: 200, status: 'ACTIVE' })

  const codes = data?.parentCodes ?? []
  const students = studentsData?.data ?? []

  const handleGenerate = () => {
    const id = Number(studentId)
    if (!id) return
    generateCode.mutate({ studentId: id }, { onSuccess: () => { setStudentId(''); refetch() } })
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Générer un code</h3>
        <div className="flex gap-2">
          <select
            value={studentId}
            onChange={e => setStudentId(e.target.value)}
            disabled={studentsLoading}
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">— Sélectionner un élève —</option>
            {students.map(s => (
              <option key={s.id} value={String(s.id)}>
                {formatStudentFullName(s)}{s.className ? ` · ${s.className}` : ''}{s.matricule ? ` (${s.matricule})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleGenerate}
            disabled={!studentId || generateCode.isPending}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <UserPlus size={14} />
            Générer
          </button>
        </div>
        {generateCode.isError && (
          <p className="mt-2 text-xs text-red-500">Erreur lors de la génération</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Codes actifs ({codes.length})</h3>
          <button onClick={() => refetch()} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        {isLoading ? (
          <div className="p-6 text-center text-sm text-zinc-400">Chargement…</div>
        ) : codes.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-400">Aucun code d'invitation parent</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Élève</th>
                <th className="px-4 py-2 text-left">Code</th>
                <th className="px-4 py-2 text-left">Expiration</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {codes.map(c => (
                <tr key={c.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-medium text-zinc-800">
                    {c.student ? formatStudentFullName(c.student) : `Élève #${c.studentId}`}
                    {c.student?.matricule && <span className="ml-1.5 text-xs text-zinc-400">{c.student.matricule}</span>}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1">
                      <code className="font-mono text-xs bg-zinc-100 px-1.5 py-0.5 rounded">{c.code}</code>
                      <CopyButton text={c.code} />
                    </div>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">
                    {c.expiresAt ? new Date(c.expiresAt).toLocaleDateString('fr') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => revokeCode.mutate(c.id)}
                      disabled={revokeCode.isPending}
                      className="p-1 text-zinc-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                      title="Révoquer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

function StaffInvitationsTab() {
  const { data, isLoading, refetch } = useInvitationStatus()
  const inviteStaff = useInviteStaff()
  const revokeInvitation = useRevokeStaffInvitation()
  const resendInvitation = useResendStaffInvitation()
  const qc = useQueryClient()
  const suspendStaff = useMutation({
    mutationFn: (userId: number) => staffApi.disable(userId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['admin', 'invitations'] }),
  })

  const [form, setForm] = useState<InviteStaffPayload>({ email: '', phone: '', role: 'TEACHER', firstName: '', lastName: '' })
  const [inviteError, setInviteError] = useState('')
  const [revokeError, setRevokeError] = useState('')

  const invitations = data?.staffInvitations ?? []

  const handleSuspend = (inv: StaffInvitation) => {
    if (!inv.userId) return
    if (!confirm(`Suspendre le compte de ${inv.firstName} ${inv.lastName} ?`)) return
    setRevokeError('')
    suspendStaff.mutate(inv.userId, {
      onSuccess: () => refetch(),
      onError: (err) => setRevokeError(getApiErrorMessage(err)),
    })
  }

  const handleRevoke = (inv: StaffInvitation) => {
    if (!confirm(`Supprimer l'invitation de ${inv.firstName} ${inv.lastName} (${inv.email}) ?`)) return
    setRevokeError('')
    revokeInvitation.mutate(
      { invitationId: inv.id, targetUserId: inv.userId ?? undefined },
      {
        onSuccess: () => refetch(),
        onError: (err) => setRevokeError(getApiErrorMessage(err)),
      },
    )
  }

  const handleInvite = () => {
    if (!form.email || !form.firstName || !form.lastName || !form.phone) return
    if (!isValidInternationalPhone(form.phone)) {
      setInviteError('Numéro de téléphone invalide pour le pays sélectionné.')
      return
    }
    setInviteError('')
    inviteStaff.mutate(
      { ...form, phone: formatPhoneToE164(form.phone) },
      {
        onSuccess: () => {
          setForm({ email: '', phone: '', role: 'TEACHER', firstName: '', lastName: '', })
          refetch()
        },
        onError: (err) => setInviteError(getApiErrorMessage(err)),
      },
    )
  }

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      PENDING: 'bg-yellow-50 text-yellow-700 border-yellow-200',
      ACCEPTED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      REVOKED: 'bg-zinc-100 text-zinc-500 border-zinc-200',
    }
    return map[status] ?? 'bg-zinc-100 text-zinc-500 border-zinc-200'
  }

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Inviter un membre du staff</h3>
        <div className="grid grid-cols-2 gap-2 mb-2">
          <input placeholder="Prénom" value={form.firstName} onChange={e => setForm(f => ({ ...f, firstName: e.target.value }))}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input placeholder="Nom" value={form.lastName} onChange={e => setForm(f => ({ ...f, lastName: e.target.value }))}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <input placeholder="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500" />
          <PhoneInput
            value={form.phone}
            onChange={(phone) => setForm(f => ({ ...f, phone }))}
            showError={false}
          />
          <select value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
            <option value="TEACHER">Enseignant</option>
            <option value="FINANCE">Finance</option>
            <option value="DIRECTOR">Directeur</option>
          </select>
        </div>
        <button
          onClick={handleInvite}
          disabled={!form.email || !form.phone || !isValidInternationalPhone(form.phone) || !form.firstName || !form.lastName || inviteStaff.isPending}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          <Mail size={14} />
          Envoyer l'invitation
        </button>
        {inviteError && (
          <p className="mt-2 text-xs text-red-600">{inviteError}</p>
        )}
        {inviteStaff.isError && !inviteError && (
          <p className="mt-2 text-xs text-red-500">Erreur lors de l&apos;envoi</p>
        )}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h3 className="text-sm font-semibold text-zinc-700">Invitations envoyées ({invitations.length})</h3>
          <button onClick={() => refetch()} className="text-zinc-400 hover:text-zinc-600 transition-colors">
            <RefreshCw size={14} />
          </button>
        </div>
        {revokeError && (
          <p className="px-4 py-2 text-xs text-red-600 border-b border-red-100 bg-red-50">{revokeError}</p>
        )}
        {isLoading ? (
          <div className="p-6 text-center text-sm text-zinc-400">Chargement…</div>
        ) : invitations.length === 0 ? (
          <div className="p-6 text-center text-sm text-zinc-400">Aucune invitation envoyée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Nom</th>
                <th className="px-4 py-2 text-left">Email</th>
                <th className="px-4 py-2 text-left">Rôle</th>
                <th className="px-4 py-2 text-left">Étape</th>
                <th className="px-4 py-2 text-left">Statut compte</th>
                <th className="px-4 py-2 text-left">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {invitations.map(inv => (
                <tr key={inv.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-medium text-zinc-800">{inv.firstName} {inv.lastName}</td>
                  <td className="px-4 py-2.5 text-zinc-600">{inv.email}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">{inv.role}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-600 text-xs">
                    {inv.verificationLabel ?? inv.verificationStep ?? '—'}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge(inv.status)}`}>{inv.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-xs text-zinc-600">{inv.userStatus ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <StaffInvitationRowActions
                      inv={inv}
                      resendPending={resendInvitation.isPending}
                      revokePending={revokeInvitation.isPending}
                      suspendPending={suspendStaff.isPending}
                      onResend={() => resendInvitation.mutate(inv.userId!, { onSuccess: () => refetch() })}
                      onDelete={() => handleRevoke(inv)}
                      onSuspend={() => handleSuspend(inv)}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}

export default function InvitationsPage() {
  const [tab, setTab] = useState<'parents' | 'staff'>('parents')

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold text-zinc-900">Invitations</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Gérez les codes d'accès parents et les invitations staff</p>
      </motion.div>

      <motion.div
        className="flex gap-1 p-1 bg-zinc-100 rounded-xl w-fit"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.25, delay: 0.08 }}
      >
        {([['parents', 'Codes Parents'], ['staff', 'Staff']] as const).map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 text-sm font-medium rounded-lg transition-all ${
              tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            }`}
          >{label}</button>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: 0.15 }}>
        {tab === 'parents' ? <ParentCodesTab /> : <StaffInvitationsTab />}
      </motion.div>
    </div>
  )
}
