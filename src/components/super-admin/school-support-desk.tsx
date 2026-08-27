'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Banknote,
  Building2,
  Calendar,
  Copy,
  Check,
  CreditCard,
  KeyRound,
  Loader2,
  LogIn,
  Phone,
  Plus,
  RefreshCw,
  ScrollText,
  Shield,
  UserRound,
  MapPin,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Gauge,
  X,
  UserPlus,
  Mail,
} from 'lucide-react'
import {
  schoolSupportApi,
  type PlatformCashPayment,
  type SchoolSupportAction,
  type SchoolSupportPrimaryAdmin,
} from '@/lib/superAdmin/api/school-support.api'
import { invitationsApi } from '@/lib/superAdmin/api/invitations.api'
import { WhatsAppInviteAssist } from '@/components/super-admin/whatsapp-invite-assist'
import { TempPasswordRevealModal } from '@/components/ui/temp-password-reveal-modal'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { StatusBadge } from '@/components/super-admin/school-saas-drawer'
import { PhoneInput } from '@/components/ui/phone-input'
import { formatPhoneToE164, isValidInternationalPhone } from '@/lib/phone/validation'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { auditActionLabel, subscriptionTierLabel } from '@/lib/i18n/display-labels'
import type { SchoolDetail, SchoolLifecycleStatus } from '@/types/super-admin'

const ACTION_META: Record<
  string,
  { label: string; tone: string; dot: string }
> = {
  MANUAL_CASH_PAYMENT: {
    label: 'Paiement cash SaaS',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    dot: 'bg-emerald-500',
  },
  SUPPORT_PASSWORD_RESET: {
    label: 'Reset mot de passe',
    tone: 'bg-amber-50 text-amber-800 border-amber-100',
    dot: 'bg-amber-500',
  },
  IMPERSONATE_START: {
    label: 'Impersonation',
    tone: 'bg-zinc-900 text-white border-zinc-800',
    dot: 'bg-zinc-900',
  },
  START_IMPERSONATION: {
    label: 'Impersonation',
    tone: 'bg-zinc-900 text-white border-zinc-800',
    dot: 'bg-zinc-900',
  },
  END_IMPERSONATION: {
    label: 'Fin impersonation',
    tone: 'bg-amber-50 text-amber-900 border-amber-100',
    dot: 'bg-amber-500',
  },
  SUSPEND_SCHOOL: {
    label: 'Suspension',
    tone: 'bg-red-50 text-red-800 border-red-100',
    dot: 'bg-red-500',
  },
  REACTIVATE_SCHOOL: {
    label: 'Réactivation',
    tone: 'bg-sky-50 text-sky-800 border-sky-100',
    dot: 'bg-sky-500',
  },
  UPDATE_SCHOOL_SAAS: {
    label: 'Contrôles SaaS',
    tone: 'bg-violet-50 text-violet-800 border-violet-100',
    dot: 'bg-violet-500',
  },
  STAFF_INVITED: {
    label: 'Invitation admin',
    tone: 'bg-emerald-50 text-emerald-800 border-emerald-100',
    dot: 'bg-emerald-500',
  },
  STAFF_INVITATION_RESENT: {
    label: 'Invitation renvoyée',
    tone: 'bg-sky-50 text-sky-800 border-sky-100',
    dot: 'bg-sky-500',
  },
  EMERGENCY_ADMIN_BOOTSTRAP: {
    label: 'Bootstrap urgence',
    tone: 'bg-amber-50 text-amber-900 border-amber-100',
    dot: 'bg-amber-500',
  },
}

function fmtDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    })
  } catch {
    return iso
  }
}

function fmtDateTime(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

function fmtUsd(n: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(n)
}

function schoolInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'É'
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase()
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase()
}

function statusTone(status: string) {
  if (status === 'ACTIVE') return 'ok' as const
  if (status === 'EXPIRED' || status === 'SUSPENDED') return 'danger' as const
  return 'warn' as const
}

function fmtRelative(iso: string) {
  try {
    const diffMs = Date.now() - new Date(iso).getTime()
    const sec = Math.round(diffMs / 1000)
    if (sec < 60) return 'à l’instant'
    const min = Math.round(sec / 60)
    if (min < 60) return `il y a ${min} min`
    const h = Math.round(min / 60)
    if (h < 24) return `il y a ${h} h`
    const d = Math.round(h / 24)
    if (d < 30) return `il y a ${d} j`
    return fmtDate(iso)
  } catch {
    return iso
  }
}

function contractHealth(expiry: string | null | undefined) {
  if (!expiry) return { label: 'Sans échéance', tone: 'neutral' as const, days: null as number | null }
  const end = new Date(expiry)
  if (Number.isNaN(end.getTime())) {
    return { label: 'Date invalide', tone: 'warn' as const, days: null }
  }
  const days = Math.ceil((end.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
  if (days < 0) return { label: `Expiré depuis ${Math.abs(days)} j`, tone: 'danger' as const, days }
  if (days <= 14) return { label: `Expire dans ${days} j`, tone: 'warn' as const, days }
  if (days <= 45) return { label: `${days} j restants`, tone: 'ok' as const, days }
  return { label: `Échéance ${fmtDate(expiry)}`, tone: 'ok' as const, days }
}

function MetaCell({
  icon: Icon,
  label,
  value,
  copyValue,
}: {
  icon: React.ElementType
  label: string
  value: string
  copyValue?: string
}) {
  const [copied, setCopied] = useState(false)
  const canCopy = Boolean(copyValue && copyValue !== '—')

  async function onCopy() {
    if (!canCopy || !copyValue) return
    try {
      await navigator.clipboard.writeText(copyValue)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="group relative rounded-xl border border-zinc-100 bg-zinc-50/80 px-3.5 py-3 min-w-0 transition-colors hover:border-zinc-200 hover:bg-white">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-zinc-400">
          <Icon size={11} />
          {label}
        </div>
        {canCopy && (
          <button
            type="button"
            onClick={() => void onCopy()}
            className="opacity-0 group-hover:opacity-100 focus:opacity-100 rounded-md p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 transition-opacity"
            title="Copier"
            aria-label={`Copier ${label}`}
          >
            {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
          </button>
        )}
      </div>
      <p className="mt-1.5 text-sm font-medium text-zinc-800 truncate" title={value}>
        {value}
      </p>
    </div>
  )
}

function SkeletonRows({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5 py-1">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-11 rounded-xl bg-zinc-100/90 animate-pulse" />
      ))}
    </div>
  )
}

export function SchoolSupportDesk({ school }: { school: SchoolDetail }) {
  const toast = useToast()
  const schoolId = school.id

  const [payments, setPayments] = useState<PlatformCashPayment[]>([])
  const [actions, setActions] = useState<SchoolSupportAction[]>([])
  const [loading, setLoading] = useState(true)

  const [payOpen, setPayOpen] = useState(false)
  const [amountUsd, setAmountUsd] = useState('')
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10))
  const [note, setNote] = useState('')
  const [payBusy, setPayBusy] = useState(false)

  const [impBusy, setImpBusy] = useState(false)
  const [resetBusy, setResetBusy] = useState(false)
  const [confirmImp, setConfirmImp] = useState(false)
  const [confirmReset, setConfirmReset] = useState(false)
  const [tempPwd, setTempPwd] = useState<{ name: string; password: string } | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)
  const [copiedDossier, setCopiedDossier] = useState(false)
  const [primaryAdmin, setPrimaryAdmin] = useState<SchoolSupportPrimaryAdmin | null>(null)
  const [hasPrimaryAdmin, setHasPrimaryAdmin] = useState(false)

  const [inviteOpen, setInviteOpen] = useState(false)
  const [invFirst, setInvFirst] = useState('')
  const [invLast, setInvLast] = useState('')
  const [invEmail, setInvEmail] = useState('')
  const [invPhone, setInvPhone] = useState('')
  const [inviteBusy, setInviteBusy] = useState(false)
  const [whatsappDeepLink, setWhatsappDeepLink] = useState<string | null>(null)
  const [whatsappError, setWhatsappError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const [p, a, profile] = await Promise.all([
        schoolSupportApi.listPayments(schoolId),
        schoolSupportApi.listActions(schoolId),
        schoolSupportApi.getProfile(schoolId),
      ])
      setPayments(p)
      setActions(a)
      setPrimaryAdmin(profile.primaryAdmin)
      setHasPrimaryAdmin(Boolean(profile.hasPrimaryAdmin ?? profile.primaryAdmin))
      setLastSyncedAt(new Date())
    } catch {
      toast.error('Impossible de charger le support école')
    } finally {
      setLoading(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [schoolId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const totals = useMemo(() => {
    const sum = payments.reduce((acc, p) => acc + (Number(p.amountUsd) || 0), 0)
    const last = payments[0]?.paidAt ?? null
    return { sum, count: payments.length, last }
  }, [payments])

  const status = (school.status ??
    (school.active ? 'ACTIVE' : 'SUSPENDED')) as SchoolLifecycleStatus
  const restricted = status === 'EXPIRED' || status === 'SUSPENDED' || school.active === false
  const health = useMemo(
    () => contractHealth(school.contractExpiry),
    [school.contractExpiry],
  )
  const studentCount = school.studentCount ?? school._count.students
  const capacityPct =
    school.capacityPct ??
    (school.studentCapacity && school.studentCapacity > 0
      ? Math.min(100, Math.round((studentCount / school.studentCapacity) * 100))
      : null)

  async function copyDossier() {
    const phone = school.promoterPhone || school.phone || '—'
    const lines = [
      `École: ${school.name}`,
      `ID: ${school.id}`,
      `Statut: ${status}`,
      `Promoteur: ${school.promoterName ?? '—'}`,
      `Téléphone: ${phone}`,
      `Adresse: ${[school.address, school.city].filter(Boolean).join(', ') || '—'}`,
      `Offre: ${subscriptionTierLabel(school.subscriptionTier)}`,
      `Contrat: ${school.contractExpiry ? fmtDate(school.contractExpiry) : '—'}`,
      `Cash SaaS: ${fmtUsd(totals.sum)} (${totals.count} règlements)`,
    ]
    try {
      await navigator.clipboard.writeText(lines.join('\n'))
      setCopiedDossier(true)
      toast.success('Fiche copiée dans le presse-papiers')
      setTimeout(() => setCopiedDossier(false), 1500)
    } catch {
      toast.error('Impossible de copier la fiche')
    }
  }

  async function submitPayment() {
    const amount = Number(amountUsd)
    if (!Number.isFinite(amount) || amount <= 0) {
      toast.error('Montant USD invalide')
      return
    }
    if (!paidAt) {
      toast.error('Date requise')
      return
    }
    setPayBusy(true)
    try {
      await schoolSupportApi.recordPayment(schoolId, {
        amountUsd: amount,
        paidAt,
        note: note.trim() || undefined,
      })
      toast.success('Paiement cash enregistré')
      setPayOpen(false)
      setAmountUsd('')
      setNote('')
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec enregistrement')
    } finally {
      setPayBusy(false)
    }
  }

  async function runImpersonate() {
    setImpBusy(true)
    try {
      const data = await schoolSupportApi.impersonate(schoolId)
      toast.success('Session école ouverte')
      window.location.assign(data.redirectTo || '/admin/dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Impersonation refusée')
      setImpBusy(false)
      setConfirmImp(false)
    }
  }

  async function runResetPassword() {
    setResetBusy(true)
    try {
      const data = await schoolSupportApi.resetPassword(schoolId)
      const name =
        [data.user.firstName, data.user.lastName].filter(Boolean).join(' ').trim() ||
        data.user.email ||
        'Admin'
      setTempPwd({ name, password: data.tempPassword })
      setConfirmReset(false)
      await refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Échec reset mot de passe')
    } finally {
      setResetBusy(false)
    }
  }

  async function runInviteAdmin() {
    if (!invFirst.trim() || !invLast.trim() || !invEmail.trim()) {
      toast.error('Nom, prénom et email requis')
      return
    }
    if (!isValidInternationalPhone(invPhone)) {
      toast.error('Téléphone mobile invalide (WhatsApp OTP)')
      return
    }
    setInviteBusy(true)
    try {
      const res = await invitationsApi.inviteStaff({
        email: invEmail.trim().toLowerCase(),
        phone: formatPhoneToE164(invPhone),
        role: 'ADMIN',
        schoolId,
        firstName: invFirst.trim(),
        lastName: invLast.trim(),
      })
      setWhatsappDeepLink(res.whatsappDeepLink ?? null)
      setWhatsappError(
        res.whatsappDeepLink
          ? null
          : (res as { whatsappError?: string }).whatsappError ??
              'Lien WhatsApp non généré — utilisez le code dans l’email',
      )
      toast.success(
        'Invitation créée',
        res.whatsappDeepLink
          ? 'Ouvrez WhatsApp pour envoyer l’OTP'
          : res.message || 'Vérifiez l’email / OTP',
      )
      setInviteOpen(false)
      setInvFirst('')
      setInvLast('')
      setInvEmail('')
      setInvPhone('')
      await refresh()
    } catch (e) {
      toast.error(getApiErrorMessage(e))
    } finally {
      setInviteBusy(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
      className="relative overflow-hidden rounded-3xl border border-zinc-200/90 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_12px_40px_-24px_rgba(0,0,0,0.18)]"
    >
      {/* subtle top wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[radial-gradient(120%_80%_at_0%_0%,rgba(24,24,27,0.06),transparent_55%),radial-gradient(80%_60%_at_100%_0%,rgba(16,185,129,0.08),transparent_50%)]"
      />

      {/* Ops status bar */}
      <div className="relative flex flex-wrap items-center justify-between gap-2 border-b border-zinc-100 bg-zinc-950 px-5 sm:px-6 py-2.5 text-[11px] text-zinc-300">
        <div className="flex flex-wrap items-center gap-3">
          <span className="inline-flex items-center gap-1.5 font-medium text-zinc-100">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Console support
          </span>
          <span className="hidden sm:inline text-zinc-600">|</span>
          <span className="tabular-nums text-zinc-400">
            {lastSyncedAt
              ? `Synchronisé ${lastSyncedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}`
              : 'Synchronisation…'}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => void copyDossier()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors"
          >
            {copiedDossier ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
            Copier la fiche
          </button>
          <button
            type="button"
            disabled={loading}
            onClick={() => void refresh()}
            className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-zinc-300 hover:bg-white/10 hover:text-white transition-colors disabled:opacity-50"
          >
            <RefreshCw size={12} className={cn(loading && 'animate-spin')} />
            Actualiser
          </button>
        </div>
      </div>

      {/* ── Header identity ─────────────────────────────────────────────── */}
      <div className="relative border-b border-zinc-100 px-5 sm:px-6 pt-5 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4 min-w-0">
            <div className="relative shrink-0">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-zinc-900 text-sm font-semibold tracking-wide text-white shadow-lg shadow-zinc-900/20">
                {schoolInitials(school.name)}
              </div>
              <span
                className={cn(
                  'absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-white',
                  statusTone(status) === 'ok'
                    ? 'bg-emerald-500'
                    : statusTone(status) === 'danger'
                      ? 'bg-red-500'
                      : 'bg-amber-400',
                )}
                title={status}
              />
            </div>

            <div className="min-w-0 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
                  Support client · God Mode
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-xl font-semibold tracking-tight text-zinc-900 truncate">
                  {school.name}
                </h2>
                <StatusBadge status={status} />
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
                    restricted
                      ? 'border-red-100 bg-red-50 text-red-700'
                      : 'border-emerald-100 bg-emerald-50 text-emerald-700',
                  )}
                >
                  {restricted ? (
                    <>
                      <AlertTriangle size={11} /> Accès restreint
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={11} /> Active
                    </>
                  )}
                </span>
              </div>
              <p className="text-xs text-zinc-500">
                Fiche établissement · facturation manuelle · outils de support
                <span className="mx-1.5 text-zinc-300">·</span>
                <span className="font-mono text-zinc-400">#{school.id}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2 w-full sm:w-auto">
            <div className="flex flex-wrap gap-2 justify-end">
              <button
                type="button"
                disabled={impBusy}
                onClick={() => setConfirmImp(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-zinc-900/15 hover:bg-zinc-800 disabled:opacity-50 transition-colors"
              >
                {impBusy ? <Loader2 size={15} className="animate-spin" /> : <LogIn size={15} />}
                Se connecter en tant que
              </button>
              <button
                type="button"
                disabled={resetBusy}
                onClick={() => setConfirmReset(true)}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-200 bg-white/90 px-4 py-2.5 text-sm font-semibold text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
              >
                {resetBusy ? (
                  <Loader2 size={15} className="animate-spin" />
                ) : (
                  <KeyRound size={15} />
                )}
                Réinitialiser le mot de passe
              </button>
            </div>
            <p className="text-[11px] text-zinc-400 flex items-center gap-1.5 justify-end">
              <Shield size={11} />
              Actions auditées · réservé aux superadmins
            </p>
          </div>
        </div>

        {/* Identité admin — invitation officielle */}
        <div
          className={cn(
            'mt-5 rounded-2xl border px-4 py-4',
            hasPrimaryAdmin
              ? 'border-zinc-100 bg-white/80'
              : 'border-amber-200/80 bg-amber-50/40',
          )}
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Admin principal
              </p>
              {hasPrimaryAdmin && primaryAdmin ? (
                <div className="mt-1 space-y-1">
                  <p className="text-sm font-semibold text-zinc-900 truncate">{primaryAdmin.name}</p>
                  <p className="text-xs text-zinc-500 truncate">{primaryAdmin.email ?? '—'}</p>
                  {primaryAdmin.mustChangePassword ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-semibold text-amber-800">
                      <KeyRound size={10} /> Changement de MDP obligatoire
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                      <CheckCircle2 size={10} /> Compte prêt
                    </span>
                  )}
                </div>
              ) : (
                <div className="mt-1">
                  <p className="text-sm font-semibold text-amber-900">Aucun admin actif</p>
                  <p className="text-xs text-amber-800/80 mt-0.5 max-w-md">
                    Parcours actuel : email + lien WhatsApp direct (OTP prérempli). L’admin choisit
                    son mot de passe à l’activation — pas de SMS payant tant que l’app ne monétise
                    pas.
                  </p>
                </div>
              )}
            </div>
            <button
              type="button"
              onClick={() => setInviteOpen((v) => !v)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 bg-white px-3.5 py-2 text-sm font-semibold text-zinc-800 hover:bg-zinc-50"
            >
              <UserPlus size={15} />
              {hasPrimaryAdmin ? 'Inviter un autre admin' : 'Inviter l’admin'}
            </button>
          </div>

          {inviteOpen ? (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-2.5 border-t border-zinc-100/80 pt-4">
              <input
                placeholder="Prénom"
                value={invFirst}
                onChange={(e) => setInvFirst(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <input
                placeholder="Nom"
                value={invLast}
                onChange={(e) => setInvLast(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <input
                type="email"
                placeholder="email@ecole.com"
                value={invEmail}
                onChange={(e) => setInvEmail(e.target.value)}
                className="rounded-xl border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-emerald-100"
              />
              <PhoneInput
                value={invPhone}
                onChange={setInvPhone}
                className="rounded-xl border border-zinc-200 bg-white"
              />
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={inviteBusy}
                  onClick={() => void runInviteAdmin()}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800 disabled:opacity-50"
                >
                  {inviteBusy ? <Loader2 size={15} className="animate-spin" /> : <Mail size={15} />}
                  Envoyer l’invitation 2FA
                </button>
                <p className="text-[11px] text-zinc-400">
                  Email + lien WhatsApp (OTP) · action journalisée
                </p>
              </div>
            </div>
          ) : null}

          {(whatsappDeepLink || whatsappError) ? (
            <WhatsAppInviteAssist
              className="mt-3"
              link={whatsappDeepLink}
              error={whatsappError}
            />
          ) : null}
        </div>

        <div className="mt-5 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <MetaCell
            icon={UserRound}
            label="Promoteur"
            value={school.promoterName ?? '—'}
            copyValue={school.promoterName ?? undefined}
          />
          <MetaCell
            icon={Phone}
            label="Téléphone"
            value={school.promoterPhone || school.phone || '—'}
            copyValue={school.promoterPhone || school.phone || undefined}
          />
          <MetaCell
            icon={MapPin}
            label="Adresse"
            value={[school.address, school.city].filter(Boolean).join(', ') || '—'}
            copyValue={[school.address, school.city].filter(Boolean).join(', ') || undefined}
          />
          <MetaCell
            icon={Calendar}
            label="Compte créé"
            value={school.createdAt ? fmtDate(school.createdAt) : '—'}
          />
        </div>

        {/* Contract health strip */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/80 px-3.5 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-100 text-zinc-700">
              <CreditCard size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Offre SaaS
              </p>
              <p className="text-sm font-semibold text-zinc-900 truncate">
                {subscriptionTierLabel(school.subscriptionTier)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/80 px-3.5 py-2.5">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-lg',
                health.tone === 'danger'
                  ? 'bg-red-50 text-red-700'
                  : health.tone === 'warn'
                    ? 'bg-amber-50 text-amber-700'
                    : 'bg-emerald-50 text-emerald-700',
              )}
            >
              <Calendar size={14} />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                Contrat
              </p>
              <p
                className={cn(
                  'text-sm font-semibold truncate',
                  health.tone === 'danger'
                    ? 'text-red-700'
                    : health.tone === 'warn'
                      ? 'text-amber-700'
                      : 'text-zinc-900',
                )}
              >
                {health.label}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-zinc-100 bg-white/80 px-3.5 py-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700">
              <Gauge size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  Capacité
                </p>
                <p className="text-[11px] font-medium tabular-nums text-zinc-500">
                  {studentCount}
                  {school.studentCapacity ? ` / ${school.studentCapacity}` : ''}
                </p>
              </div>
              <div className="mt-1.5 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    capacityPct == null
                      ? 'w-1/4 bg-zinc-300'
                      : capacityPct >= 95
                        ? 'bg-red-500'
                        : capacityPct >= 80
                          ? 'bg-amber-500'
                          : 'bg-emerald-500',
                  )}
                  style={{ width: `${capacityPct ?? 25}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Body 2 columns ──────────────────────────────────────────────── */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-zinc-100">
        {/* Left — billing */}
        <section className="p-5 sm:p-6 space-y-5">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100">
                <Banknote size={18} />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-zinc-900">Historique des paiements</h3>
                <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                  Règlements cash SaaS validés manuellement
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPayOpen(true)}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 hover:bg-emerald-700 transition-colors"
            >
              <Plus size={14} />
              Paiement manuel
            </button>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { label: 'Total cash', value: loading ? '—' : fmtUsd(totals.sum) },
              { label: 'Règlements', value: loading ? '—' : String(totals.count) },
              {
                label: 'Dernier',
                value: loading ? '—' : totals.last ? fmtDate(totals.last) : '—',
              },
            ].map((kpi) => (
              <div
                key={kpi.label}
                className="rounded-xl border border-zinc-100 bg-gradient-to-b from-zinc-50/80 to-white px-3 py-2.5"
              >
                <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
                  {kpi.label}
                </p>
                <p className="mt-1 text-sm font-semibold tabular-nums text-zinc-900 truncate">
                  {kpi.value}
                </p>
              </div>
            ))}
          </div>

          {loading ? (
            <SkeletonRows />
          ) : payments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-zinc-50/50 px-4 py-10 text-center">
              <Building2 className="mx-auto text-zinc-300 mb-3" size={28} />
              <p className="text-sm font-medium text-zinc-700">Aucun paiement cash</p>
              <p className="text-xs text-zinc-500 mt-1 max-w-xs mx-auto">
                Enregistrez le premier règlement SaaS pour constituer l&apos;historique de
                facturation.
              </p>
              <button
                type="button"
                onClick={() => setPayOpen(true)}
                className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 hover:bg-zinc-50"
              >
                <Plus size={12} /> Enregistrer
              </button>
            </div>
          ) : (
            <div className="overflow-hidden rounded-2xl border border-zinc-100">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="bg-zinc-50/90 text-[10px] uppercase tracking-[0.08em] text-zinc-400">
                    <th className="px-3.5 py-2.5 font-semibold">Date</th>
                    <th className="px-3.5 py-2.5 font-semibold">Montant</th>
                    <th className="px-3.5 py-2.5 font-semibold">Validé par</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {payments.map((p) => (
                    <tr
                      key={p.id}
                      className="group transition-colors hover:bg-emerald-50/30"
                    >
                      <td className="px-3.5 py-3 text-zinc-600 tabular-nums">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock3 size={12} className="text-zinc-300" />
                          {fmtDate(p.paidAt)}
                        </span>
                      </td>
                      <td className="px-3.5 py-3 font-semibold tabular-nums text-zinc-900">
                        {fmtUsd(p.amountUsd)}
                      </td>
                      <td className="px-3.5 py-3 text-zinc-600">
                        <span className="inline-flex max-w-[10rem] truncate items-center gap-1.5">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-100 text-[9px] font-bold text-zinc-500">
                            {p.recordedByName.slice(0, 1).toUpperCase()}
                          </span>
                          {p.recordedByName}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Right — journal + tools */}
        <section className="p-5 sm:p-6 space-y-5 bg-zinc-50/30">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-zinc-900 text-white shadow-sm shadow-zinc-900/20">
              <ScrollText size={18} />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-zinc-900">Journal des actions</h3>
              <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">
                Trace support, facturation et contrôles SaaS
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200/80 bg-white p-3.5 space-y-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-[0.1em] text-zinc-400 px-0.5">
              Outils de support
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={impBusy}
                onClick={() => setConfirmImp(true)}
                className="group flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-left hover:border-zinc-300 hover:bg-white transition-colors disabled:opacity-50"
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-zinc-900 text-white group-hover:scale-[1.03] transition-transform">
                  <LogIn size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900">Impersonate</p>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Session admin école · 30 min
                  </p>
                </div>
              </button>
              <button
                type="button"
                disabled={resetBusy}
                onClick={() => setConfirmReset(true)}
                className="group flex items-start gap-3 rounded-xl border border-zinc-100 bg-zinc-50/80 px-3 py-3 text-left hover:border-amber-200 hover:bg-amber-50/40 transition-colors disabled:opacity-50"
              >
                <div className="mt-0.5 flex h-8 w-8 items-center justify-center rounded-lg bg-amber-100 text-amber-800 group-hover:scale-[1.03] transition-transform">
                  <KeyRound size={14} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-zinc-900">Reset MDP</p>
                  <p className="text-[11px] text-zinc-500 leading-snug mt-0.5">
                    Mot de passe temporaire forcé
                  </p>
                </div>
              </button>
            </div>
          </div>

          {loading ? (
            <SkeletonRows rows={5} />
          ) : actions.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-zinc-200 bg-white px-4 py-10 text-center">
              <ScrollText className="mx-auto text-zinc-300 mb-3" size={28} />
              <p className="text-sm font-medium text-zinc-700">Journal vide</p>
              <p className="text-xs text-zinc-500 mt-1">
                Les actions support apparaîtront ici dès la première opération.
              </p>
            </div>
          ) : (
            <ol className="relative space-y-0 max-h-[22rem] overflow-y-auto pr-1">
              {actions.map((a, idx) => {
                const meta = ACTION_META[a.action] ?? {
                  label: auditActionLabel(a.action),
                  tone: 'bg-zinc-100 text-zinc-700 border-zinc-200',
                  dot: 'bg-zinc-400',
                }
                return (
                  <li key={a.id} className="relative flex gap-3 pb-4 last:pb-0">
                    {idx < actions.length - 1 && (
                      <span
                        aria-hidden
                        className="absolute left-[7px] top-4 bottom-0 w-px bg-zinc-200"
                      />
                    )}
                    <span
                      className={cn(
                        'relative z-[1] mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full ring-4 ring-white',
                        meta.dot,
                      )}
                    />
                    <div className="min-w-0 flex-1 rounded-xl border border-zinc-100 bg-white px-3 py-2.5 shadow-[0_1px_0_rgba(0,0,0,0.02)]">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span
                          className={cn(
                            'inline-flex rounded-md border px-2 py-0.5 text-[10px] font-semibold',
                            meta.tone,
                          )}
                        >
                          {meta.label}
                        </span>
                        <span
                          className="text-[11px] tabular-nums text-zinc-400"
                          title={fmtDateTime(a.createdAt)}
                        >
                          {fmtRelative(a.createdAt)}
                        </span>
                      </div>
                      <p className="mt-1.5 text-xs text-zinc-500">
                        par <span className="font-medium text-zinc-700">{a.actorName}</span>
                      </p>
                    </div>
                  </li>
                )
              })}
            </ol>
          )}
        </section>
      </div>

      {/* Payment modal */}
      <AnimatePresence>
        {payOpen && (
          <motion.div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
              role="dialog"
              aria-modal="true"
            >
              <div className="flex items-start justify-between gap-3 border-b border-zinc-100 px-5 py-4 bg-gradient-to-br from-emerald-50/80 to-white">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-600 text-white">
                    <Banknote size={16} />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-zinc-900">
                      Paiement manuel
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">{school.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700"
                  aria-label="Fermer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="px-5 py-4 space-y-3.5">
                <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Date du règlement
                  <input
                    type="date"
                    value={paidAt}
                    onChange={(e) => setPaidAt(e.target.value)}
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Montant (USD)
                  <div className="relative mt-1.5">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-zinc-400">
                      $
                    </span>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={amountUsd}
                      onChange={(e) => setAmountUsd(e.target.value)}
                      placeholder="150.00"
                      className="w-full rounded-xl border border-zinc-200 bg-zinc-50/50 pl-7 pr-3 py-2.5 text-sm font-semibold tabular-nums text-zinc-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                    />
                  </div>
                </label>

                <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  Note (optionnel)
                  <input
                    type="text"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={280}
                    placeholder="Réf. reçu, période couverte…"
                    className="mt-1.5 w-full rounded-xl border border-zinc-200 bg-zinc-50/50 px-3 py-2.5 text-sm text-zinc-900 outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
                  />
                </label>
              </div>

              <div className="flex gap-2 border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
                <button
                  type="button"
                  onClick={() => setPayOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm font-medium text-zinc-700 hover:bg-zinc-50"
                >
                  Annuler
                </button>
                <button
                  type="button"
                  disabled={payBusy}
                  onClick={() => void submitPayment()}
                  className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-700 disabled:opacity-50 inline-flex items-center justify-center gap-2 shadow-sm shadow-emerald-600/20"
                >
                  {payBusy && <Loader2 size={14} className="animate-spin" />}
                  Enregistrer
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={confirmImp}
        title="Se connecter en tant qu’admin ?"
        description={`Une session temporaire de l’administrateur de « ${school.name} » sera ouverte. Votre session Superadmin est conservée en arrière-plan.`}
        impact={[
          'Durée limitée à 30 minutes',
          'Bannière « Mode Impersonation » visible dans /admin',
          'Actions Superadmin bloquées jusqu’à la sortie',
          'Journal d’audit : démarrage d’impersonation',
        ]}
        confirmLabel="Ouvrir la session école"
        variant="danger"
        loading={impBusy}
        onConfirm={() => void runImpersonate()}
        onCancel={() => setConfirmImp(false)}
      />

      <ConfirmDialog
        open={confirmReset}
        title="Réinitialiser le mot de passe ?"
        description="Un mot de passe temporaire sera généré pour l’admin principal. Les sessions actives seront révoquées."
        impact={[
          'Changement de MDP forcé à la prochaine connexion',
          'Le mot de passe ne s’affiche qu’une seule fois',
          'Action journalisée dans l’audit support',
        ]}
        confirmLabel="Générer le mot de passe"
        variant="danger"
        loading={resetBusy}
        onConfirm={() => void runResetPassword()}
        onCancel={() => setConfirmReset(false)}
      />

      <TempPasswordRevealModal
        open={Boolean(tempPwd)}
        userName={tempPwd?.name ?? ''}
        tempPassword={tempPwd?.password ?? ''}
        onClose={() => setTempPwd(null)}
      />
    </motion.div>
  )
}
