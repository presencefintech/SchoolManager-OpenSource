'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  LogOut, KeyRound, Trash2, Mail, QrCode,
  CheckCircle2, AlertCircle, Loader2, RefreshCw, Users,
  UserPlus, Shield, BookUser, Copy, Check, Info,
} from 'lucide-react'
import {
  useActiveSessions,
  useSchools,
  useSchoolInvitations,
  useInviteStaffSuperAdmin,
  useRevokeStaffInvitationSuperAdmin,
  useResendStaffInvitationSuperAdmin,
  useSuspendUserSuperAdmin,
  useReactivateUserSuperAdmin,
} from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import { invitationsApi } from '@/lib/superAdmin/api/invitations.api'
import { getApiErrorMessage } from '@/lib/api/client'
import type { StaffInvitation } from '@/types/super-admin'
import { cn } from '@/lib/utils'
import { Skeleton } from '@/components/ui/skeleton'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatPhoneToE164, isValidInternationalPhone } from '@/lib/phone/validation'
import { StaffInvitationRowActions } from '@/components/invitations/staff-invitation-row-actions'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'

function CopyInline({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500) }}
      className="p-1 rounded hover:bg-zinc-100 text-zinc-400 hover:text-zinc-700"
      title="Copier"
    >
      {copied ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
    </button>
  )
}

/* ── helpers ──────────────────────────────────────────────────────────────── */
function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

type FeedbackState = { type: 'success' | 'error'; message: string } | null

function Feedback({ state }: { state: FeedbackState }) {
  if (!state) return null
  return (
    <div className={cn(
      'flex items-center gap-2 rounded-xl px-4 py-3 text-sm mt-3',
      state.type === 'success' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
    )}>
      {state.type === 'success'
        ? <CheckCircle2 size={14} className="flex-shrink-0" />
        : <AlertCircle size={14} className="flex-shrink-0" />
      }
      {state.message}
    </div>
  )
}

function ActionCard({
  icon: Icon, title, desc, color, children,
}: {
  icon: React.ElementType; title: string; desc: string; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center', color)}>
          <Icon size={16} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-900">{title}</p>
          <p className="text-xs text-zinc-400">{desc}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

const ROLE_OPTIONS = [
  { value: 'ADMIN',   label: 'Administrateur' },
  { value: 'FINANCE', label: 'Finance' },
  { value: 'TEACHER', label: 'Enseignant' },
  { value: 'DIRECTOR', label: 'Directeur' },
  { value: 'IT',      label: 'IT / Guichet' },
]

const STATUS_COLORS: Record<string, string> = {
  PENDING:  'bg-amber-50 text-amber-700',
  ACCEPTED: 'bg-emerald-50 text-emerald-700',
  EXPIRED:  'bg-zinc-100 text-zinc-400',
  REVOKED:  'bg-red-50 text-red-500',
}

/* ══════════════════════════════════════════════════════════════════════════ */

export default function AuthManagementPage() {
  const { data: sessions, isLoading: loadingSessions, refetch: refetchSessions } = useActiveSessions()
  const { data: schools } = useSchools()

  /* Invitations school selector */
  const [invSchoolId, setInvSchoolId] = useState<number | null>(null)
  const { data: schoolInvitations, isLoading: loadingInvitations, refetch: refetchInvitations } =
    useSchoolInvitations(invSchoolId ?? 0)
  const inviteStaffMutation = useInviteStaffSuperAdmin()
  const revokeStaffMutation = useRevokeStaffInvitationSuperAdmin()
  const resendStaffMutation = useResendStaffInvitationSuperAdmin()
  const suspendUserMutation = useSuspendUserSuperAdmin()
  const reactivateUserMutation = useReactivateUserSuperAdmin()
  const [revokeTarget, setRevokeTarget] = useState<StaffInvitation | null>(null)

  /* Force logout */
  const [logoutUserId, setLogoutUserId] = useState('')
  const [logoutLoading, setLogoutLoading] = useState(false)
  const [logoutFeedback, setLogoutFeedback] = useState<FeedbackState>(null)

  /* Reset MFA */
  const [mfaUserId, setMfaUserId] = useState('')
  const [mfaLoading, setMfaLoading] = useState(false)
  const [mfaFeedback, setMfaFeedback] = useState<FeedbackState>(null)
  const [mfaResult, setMfaResult] = useState<{ qrCode?: string; secret?: string } | null>(null)

  /* Cleanup sessions */
  const [cleanupDays, setCleanupDays] = useState('30')
  const [cleanupLoading, setCleanupLoading] = useState(false)
  const [cleanupFeedback, setCleanupFeedback] = useState<FeedbackState>(null)

  /* Reset password */
  const [resetEmail, setResetEmail] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const [resetFeedback, setResetFeedback] = useState<FeedbackState>(null)

  /* Generate invite (parent-code legacy) */
  const [inviteStudentId, setInviteStudentId] = useState('')
  const [inviteSchoolId, setInviteSchoolId] = useState('')
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteFeedback, setInviteFeedback] = useState<FeedbackState>(null)
  const [inviteResult, setInviteResult] = useState<{ code: string; expiresAt: string } | null>(null)

  /* Invite staff */
  const [staffEmail,     setStaffEmail]     = useState('')
  const [staffPhone,     setStaffPhone]     = useState('')
  const [staffFirstName, setStaffFirstName] = useState('')
  const [staffLastName,  setStaffLastName]  = useState('')
  const [staffRole,      setStaffRole]      = useState<'ADMIN' | 'FINANCE' | 'TEACHER' | 'DIRECTOR' | 'IT'>('ADMIN')
  const [staffSchoolId,  setStaffSchoolId]  = useState('')
  const [staffFeedback,  setStaffFeedback]  = useState<FeedbackState>(null)
  const [invListError,   setInvListError]   = useState('')

  /* Parent code */
  const [pcStudentId, setPcStudentId] = useState('')
  const [pcSchoolId,  setPcSchoolId]  = useState('')
  const [pcEmail,     setPcEmail]     = useState('')
  const [pcLoading,   setPcLoading]   = useState(false)
  const [pcFeedback,  setPcFeedback]  = useState<FeedbackState>(null)
  const [pcResult,    setPcResult]    = useState<{ code?: string; expiresAt?: string } | null>(null)

  /* Create admin (bootstrap d'urgence) */
  const [adminEmail,    setAdminEmail]    = useState('')
  const [adminPassword, setAdminPassword] = useState('')
  const [adminSchoolId, setAdminSchoolId] = useState('')
  const [adminLoading,  setAdminLoading]  = useState(false)
  const [adminFeedback, setAdminFeedback] = useState<FeedbackState>(null)

  /* Per-session force logout */
  const [logoutingId, setLogoutingId] = useState<number | null>(null)

  /* ── handlers ─────────────────────────────────────────────────────────── */
  const handleForceLogout = async () => {
    const id = Number(logoutUserId)
    if (!id) return
    setLogoutLoading(true); setLogoutFeedback(null)
    try {
      await superAdminApi.forceLogout(id)
      setLogoutFeedback({ type: 'success', message: `Sessions de l'utilisateur #${id} révoquées.` })
      setLogoutUserId(''); refetchSessions()
    } catch { setLogoutFeedback({ type: 'error', message: 'Erreur lors de la déconnexion forcée.' }) }
    finally { setLogoutLoading(false) }
  }

  const handleSessionLogout = async (userId: number) => {
    setLogoutingId(userId)
    try { await superAdminApi.forceLogout(userId); refetchSessions() }
    catch { /* ignore */ }
    finally { setLogoutingId(null) }
  }

  const handleResetMFA = async () => {
    const id = Number(mfaUserId)
    if (!id) return
    setMfaLoading(true); setMfaFeedback(null); setMfaResult(null)
    try {
      const res = await superAdminApi.resetMFA(id)
      setMfaResult(res.data ?? null)
      setMfaFeedback({ type: 'success', message: `MFA de l'utilisateur #${id} réinitialisé.` })
      setMfaUserId('')
    } catch { setMfaFeedback({ type: 'error', message: 'Erreur lors de la réinitialisation MFA.' }) }
    finally { setMfaLoading(false) }
  }

  const handleCleanup = async () => {
    setCleanupLoading(true); setCleanupFeedback(null)
    try {
      const res = await superAdminApi.cleanupSessions(Number(cleanupDays))
      setCleanupFeedback({ type: 'success', message: `${(res.data as { count?: number })?.count ?? 0} session(s) supprimée(s).` })
      refetchSessions()
    } catch { setCleanupFeedback({ type: 'error', message: 'Erreur lors du nettoyage.' }) }
    finally { setCleanupLoading(false) }
  }

  const handlePasswordReset = async () => {
    if (!resetEmail) return
    setResetLoading(true); setResetFeedback(null)
    try {
      await superAdminApi.triggerPasswordReset(resetEmail)
      setResetFeedback({ type: 'success', message: `Email de reset envoyé à ${resetEmail}.` })
      setResetEmail('')
    } catch { setResetFeedback({ type: 'error', message: 'Erreur lors de l\'envoi.' }) }
    finally { setResetLoading(false) }
  }

  const handleGenerateInvite = async () => {
    const sid = Number(inviteStudentId), schid = Number(inviteSchoolId)
    if (!sid || !schid) return
    setInviteLoading(true); setInviteFeedback(null); setInviteResult(null)
    try {
      const res = await superAdminApi.generateInvite(sid, schid)
      setInviteResult(res)
      setInviteFeedback({ type: 'success', message: 'Code d\'invitation généré.' })
    } catch { setInviteFeedback({ type: 'error', message: 'Erreur lors de la génération.' }) }
    finally { setInviteLoading(false) }
  }

  const handleInviteStaff = () => {
    if (!staffEmail || !staffPhone || !staffFirstName || !staffLastName || !staffSchoolId) return
    if (!isValidInternationalPhone(staffPhone)) {
      setStaffFeedback({ type: 'error', message: 'Numéro de téléphone invalide pour le pays sélectionné.' })
      return
    }
    setStaffFeedback(null)
    const schoolId = Number(staffSchoolId)
    inviteStaffMutation.mutate(
      {
        email: staffEmail,
        phone: formatPhoneToE164(staffPhone),
        role: staffRole,
        schoolId,
        firstName: staffFirstName,
        lastName: staffLastName,
      },
      {
        onSuccess: (res) => {
          setStaffFeedback({ type: 'success', message: res.message ?? `Invitation 2FA envoyée à ${staffEmail}.` })
          setStaffEmail('')
          setStaffPhone('')
          setStaffFirstName('')
          setStaffLastName('')
          setStaffSchoolId('')
          setInvSchoolId(schoolId)
          refetchInvitations()
        },
        onError: (err) => setStaffFeedback({ type: 'error', message: getApiErrorMessage(err) }),
      },
    )
  }

  const handleRevokeStaffRow = (inv: StaffInvitation) => {
    if (!invSchoolId) return
    setRevokeTarget(inv)
  }

  const confirmRevokeStaff = () => {
    if (!invSchoolId || !revokeTarget) return
    setInvListError('')
    revokeStaffMutation.mutate(
      { invitationId: revokeTarget.id, targetUserId: revokeTarget.userId ?? undefined, schoolId: invSchoolId },
      {
        onSuccess: (res) => {
          setRevokeTarget(null)
          refetchInvitations()
          setStaffFeedback({ type: 'success', message: res.message ?? 'Invitation supprimée.' })
        },
        onError: (err) => setInvListError(getApiErrorMessage(err)),
      },
    )
  }

  const handleResendStaffRow = (inv: StaffInvitation) => {
    if (!invSchoolId || !inv.userId) return
    setInvListError('')
    resendStaffMutation.mutate(
      { targetUserId: inv.userId, schoolId: invSchoolId },
      {
        onSuccess: (res) => setStaffFeedback({ type: 'success', message: res.message ?? 'Invitation renvoyée (email + SMS).' }),
        onError: (err) => setInvListError(getApiErrorMessage(err)),
      },
    )
  }

  const handleSuspendStaffRow = (inv: StaffInvitation) => {
    if (!invSchoolId || !inv.userId) return
    const reason = prompt(`Motif de suspension pour ${inv.firstName} ${inv.lastName} :`) ?? ''
    if (reason === null) return
    setInvListError('')
    suspendUserMutation.mutate(
      { userId: inv.userId, schoolId: invSchoolId, reason: reason || undefined },
      {
        onSuccess: (res) => {
          setStaffFeedback({ type: 'success', message: res.message ?? 'Compte suspendu.' })
          refetchInvitations()
        },
        onError: (err) => setInvListError(getApiErrorMessage(err)),
      },
    )
  }

  const handleReactivateStaffRow = (inv: StaffInvitation) => {
    if (!invSchoolId || !inv.userId) return
    setInvListError('')
    reactivateUserMutation.mutate(
      { userId: inv.userId, schoolId: invSchoolId },
      {
        onSuccess: (res) => {
          setStaffFeedback({ type: 'success', message: res.message ?? 'Compte réactivé.' })
          refetchInvitations()
        },
        onError: (err) => setInvListError(getApiErrorMessage(err)),
      },
    )
  }

  const handleParentCode = async () => {
    if (!pcStudentId || !pcSchoolId) return
    setPcLoading(true); setPcFeedback(null); setPcResult(null)
    try {
      const res = await invitationsApi.generateParentCode({
        studentId: Number(pcStudentId), schoolId: Number(pcSchoolId),
        email: pcEmail || undefined,
      })
      setPcResult(res.data ?? null)
      setPcFeedback({ type: 'success', message: res.message ?? 'Code parent généré.' })
      setPcStudentId(''); setPcSchoolId(''); setPcEmail('')
    } catch { setPcFeedback({ type: 'error', message: 'Erreur lors de la génération.' }) }
    finally { setPcLoading(false) }
  }

  const handleCreateAdmin = async () => {
    if (!adminEmail || !adminPassword || !adminSchoolId) return
    setAdminLoading(true); setAdminFeedback(null)
    try {
      const res = await invitationsApi.createAdmin({
        email: adminEmail, password: adminPassword, schoolId: Number(adminSchoolId),
      })
      setAdminFeedback({ type: 'success', message: res.message ?? `Admin créé : ${adminEmail}` })
      setAdminEmail(''); setAdminPassword(''); setAdminSchoolId('')
    } catch { setAdminFeedback({ type: 'error', message: 'Erreur lors de la création.' }) }
    finally { setAdminLoading(false) }
  }

  /* ══════════════════════════════════════════════════════════════════════ */

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-6xl mx-auto px-8 py-6">
          <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Gestion des accès</h1>
          <p className="text-sm text-zinc-400 mt-1">Sessions · Invitations · Comptes</p>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-8 space-y-10">

        {/* ══ SECTION 1 — SESSIONS ════════════════════════════════════════ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Sessions</p>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

            {/* Sessions list — spans 2 cols */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-zinc-400" />
                  <span className="text-sm font-semibold text-zinc-900">Sessions actives</span>
                  {sessions && (
                    <span className="text-xs bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full tabular-nums">
                      {sessions.length}
                    </span>
                  )}
                </div>
                <button onClick={() => refetchSessions()} className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors">
                  <RefreshCw size={12} className="text-zinc-400" />
                </button>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {loadingSessions ? (
                  <div className="divide-y divide-zinc-100">
                    {[...Array(3)].map((_, i) => <div key={i} className="px-6 py-4"><Skeleton className="h-4 w-2/3" /></div>)}
                  </div>
                ) : sessions?.length ? (
                  <div className="divide-y divide-zinc-100">
                    {sessions.map((s) => (
                      <div key={s.id} className="flex items-center justify-between px-6 py-3.5 hover:bg-zinc-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 flex-shrink-0" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">{s.user.firstName} {s.user.lastName}</p>
                            <p className="text-xs text-zinc-400 truncate">{s.user.email} · <span className="font-medium">{s.user.role}</span></p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-xs text-zinc-300 tabular-nums hidden sm:block">
                            {new Date(s.expiresAt).toLocaleDateString('fr-FR')}
                          </span>
                          <button
                            onClick={() => handleSessionLogout(s.userId)}
                            disabled={logoutingId === s.userId}
                            className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 hover:bg-red-50 px-2.5 py-1.5 rounded-lg transition-all disabled:opacity-40"
                          >
                            {logoutingId === s.userId ? <Loader2 size={10} className="animate-spin" /> : <LogOut size={10} />}
                            Déconnecter
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="px-6 py-10 text-center text-sm text-zinc-400">Aucune session active</div>
                )}
              </div>
            </div>

            {/* Session actions — 1 col, stacked */}
            <div className="flex flex-col gap-4">
              {/* Force logout */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <LogOut size={13} className="text-red-400" />
                  <p className="text-sm font-semibold text-zinc-900">Déconnexion forcée</p>
                </div>
                <div className="space-y-2">
                  <input
                    type="number" placeholder="ID utilisateur"
                    value={logoutUserId} onChange={(e) => setLogoutUserId(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-100"
                  />
                  <button
                    onClick={handleForceLogout} disabled={!logoutUserId || logoutLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {logoutLoading ? <Loader2 size={13} className="animate-spin" /> : <LogOut size={13} />}
                    Forcer
                  </button>
                  <Feedback state={logoutFeedback} />
                </div>
              </div>

              {/* Cleanup */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Trash2 size={13} className="text-zinc-400" />
                  <p className="text-sm font-semibold text-zinc-900">Nettoyage</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="number" min="1" max="365"
                      value={cleanupDays} onChange={(e) => setCleanupDays(e.target.value)}
                      className="w-20 border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                    <span className="text-xs text-zinc-400">jours d'ancienneté</span>
                  </div>
                  <button
                    onClick={handleCleanup} disabled={cleanupLoading}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {cleanupLoading ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    Nettoyer
                  </button>
                  <Feedback state={cleanupFeedback} />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 2 — SÉCURITÉ COMPTE ════════════════════════════════ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Sécurité des comptes</p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">

            {/* Reset MFA */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <QrCode size={14} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Reset MFA</p>
                  <p className="text-xs text-zinc-400">Nouveau secret TOTP</p>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="number" placeholder="ID utilisateur"
                  value={mfaUserId} onChange={(e) => setMfaUserId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  onClick={handleResetMFA} disabled={!mfaUserId || mfaLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {mfaLoading ? <Loader2 size={13} className="animate-spin" /> : <KeyRound size={13} />}
                  Réinitialiser
                </button>
                <Feedback state={mfaFeedback} />
                {mfaResult?.secret && (
                  <div className="bg-zinc-50 rounded-xl p-3 mt-1 border border-zinc-200">
                    <p className="text-xs text-zinc-400 mb-1">Nouveau secret</p>
                    <code className="text-xs font-mono text-zinc-800 break-all">{mfaResult.secret}</code>
                  </div>
                )}
              </div>
            </div>

            {/* Reset password */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Mail size={14} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Reset mot de passe</p>
                  <p className="text-xs text-zinc-400">Envoie un email</p>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="email" placeholder="email@exemple.com"
                  value={resetEmail} onChange={(e) => setResetEmail(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                />
                <button
                  onClick={handlePasswordReset} disabled={!resetEmail || resetLoading}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {resetLoading ? <Loader2 size={13} className="animate-spin" /> : <Mail size={13} />}
                  Envoyer le reset
                </button>
                <Feedback state={resetFeedback} />
              </div>
            </div>

            {/* Create admin */}
            <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                  <Shield size={14} className="text-zinc-500" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-zinc-900">Créer un admin</p>
                  <p className="text-xs text-zinc-400">Bootstrap d&apos;urgence — préférez l&apos;invitation 2FA</p>
                </div>
              </div>
              <div className="space-y-2">
                <input
                  type="email" placeholder="email@ecole.com"
                  value={adminEmail} onChange={(e) => setAdminEmail(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <input
                  type="password" placeholder="Mot de passe"
                  value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-slate-200"
                />
                <select
                  value={adminSchoolId} onChange={(e) => setAdminSchoolId(e.target.value)}
                  className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-slate-200"
                >
                  <option value="">École…</option>
                  {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <button
                  onClick={handleCreateAdmin} disabled={adminLoading || !adminEmail || !adminPassword || !adminSchoolId}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                >
                  {adminLoading ? <Loader2 size={13} className="animate-spin" /> : <Shield size={13} />}
                  Créer l'administrateur
                </button>
                <Feedback state={adminFeedback} />
              </div>
            </div>
          </div>
        </section>

        {/* ══ SECTION 3 — INVITATIONS ════════════════════════════════════ */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 mb-4">Invitations</p>

          <div className="mb-4 rounded-2xl border border-blue-100 bg-blue-50/60 p-4 text-sm text-blue-900">
            <div className="flex gap-2 items-start">
              <Info size={16} className="flex-shrink-0 mt-0.5 text-blue-600" />
              <div className="space-y-2 text-xs leading-relaxed">
                <p><strong>Staff (enseignant, finance, admin)</strong> — Email avec lien web <code className="bg-white/80 px-1 rounded">/activate</code> + SMS avec code OTP. Activation sur navigateur (PC ou mobile), puis connexion web ou app enseignant mobile.</p>
                <p><strong>Parent (app mobile Flutter)</strong> — L&apos;admin génère un <strong>code de liaison</strong> (8 caractères). Remise au parent : email si renseigné, sinon SMS / WhatsApp / papier. Le parent saisit téléphone + code dans l&apos;app : <code className="bg-white/80 px-1 rounded">POST /mobile/parents/activate-access</code>.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Left col — état par école */}
            <div className="flex flex-col gap-4">

              {/* État des invitations par école */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden lg:col-span-2">
                <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                  <div className="flex items-center gap-2">
                    <BookUser size={14} className="text-zinc-400" />
                    <span className="text-sm font-semibold text-zinc-900">Invitations staff par école</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={invSchoolId ?? ''}
                      onChange={(e) => setInvSchoolId(e.target.value ? Number(e.target.value) : null)}
                      className="text-xs text-zinc-600 bg-transparent border border-zinc-200 rounded-lg px-2.5 py-1.5 focus:outline-none"
                    >
                      <option value="">Choisir…</option>
                      {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                    {invSchoolId && (
                      <button onClick={() => refetchInvitations()} className="p-1.5 hover:bg-zinc-50 rounded-lg transition-colors">
                        <RefreshCw size={11} className="text-zinc-400" />
                      </button>
                    )}
                  </div>
                </div>

                {invListError && (
                  <p className="px-6 py-2 text-xs text-red-600 border-b border-red-100 bg-red-50">{invListError}</p>
                )}

                {!invSchoolId ? (
                  <div className="px-6 py-8 text-center text-xs text-zinc-400">Sélectionnez une école pour voir les invitations</div>
                ) : loadingInvitations ? (
                  <div className="p-4 space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-9" />)}</div>
                ) : !schoolInvitations?.staff?.length ? (
                  <div className="px-6 py-8 text-center text-xs text-zinc-400">Aucune invitation staff pour cette école</div>
                ) : (
                  <div className="overflow-x-auto">
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
                        {schoolInvitations.staff.map((inv) => (
                          <tr key={inv.id} className="hover:bg-zinc-50">
                            <td className="px-4 py-2.5 font-medium text-zinc-800">{inv.firstName} {inv.lastName}</td>
                            <td className="px-4 py-2.5 text-zinc-600 text-xs">{inv.email}</td>
                            <td className="px-4 py-2.5">
                              <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{inv.role}</span>
                            </td>
                            <td className="px-4 py-2.5 text-zinc-600 text-xs">
                              {inv.verificationLabel ?? inv.verificationStep ?? '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full', STATUS_COLORS[inv.status] ?? 'bg-zinc-100 text-zinc-500')}>
                                {inv.status}
                              </span>
                            </td>
                            <td className="px-4 py-2.5 text-xs text-zinc-600">
                              {inv.userStatus ?? '—'}
                            </td>
                            <td className="px-4 py-2.5">
                              <StaffInvitationRowActions
                                inv={inv}
                                size="md"
                                resendPending={resendStaffMutation.isPending}
                                revokePending={revokeStaffMutation.isPending}
                                suspendPending={suspendUserMutation.isPending}
                                reactivatePending={reactivateUserMutation.isPending}
                                onResend={() => handleResendStaffRow(inv)}
                                onDelete={() => handleRevokeStaffRow(inv)}
                                onSuspend={() => handleSuspendStaffRow(inv)}
                                onReactivate={() => handleReactivateStaffRow(inv)}
                              />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {invSchoolId && schoolInvitations?.parents?.length ? (
                  <div className="border-t border-zinc-100 px-6 py-3">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-zinc-400 mb-2">Codes parents actifs</p>
                    <div className="space-y-1 max-h-28 overflow-y-auto">
                      {schoolInvitations.parents.map((inv) => (
                        <div key={inv.id} className="flex items-center gap-2 text-xs text-zinc-600">
                          <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">Parent</span>
                          <span>Élève #{inv.studentId}</span>
                          {inv.code && (
                            <span className="flex items-center gap-0.5">
                              <code className="font-mono text-[10px] bg-zinc-100 px-1 rounded">{inv.code}</code>
                              <CopyInline text={inv.code} />
                            </span>
                          )}
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full ml-auto', STATUS_COLORS[inv.status] ?? 'bg-zinc-100 text-zinc-500')}>
                            {inv.status}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>

            {/* Right col — inviter staff + code parent */}
            <div className="flex flex-col gap-4">

              {/* Inviter staff */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <UserPlus size={14} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Inviter un collaborateur</p>
                    <p className="text-xs text-zinc-400">Email + SMS OTP · Admin · Finance · Enseignant</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="text" placeholder="Prénom"
                      value={staffFirstName} onChange={(e) => setStaffFirstName(e.target.value)}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                    <input type="text" placeholder="Nom"
                      value={staffLastName} onChange={(e) => setStaffLastName(e.target.value)}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                  </div>
                  <input type="email" placeholder="email@exemple.com"
                    value={staffEmail} onChange={(e) => setStaffEmail(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                  <PhoneInput
                    value={staffPhone}
                    onChange={setStaffPhone}
                    showError={false}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select value={staffRole} onChange={(e) => setStaffRole(e.target.value as 'ADMIN' | 'FINANCE' | 'TEACHER' | 'DIRECTOR' | 'IT')}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    >
                      {ROLE_OPTIONS.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                    <select value={staffSchoolId} onChange={(e) => setStaffSchoolId(e.target.value)}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    >
                      <option value="">École…</option>
                      {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <button
                    onClick={handleInviteStaff}
                    disabled={inviteStaffMutation.isPending || !staffEmail || !staffPhone || !isValidInternationalPhone(staffPhone) || !staffFirstName || !staffLastName || !staffSchoolId}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {inviteStaffMutation.isPending ? <Loader2 size={13} className="animate-spin" /> : <UserPlus size={13} />}
                    Envoyer l'invitation 2FA
                  </button>
                  <Feedback state={staffFeedback} />
                </div>
              </div>

              {/* Code parent */}
              <div className="bg-white rounded-2xl border border-zinc-200 shadow-[0_2px_12px_rgba(0,0,0,0.06)] p-6">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-xl bg-zinc-100 flex items-center justify-center">
                    <BookUser size={14} className="text-zinc-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-900">Code de liaison parent</p>
                    <p className="text-xs text-zinc-400">App mobile · code 8 caractères · validité 48 h</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" placeholder="ID élève"
                      value={pcStudentId} onChange={(e) => setPcStudentId(e.target.value)}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    />
                    <select value={pcSchoolId} onChange={(e) => setPcSchoolId(e.target.value)}
                      className="border border-zinc-200 rounded-xl px-3 py-2 text-sm text-zinc-600 bg-white focus:outline-none focus:ring-2 focus:ring-zinc-200"
                    >
                      <option value="">École…</option>
                      {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <input type="email" placeholder="Email parent (optionnel — envoi automatique du code)"
                    value={pcEmail} onChange={(e) => setPcEmail(e.target.value)}
                    className="w-full border border-zinc-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-zinc-200"
                  />
                  <p className="text-[10px] text-zinc-400 leading-relaxed">
                    Sans email, communiquez le code au parent (SMS, WhatsApp, papier). Il l&apos;entre dans l&apos;app avec son numéro de téléphone.
                  </p>
                  <button
                    onClick={handleParentCode} disabled={pcLoading || !pcStudentId || !pcSchoolId}
                    className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {pcLoading ? <Loader2 size={13} className="animate-spin" /> : <BookUser size={13} />}
                    Générer le code
                  </button>
                  <Feedback state={pcFeedback} />
                  {pcResult?.code && (
                    <div className="bg-zinc-50 rounded-xl px-4 py-3 mt-1 border border-zinc-200">
                      <p className="text-xs text-zinc-400 mb-1">Code de liaison — à transmettre au parent</p>
                      <div className="flex items-center gap-2">
                        <code className="text-xl font-bold font-mono text-zinc-900 tracking-widest">{pcResult.code}</code>
                        <CopyInline text={pcResult.code} />
                      </div>
                      {pcResult.expiresAt && (
                        <p className="text-[10px] text-zinc-400 mt-1">
                          Expire le {new Date(pcResult.expiresAt).toLocaleString('fr-FR')}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      <ConfirmDialog
        open={revokeTarget != null}
        title="Supprimer l'invitation ?"
        description={
          revokeTarget
            ? `Supprimer l'invitation de ${revokeTarget.firstName} ${revokeTarget.lastName} (${revokeTarget.email}) ?`
            : ''
        }
        impact={['Le lien d\'invitation ne sera plus utilisable']}
        confirmLabel="Supprimer"
        variant="danger"
        loading={revokeStaffMutation.isPending}
        onConfirm={confirmRevokeStaff}
        onCancel={() => setRevokeTarget(null)}
      />
    </div>
  )
}
