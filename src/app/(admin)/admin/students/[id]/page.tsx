'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, User, CheckCircle2, XCircle, Clock, ShieldAlert,
  FileCheck, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useStudentDetail, useStudentActivity, useDossierStatus, useSecurityAction,
} from '@/lib/hooks/use-admin'
import { Skeleton } from '@/components/ui/skeleton'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; cls: string }> = {
  ACTIVE:    { label: 'Actif',    cls: 'bg-emerald-50 text-emerald-700' },
  INACTIVE:  { label: 'Inactif', cls: 'bg-zinc-100 text-zinc-500' },
  SUSPENDED: { label: 'Suspendu', cls: 'bg-red-50 text-red-700' },
}

function InfoRow({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-3 py-2 border-b border-zinc-50 last:border-0">
      <span className="text-xs text-zinc-400 w-32 flex-shrink-0 pt-0.5">{label}</span>
      <span className="text-sm text-zinc-700 min-w-0 break-words">{value}</span>
    </div>
  )
}

function DossierCheck({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className={cn('flex items-center gap-2 p-3 rounded-xl', ok ? 'bg-emerald-50' : 'bg-zinc-50')}>
      {ok ? <CheckCircle2 size={14} className="text-emerald-600" /> : <XCircle size={14} className="text-zinc-300" />}
      <span className={cn('text-xs font-medium', ok ? 'text-emerald-700' : 'text-zinc-400')}>{label}</span>
    </div>
  )
}

export default function StudentDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const studentId = Number(id)

  const { data: student, isLoading } = useStudentDetail(studentId)
  const { data: activity, isLoading: loadingActivity } = useStudentActivity(studentId)
  const { data: dossier } = useDossierStatus(studentId)
  const securityMutation = useSecurityAction()

  const [actionLoading, setActionLoading] = useState<string | null>(null)

  async function doAction(action: string, reason?: string) {
    setActionLoading(action)
    try {
      await securityMutation.mutateAsync({ id: studentId, action, reason })
    } finally {
      setActionLoading(null)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50 p-8 space-y-4 max-w-4xl mx-auto">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-64" />
      </div>
    )
  }

  if (!student) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center">
        <p className="text-sm text-zinc-400">Élève introuvable.</p>
      </div>
    )
  }

  const sc = STATUS_CFG[student.status] ?? { label: student.status, cls: 'bg-zinc-100 text-zinc-500' }
  const debtAmount = student.debtAmount ?? 0
  const dossierItem = dossier as {
    hasPhoto?: boolean; hasBiometrics?: boolean; hasParentContact?: boolean;
    isFinanciallyCleared?: boolean; completionRate?: number
  } | undefined

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-4xl mx-auto px-8 py-5 flex items-center gap-4">
          <button
            onClick={() => router.back()}
            className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center">
              <span className="text-sm font-bold text-emerald-700">
                {student.firstName?.[0]}{student.lastName?.[0]}
              </span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-zinc-900">{student.firstName} {student.lastName}</h1>
              <div className="flex items-center gap-2 mt-0.5">
                <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', sc.cls)}>{sc.label}</span>
                {student.matricule && <span className="text-xs text-zinc-400 font-mono">{student.matricule}</span>}
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto px-8 py-6 space-y-5">

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* Profile */}
          <div className="lg:col-span-2 space-y-4">
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2"><User size={14} /> Informations</h2>
              <InfoRow label="Classe" value={student.className} />
              <InfoRow label="Email" value={student.email} />
              <InfoRow label="Téléphone" value={student.phone} />
              <InfoRow label="Date de naissance" value={student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString('fr-FR') : undefined} />
              <InfoRow label="Adresse" value={student.address} />
              <InfoRow label="Parent/Tuteur" value={student.parentName} />
              <InfoRow label="Tél. parent" value={student.parentPhone} />
              <InfoRow label="Email parent" value={student.parentEmail} />
              <InfoRow label="Genre" value={student.gender === 'M' ? 'Masculin' : student.gender === 'F' ? 'Féminin' : undefined} />
            </div>

            {/* Finance */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-4">Finance</h2>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: 'À payer', value: student.totalDue, color: 'zinc' },
                  { label: 'Payé', value: student.totalPaid, color: 'emerald' },
                  { label: 'Solde', value: debtAmount, color: debtAmount > 0 ? 'red' : 'emerald' },
                ].map(({ label, value, color }) => (
                  <div key={label} className={cn('rounded-xl p-3',
                    color === 'emerald' ? 'bg-emerald-50' : color === 'red' ? 'bg-red-50' : 'bg-zinc-50'
                  )}>
                    <p className="text-[11px] text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
                    <p className={cn('text-base font-bold tabular-nums',
                      color === 'emerald' ? 'text-emerald-700' : color === 'red' ? 'text-red-700' : 'text-zinc-700'
                    )}>
                      {(value ?? 0).toLocaleString('fr-FR')}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Activity */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="px-5 py-4 border-b border-zinc-100">
                <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><Clock size={14} /> Activité récente</h2>
              </div>
              {loadingActivity ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-10" />)}</div>
              ) : (activity as unknown[])?.length ? (
                <div className="divide-y divide-zinc-50 max-h-72 overflow-y-auto">
                  {((activity as Array<{ id: number; type: string; description: string; createdAt: string }>) ?? []).map((evt) => (
                    <div key={evt.id} className="px-5 py-3 flex items-start gap-3">
                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-2 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-zinc-700">{evt.type}</p>
                        <p className="text-xs text-zinc-400 truncate">{evt.description}</p>
                      </div>
                      <span className="text-[10px] text-zinc-300 flex-shrink-0 ml-auto pt-0.5 tabular-nums">
                        {new Date(evt.createdAt).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-sm text-zinc-400">Aucune activité</div>
              )}
            </div>
          </div>

          {/* Right column */}
          <div className="space-y-4">

            {/* Dossier */}
            {dossierItem && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-sm font-semibold text-zinc-700 flex items-center gap-2"><FileCheck size={14} /> Dossier</h2>
                  <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full',
                    (dossierItem.completionRate ?? 0) >= 80 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                  )}>
                    {dossierItem.completionRate ?? 0}%
                  </span>
                </div>
                <div className="space-y-2">
                  <DossierCheck ok={!!dossierItem.hasPhoto} label="Photo" />
                  <DossierCheck ok={!!dossierItem.hasBiometrics} label="Biométrie" />
                  <DossierCheck ok={!!dossierItem.hasParentContact} label="Contact parent" />
                  <DossierCheck ok={!!dossierItem.isFinanciallyCleared} label="Dégagé financièrement" />
                </div>
              </div>
            )}

            {/* Presence stats */}
            {student.presenceCount !== undefined && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <h2 className="text-sm font-semibold text-zinc-700 mb-3">Présence</h2>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Total présences</span>
                    <span className="text-sm font-bold text-zinc-900 tabular-nums">{student.presenceCount}</span>
                  </div>
                  {student.lastPresence && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">Dernière présence</span>
                      <span className="text-xs text-zinc-600">{new Date(student.lastPresence).toLocaleDateString('fr-FR')}</span>
                    </div>
                  )}
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-zinc-500">Dossier verrouillé</span>
                    <span className={cn('text-xs font-medium', student.isLocked ? 'text-red-600' : 'text-emerald-600')}>
                      {student.isLocked ? 'Oui' : 'Non'}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* Security actions */}
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
              <h2 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-2">
                <ShieldAlert size={14} className="text-red-500" /> Actions
              </h2>
              <div className="space-y-2">
                {[
                  { action: 'SUSPEND', label: 'Suspendre', danger: true },
                  { action: 'UNSUSPEND', label: 'Lever suspension', danger: false },
                  { action: 'LOCK', label: 'Verrouiller dossier', danger: true },
                  { action: 'UNLOCK', label: 'Déverrouiller dossier', danger: false },
                ].map(({ action, label, danger }) => (
                  <button
                    key={action}
                    onClick={() => doAction(action)}
                    disabled={securityMutation.isPending}
                    className={cn(
                      'w-full flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium transition-colors',
                      danger
                        ? 'border border-red-200 text-red-600 hover:bg-red-50'
                        : 'border border-zinc-200 text-zinc-600 hover:bg-zinc-50',
                    )}
                  >
                    {actionLoading === action && <Loader2 size={12} className="animate-spin" />}
                    {label}
                  </button>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
