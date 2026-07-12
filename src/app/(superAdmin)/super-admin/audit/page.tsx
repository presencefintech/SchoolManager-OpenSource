'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  ShieldAlert, Activity, Wifi, WifiOff, Zap, Clock, UserCheck,
  HardDrive, AlertTriangle, CheckCircle2, XCircle, Download,
  RefreshCw, FileSearch, ScrollText, Loader2, Flag, SearchCheck, UploadCloud,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useReconciliationHealth, useProviderStats, useSecurityAlerts,
  useAnomalyDashboard, useMobileMoneyMetrics, useFraudRadar, useQueueStatus,
  useActiveSessions, useAuditSnapshot, useStorageStats,
  useCoreAuditLogs,
} from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { Skeleton } from '@/components/ui/skeleton'

/* ── helpers ──────────────────────────────────────────────────────────────── */
const fmt = (n: number) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

function ScoreBadge({ score }: { score: number }) {
  return (
    <span className={cn(
      'px-2 py-0.5 rounded text-xs font-mono font-bold tabular-nums',
      score >= 80 ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
    )}>
      {score}
    </span>
  )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-widest mb-3">{children}</h2>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
export default function AuditPage() {
  /* ── monitoring hooks ── */
  const { data: reconciliation, isLoading: loadingRecon } = useReconciliationHealth()
  const { data: providers, isLoading: loadingProviders } = useProviderStats()
  const { data: queue, isLoading: loadingQueue } = useQueueStatus()
  const { data: sessions, isLoading: loadingSessions } = useActiveSessions()
  const { data: auditSnap, isLoading: loadingAudit } = useAuditSnapshot()
  const { data: storage, isLoading: loadingStorage } = useStorageStats()
  const { data: alerts, isLoading: loadingAlerts } = useSecurityAlerts()
  const { data: anomalies, isLoading: loadingAnomalies } = useAnomalyDashboard()
  const { data: mmMetrics, isLoading: loadingMM } = useMobileMoneyMetrics()
  const { data: fraudRadar, isLoading: loadingFraud } = useFraudRadar()
  const { data: auditLogs, isLoading: loadingLogs } = useCoreAuditLogs({ take: 50 })

  /* ── integrity check ── */
  const [integritySchoolId, setIntegritySchoolId] = useState('')
  const [integrityStudentId, setIntegrityStudentId] = useState('')
  const [checkingIntegrity, setCheckingIntegrity] = useState(false)
  const [integrityResult, setIntegrityResult] = useState<Record<string, unknown> | null>(null)
  const [integrityMsg, setIntegrityMsg] = useState<{ ok: boolean; text: string } | null>(null)

  /* ── payment flags ── */
  const [paymentFlags, setPaymentFlags] = useState<unknown[] | null>(null)
  const [loadingFlags, setLoadingFlags] = useState(false)
  const [flagsLoaded, setFlagsLoaded] = useState(false)

  /* ── reconcile form ── */
  const [paymentId, setPaymentId] = useState('')
  const [providerRef, setProviderRef] = useState('')
  const [reconciling, setReconciling] = useState(false)
  const [reconcileMsg, setReconcileMsg] = useState<{ ok: boolean; text: string } | null>(null)

  /* ── export ── */
  const [exporting, setExporting] = useState(false)

  /* ── force storage upload ── */
  const [forceUploadFile, setForceUploadFile] = useState<File | null>(null)
  const [forceUploading, setForceUploading] = useState(false)
  const [forceUploadMsg, setForceUploadMsg] = useState<{ ok: boolean; text: string } | null>(null)

  const handleForceStorageUpload = async () => {
    if (!forceUploadFile) return
    setForceUploading(true)
    setForceUploadMsg(null)
    try {
      const fd = new FormData()
      fd.append('file', forceUploadFile)
      const res = await superAdminApi.forceStorageUpload(fd)
      setForceUploadMsg({ ok: true, text: res.message ?? 'Fichier envoyé au stockage' })
      setForceUploadFile(null)
    } catch {
      setForceUploadMsg({ ok: false, text: 'Erreur lors de l\'envoi' })
    } finally {
      setForceUploading(false)
    }
  }

  const handleIntegrityCheck = async () => {
    if (!integritySchoolId || !integrityStudentId) return
    setCheckingIntegrity(true)
    setIntegrityMsg(null)
    setIntegrityResult(null)
    try {
      const data = await superAdminApi.checkIntegrity(Number(integritySchoolId), Number(integrityStudentId))
      setIntegrityResult(data as Record<string, unknown>)
      setIntegrityMsg({ ok: true, text: 'Vérification effectuée' })
    } catch {
      setIntegrityMsg({ ok: false, text: 'Erreur lors de la vérification d\'intégrité' })
    } finally {
      setCheckingIntegrity(false)
    }
  }

  const handleLoadFlags = async () => {
    setLoadingFlags(true)
    try {
      const data = await superAdminApi.getPaymentFlags()
      setPaymentFlags(data)
      setFlagsLoaded(true)
    } catch {
      setPaymentFlags([])
      setFlagsLoaded(true)
    } finally {
      setLoadingFlags(false)
    }
  }

  const handleReconcile = async () => {
    if (!paymentId) return
    setReconciling(true)
    setReconcileMsg(null)
    try {
      const res = await superAdminApi.reconcilePayment(Number(paymentId), providerRef || undefined)
      setReconcileMsg({ ok: true, text: res.message ?? 'Paiement réconcilié' })
      setPaymentId('')
      setProviderRef('')
    } catch {
      setReconcileMsg({ ok: false, text: 'Erreur lors de la réconciliation' })
    } finally {
      setReconciling(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await superAdminApi.exportAuditCSV()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `audit_logs_${new Date().toISOString().slice(0, 10)}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">

      {/* Header */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 px-8 py-6">
          <div>
            <h1 className="text-3xl font-semibold text-zinc-900 tracking-tight">Audit & Monitoring</h1>
            <p className="text-sm text-zinc-400 mt-1">Infrastructure, sécurité, fraude et logs d&apos;audit</p>
          </div>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50 disabled:opacity-50 transition-colors"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            Export CSV audit
          </button>
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-8 py-8 space-y-8">

        {/* ══ 1. INFRASTRUCTURE ══════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Infrastructure</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

            {/* Réconciliation */}
            {loadingRecon ? <Skeleton className="h-44" /> : reconciliation && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <Activity size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">Réconciliation</span>
                </div>
                <p className={cn('text-4xl font-bold tabular-nums', reconciliation.metrics.totalErrors > 0 ? 'text-red-600' : 'text-emerald-600')}>
                  {reconciliation.metrics.successRate.toFixed(1)}%
                </p>
                <div className="text-sm text-zinc-500 space-y-1">
                  <p className="tabular-nums">{reconciliation.metrics.totalErrors} erreur{reconciliation.metrics.totalErrors !== 1 ? 's' : ''}</p>
                  <p className="tabular-nums">moy. {reconciliation.metrics.avgProcessTime}s</p>
                </div>
                <span className={cn('self-start text-xs font-semibold px-2.5 py-1 rounded-lg',
                  reconciliation.metrics.totalErrors > 0 ? 'bg-red-50 text-red-600' : 'bg-emerald-50 text-emerald-600')}>
                  {reconciliation.metrics.totalErrors > 0 ? 'Erreurs' : 'OK'}
                </span>
              </div>
            )}

            {/* Gateways */}
            {loadingProviders ? <Skeleton className="h-44" /> : providers && providers.length > 0 && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <Wifi size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">Gateways</span>
                </div>
                <div className="space-y-3">
                  {providers.map((p) => (
                    <div key={p.method}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm text-zinc-600 truncate">{p.method}</span>
                        <span className={cn('text-sm font-mono font-bold tabular-nums',
                          p.reliabilityRate >= 90 ? 'text-emerald-600' : p.reliabilityRate >= 70 ? 'text-amber-600' : 'text-red-600')}>
                          {p.reliabilityRate.toFixed(0)}%
                        </span>
                      </div>
                      <div className="w-full h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                        <div
                          className={cn('h-full rounded-full', p.reliabilityRate >= 90 ? 'bg-emerald-400' : p.reliabilityRate >= 70 ? 'bg-amber-400' : 'bg-red-400')}
                          style={{ width: `${p.reliabilityRate}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Queue BullMQ */}
            {loadingQueue ? <Skeleton className="h-44" /> : queue && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  {queue.redisEnabled ? <Zap size={14} className="text-zinc-400" /> : <WifiOff size={14} className="text-zinc-400" />}
                  <span className="text-xs font-medium text-zinc-400">Queue BullMQ</span>
                </div>
                {!queue.redisEnabled ? (
                  <div className="flex items-center gap-2 text-sm text-red-600">
                    <XCircle size={14} />
                    Redis indisponible
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {([
                      { label: 'Waiting',   val: queue.waiting,   alert: false },
                      { label: 'Active',    val: queue.active,    alert: false },
                      { label: 'Completed', val: queue.completed, alert: false },
                      { label: 'Failed',    val: queue.failed,    alert: queue.failed > 0 },
                      { label: 'Delayed',   val: queue.delayed,   alert: queue.delayed > 0 },
                    ]).map(({ label, val, alert }) => (
                      <div key={label} className="flex justify-between text-sm">
                        <span className="text-zinc-400">{label}</span>
                        <span className={cn('font-mono font-semibold tabular-nums', alert ? 'text-red-600' : 'text-zinc-800')}>{val}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Stockage Cloudinary */}
            {loadingStorage ? <Skeleton className="h-44" /> : storage && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5 flex flex-col gap-4">
                <div className="flex items-center gap-2">
                  <HardDrive size={14} className="text-zinc-400" />
                  <span className="text-xs font-medium text-zinc-400">Stockage Cloudinary</span>
                </div>
                <p className="text-4xl font-bold text-zinc-900 tabular-nums">{storage.storage_used}</p>
                <div className="text-sm text-zinc-500 space-y-1">
                  <p className="tabular-nums">{storage.total_files.toLocaleString('fr-FR')} fichiers</p>
                  <p>Bande passante : {storage.bandwidth}</p>
                </div>
                <div className="pt-3 border-t border-zinc-100 space-y-2">
                  <label className="flex items-center gap-2 text-xs font-medium text-zinc-500">
                    <UploadCloud size={13} className="text-zinc-400" />
                    Forcer un envoi vers le stockage
                  </label>
                  <input
                    type="file"
                    onChange={(e) => setForceUploadFile(e.target.files?.[0] ?? null)}
                    className="w-full text-xs text-zinc-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-zinc-100 file:text-zinc-700 hover:file:bg-zinc-200 transition-all"
                  />
                  <button
                    onClick={handleForceStorageUpload}
                    disabled={forceUploading || !forceUploadFile}
                    className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-900 text-white hover:bg-zinc-700 disabled:opacity-40 transition-colors"
                  >
                    {forceUploading ? <Loader2 size={12} className="animate-spin" /> : <UploadCloud size={12} />}
                    Envoyer
                  </button>
                  {forceUploadMsg && (
                    <p className={cn('text-xs', forceUploadMsg.ok ? 'text-emerald-600' : 'text-red-500')}>
                      {forceUploadMsg.text}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ══ 2. SÉCURITÉ & FRAUDE ═══════════════════════════════════════════ */}
        <div>
          <SectionTitle>Sécurité & Fraude</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {/* Sessions actives */}
            {loadingSessions ? <Skeleton className="h-52" /> : sessions && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <UserCheck size={14} className="text-zinc-400" />
                    <span className="text-sm font-medium text-zinc-500">Sessions actives</span>
                  </div>
                  <span className="text-2xl font-semibold tabular-nums text-zinc-900">{sessions.length}</span>
                </div>
                {sessions.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {sessions.slice(0, 5).map((s) => (
                      <div key={s.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <div className="flex items-center gap-2.5">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse flex-shrink-0" />
                          <span className="text-sm text-zinc-600 truncate max-w-[200px]">{s.user.firstName} {s.user.lastName}</span>
                        </div>
                        <span className="text-xs font-medium bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-lg">{s.user.role}</span>
                      </div>
                    ))}
                    {sessions.length > 5 && <p className="text-xs text-zinc-400 pt-3">+ {sessions.length - 5} autres</p>}
                  </div>
                ) : <p className="text-sm text-zinc-400">Aucune session active</p>}
              </div>
            )}

            {/* Audit sécurité */}
            {loadingAudit ? <Skeleton className="h-52" /> : auditSnap && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <FileSearch size={14} className={auditSnap.length > 0 ? 'text-orange-500' : 'text-zinc-300'} />
                    <span className="text-sm font-medium text-zinc-500">Audit sécurité</span>
                  </div>
                  <span className={cn('text-2xl font-semibold tabular-nums', auditSnap.length > 0 ? 'text-orange-600' : 'text-zinc-300')}>
                    {auditSnap.length}
                  </span>
                </div>
                {auditSnap.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {auditSnap.map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <span className="text-sm text-zinc-600 truncate max-w-[200px]">{e.action}</span>
                        <span className={cn('text-xs font-semibold px-2 py-0.5 rounded-lg',
                          e.severity === 'CRITICAL' ? 'bg-red-50 text-red-600'
                          : e.severity === 'WARNING' ? 'bg-amber-50 text-amber-600'
                          : 'bg-zinc-100 text-zinc-500')}>
                          {e.severity}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-emerald-600">
                    <CheckCircle2 size={14} />
                    Aucun événement critique
                  </div>
                )}
              </div>
            )}

            {/* Paiements suspects */}
            {loadingAlerts ? <Skeleton className="h-52" /> : alerts && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={alerts.count > 0 ? 'text-red-500' : 'text-zinc-300'} />
                    <span className="text-sm font-medium text-zinc-500">Paiements suspects</span>
                  </div>
                  <span className={cn('text-2xl font-semibold tabular-nums', alerts.count > 0 ? 'text-red-600' : 'text-zinc-300')}>
                    {alerts.count}
                  </span>
                </div>
                {alerts.recent.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {alerts.recent.map((a) => (
                      <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <span className="text-sm text-zinc-500 capitalize">{a.method.toLowerCase()}</span>
                        <span className="text-sm font-mono font-semibold text-red-600 tabular-nums">{fmt(a.amount)}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="text-sm text-zinc-400">Aucune alerte active</p>}
              </div>
            )}

            {/* Anomalies présences */}
            {loadingAnomalies ? <Skeleton className="h-52" /> : anomalies && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <ShieldAlert size={14} className={anomalies.count > 0 ? 'text-amber-500' : 'text-zinc-300'} />
                    <span className="text-sm font-medium text-zinc-500">Anomalies présences</span>
                  </div>
                  <span className={cn('text-2xl font-semibold tabular-nums', anomalies.count > 0 ? 'text-amber-600' : 'text-zinc-300')}>
                    {anomalies.count}
                  </span>
                </div>
                {anomalies.data.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {anomalies.data.slice(0, 5).map((e) => (
                      <div key={e.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <span className="text-sm text-zinc-600 truncate max-w-[200px]">
                          {e.presence ? formatStudentFullName(e.presence.student) : `Event #${e.id}`}
                        </span>
                        <ScoreBadge score={e.fraudScore} />
                      </div>
                    ))}
                    {anomalies.count > 5 && <p className="text-xs text-zinc-400 pt-3">+ {anomalies.count - 5} autres</p>}
                  </div>
                ) : <p className="text-sm text-zinc-400">Aucune anomalie détectée</p>}
              </div>
            )}
          </div>
        </div>

        {/* ══ 3. MOBILE MONEY ════════════════════════════════════════════════ */}
        <div>
          <SectionTitle>Mobile Money</SectionTitle>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

            {loadingMM ? <Skeleton className="h-52" /> : mmMetrics && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Clock size={14} className={mmMetrics.length > 0 ? 'text-amber-500' : 'text-zinc-300'} />
                    <span className="text-sm font-medium text-zinc-500">Paiements en attente</span>
                  </div>
                  <span className={cn('text-2xl font-semibold tabular-nums', mmMetrics.length > 0 ? 'text-amber-600' : 'text-zinc-300')}>
                    {mmMetrics.length}
                  </span>
                </div>
                {mmMetrics.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {mmMetrics.slice(0, 5).map((p) => (
                      <div key={p.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <span className="text-sm text-zinc-500 truncate max-w-[200px]">{p.school.name}</span>
                        <span className="text-sm font-mono font-semibold text-zinc-800 tabular-nums">{fmt(p.amount)}</span>
                      </div>
                    ))}
                    {mmMetrics.length > 5 && <p className="text-xs text-zinc-400 pt-3">+ {mmMetrics.length - 5} autres</p>}
                  </div>
                ) : <p className="text-sm text-zinc-400">Aucun paiement en attente</p>}
              </div>
            )}

            {loadingFraud ? <Skeleton className="h-52" /> : fraudRadar && (
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <AlertTriangle size={14} className={fraudRadar.length > 0 ? 'text-red-500' : 'text-zinc-300'} />
                    <span className="text-sm font-medium text-zinc-500">Radar fraude (score &gt;70)</span>
                  </div>
                  <span className={cn('text-2xl font-semibold tabular-nums', fraudRadar.length > 0 ? 'text-red-600' : 'text-zinc-300')}>
                    {fraudRadar.length}
                  </span>
                </div>
                {fraudRadar.length > 0 ? (
                  <div className="divide-y divide-zinc-50">
                    {fraudRadar.slice(0, 5).map((f) => (
                      <div key={f.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                        <span className="text-sm text-zinc-500 truncate max-w-[200px]">{f.payment.school.name}</span>
                        <ScoreBadge score={f.fraudScore} />
                      </div>
                    ))}
                    {fraudRadar.length > 5 && <p className="text-xs text-zinc-400 pt-3">+ {fraudRadar.length - 5} autres</p>}
                  </div>
                ) : <p className="text-sm text-zinc-400">Aucune anomalie critique</p>}
              </div>
            )}
          </div>
        </div>

        {/* ══ 4. RÉCONCILIATION MANUELLE ═════════════════════════════════════ */}
        <div>
          <SectionTitle>Réconciliation manuelle</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-6 py-5">
            <p className="text-sm text-zinc-500 mb-4">Forcer la réconciliation d&apos;un paiement spécifique</p>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">ID du paiement</label>
                <input
                  type="number"
                  placeholder="Ex: 247"
                  value={paymentId}
                  onChange={(e) => setPaymentId(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-36"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">Référence provider (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: TXN_ABC123"
                  value={providerRef}
                  onChange={(e) => setProviderRef(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-52"
                />
              </div>
              <button
                onClick={handleReconcile}
                disabled={reconciling || !paymentId}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {reconciling ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
                Réconcilier
              </button>
            </div>
            {reconcileMsg && (
              <div className={cn('mt-3 flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg', reconcileMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                {reconcileMsg.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {reconcileMsg.text}
              </div>
            )}
          </div>
        </div>

        {/* ══ 5. VÉRIFICATION INTÉGRITÉ CROSS-SCHOOL ══════════════════════════ */}
        <div>
          <SectionTitle>Vérification intégrité cross-school</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-6 py-5">
            <div className="flex items-center gap-2 mb-4">
              <SearchCheck size={13} className="text-zinc-400" />
              <span className="text-sm text-zinc-500">Audit d'intégrité d'un élève dans un établissement</span>
            </div>
            <div className="flex items-end gap-3 flex-wrap">
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">ID établissement</label>
                <input
                  type="number"
                  placeholder="Ex: 5"
                  value={integritySchoolId}
                  onChange={(e) => setIntegritySchoolId(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-32"
                />
              </div>
              <div>
                <label className="text-xs text-zinc-400 mb-1 block">ID élève</label>
                <input
                  type="number"
                  placeholder="Ex: 42"
                  value={integrityStudentId}
                  onChange={(e) => setIntegrityStudentId(e.target.value)}
                  className="px-3 py-2.5 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 w-32"
                />
              </div>
              <button
                onClick={handleIntegrityCheck}
                disabled={checkingIntegrity || !integritySchoolId || !integrityStudentId}
                className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
              >
                {checkingIntegrity ? <Loader2 size={13} className="animate-spin" /> : <SearchCheck size={13} />}
                Vérifier
              </button>
            </div>
            {integrityMsg && (
              <div className={cn('mt-3 flex items-center gap-2 text-sm px-3 py-2.5 rounded-lg', integrityMsg.ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
                {integrityMsg.ok ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                {integrityMsg.text}
              </div>
            )}
            {integrityResult && (
              <div className="mt-3 bg-zinc-50 border border-zinc-100 rounded-lg p-3 grid grid-cols-2 gap-x-6 gap-y-1.5">
                {Object.entries(integrityResult).slice(0, 12).map(([k, v]) => (
                  <div key={k} className="flex items-center gap-2 text-xs">
                    <span className="text-zinc-400 w-28 flex-shrink-0 truncate">{k}</span>
                    <span className="font-mono text-zinc-700 truncate">{String(v == null ? '—' : v)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══ 6. FLAGS DE PAIEMENTS ══════════════════════════════════════════ */}
        <div>
          <SectionTitle>Flags de paiements</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <Flag size={14} className="text-amber-500" />
                <span className="text-sm font-medium text-zinc-600">Paiements signalés</span>
              </div>
              {!flagsLoaded && (
                <button
                  onClick={handleLoadFlags}
                  disabled={loadingFlags}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-200 rounded-lg text-zinc-500 hover:bg-zinc-50 disabled:opacity-40 transition-colors"
                >
                  {loadingFlags ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                  Charger
                </button>
              )}
            </div>
            {!flagsLoaded ? (
              <div className="px-6 py-10 text-center text-sm text-zinc-400">
                Cliquez sur Charger pour afficher les flags de paiements
              </div>
            ) : paymentFlags && paymentFlags.length > 0 ? (
              <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
                {paymentFlags.map((f, i) => (
                  <div key={i} className="flex items-center gap-4 px-6 py-3 text-xs hover:bg-zinc-50 transition-colors">
                    <Flag size={11} className="text-amber-400 flex-shrink-0" />
                    <pre className="font-mono text-zinc-600 truncate flex-1">{JSON.stringify(f)}</pre>
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-10 text-center text-sm text-zinc-400">
                <CheckCircle2 size={20} className="mx-auto text-emerald-400 mb-2" />
                Aucun flag de paiement détecté
              </div>
            )}
          </div>
        </div>

        {/* ══ 7. LOGS D'AUDIT COMPLETS ═══════════════════════════════════════ */}
        <div>
          <SectionTitle>Logs d&apos;audit</SectionTitle>
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-100">
              <div className="flex items-center gap-2.5">
                <ScrollText size={14} className="text-zinc-400" />
                <span className="text-sm font-medium text-zinc-600">Activité système</span>
              </div>
              {auditLogs && (
                <span className="text-xs text-zinc-400 tabular-nums">{auditLogs.total.toLocaleString('fr-FR')} entrées</span>
              )}
            </div>

            {loadingLogs ? (
              <div className="divide-y divide-zinc-100">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="px-6 py-4 flex gap-4">
                    <Skeleton className="h-3 w-24 flex-shrink-0" />
                    <Skeleton className="h-3 flex-1" />
                    <Skeleton className="h-3 w-20 flex-shrink-0" />
                  </div>
                ))}
              </div>
            ) : auditLogs?.rows.length ? (
              <div className="divide-y divide-zinc-100 max-h-[480px] overflow-y-auto">
                {auditLogs.rows.map((log) => (
                  <div key={log.id} className="flex items-start gap-4 px-6 py-4 hover:bg-zinc-50 transition-colors">
                    <span className="text-xs text-zinc-400 tabular-nums whitespace-nowrap pt-0.5">
                      {new Date(log.createdAt).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-zinc-800">{log.action}</span>
                        {log.resource && (
                          <span className="text-xs text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">{log.resource}</span>
                        )}
                      </div>
                      {log.school && (
                        <p className="text-xs text-zinc-400 mt-0.5 truncate">{log.school.name}</p>
                      )}
                    </div>
                    {log.actor && (
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-zinc-600">{log.actor.firstName} {log.actor.lastName}</p>
                        <p className="text-[10px] text-zinc-400 truncate max-w-[160px]">{log.actor.email}</p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="px-6 py-12 text-center">
                <ScrollText size={24} className="mx-auto text-zinc-300 mb-2" />
                <p className="text-sm text-zinc-400">Aucun log d&apos;audit</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  )
}
