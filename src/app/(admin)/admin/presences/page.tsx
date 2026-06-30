'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, stagger } from '@/lib/animations'
import {
  CheckCircle2, XCircle, Clock, ShieldAlert, Activity,
  QrCode, Plus, Users, RefreshCw, CheckCheck, Trash2, X,
  EyeOff, Bell,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePresenceStats, usePresenceLiveFeed, usePresenceHeatmap, usePresenceAlerts,
  useValidatePresence, useDeletePresence,
  useGenerateSessionQR, useClasses,
  useDismissSecurityAlert, useValidateSecurityAlert, useNotifySecurityAlert,
} from '@/lib/hooks/use-admin'
import type { PresenceSecurityAlert, ClassListItem } from '@/types/admin'
import { ManualRecordModal } from '@/components/admin/presences/ManualRecordModal'
import { BulkPresenceGrid } from '@/components/admin/presences/BulkPresenceGrid'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import { labelFraudScore } from '@/lib/business-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const STATUS_CFG: Record<string, { label: string; dot: string; badge: string }> = {
  PRESENT: { label: 'Présent', dot: 'bg-emerald-500', badge: 'bg-emerald-50 text-emerald-700' },
  ABSENT:  { label: 'Absent',  dot: 'bg-red-500',     badge: 'bg-red-50 text-red-700' },
  LATE:    { label: 'Retard',  dot: 'bg-amber-500',   badge: 'bg-amber-50 text-amber-700' },
}

// ── Modals ─────────────────────────────────────────────────────────

function QRKioskModal({ onClose, classes }: { onClose: () => void; classes: ClassListItem[] }) {
  const [classId, setClassId] = useState('')
  const generate = useGenerateSessionQR()
  const selected = classes.find(c => String(c.id) === classId)

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">QR Code Kiosque</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={18} /></button>
        </div>
        <div className="p-6 space-y-4">
          {!generate.data ? (
            <>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">Classe</label>
                <select
                  value={classId}
                  onChange={e => setClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                >
                  <option value="">Sélectionner une classe…</option>
                  {classes.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <button
                onClick={() => classId && generate.mutate(Number(classId))}
                disabled={!classId || generate.isPending}
                className="w-full px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {generate.isPending ? 'Génération…' : 'Générer le QR'}
              </button>
              {generate.isError && <p className="text-xs text-red-600 text-center">Erreur lors de la génération</p>}
            </>
          ) : (
            <div className="text-center space-y-4">
              {selected && (
                <p className="text-xs font-semibold text-zinc-500 bg-zinc-50 rounded-lg px-3 py-1.5">
                  {selected.name}
                </p>
              )}
              <img
                src={generate.data.qrCode}
                alt="QR Code Kiosque"
                className="mx-auto w-48 h-48 rounded-xl border border-zinc-200"
              />
              <p className="text-xs text-zinc-400">Expire dans {Math.round(generate.data.expiresAt / 60)} minutes</p>
              <button onClick={() => generate.reset()} className="text-xs text-emerald-600 hover:underline">
                Générer un nouveau QR
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Heatmap ─────────────────────────────────────────────────────────

function HeatmapChart({ classId }: { classId?: number }) {
  const { data, isLoading } = usePresenceHeatmap(classId)

  if (isLoading) {
    return (
      <div className="flex items-end gap-1 h-40">
        {[...Array(24)].map((_, i) => <div key={i} className="flex-1 rounded-xl bg-zinc-100 animate-pulse" style={{ height: `${30 + Math.random() * 70}%` }} />)}
      </div>
    )
  }

  if (!data?.length) {
    return <p className="text-sm text-zinc-400 text-center py-10">Aucune donnée disponible</p>
  }

  const max = Math.max(...data.map(d => d.count), 1)
  return (
    <div className="space-y-3">
      <div className="flex items-end gap-1 h-40">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 flex flex-col items-center gap-1 group relative">
            {d.count > 0 && (
              <span className="absolute bottom-full mb-1 text-[10px] bg-zinc-800 text-white px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                {d.count}
              </span>
            )}
            <div
              className={cn(
                'w-full rounded-t-sm transition-colors',
                d.count > 0 ? 'bg-emerald-400 group-hover:bg-emerald-500' : 'bg-zinc-100'
              )}
              style={{ height: `${Math.max((d.count / max) * 140, d.count > 0 ? 4 : 2)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 text-center text-[9px] text-zinc-300">
            {d.hour.replace('h', '')}h
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────

type Tab = 'live' | 'heatmap' | 'alerts'

export default function PresencesPage() {
  const toast = useToast()
  const [tab, setTab] = useState<Tab>('live')
  const [filterClassId, setFilterClassId] = useState<number | undefined>(undefined)
  const [showManual, setShowManual] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showQR, setShowQR] = useState(false)
  const [alertAction, setAlertAction] = useState<{ type: 'dismiss' | 'validate' | 'notify'; alert: PresenceSecurityAlert } | null>(null)

  const { data: stats, isLoading: loadingStats } = usePresenceStats()
  const { data: feed, isLoading: loadingFeed, refetch: refetchFeed } = usePresenceLiveFeed({
    limit: 50,
    ...(filterClassId ? { classId: filterClassId } : {}),
  })
  const { data: alerts, isLoading: loadingAlerts } = usePresenceAlerts()
  const { data: classesData } = useClasses()
  const classes = classesData ?? []

  const validate = useValidatePresence()
  const del = useDeletePresence()
  const dismissAlert = useDismissSecurityAlert()
  const validateAlert = useValidateSecurityAlert()
  const notifyAlert = useNotifySecurityAlert()

  const STAT_CARDS = [
    { label: 'Présents',         value: stats?.present       ?? '—', color: 'emerald', Icon: CheckCircle2 },
    { label: 'Absents',          value: stats?.absent        ?? '—', color: 'rose',    Icon: XCircle },
    { label: 'Retards',          value: stats?.late          ?? '—', color: 'amber',   Icon: Clock },
    { label: 'Total élèves',     value: stats?.totalStudents ?? '—', color: 'indigo',  Icon: Activity },
    { label: 'Fraudes critiques',value: stats?.criticalFraud ?? '—', color: 'rose',    Icon: ShieldAlert },
  ] as const

  const COLORS: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600',
    rose:    'bg-rose-50 text-rose-600',
    amber:   'bg-amber-50 text-amber-600',
    indigo:  'bg-indigo-50 text-indigo-600',
  }

  const TABS: { key: Tab; label: string }[] = [
    { key: 'live',    label: 'Flux en direct' },
    { key: 'heatmap', label: 'Heatmap' },
    { key: 'alerts',  label: `Alertes${alerts?.length ? ` (${alerts.length})` : ''}` },
  ]

  async function confirmAlertAction() {
    if (!alertAction) return
    const { type, alert } = alertAction
    try {
      if (type === 'dismiss') {
        await dismissAlert.mutateAsync({ eventId: alert.id })
        toast.success('Alerte ignorée', 'Elle n\'apparaîtra plus dans le feed actif.')
      } else if (type === 'validate') {
        await validateAlert.mutateAsync(alert.id)
        toast.success('Présence validée', 'L\'alerte a été levée après contrôle.')
      } else {
        await notifyAlert.mutateAsync({ eventId: alert.id })
        toast.success('Notification envoyée', 'Le parent ou l\'élève sera informé.')
      }
    } catch (err) {
      toast.error('Action impossible', getApiErrorMessage(err))
    } finally {
      setAlertAction(null)
    }
  }

  const alertActionLoading = dismissAlert.isPending || validateAlert.isPending || notifyAlert.isPending

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Présences</h1>
            <p className="text-sm text-zinc-400 mt-1 capitalize" suppressHydrationWarning>
              {new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setShowQR(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <QrCode size={15} />
              QR Kiosque
            </button>
            <button
              onClick={() => setShowBulk(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors"
            >
              <Users size={15} />
              Enreg. groupé
            </button>
            <button
              onClick={() => setShowManual(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus size={15} />
              Enregistrement manuel
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div className="max-w-7xl mx-auto px-8 py-8 space-y-6" variants={stagger} initial="hidden" animate="show">

        {/* Stats Cards */}
        <motion.div variants={fadeUp} className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {STAT_CARDS.map(({ label, value, color, Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4">
              {loadingStats ? (
                <Skeleton className="h-12" />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium text-zinc-400 uppercase tracking-wide mb-1 leading-tight">{label}</p>
                    <p className="text-2xl font-bold text-zinc-900 tabular-nums">{value}</p>
                  </div>
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', COLORS[color])}>
                    <Icon size={16} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {/* Attendance rate bar */}
        {!loadingStats && (
          <motion.div variants={fadeUp} className="bg-white rounded-xl border border-zinc-200 px-6 py-4 flex items-center gap-5">
            <span className="text-sm font-medium text-zinc-600 w-32 flex-shrink-0">Taux de présence</span>
            <div className="flex-1 bg-zinc-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-700"
                style={{ width: `${stats?.attendanceRate ?? 0}%` }}
              />
            </div>
            <span className="text-sm font-bold text-emerald-700 flex-shrink-0 tabular-nums w-12 text-right">
              {(stats?.attendanceRate ?? 0).toFixed(1)}%
            </span>
          </motion.div>
        )}

        {/* Filtre classe (flux + heatmap) */}
        <motion.div variants={fadeUp} className="flex flex-wrap items-center gap-3">
          <label className="text-xs font-medium text-zinc-500">Classe</label>
          <select
            value={filterClassId ?? ''}
            onChange={(e) => {
              const value = e.target.value
              setFilterClassId(value ? Number(value) : undefined)
            }}
            className="px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
          >
            <option value="">Toutes les classes</option>
            {classes.map((c: ClassListItem) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </motion.div>

        {/* Tabs */}
        <motion.div variants={fadeUp}>
          <div className="flex items-center gap-1 bg-white border border-zinc-200 rounded-xl p-1 w-fit mb-5">
            {TABS.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setTab(key)}
                className={cn(
                  'px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  tab === key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700 hover:bg-zinc-50',
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Live feed ── */}
          {tab === 'live' && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-sm font-medium text-zinc-700">Flux en direct</span>
                  {feed && (
                    <span className="text-xs text-zinc-400">({feed.total} enregistrements)</span>
                  )}
                </div>
                <button
                  onClick={() => refetchFeed()}
                  className="flex items-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-600 transition-colors"
                >
                  <RefreshCw size={12} />
                  Actualiser
                </button>
              </div>

              {loadingFeed ? (
                <div className="p-4 space-y-3">{[...Array(6)].map((_, i) => <Skeleton key={i} className="h-12" />)}</div>
              ) : feed?.entries?.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100">
                        <th className="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Élève</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Classe</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Statut</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Méthode</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Heure</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-zinc-400 uppercase tracking-wide">Risque</th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-zinc-400 uppercase tracking-wide">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {feed.entries.map((entry) => {
                        const cfg = STATUS_CFG[entry.status] ?? STATUS_CFG.ABSENT
                        const risk = entry.security?.riskScore ?? 0
                        const isSuspicious = entry.security?.isSuspicious
                        return (
                          <tr key={entry.id} className={cn('hover:bg-zinc-50/60 transition-colors', isSuspicious && 'bg-red-50/30')}>
                            <td className="px-6 py-3">
                              <p className="font-medium text-zinc-800 leading-tight">{entry.studentName}</p>
                              {entry.matricule && <p className="text-xs text-zinc-400">{entry.matricule}</p>}
                            </td>
                            <td className="px-4 py-3 text-zinc-600 text-xs">{entry.className}</td>
                            <td className="px-4 py-3">
                              <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', cfg.badge)}>{cfg.label}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-400 uppercase tracking-wide">{entry.method ?? '—'}</td>
                            <td className="px-4 py-3 text-xs text-zinc-400 tabular-nums">
                              {new Date(entry.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                            </td>
                            <td className="px-4 py-3">
                              {risk > 0 ? (
                                <span className={cn(
                                  'text-xs font-medium px-2 py-0.5 rounded-full',
                                  risk >= 70 ? 'bg-red-50 text-red-700' : risk >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500',
                                )}>
                                  {risk}%
                                </span>
                              ) : <span className="text-xs text-zinc-200">—</span>}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {isSuspicious && (
                                  <button
                                    onClick={() => validate.mutate({ id: entry.id })}
                                    disabled={validate.isPending}
                                    title="Valider"
                                    className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-50 transition-colors"
                                  >
                                    <CheckCheck size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    if (window.confirm('Supprimer cette présence ?')) {
                                      del.mutate({ id: entry.id, reason: 'Suppression administrative' })
                                    }
                                  }}
                                  disabled={del.isPending}
                                  title={del.isError ? 'Erreur — voir console' : 'Supprimer'}
                                  className={cn(
                                    'p-1.5 rounded-lg disabled:opacity-50 transition-colors',
                                    del.isError ? 'text-orange-500 hover:bg-orange-50' : 'text-red-500 hover:bg-red-50'
                                  )}
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <Activity size={28} className="mx-auto mb-3 text-zinc-200" />
                  <p className="text-sm text-zinc-400">Aucun enregistrement pour l'instant</p>
                  <p className="text-xs text-zinc-300 mt-1">Actualisation automatique toutes les 15 secondes</p>
                </div>
              )}
            </div>
          )}

          {/* ── Heatmap ── */}
          {tab === 'heatmap' && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-6">
              <h3 className="text-sm font-medium text-zinc-700 mb-6">
                Distribution horaire des présences — aujourd'hui
              </h3>
              <HeatmapChart classId={filterClassId} />
              <p className="text-xs text-zinc-300 mt-4 text-center">
                Survolez les barres pour voir le nombre de pointages par heure
              </p>
            </div>
          )}

          {/* ── Alerts ── */}
          {tab === 'alerts' && (
            <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="flex items-center gap-2 px-6 py-4 border-b border-zinc-100">
                <ShieldAlert size={14} className="text-red-500" />
                <span className="text-sm font-medium text-zinc-700">Alertes de sécurité</span>
                {alerts && alerts.length > 0 && (
                  <span className="ml-auto text-xs font-semibold bg-red-50 text-red-600 px-2 py-0.5 rounded-full">
                    {alerts.length}
                  </span>
                )}
              </div>

              {loadingAlerts ? (
                <div className="p-4 space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-20" />)}</div>
              ) : alerts?.length ? (
                <div className="divide-y divide-zinc-50">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="px-6 py-4 hover:bg-zinc-50/60 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-semibold text-zinc-800">
                              {alert.presence?.student?.firstName} {alert.presence?.student?.lastName}
                            </span>
                            {alert.presence?.student?.matricule && (
                              <span className="text-xs text-zinc-400 font-mono">{alert.presence.student.matricule}</span>
                            )}
                          </div>
                          <p className="text-xs text-zinc-500 mb-2">Classe : {alert.presence?.class?.name ?? '—'}</p>
                          {Array.isArray(alert.fraudReasons) && alert.fraudReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {alert.fraudReasons.map((reason, i) => (
                                <span key={i} className="text-[10px] bg-red-50 text-red-600 px-1.5 py-0.5 rounded-full">
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-2 flex-shrink-0">
                          <span className={cn(
                            'text-xs font-semibold px-2 py-0.5 rounded-full max-w-[160px] text-right leading-tight',
                            alert.isSuspectedFraud || alert.fraudScore >= 70 ? 'bg-red-50 text-red-700'
                            : alert.fraudScore >= 40 ? 'bg-amber-50 text-amber-700'
                            : 'bg-zinc-100 text-zinc-600',
                          )}>
                            {labelFraudScore(alert.fraudScore, alert.isSuspectedFraud)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setAlertAction({ type: 'dismiss', alert })}
                              disabled={alertActionLoading}
                              title="Ignorer l'alerte"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                            >
                              <EyeOff size={12} /> Ignorer
                            </button>
                            <button
                              onClick={() => setAlertAction({ type: 'validate', alert })}
                              disabled={alertActionLoading}
                              title="Valider après contrôle"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            >
                              <CheckCheck size={12} /> Valider
                            </button>
                            <button
                              onClick={() => setAlertAction({ type: 'notify', alert })}
                              disabled={alertActionLoading}
                              title="Notifier parent / élève"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
                            >
                              <Bell size={12} /> Notifier
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="px-6 py-14 text-center">
                  <ShieldAlert size={28} className="mx-auto mb-3 text-zinc-200" />
                  <p className="text-sm text-zinc-400">Aucune alerte de sécurité active</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {showManual && <ManualRecordModal onClose={() => setShowManual(false)} />}
      {showBulk   && <BulkPresenceGrid  onClose={() => setShowBulk(false)}   />}
      {showQR     && <QRKioskModal     onClose={() => setShowQR(false)} classes={classes}  />}

      <ConfirmDialog
        open={alertAction != null}
        title={
          alertAction?.type === 'dismiss' ? 'Ignorer cette alerte ?'
          : alertAction?.type === 'validate' ? 'Valider cette présence ?'
          : 'Envoyer une notification ?'
        }
        description={
          alertAction?.type === 'dismiss'
            ? 'L\'alerte sera archivée sans action sur la présence.'
            : alertAction?.type === 'validate'
              ? 'La présence sera confirmée et l\'alerte de sécurité levée.'
              : 'Un message sera envoyé au contact enregistré pour cet élève.'
        }
        impact={alertAction ? [
          `Élève : ${alertAction.alert.presence?.student?.firstName} ${alertAction.alert.presence?.student?.lastName}`,
          labelFraudScore(alertAction.alert.fraudScore, alertAction.alert.isSuspectedFraud),
        ] : []}
        confirmLabel={
          alertAction?.type === 'dismiss' ? 'Ignorer'
          : alertAction?.type === 'validate' ? 'Valider'
          : 'Notifier'
        }
        variant={alertAction?.type === 'dismiss' ? 'default' : 'default'}
        loading={alertActionLoading}
        onConfirm={confirmAlertAction}
        onCancel={() => setAlertAction(null)}
      />
    </div>
  )
}
