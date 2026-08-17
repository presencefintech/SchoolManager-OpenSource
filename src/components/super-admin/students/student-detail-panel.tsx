'use client'

import { useState, useEffect, useMemo, useRef, useCallback } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, ScanLine, Wallet, ShieldAlert, AlertTriangle, CheckCircle2, XCircle,
  Camera, Fingerprint, BadgeCheck, FileText, History, LayoutDashboard, UserPlus,
  CreditCard, Printer, FileDown, Loader2, Lock, LockOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatRdcFullName } from '@/lib/utils/student-name.util'
import {
  useStudentDashboard,
  useStudentActivity,
  useStudentDossier,
} from '@/lib/hooks/use-super-admin'
import { useToggleStudentPaymentLock } from '@/lib/hooks/use-student-mutations'
import { resolveApiErrorMessage } from '@/lib/auth/security-errors'
import { StudentCard } from '@/components/StudentCard'
import { mapDashboardToStudentCard } from '@/lib/student-card/utils'
import { downloadStudentCardPdf, printStudentCard } from '@/lib/student-card/export-actions'
import { fmtCurrency, fmtDate, statusBadgeClass } from './student-utils'
import { studentStatusLabel } from '@/lib/i18n/display-labels'

type PanelTab = 'overview' | 'history' | 'dossier' | 'activity'

function StatCard({
  label, value, sub, icon: Icon, color = 'indigo',
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType; color?: 'indigo' | 'emerald' | 'amber' | 'rose'
}) {
  const colors = {
    indigo: 'bg-indigo-50 text-indigo-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    amber: 'bg-amber-50 text-amber-600',
    rose: 'bg-rose-50 text-rose-600',
  }
  return (
    <div className="bg-zinc-50 rounded-xl border border-zinc-200/80 px-4 py-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
          <p className="text-xl font-bold text-zinc-900 tabular-nums leading-none">{value}</p>
          {sub && <p className="text-xs text-zinc-500 mt-1">{sub}</p>}
        </div>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', colors[color])}>
          <Icon size={15} />
        </div>
      </div>
    </div>
  )
}

const activityIcons: Record<string, React.ElementType> = {
  PRESENCE: ScanLine,
  PAYMENT: Wallet,
  DISCIPLINE: ShieldAlert,
}

const activityColors: Record<string, string> = {
  PRESENCE: 'bg-indigo-50 text-indigo-600',
  PAYMENT: 'bg-emerald-50 text-emerald-600',
  DISCIPLINE: 'bg-rose-50 text-rose-600',
}

const TABS: { id: PanelTab; label: string; icon: React.ElementType }[] = [
  { id: 'overview', label: 'Vue', icon: LayoutDashboard },
  { id: 'history', label: 'Historique', icon: History },
  { id: 'dossier', label: 'Dossier', icon: FileText },
  { id: 'activity', label: 'Activité', icon: ScanLine },
]

export interface StudentDetailPanelProps {
  studentId: number
  schoolId: number
  open: boolean
  onClose: () => void
}

export function StudentDetailPanel({ studentId, schoolId, open, onClose }: StudentDetailPanelProps) {
  const [tab, setTab] = useState<PanelTab>('overview')
  const [downloadingCard, setDownloadingCard] = useState(false)
  const [cardExportReady, setCardExportReady] = useState(false)
  const cardElementRef = useRef<HTMLDivElement | null>(null)
  const handleCardElement = useCallback((el: HTMLDivElement | null) => {
    cardElementRef.current = el
  }, [])

  const { data: dashboard, isLoading: dashLoading, isError: dashError, error: dashQueryError } =
    useStudentDashboard(studentId)
  const { data: activity, isLoading: actLoading } = useStudentActivity(studentId)
  const { data: dossier, isLoading: dossierLoading } = useStudentDossier(studentId)
  const toggleLock = useToggleStudentPaymentLock()

  const handleTogglePaymentLock = useCallback(() => {
    if (!dashboard || schoolId <= 0) return
    toggleLock.mutate({
      studentId,
      schoolId,
      isLocked: !dashboard.profile.isPaymentLocked,
    })
  }, [dashboard, schoolId, studentId, toggleLock])

  const cardData = useMemo(
    () => (dashboard ? mapDashboardToStudentCard(dashboard) : null),
    [dashboard],
  )

  async function handleDownloadCard() {
    if (!cardData || !cardExportReady) return
    setDownloadingCard(true)
    try {
      await downloadStudentCardPdf(cardData, `carte_eleve_${studentId}.pdf`, {
        sourceElement: cardElementRef.current,
      })
    } catch (e) {
      console.error('[StudentCard] export PDF', e)
    } finally {
      setDownloadingCard(false)
    }
  }

  async function handlePrintCard() {
    if (!cardData || !cardExportReady) return
    try {
      await printStudentCard(cardData, { sourceElement: cardElementRef.current })
    } catch (e) {
      console.error('[StudentCard] print', e)
      window.alert(e instanceof Error ? e.message : 'Impossible d\'imprimer la carte.')
    }
  }

  useEffect(() => {
    if (open) {
      setTab('overview')
      setCardExportReady(false)
    }
  }, [studentId, open])

  const dossierItems = dossier
    ? [
        { key: 'photo', label: 'Photo de profil', icon: Camera },
        { key: 'biometrics', label: 'Données biométriques', icon: Fingerprint },
        { key: 'verified', label: 'Vérifié physiquement', icon: BadgeCheck },
        { key: 'payment', label: 'Premier paiement effectué', icon: Wallet },
        { key: 'documents', label: 'Documents (acte de naissance)', icon: FileText },
      ]
    : []

  const profileHeader = dashboard && (
    <div className="flex items-start gap-3 p-3 rounded-xl border border-zinc-200/80 bg-zinc-50/50">
      <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
        {dashboard.profile.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={dashboard.profile.photoUrl} alt="" className="w-12 h-12 object-cover" />
        ) : (
          <span className="text-base font-bold text-indigo-700">
            {dashboard.profile.firstName[0]}{dashboard.profile.lastName[0]}
          </span>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-zinc-900 truncate">
            {formatRdcFullName(dashboard.profile)}
          </h3>
          <span className={cn('px-1.5 py-0.5 text-[10px] rounded-full ring-1', statusBadgeClass(dashboard.profile.status))}>
            {studentStatusLabel(dashboard.profile.status)}
          </span>
        </div>
        <p className="text-[11px] text-zinc-500 mt-0.5 truncate">
          {dashboard.profile.class?.name ?? 'Sans classe'} · {dashboard.profile.matricule ?? '—'}
        </p>
      </div>
    </div>
  )

  return (
    <AnimatePresence>
      {open && studentId > 0 && (
        <>
          <motion.button
            type="button"
            aria-label="Fermer la fiche élève"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[2px]"
            onClick={onClose}
          />

          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label="Fiche élève"
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 28, stiffness: 320 }}
            className="fixed inset-y-0 right-0 z-50 w-full max-w-lg bg-white border-l border-zinc-200 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-100 bg-gradient-to-r from-slate-50 to-white flex-shrink-0">
              <div>
                <p className="text-[10px] font-semibold text-indigo-600 uppercase tracking-wider">Fiche élève 360°</p>
                <p className="text-sm font-medium text-zinc-800 mt-0.5 tabular-nums">
                  ID {studentId}
                  {schoolId > 0 && <span className="text-zinc-400 font-normal"> · École #{schoolId}</span>}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {schoolId > 0 && (
                  <Link
                    href={`/super-admin/enrollment?schoolId=${schoolId}&studentId=${studentId}`}
                    className="h-9 px-3 rounded-xl border border-indigo-200 bg-indigo-50 flex items-center gap-1.5 text-[11px] font-medium text-indigo-700 hover:bg-indigo-100 transition-colors"
                    title="Ouvrir le diagnostic inscription pour cet élève"
                  >
                    <UserPlus size={14} />
                    Inscriptions
                  </Link>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-9 w-9 rounded-xl border border-zinc-200 flex items-center justify-center text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800 transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="px-4 pt-3 pb-0 border-b border-zinc-100 flex-shrink-0">
              <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl">
                {TABS.map(({ id, label, icon: Icon }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setTab(id)}
                    className={cn(
                      'flex-1 flex items-center justify-center gap-1 px-2 py-2 rounded-lg text-[11px] font-medium transition-all',
                      tab === id ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
                    )}
                  >
                    <Icon size={12} />
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
              {dashError ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 flex items-center gap-3 text-red-700">
                  <XCircle size={18} className="flex-shrink-0" />
                  <p className="text-sm font-medium">
                    {resolveApiErrorMessage(
                      (dashQueryError as { response?: { data?: unknown } })?.response?.data,
                      'Élève introuvable ou accès refusé',
                    )}
                  </p>
                </div>
              ) : dashLoading && tab !== 'activity' ? (
                <div className="space-y-3">
                  <div className="h-16 bg-zinc-100 rounded-xl animate-pulse" />
                  <div className="h-32 bg-zinc-100 rounded-xl animate-pulse" />
                </div>
              ) : (
                <>
                  {tab === 'overview' && dashboard && (
                    <>
                      {profileHeader}
                      <div className="grid grid-cols-2 gap-2">
                        <StatCard label="Présence" value={`${dashboard.stats.attendanceRate}%`} icon={ScanLine} color="indigo" />
                        <StatCard
                          label="Payé"
                          value={fmtCurrency(dashboard.stats.totalPaid, dashboard.stats.currency)}
                          icon={Wallet}
                          color="emerald"
                        />
                        <StatCard
                          label="Dette"
                          value={fmtCurrency(dashboard.stats.remainingDebt, dashboard.stats.currency)}
                          sub={dashboard.stats.isUpToDate ? 'À jour' : 'En retard'}
                          icon={AlertTriangle}
                          color={dashboard.stats.isUpToDate ? 'emerald' : 'rose'}
                        />
                        <StatCard
                          label="Biométrie"
                          value={dashboard.profile.biometricStatus ?? 'Non enrôlé'}
                          icon={Fingerprint}
                          color="amber"
                        />
                      </div>
                      {schoolId > 0 && (
                        <button
                          type="button"
                          onClick={handleTogglePaymentLock}
                          disabled={toggleLock.isPending}
                          className={cn(
                            'w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                            dashboard.profile.isPaymentLocked
                              ? 'bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100'
                              : 'bg-zinc-50 text-zinc-600 ring-1 ring-zinc-200 hover:bg-zinc-100',
                          )}
                        >
                          {toggleLock.isPending ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : dashboard.profile.isPaymentLocked ? (
                            <Lock size={14} />
                          ) : (
                            <LockOpen size={14} />
                          )}
                          {dashboard.profile.isPaymentLocked ? 'Déverrouiller les paiements' : 'Verrouiller les paiements'}
                        </button>
                      )}
                      {dashboard.profile.birthDate && (
                        <p className="text-[11px] text-zinc-400 text-center">
                          Né(e) le {fmtDate(dashboard.profile.birthDate)} · {dashboard.profile.gender}
                          {dashboard.profile.isPaymentLocked && ' · Paiement verrouillé'}
                        </p>
                      )}

                      {cardData && (
                        <div className="rounded-xl border border-zinc-200/80 bg-zinc-50/60 overflow-hidden">
                          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100 bg-white/80">
                            <div className="flex items-center gap-2 min-w-0">
                              <CreditCard size={14} className="text-indigo-600 flex-shrink-0" />
                              <div className="min-w-0">
                                <p className="text-xs font-semibold text-zinc-800">Carte élève</p>
                                <p className="text-[10px] text-zinc-400 truncate">Format badge · réimpression</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <button
                                type="button"
                                onClick={handleDownloadCard}
                                disabled={downloadingCard || !cardExportReady}
                                className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
                              >
                                {downloadingCard ? <Loader2 size={12} className="animate-spin" /> : <FileDown size={12} />}
                                PDF
                              </button>
                              <button
                                type="button"
                                onClick={handlePrintCard}
                                disabled={!cardExportReady}
                                className="h-8 flex items-center gap-1.5 px-2.5 rounded-lg text-[11px] font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
                              >
                                <Printer size={12} />
                                Imprimer
                              </button>
                            </div>
                          </div>
                          <div className="flex justify-center p-4 overflow-x-auto">
                            <StudentCard
                              data={cardData}
                              preview
                              onCardElement={handleCardElement}
                              onReady={(s) => setCardExportReady(s.canDownload)}
                            />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {tab === 'history' && dashboard && (
                    <>
                      {profileHeader}
                      <div className="space-y-4">
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1.5">
                            <Wallet size={13} className="text-emerald-600" />
                            Paiements confirmés
                          </h4>
                          {dashboard.history.payments.length ? (
                            <div className="rounded-xl border border-zinc-200/80 divide-y divide-zinc-50 overflow-hidden">
                              {dashboard.history.payments.map((p) => (
                                <div key={p.id} className="px-3 py-2.5 flex items-center justify-between text-xs">
                                  <span className="text-zinc-500">{fmtDate(p.createdAt)}</span>
                                  <span className="font-semibold tabular-nums text-emerald-700">
                                    {fmtCurrency(p.amount, p.currency)}
                                  </span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-xl">Aucun paiement</p>
                          )}
                        </div>
                        <div>
                          <h4 className="text-xs font-semibold text-zinc-700 mb-2 flex items-center gap-1.5">
                            <ScanLine size={13} className="text-indigo-600" />
                            Présences récentes
                          </h4>
                          {dashboard.history.presences.length ? (
                            <div className="rounded-xl border border-zinc-200/80 divide-y divide-zinc-50 overflow-hidden max-h-52 overflow-y-auto">
                              {dashboard.history.presences.map((p) => (
                                <div key={p.id} className="px-3 py-2.5 flex items-center justify-between gap-2 text-xs">
                                  <div className="min-w-0">
                                    <span className={cn(
                                      'font-medium',
                                      p.status === 'PRESENT' ? 'text-emerald-700' : p.status === 'LATE' ? 'text-amber-700' : 'text-zinc-600',
                                    )}>
                                      {p.status ?? '—'}
                                    </span>
                                    {p.scanMethod && (
                                      <span className="text-zinc-400 ml-1">· {p.scanMethod}</span>
                                    )}
                                  </div>
                                  <span className="text-zinc-400 flex-shrink-0">{fmtDate(p.scannedAt)}</span>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <p className="text-xs text-zinc-400 py-4 text-center border border-dashed border-zinc-200 rounded-xl">Aucune présence</p>
                          )}
                        </div>
                      </div>
                    </>
                  )}

                  {tab === 'dossier' && (
                    dossierLoading ? (
                      <div className="h-40 bg-zinc-100 rounded-xl animate-pulse" />
                    ) : dossier ? (
                      <>
                        {profileHeader}
                        <div className="rounded-xl border border-zinc-200/80 p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h4 className="text-sm font-semibold text-zinc-800">Complétude</h4>
                              <p className="text-xs text-zinc-400">{Math.round(dossier.completionRate)}%</p>
                            </div>
                            <span className={cn(
                              'px-2 py-0.5 text-[10px] font-semibold rounded-full',
                              dossier.isReady ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200' : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
                            )}>
                              {dossier.isReady ? 'Complet' : 'Incomplet'}
                            </span>
                          </div>
                          <div className="h-1.5 bg-zinc-100 rounded-full mb-3 overflow-hidden">
                            <div
                              className={cn('h-full rounded-full', dossier.isReady ? 'bg-emerald-500' : 'bg-amber-400')}
                              style={{ width: `${dossier.completionRate}%` }}
                            />
                          </div>
                          <div className="grid grid-cols-1 gap-1.5">
                            {dossierItems.map(({ key, label, icon: Icon }) => {
                              const ok = dossier.checks[key as keyof typeof dossier.checks]
                              return (
                                <div
                                  key={key}
                                  className={cn(
                                    'flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs',
                                    ok ? 'bg-emerald-50/80 border-emerald-200 text-emerald-700' : 'bg-zinc-50 border-zinc-200 text-zinc-400',
                                  )}
                                >
                                  <Icon size={13} className="flex-shrink-0" />
                                  <span className="truncate">{label}</span>
                                  {ok
                                    ? <CheckCircle2 size={12} className="ml-auto text-emerald-500" />
                                    : <XCircle size={12} className="ml-auto text-zinc-300" />
                                  }
                                </div>
                              )
                            })}
                          </div>
                        </div>
                      </>
                    ) : null
                  )}

                  {tab === 'activity' && (
                    <div className="rounded-xl border border-zinc-200/80 overflow-hidden">
                      <div className="px-4 py-3 border-b border-zinc-100 bg-zinc-50/50">
                        <h4 className="text-sm font-semibold text-zinc-800">Timeline unifiée</h4>
                        <p className="text-[11px] text-zinc-400">Présences, paiements, discipline</p>
                      </div>
                      {actLoading ? (
                        <div className="p-4 space-y-3">
                          {[...Array(4)].map((_, i) => <div key={i} className="h-10 bg-zinc-100 rounded-lg animate-pulse" />)}
                        </div>
                      ) : activity?.length ? (
                        <div className="divide-y divide-zinc-50 max-h-[min(24rem,50vh)] overflow-y-auto">
                          {activity.map((event, i) => {
                            const Icon = activityIcons[event.type] ?? ScanLine
                            const colorClass = activityColors[event.type] ?? 'bg-zinc-100 text-zinc-500'
                            return (
                              <div key={i} className="px-4 py-2.5 flex items-center gap-3">
                                <div className={cn('w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0', colorClass)}>
                                  <Icon size={12} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs text-zinc-700 truncate">{event.title}</p>
                                  <p className="text-[10px] text-zinc-400">{fmtDate(event.date)}</p>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-xs text-zinc-400 text-center py-8">Aucune activité</p>
                      )}
                    </div>
                  )}
                </>
              )}

              <p className="text-[10px] text-zinc-400 text-center pb-2">
                Consultation journalisée · accès SuperAdmin
              </p>
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  )
}
