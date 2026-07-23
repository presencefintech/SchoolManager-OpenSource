'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { fadeUp, stagger } from '@/lib/animations'
import {
  CheckCircle2, XCircle, Clock, ShieldAlert, Activity,
  QrCode, Plus, ClipboardList, RefreshCw, CheckCheck, Trash2,
  EyeOff, Bell, Settings2, History,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import {
  usePresenceStats, usePresenceLiveFeed, usePresenceHeatmap, usePresenceAlerts,
  useValidatePresence, useDeletePresence,
  useClasses, useSections,
  useDismissSecurityAlert, useValidateSecurityAlert, useNotifySecurityAlert,
} from '@/lib/hooks/use-admin'
import type { PresenceSecurityAlert, ClassListItem } from '@/types/admin'
import { ManualRecordModal } from '@/components/admin/presences/ManualRecordModal'
import { BulkPresenceGrid } from '@/components/admin/presences/BulkPresenceGrid'
import { PendingSheetsPanel, type OpenAttendanceSheetParams } from '@/components/admin/presences/PendingSheetsPanel'
import { QRKioskModal } from '@/components/admin/presences/QRKioskModal'
import { PresenceStatusBadge } from '@/components/admin/presences/PresenceStatusBadge'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { useToast } from '@/providers/toast-provider'
import { labelFraudScore } from '@/lib/business-labels'
import { getApiErrorMessage } from '@/lib/api/client'
import { Skeleton } from '@/components/ui/skeleton'
import { AdminMultiCriteriaSearch } from '@/components/admin/shared/admin-multi-criteria-search'
import { AttendanceHistoryPanel } from '@/components/admin/presences/AttendanceHistoryPanel'
import { useMultiCriteriaSearch } from '@/lib/hooks/use-multi-criteria-search'

const PRESENCE_FILTER_DEFAULTS = { search: '', classId: '', status: '' }

type Tab = 'live' | 'history' | 'heatmap' | 'alerts' | 'sheets'

function parseTab(raw: string | null): Tab {
  if (
    raw === 'history' ||
    raw === 'heatmap' ||
    raw === 'alerts' ||
    raw === 'sheets' ||
    raw === 'live'
  ) {
    return raw
  }
  return 'live'
}

type BulkModalState = {
  classId?: number
  sessionDate?: string
} | null

function HeatmapChart({ classId }: { classId?: number }) {
  const { data, isLoading } = usePresenceHeatmap(classId)

  if (isLoading) {
    return (
      <div className="flex h-44 items-end gap-1">
        {[...Array(24)].map((_, i) => (
          <div
            key={i}
            className="flex-1 animate-pulse rounded-t-md bg-zinc-100"
            style={{ height: `${30 + (i % 5) * 14}%` }}
          />
        ))}
      </div>
    )
  }

  if (!data?.length) {
    return <p className="py-10 text-center text-sm text-zinc-400">Aucune donnée disponible</p>
  }

  const max = Math.max(...data.map((d) => d.count), 1)
  return (
    <div className="space-y-3">
      <div className="flex h-44 items-end gap-1">
        {data.map((d) => (
          <div key={d.hour} className="group relative flex flex-1 flex-col items-center gap-1">
            {d.count > 0 && (
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 whitespace-nowrap rounded bg-zinc-800 px-1.5 py-0.5 text-[10px] text-white opacity-0 transition-opacity group-hover:opacity-100">
                {d.count} pointage{d.count > 1 ? 's' : ''}
              </span>
            )}
            <div
              className={cn(
                'w-full rounded-t-md transition-colors',
                d.count > 0 ? 'bg-emerald-400 group-hover:bg-emerald-500' : 'bg-zinc-100',
              )}
              style={{ height: `${Math.max((d.count / max) * 160, d.count > 0 ? 6 : 3)}px` }}
            />
          </div>
        ))}
      </div>
      <div className="flex gap-1">
        {data.map((d) => (
          <div key={d.hour} className="flex-1 text-center text-[9px] text-zinc-400">
            {d.hour.replace('h', '')}h
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PresencesPage() {
  return (
    <Suspense fallback={null}>
      <PresencesPageContent />
    </Suspense>
  )
}

function PresencesPageContent() {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const [tab, setTab] = useState<Tab>(() => parseTab(searchParams.get('tab')))

  useEffect(() => {
    setTab(parseTab(searchParams.get('tab')))
  }, [searchParams])

  const selectTab = (next: Tab) => {
    setTab(next)
    const params = new URLSearchParams(searchParams.toString())
    if (next === 'live') params.delete('tab')
    else params.set('tab', next)
    const qs = params.toString()
    router.replace(qs ? `?${qs}` : '/admin/presences', { scroll: false })
  }

  const {
    draft: filterDraft,
    applied: filters,
    setField: setFilterField,
    apply: applyFilters,
    reset: resetFilters,
    removeFilter,
  } = useMultiCriteriaSearch(PRESENCE_FILTER_DEFAULTS)
  const filterClassId = filters.classId ? Number(filters.classId) : undefined
  const [showManual, setShowManual] = useState(false)
  const [bulkModal, setBulkModal] = useState<BulkModalState>(null)
  const [showQR, setShowQR] = useState(false)
  const [alertAction, setAlertAction] = useState<{
    type: 'dismiss' | 'validate' | 'notify'
    alert: PresenceSecurityAlert
  } | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; studentName: string } | null>(null)

  const { data: stats, isLoading: loadingStats } = usePresenceStats()
  const { data: feed, isLoading: loadingFeed, refetch: refetchFeed } = usePresenceLiveFeed({
    limit: 50,
    ...(filterClassId ? { classId: filterClassId } : {}),
  })
  const { data: alerts, isLoading: loadingAlerts } = usePresenceAlerts()
  const { data: classesData } = useClasses()
  const { data: sectionsData } = useSections()
  const classes = classesData ?? []
  const sections = (sectionsData ?? []).map((s: { id: number; name: string }) => ({
    id: s.id,
    name: s.name,
  }))

  const validate = useValidatePresence()
  const del = useDeletePresence()
  const dismissAlert = useDismissSecurityAlert()
  const validateAlert = useValidateSecurityAlert()
  const notifyAlert = useNotifySecurityAlert()

  const STAT_CARDS = [
    { label: 'Présents', value: stats?.present ?? '—', color: 'emerald', Icon: CheckCircle2 },
    { label: 'Absents', value: stats?.absent ?? '—', color: 'rose', Icon: XCircle },
    { label: 'Retards', value: stats?.late ?? '—', color: 'amber', Icon: Clock },
    { label: 'Total élèves', value: stats?.totalStudents ?? '—', color: 'indigo', Icon: Activity },
    { label: 'Fraudes critiques', value: stats?.criticalFraud ?? '—', color: 'rose', Icon: ShieldAlert },
  ] as const

  const COLORS: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-600/10',
    rose: 'bg-rose-50 text-rose-600 ring-rose-600/10',
    amber: 'bg-amber-50 text-amber-600 ring-amber-600/10',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-600/10',
  }

  const filteredFeedEntries = useMemo(() => {
    const entries = feed?.entries ?? []
    const q = String(filters.search ?? '').toLowerCase().trim()
    const status = String(filters.status ?? '')
    return entries.filter((entry) => {
      if (status && entry.status !== status) return false
      if (!q) return true
      return (
        entry.studentName?.toLowerCase().includes(q) ||
        entry.matricule?.toLowerCase().includes(q) ||
        entry.className?.toLowerCase().includes(q)
      )
    })
  }, [feed?.entries, filters.search, filters.status])

  const filterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = []
    if (filters.search) chips.push({ id: 'search', label: `Texte : ${filters.search}` })
    if (filters.classId) {
      const name = classes.find((c) => c.id === Number(filters.classId))?.name ?? filters.classId
      chips.push({ id: 'classId', label: `Classe : ${name}` })
    }
    if (filters.status) chips.push({ id: 'status', label: `Statut : ${filters.status}` })
    return chips
  }, [filters, classes])

  const TABS: { key: Tab; label: string; icon?: typeof Activity }[] = [
    { key: 'live', label: 'Flux en direct', icon: Activity },
    { key: 'history', label: 'Historique', icon: History },
    { key: 'heatmap', label: 'Heatmap' },
    { key: 'sheets', label: 'Cahiers d\'appel', icon: ClipboardList },
    { key: 'alerts', label: `Alertes${alerts?.length ? ` (${alerts.length})` : ''}`, icon: ShieldAlert },
  ]

  function openBulkSheet(params?: OpenAttendanceSheetParams) {
    setBulkModal({
      classId: params?.classId,
      sessionDate: params?.sessionDate,
    })
    selectTab('sheets')
  }

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

  async function confirmDelete() {
    if (!deleteTarget) return
    try {
      await del.mutateAsync({ id: deleteTarget.id, reason: 'Suppression administrative' })
      toast.success('Présence supprimée', deleteTarget.studentName)
    } catch (err) {
      toast.error('Suppression impossible', getApiErrorMessage(err))
    } finally {
      setDeleteTarget(null)
    }
  }

  const alertActionLoading = dismissAlert.isPending || validateAlert.isPending || notifyAlert.isPending

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 to-zinc-100/80">
      <motion.div
        className="border-b border-zinc-200/80 bg-white/90 backdrop-blur-md"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-6 py-6 lg:px-8">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
              Registre d&apos;assiduité
            </p>
            <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900">Présences</h1>
            <p className="mt-1 text-sm text-zinc-500" suppressHydrationWarning>
              {new Date().toLocaleDateString('fr-FR', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
              {' · '}
              Flux live, cahiers d&apos;appel et alertes fraude
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/admin/settings"
              className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-500 transition-colors hover:bg-zinc-50 hover:text-zinc-700"
            >
              <Settings2 size={14} />
              Paramètres
            </Link>
            <button
              type="button"
              onClick={() => setShowQR(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-zinc-50"
            >
              <QrCode size={15} />
              QR Kiosque
            </button>
            <button
              type="button"
              onClick={() => openBulkSheet()}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-sm font-medium text-indigo-800 transition-colors hover:bg-indigo-50"
            >
              <ClipboardList size={15} />
              Cahier d&apos;appel
            </button>
            <button
              type="button"
              onClick={() => setShowManual(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-emerald-700"
            >
              <Plus size={15} />
              Saisie manuelle
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div
        className="mx-auto max-w-7xl space-y-6 px-6 py-8 lg:px-8"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={fadeUp} className="grid grid-cols-2 gap-4 lg:grid-cols-5">
          {STAT_CARDS.map(({ label, value, color, Icon }) => (
            <div
              key={label}
              className="rounded-2xl border border-zinc-200/80 bg-white px-5 py-4 shadow-[0_1px_4px_rgba(0,0,0,0.04)]"
            >
              {loadingStats ? (
                <Skeleton className="h-12" />
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                      {label}
                    </p>
                    <p className="text-2xl font-bold tabular-nums text-zinc-900">{value}</p>
                  </div>
                  <div
                    className={cn(
                      'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ring-1 ring-inset',
                      COLORS[color],
                    )}
                  >
                    <Icon size={18} />
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>

        {!loadingStats && (
          <motion.div
            variants={fadeUp}
            className="rounded-2xl border border-zinc-200/80 bg-white px-6 py-4 shadow-sm"
          >
            <div className="flex items-center gap-5">
              <span className="w-28 shrink-0 text-sm font-medium text-zinc-600">Taux du jour</span>
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-zinc-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-700"
                style={{ width: `${stats?.attendanceRate ?? 0}%` }}
              />
            </div>
              <span className="w-14 shrink-0 text-right text-sm font-bold tabular-nums text-emerald-700">
              {(stats?.attendanceRate ?? 0).toFixed(1)}%
            </span>
            </div>
          </motion.div>
        )}

        <AdminMultiCriteriaSearch
          title="Filtrer les présences"
          primaryPlaceholder="Élève, matricule, classe…"
          values={filterDraft}
          onChange={(id, value) => setFilterField(id as keyof typeof PRESENCE_FILTER_DEFAULTS, value)}
          onApply={applyFilters}
          onReset={resetFilters}
          activeChips={filterChips}
          onRemoveChip={(id) => removeFilter(id as keyof typeof PRESENCE_FILTER_DEFAULTS)}
          resultCount={tab === 'live' ? filteredFeedEntries.length : undefined}
          loading={loadingFeed}
          fields={[
            {
              id: 'classId',
              type: 'select',
              label: 'Classe',
              options: classes.map((c: ClassListItem) => ({ value: String(c.id), label: c.name })),
            },
            {
              id: 'status',
              type: 'select',
              label: 'Statut pointage',
              options: [
                { value: 'PRESENT', label: 'Présent' },
                { value: 'LATE', label: 'Retard' },
                { value: 'ABSENT', label: 'Absent' },
              ],
            },
          ]}
        />

        <motion.div variants={fadeUp}>
          <div className="mb-5 inline-flex items-center gap-1 rounded-2xl border border-zinc-200 bg-white p-1 shadow-sm">
            {TABS.map(({ key, label, icon: TabIcon }) => (
              <button
                key={key}
                type="button"
                onClick={() => selectTab(key)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium transition-all',
                  tab === key
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'text-zinc-500 hover:bg-zinc-50 hover:text-zinc-800',
                )}
              >
                {TabIcon && <TabIcon size={14} />}
                {label}
              </button>
            ))}
          </div>

          {tab === 'live' && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center justify-between border-b border-zinc-100 px-6 py-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
                  <span className="text-sm font-medium text-zinc-800">Flux en direct</span>
                  {feed && (
                    <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-xs text-zinc-500">
                      {feed.total} enregistrements
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => refetchFeed()}
                  className="inline-flex items-center gap-1.5 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
                >
                  <RefreshCw size={12} />
                  Actualiser
                </button>
              </div>

              {loadingFeed ? (
                <div className="space-y-3 p-4">
                  {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : filteredFeedEntries.length ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-100 bg-zinc-50/50">
                        <th className="px-6 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Élève
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Classe
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Statut
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Méthode
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Heure
                        </th>
                        <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Risque
                        </th>
                        <th className="px-4 py-3 text-right text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-50">
                      {filteredFeedEntries.map((entry) => {
                        const risk = entry.security?.riskScore ?? 0
                        const isSuspicious = entry.security?.isSuspicious
                        return (
                          <tr
                            key={entry.id}
                            className={cn(
                              'transition-colors hover:bg-zinc-50/60',
                              isSuspicious && 'bg-red-50/20',
                            )}
                          >
                            <td className="px-6 py-3">
                              <p className="font-medium leading-tight text-zinc-800">{entry.studentName}</p>
                              {entry.matricule && (
                                <p className="text-xs text-zinc-400">{entry.matricule}</p>
                              )}
                            </td>
                            <td className="px-4 py-3 text-xs text-zinc-600">{entry.className}</td>
                            <td className="px-4 py-3">
                              <PresenceStatusBadge status={entry.status} />
                            </td>
                            <td className="px-4 py-3 text-xs uppercase tracking-wide text-zinc-400">
                              {entry.method ?? '—'}
                            </td>
                            <td className="px-4 py-3 text-xs tabular-nums text-zinc-500">
                              {new Date(entry.scannedAt).toLocaleTimeString('fr-FR', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </td>
                            <td className="px-4 py-3">
                              {risk > 0 ? (
                                <span
                                  className={cn(
                                    'rounded-full px-2 py-0.5 text-xs font-medium',
                                    risk >= 70
                                      ? 'bg-red-50 text-red-700'
                                      : risk >= 40
                                        ? 'bg-amber-50 text-amber-700'
                                        : 'bg-zinc-100 text-zinc-500',
                                  )}
                                >
                                  {risk}%
                                </span>
                              ) : (
                                <span className="text-xs text-zinc-200">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center justify-end gap-1">
                                {isSuspicious && (
                                  <button
                                    type="button"
                                    onClick={() => validate.mutate({ id: entry.id })}
                                    disabled={validate.isPending}
                                    title="Valider"
                                    className="rounded-lg p-1.5 text-emerald-600 transition-colors hover:bg-emerald-50 disabled:opacity-50"
                                  >
                                    <CheckCheck size={14} />
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() =>
                                    setDeleteTarget({
                                      id: entry.id,
                                      studentName: entry.studentName,
                                    })
                                  }
                                  disabled={del.isPending}
                                  title="Supprimer"
                                  className="rounded-lg p-1.5 text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
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
                <div className="px-6 py-16 text-center">
                  <Activity size={32} className="mx-auto mb-3 text-zinc-200" />
                  <p className="text-sm text-zinc-500">Aucun enregistrement pour l&apos;instant</p>
                  <p className="mt-1 text-xs text-zinc-400">Actualisation automatique toutes les 15 secondes</p>
                </div>
              )}
            </div>
          )}

          {tab === 'history' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-5 sm:p-6 shadow-sm">
              <h3 className="mb-4 text-sm font-semibold text-zinc-800">
                Historique — présents, retards et absences
              </h3>
              <AttendanceHistoryPanel
                mode="admin"
                classes={classes.map((c: ClassListItem) => ({
                  id: c.id,
                  name: c.name,
                  sectionId: c.sectionId,
                }))}
                sections={sections}
                initialClassId={filterClassId ?? ''}
              />
            </div>
          )}

          {tab === 'heatmap' && (
            <div className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
              <h3 className="mb-6 text-sm font-semibold text-zinc-800">
                Distribution horaire — aujourd&apos;hui
              </h3>
              <HeatmapChart classId={filterClassId} />
            </div>
          )}

          {tab === 'sheets' && (
            <PendingSheetsPanel classId={filterClassId} onOpenSheet={openBulkSheet} />
          )}

          {tab === 'alerts' && (
            <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-white shadow-sm">
              <div className="flex items-center gap-2 border-b border-zinc-100 px-6 py-4">
                <ShieldAlert size={16} className="text-red-500" />
                <span className="text-sm font-semibold text-zinc-800">Alertes de sécurité</span>
                {alerts && alerts.length > 0 && (
                  <span className="ml-auto rounded-full bg-red-50 px-2.5 py-0.5 text-xs font-semibold text-red-600">
                    {alerts.length}
                  </span>
                )}
              </div>

              {loadingAlerts ? (
                <div className="space-y-3 p-4">
                  {[...Array(4)].map((_, i) => (
                    <Skeleton key={i} className="h-20" />
                  ))}
                </div>
              ) : alerts?.length ? (
                <div className="divide-y divide-zinc-50">
                  {alerts.map((alert) => (
                    <div key={alert.id} className="px-6 py-4 transition-colors hover:bg-zinc-50/60">
                      <div className="flex items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="mb-0.5 flex items-center gap-2">
                            <span className="text-sm font-semibold text-zinc-800">
                              {formatStudentFullName(alert.presence?.student ?? {})}
                            </span>
                            {alert.presence?.student?.matricule && (
                              <span className="font-mono text-xs text-zinc-400">
                                {alert.presence.student.matricule}
                              </span>
                            )}
                          </div>
                          <p className="mb-2 text-xs text-zinc-500">
                            Classe : {alert.presence?.class?.name ?? '—'}
                          </p>
                          {Array.isArray(alert.fraudReasons) && alert.fraudReasons.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {alert.fraudReasons.map((reason, i) => (
                                <span
                                  key={i}
                                  className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-600"
                                >
                                  {reason}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2">
                          <span
                            className={cn(
                              'max-w-[160px] rounded-full px-2 py-0.5 text-right text-xs font-semibold leading-tight',
                              alert.isSuspectedFraud || alert.fraudScore >= 70
                                ? 'bg-red-50 text-red-700'
                                : alert.fraudScore >= 40
                                  ? 'bg-amber-50 text-amber-700'
                            : 'bg-zinc-100 text-zinc-600',
                            )}
                          >
                            {labelFraudScore(alert.fraudScore, alert.isSuspectedFraud)}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setAlertAction({ type: 'dismiss', alert })}
                              disabled={alertActionLoading}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-40"
                            >
                              <EyeOff size={12} /> Ignorer
                            </button>
                            <button
                              type="button"
                              onClick={() => setAlertAction({ type: 'validate', alert })}
                              disabled={alertActionLoading}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-emerald-700 hover:bg-emerald-50 disabled:opacity-40"
                            >
                              <CheckCheck size={12} /> Valider
                            </button>
                            <button
                              type="button"
                              onClick={() => setAlertAction({ type: 'notify', alert })}
                              disabled={alertActionLoading}
                              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium text-blue-700 hover:bg-blue-50 disabled:opacity-40"
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
                <div className="px-6 py-16 text-center">
                  <ShieldAlert size={32} className="mx-auto mb-3 text-zinc-200" />
                  <p className="text-sm text-zinc-500">Aucune alerte de sécurité active</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </motion.div>

      {showManual && <ManualRecordModal onClose={() => setShowManual(false)} />}
      {bulkModal && (
        <BulkPresenceGrid
          initialClassId={bulkModal.classId}
          initialSessionDate={bulkModal.sessionDate}
          onClose={() => setBulkModal(null)}
        />
      )}
      {showQR && <QRKioskModal onClose={() => setShowQR(false)} />}

      <ConfirmDialog
        open={alertAction != null}
        title={
          alertAction?.type === 'dismiss'
            ? 'Ignorer cette alerte ?'
            : alertAction?.type === 'validate'
              ? 'Valider cette présence ?'
          : 'Envoyer une notification ?'
        }
        description={
          alertAction?.type === 'dismiss'
            ? "L'alerte sera archivée sans action sur la présence."
            : alertAction?.type === 'validate'
              ? "La présence sera confirmée et l'alerte de sécurité levée."
              : 'Un message sera envoyé au contact enregistré pour cet élève.'
        }
        impact={
          alertAction
            ? [
          `Élève : ${formatStudentFullName(alertAction.alert.presence?.student ?? {})}`,
          labelFraudScore(alertAction.alert.fraudScore, alertAction.alert.isSuspectedFraud),
              ]
            : []
        }
        confirmLabel={
          alertAction?.type === 'dismiss'
            ? 'Ignorer'
            : alertAction?.type === 'validate'
              ? 'Valider'
          : 'Notifier'
        }
        loading={alertActionLoading}
        onConfirm={confirmAlertAction}
        onCancel={() => setAlertAction(null)}
      />

      <ConfirmDialog
        open={deleteTarget != null}
        title="Supprimer cette présence ?"
        description="Cette action est irréversible. La ligne sera retirée du registre du jour."
        impact={deleteTarget ? [`Élève : ${deleteTarget.studentName}`] : []}
        confirmLabel="Supprimer"
        variant="danger"
        loading={del.isPending}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  )
}
