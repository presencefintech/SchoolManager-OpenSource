'use client'

import { useState, useRef, useMemo } from 'react'
import { useState, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Users, UserX, RefreshCw, CheckCircle, XCircle,
  PenLine, UploadCloud, ShieldCheck, Clock, Wifi,
  WifiOff, ScanLine, AlertTriangle, Building2,
  BarChart3, PieChart as PieIcon, Radio,
} from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip,
  ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts'
import { cn } from '@/lib/utils'
import { useSchools, usePresenceDashboard } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'

const CHART_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4', '#ec4899', '#84cc16']

const METHOD_LABELS: Record<string, string> = {
  MANUAL: 'Manuel',
  MANUAL_ADMIN: 'Admin',
  QR_CODE: 'QR Code',
  NFC: 'NFC',
  FACIAL: 'Facial',
  BIOMETRIC: 'Biométrie',
  UNKNOWN: 'Autre',
}

/* ── design system ─────────────────────────────────────────────────────────── */
function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-2xl bg-zinc-100/80 animate-pulse', className)} />
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider mb-3">{children}</p>
}

function Panel({
  children, className, padding = true,
}: { children: React.ReactNode; className?: string; padding?: boolean }) {
  return (
    <div className={cn(
      'bg-white rounded-2xl border border-zinc-200/80 shadow-[0_1px_3px_rgba(0,0,0,0.04)]',
      padding && 'p-6',
      className,
    )}>
      {children}
    </div>
  )
}

function PanelHeader({
  icon: Icon, iconClass, title, description, action,
}: {
  icon: React.ElementType
  iconClass?: string
  title: string
  description?: string
  action?: React.ReactNode
}) {
  return (
    <div className="flex items-start justify-between gap-4 mb-4">
      <div className="flex items-start gap-3">
        <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0', iconClass ?? 'bg-indigo-50 text-indigo-600')}>
          <Icon size={18} />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          {description && <p className="text-xs text-zinc-500 mt-0.5 leading-relaxed">{description}</p>}
        </div>
      </div>
      {action}
    </div>
  )
}

function KpiCard({
  label, value, sub, icon: Icon, tone = 'neutral', progress,
}: {
  label: string; value: string | number; sub?: string
  icon: React.ElementType
  tone?: 'neutral' | 'ok' | 'warn' | 'danger'
  progress?: number
}) {
  const tones = {
    neutral: { ring: 'ring-zinc-500/5', icon: 'bg-zinc-100 text-zinc-600', val: 'text-zinc-900', bar: 'bg-zinc-400' },
    ok: { ring: 'ring-emerald-500/10', icon: 'bg-emerald-50 text-emerald-600', val: 'text-emerald-700', bar: 'bg-emerald-500' },
    warn: { ring: 'ring-amber-500/10', icon: 'bg-amber-50 text-amber-600', val: 'text-amber-700', bar: 'bg-amber-400' },
    danger: { ring: 'ring-red-500/10', icon: 'bg-red-50 text-red-600', val: 'text-red-600', bar: 'bg-red-500' },
  }[tone]

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('rounded-2xl border border-zinc-200/80 bg-white p-5 shadow-sm ring-1', tones.ring)}
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">{label}</span>
        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', tones.icon)}>
          <Icon size={15} />
        </div>
      </div>
      <p className={cn('text-3xl font-bold tabular-nums tracking-tight', tones.val)}>{value}</p>
      {sub && <p className="text-[11px] text-zinc-400 mt-1.5">{sub}</p>}
      {progress !== undefined && (
        <div className="mt-3 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.min(progress, 100)}%` }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className={cn('h-full rounded-full', tones.bar)}
          />
        </div>
      )}
    </motion.div>
  )
}

type ActionResult = { type: 'success' | 'error'; message: string } | null
function ResultBanner({ result }: { result: ActionResult }) {
  if (!result) return null
  return (
    <div className={cn(
      'flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm',
      result.type === 'success' ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-red-200 bg-red-50 text-red-700',
    )}>
      {result.type === 'success' ? <CheckCircle size={13} /> : <XCircle size={13} />}
      {result.message}
    </div>
  )
}

function relativeTime(iso: string): string {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000
  if (diff < 60) return `${Math.floor(diff)}s`
  if (diff < 3600) return `${Math.floor(diff / 60)}m`
  return `${Math.floor(diff / 3600)}h`
}

const inputCls = 'h-9 px-3 text-sm rounded-lg border border-zinc-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all placeholder:text-zinc-300'
const btn = (color: 'zinc' | 'indigo' | 'emerald') => cn(
  'h-9 px-4 text-sm font-medium rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-all',
  color === 'zinc'    && 'bg-zinc-900 text-white hover:bg-zinc-700',
  color === 'indigo'  && 'bg-indigo-600 text-white hover:bg-indigo-700',
  color === 'emerald' && 'bg-emerald-600 text-white hover:bg-emerald-700',
)

const SCAN_METHODS = ['MANUAL', 'QR_CODE', 'NFC', 'FACIAL', 'BIOMETRIC']

const selectCls = 'h-10 px-3.5 text-sm rounded-xl border border-white/20 bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-indigo-400/40 min-w-[280px] backdrop-blur'

/* ══════════════════════════════════════════════════════════════════════════════ */
export default function PresencePage() {
  const { data: schools } = useSchools()
  const [schoolId, setSchoolId] = useState<number | null>(null)

  const { data: dashboard, isLoading, isError, error, refetch, dataUpdatedAt } = usePresenceDashboard(schoolId ?? 0)

  /* ── Enregistrement forcé ── */
  const [recStudentId, setRecStudentId] = useState('')
  const [recMethod, setRecMethod] = useState('MANUAL')
  const [recNote, setRecNote] = useState('')
  const [recLoading, setRecLoading] = useState(false)
  const [recResult, setRecResult] = useState<ActionResult>(null)

  /* ── Validation manuelle ── */
  const [valPresenceId, setValPresenceId] = useState('')
  const [valLoading, setValLoading] = useState(false)
  const [valResult, setValResult] = useState<ActionResult>(null)

  /* ── Sync offline ── */
  const [syncJson, setSyncJson] = useState('')
  const [syncLoading, setSyncLoading] = useState(false)
  const [syncResult, setSyncResult] = useState<ActionResult>(null)
  const syncRef = useRef<HTMLTextAreaElement>(null)

  /* ── handlers ── */
  async function handleRecord() {
    if (!schoolId || !recStudentId) return
    setRecLoading(true); setRecResult(null)
    try {
      const r = await superAdminApi.recordPresence(schoolId, Number(recStudentId), { scanMethod: recMethod, note: recNote || undefined })
      setRecResult({ type: 'success', message: r.message ?? `Présence #${r.data?.id} enregistrée (score fraude: ${(r.data?.fraudScore ?? 0).toFixed(2)})` })
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setRecResult({ type: 'error', message: err.response?.data?.message ?? 'Erreur lors de l\'enregistrement.' })
    } finally { setRecLoading(false) }
  }

  async function handleValidate() {
    if (!schoolId || !valPresenceId) return
    setValLoading(true); setValResult(null)
    try {
      const r = await superAdminApi.validatePresence(schoolId, Number(valPresenceId))
      setValResult({ type: 'success', message: r.message ?? `Présence #${valPresenceId} validée.` })
      refetch()
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } } }
      setValResult({ type: 'error', message: err.response?.data?.message ?? 'Présence introuvable ou déjà validée.' })
    } finally { setValLoading(false) }
  }

  async function handleSync() {
    if (!schoolId || !syncJson.trim()) return
    setSyncLoading(true); setSyncResult(null)
    try {
      const ops = JSON.parse(syncJson)
      if (!Array.isArray(ops)) throw new Error('Le JSON doit être un tableau d\'objets.')
      const r = await superAdminApi.bulkSyncPresence(schoolId, ops)
      const ok = r.data?.filter(x => x.status !== 'ERROR').length ?? 0
      const err = (r.data?.length ?? 0) - ok
      setSyncResult({ type: err === 0 ? 'success' : 'error', message: `${ok} enregistrés${err > 0 ? `, ${err} erreurs` : ''}.` })
      refetch()
    } catch (e: unknown) {
      const err = e as { message?: string; response?: { data?: { message?: string } } }
      setSyncResult({ type: 'error', message: err.response?.data?.message ?? err.message ?? 'Erreur de parsing ou d\'envoi.' })
    } finally { setSyncLoading(false) }
  }

  /* ── Computed ── */
  const total = dashboard ? dashboard.stats.presentCount + dashboard.stats.absentCount : 0
  const rate = total > 0 ? Math.round((dashboard!.stats.presentCount / total) * 100) : 0
  const lastRefresh = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : null
  const selectedSchool = schools?.find((s) => s.id === schoolId)

  const presencePie = useMemo(() => {
    if (!dashboard) return []
    return [
      { name: 'Présents', value: dashboard.stats.presentCount, color: '#10b981' },
      { name: 'Absents', value: dashboard.stats.absentCount, color: '#ef4444' },
    ].filter((d) => d.value > 0)
  }, [dashboard])

  const classBarData = useMemo(() => (
    (dashboard?.classBreakdown ?? []).slice(0, 10).map((cls) => ({
      name: cls.name.length > 12 ? `${cls.name.slice(0, 12)}…` : cls.name,
      effectif: cls._count.students,
    }))
  ), [dashboard])

  const scanMethodData = useMemo(() => {
    if (!dashboard?.liveFeed.length) return []
    const counts: Record<string, number> = {}
    for (const item of dashboard.liveFeed) {
      const key = item.scanMethod ?? 'UNKNOWN'
      counts[key] = (counts[key] ?? 0) + 1
    }
    return Object.entries(counts)
      .map(([method, count], i) => ({
        name: METHOD_LABELS[method] ?? method,
        value: count,
        color: CHART_COLORS[i % CHART_COLORS.length],
      }))
      .sort((a, b) => b.value - a.value)
  }, [dashboard])

  const statusFromFeed = useMemo(() => {
    if (!dashboard?.liveFeed.length) return []
    const counts: Record<string, number> = {}
    for (const item of dashboard.liveFeed) {
      const key = item.status ?? 'UNKNOWN'
      counts[key] = (counts[key] ?? 0) + 1
    }
    const colors: Record<string, string> = {
      PRESENT: '#10b981', LATE: '#f59e0b', ABSENT: '#ef4444', UNKNOWN: '#a1a1aa',
    }
    const labels: Record<string, string> = {
      PRESENT: 'Présent', LATE: 'Retard', ABSENT: 'Absent', UNKNOWN: 'Autre',
    }
    return Object.entries(counts).map(([status, value]) => ({
      name: labels[status] ?? status,
      value,
      color: colors[status] ?? '#6366f1',
    }))
  }, [dashboard])

  /* ────────────────────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-50 via-white to-zinc-50/80">

      {/* ── HEADER ───────────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-zinc-200/80">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
    <div className="min-h-screen bg-zinc-50">

      {/* ── PAGE HEADER ──────────────────────────────────────────────────────── */}
      <motion.div className="bg-white border-b border-zinc-200" initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <div className="max-w-7xl mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-[22px] font-semibold text-zinc-900 tracking-tight">Présence</h1>
            <p className="text-xs text-zinc-400 mt-0.5">Dashboard live · enregistrement forcé · validation · sync offline</p>
          </div>
          {schoolId && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                <ScanLine size={17} className="text-emerald-600" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-semibold text-zinc-900">Présence</h1>
                  {schoolId && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-0.5">
                  {selectedSchool ? `${selectedSchool.name} — ${selectedSchool.city}` : 'Dashboard temps réel · flux de scans · suivi des absences'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {schoolId && lastRefresh && (
                <span className="text-[11px] text-zinc-400 tabular-nums">MAJ {lastRefresh}</span>
              )}
              {schoolId && (
                <button
                  onClick={() => refetch()}
                  disabled={isLoading}
                  className="h-8 w-8 flex items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-500 hover:bg-zinc-50 transition-all disabled:opacity-40"
                >
                  <RefreshCw size={13} className={cn(isLoading && 'animate-spin')} />
                </button>
              )}
              <div className="flex items-center gap-2 border border-zinc-200 rounded-lg px-3 py-1.5 bg-white">
                <Building2 size={13} className="text-zinc-400" />
                <select
                  value={schoolId ?? ''}
                  onChange={(e) => setSchoolId(e.target.value ? Number(e.target.value) : null)}
                  className="bg-transparent text-sm text-zinc-700 focus:outline-none min-w-[220px] cursor-pointer"
                >
                  <option value="">Sélectionner un établissement…</option>
                  {schools?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.city}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Stat chips quand une école est chargée */}
          {schoolId && dashboard && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-100">
              {[
                { label: 'Présents', value: dashboard.stats.presentCount, icon: Users },
                { label: 'Absents', value: dashboard.stats.absentCount, icon: UserX },
                { label: 'Taux de présence', value: `${rate}%`, icon: BarChart3 },
                { label: 'Total actifs', value: total, icon: Clock },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-2 bg-zinc-50 border border-zinc-100 rounded-lg px-3 py-2">
                  <s.icon size={13} className="text-zinc-400 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-zinc-800 tabular-nums leading-none">{s.value}</p>
                    <p className="text-[10px] text-zinc-400 mt-0.5">{s.label}</p>
                  </div>
                  <p className="text-xl font-bold tabular-nums">{s.value}</p>
                </div>
              ))}
            </div>
          )}
          {schoolId && isLoading && (
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-zinc-100">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-10 w-32 bg-zinc-100 rounded-lg animate-pulse" />
              ))}
            </div>
          )}
        </div>
      </motion.div>

      <div className="max-w-7xl mx-auto px-6 pt-6 pb-10 space-y-6">

        {!schoolId && (
          <Panel className="text-center py-16">
            <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center mx-auto mb-4">
              <ScanLine size={24} className="text-indigo-400" />
            </div>
            <p className="text-sm font-medium text-zinc-700 mb-1">Aucun établissement sélectionné</p>
            <p className="text-sm text-zinc-400 max-w-md mx-auto">
              Choisissez une école dans le sélecteur ci-dessus pour accéder au dashboard live et aux indicateurs de présence.
            </p>
          </Panel>
        )}

        {schoolId && isError && (
          <Panel className="border-red-200/80 bg-red-50/50">
            <div className="flex items-start gap-4">
              <AlertTriangle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-700">Impossible de charger le dashboard de présence</p>
                <p className="text-sm text-red-500 mt-0.5">
                  {(error as { response?: { data?: { message?: string } } })?.response?.data?.message
                    ?? 'Vérifiez que le backend tourne et que tu es connecté en tant que super admin.'}
                </p>
              </div>
              <button
                onClick={() => refetch()}
                className="flex items-center gap-1.5 text-sm text-red-600 hover:text-red-800 font-medium flex-shrink-0 transition-colors"
              >
                <RefreshCw size={13} />
                Réessayer
              </button>
            </div>
          </Panel>
        )}

        {schoolId && !isError && (
          <>
            {/* ── KPI ─────────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {isLoading ? (
                <><Sk className="h-32" /><Sk className="h-32" /><Sk className="h-32" /></>
              ) : dashboard ? (
                <>
                  <KpiCard
                    label="Présents aujourd'hui"
                    value={dashboard.stats.presentCount}
                    sub={`sur ${total} élèves actifs`}
                    icon={Users}
                    tone="ok"
                  />
                  <KpiCard
                    label="Absents critiques"
                    value={dashboard.stats.absentCount}
                    sub="non scannés"
                    icon={UserX}
                    tone="danger"
                  />
                  <KpiCard
                    label="Taux de présence"
                    value={`${rate}%`}
                    sub={rate >= 80 ? 'Objectif atteint' : rate >= 60 ? 'Sous l\'objectif' : 'Alerte'}
                    icon={ShieldCheck}
                    tone={rate >= 80 ? 'ok' : rate >= 60 ? 'warn' : 'danger'}
                    progress={rate}
                  />
                </>
              ) : null}
            </div>

            {/* ── GRAPHIQUES ─────────────────────────────────────────────── */}
            {dashboard && (
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <BarChart3 size={16} className="text-indigo-600" />
                  <h2 className="text-sm font-semibold text-zinc-800">Analytique du jour</h2>
                  <span className="text-[10px] text-zinc-400">— données API live</span>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                  {/* Donut présence */}
                  <Panel>
                    <PanelHeader
                      icon={PieIcon}
                      iconClass="bg-emerald-50 text-emerald-600"
                      title="Répartition présence"
                      description="Présents vs absents (jour courant)"
                    />
                    {presencePie.length ? (
                      <div className="flex flex-col items-center">
                        <div className="relative w-40 h-40">
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={presencePie}
                                cx="50%" cy="50%"
                                innerRadius={48} outerRadius={72}
                                paddingAngle={3}
                                dataKey="value"
                                strokeWidth={0}
                              >
                                {presencePie.map((entry) => (
                                  <Cell key={entry.name} fill={entry.color} />
                                ))}
                              </Pie>
                              <RechartsTooltip
                                formatter={(v: number) => [v, 'élèves']}
                                contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-xl font-bold text-zinc-900 tabular-nums">{rate}%</span>
                            <span className="text-[10px] text-zinc-400 uppercase">taux</span>
                          </div>
                        </div>
                        <div className="flex gap-4 mt-3">
                          {presencePie.map((d) => (
                            <div key={d.name} className="flex items-center gap-1.5 text-xs text-zinc-600">
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />
                              {d.name} <span className="font-semibold tabular-nums">{d.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 text-center py-10">Aucune donnée</p>
                    )}
                  </Panel>

                  {/* Bar classes */}
                  <Panel className="lg:col-span-1">
                    <PanelHeader
                      icon={BarChart3}
                      iconClass="bg-indigo-50 text-indigo-600"
                      title="Effectifs par classe"
                      description="Élèves présents par classe"
                    />
                    {classBarData.length ? (
                      <ResponsiveContainer width="100%" height={180}>
                        <BarChart data={classBarData} margin={{ top: 0, right: 4, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f4f4f5" vertical={false} />
                          <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} tickLine={false} axisLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} tickLine={false} axisLine={false} allowDecimals={false} />
                          <RechartsTooltip
                            contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="effectif" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={24} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <p className="text-sm text-zinc-400 text-center py-10">Aucune classe</p>
                    )}
                  </Panel>

                  {/* Scan methods or status */}
                  <Panel>
                    <PanelHeader
                      icon={Radio}
                      iconClass="bg-violet-50 text-violet-600"
                      title="Modes de scan"
                      description="Répartition des scans du flux live"
                    />
                    {scanMethodData.length ? (
                      <div className="space-y-2.5">
                        {scanMethodData.map((d) => {
                          const max = scanMethodData[0]?.value ?? 1
                          const w = Math.round((d.value / max) * 100)
                          return (
                            <div key={d.name}>
                              <div className="flex justify-between text-xs mb-1">
                                <span className="text-zinc-600">{d.name}</span>
                                <span className="font-semibold tabular-nums text-zinc-800">{d.value}</span>
                              </div>
                              <div className="h-1.5 bg-zinc-100 rounded-full overflow-hidden">
                                <div className="h-full rounded-full transition-all" style={{ width: `${w}%`, backgroundColor: d.color }} />
                              </div>
                            </div>
                          )
                        })}
                        {statusFromFeed.length > 0 && (
                          <div className="pt-3 mt-3 border-t border-zinc-100 flex flex-wrap gap-2">
                            {statusFromFeed.map((s) => (
                              <span
                                key={s.name}
                                className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-50 text-zinc-600 ring-1 ring-zinc-100"
                              >
                                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: s.color }} />
                                {s.name}: {s.value}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-400 text-center py-10">Aucun scan aujourd&apos;hui</p>
                    )}
                  </Panel>
                </div>
              </div>
            )}

            {/* ── LIVE FEED + ABSENTS ──────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Panel padding={false} className="overflow-hidden flex flex-col">
                <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
                  <PanelHeader
                    icon={Wifi}
                    iconClass="bg-emerald-50 text-emerald-600"
                    title="Flux live"
                    description="Derniers scans · actualisation 30s"
                    action={
                      <span className="text-[10px] font-medium text-zinc-400 bg-zinc-100 px-2 py-1 rounded-full tabular-nums">
                        {dashboard?.liveFeed.length ?? 0} scans
                      </span>
                    }
                  />
                </div>
                <div className="overflow-y-auto max-h-80 divide-y divide-zinc-50 flex-1">
                  {isLoading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(6)].map((_, i) => <Sk key={i} className="h-10 rounded-xl" />)}
                    </div>
                  ) : !dashboard?.liveFeed.length ? (
                    <div className="p-10 text-center">
                      <WifiOff size={22} className="mx-auto text-zinc-300 mb-2" />
                      <p className="text-sm text-zinc-400">Aucun scan enregistré aujourd&apos;hui.</p>
                    </div>
                  ) : (
                    dashboard.liveFeed.map((item) => {
                      const name = `${item.student.firstName} ${item.student.lastName}`
                      const statusColor =
                        item.status === 'PRESENT' ? 'bg-emerald-400'
                        : item.status === 'LATE'   ? 'bg-amber-400'
                        : item.status === 'ABSENT'  ? 'bg-red-400'
                        : 'bg-zinc-300'
                      return (
                        <div key={item.id} className="flex items-center gap-3 px-6 py-3 hover:bg-zinc-50/60 transition-colors">
                          <span className={cn('w-2 h-2 rounded-full flex-shrink-0 ring-2 ring-white', statusColor)} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-zinc-800 truncate">{name}</p>
                            <p className="text-[11px] text-zinc-400 truncate">
                              {item.student.class?.name ?? '—'}
                              {item.scanMethod ? ` · ${METHOD_LABELS[item.scanMethod] ?? item.scanMethod}` : ''}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <span className="text-[10px] font-mono text-zinc-300 tabular-nums">#{item.id}</span>
                            {item.validated && <CheckCircle size={12} className="text-emerald-500" />}
                            <span className="text-[11px] font-medium text-zinc-400 tabular-nums bg-zinc-50 px-1.5 py-0.5 rounded">
                              {relativeTime(item.scannedAt)}
                            </span>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>
              </Panel>

              <Panel padding={false} className="overflow-hidden flex flex-col">
                <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
                  <PanelHeader
                    icon={UserX}
                    iconClass="bg-red-50 text-red-600"
                    title="Absents critiques"
                    description="Élèves non scannés aujourd'hui"
                    action={
                      <span className="text-[10px] font-semibold text-red-600 bg-red-50 px-2 py-1 rounded-full tabular-nums ring-1 ring-red-100">
                        {dashboard?.criticalAbsents.length ?? 0}
                      </span>
                    }
                  />
                </div>
                <div className="overflow-y-auto max-h-80 divide-y divide-zinc-50 flex-1">
                  {isLoading ? (
                    <div className="p-6 space-y-3">
                      {[...Array(6)].map((_, i) => <Sk key={i} className="h-10 rounded-xl" />)}
                    </div>
                  ) : !dashboard?.criticalAbsents.length ? (
                    <div className="p-10 text-center">
                      <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center mx-auto mb-2">
                        <CheckCircle size={20} className="text-emerald-400" />
                      </div>
                      <p className="text-sm text-zinc-500">Tous les élèves sont scannés !</p>
                    </div>
                  ) : (
                    dashboard.criticalAbsents.map((s, i) => (
                      <div key={i} className="flex items-center gap-3 px-6 py-3 hover:bg-red-50/30 transition-colors">
                        <div className="w-8 h-8 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0 ring-1 ring-red-100">
                          <UserX size={13} className="text-red-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-800 truncate">
                            {s.firstName} {s.lastName}
                          </p>
                          <p className="text-[11px] text-zinc-400">{s.class?.name ?? 'Classe inconnue'}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </Panel>
            </div>

            {/* ══ 4. ACTIONS ADMIN ════════════════════════════════════════════ */}
            <div>
              <SectionTitle>Actions administrateur</SectionTitle>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">

                {/* ── Enregistrement forcé ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <PenLine size={13} className="text-indigo-500" />
                    <span className="text-xs font-semibold text-zinc-700">Enregistrement forcé</span>
                  </div>
                  <div className="space-y-2.5 mb-4">
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">ID élève</p>
                      <input
                        type="number"
                        placeholder="ex: 42"
                        value={recStudentId}
                        onChange={e => setRecStudentId(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      />
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">Méthode de scan</p>
                      <select
                        value={recMethod}
                        onChange={e => setRecMethod(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      >
                        {SCAN_METHODS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <p className="text-[11px] text-zinc-400 mb-1.5">Note (optionnelle)</p>
                      <input
                        type="text"
                        placeholder="Raison…"
                        value={recNote}
                        onChange={e => setRecNote(e.target.value)}
                        className={cn(inputCls, 'w-full')}
                      />
                    </div>
                  </div>
                  <button
                    disabled={!recStudentId || recLoading}
                    onClick={handleRecord}
                    className={cn(btn('indigo'), 'w-full')}
                  >
                    {recLoading ? 'Enregistrement…' : 'Enregistrer la présence'}
                  </button>
                  {recResult && <div className="mt-3"><ResultBanner result={recResult} /></div>}
                </div>

                {/* ── Validation manuelle ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <ShieldCheck size={13} className="text-emerald-500" />
                    <span className="text-xs font-semibold text-zinc-700">Validation manuelle</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-4">
                    Valide manuellement une présence en quarantaine ou flagguée après anomalie détectée.
                  </p>
                  <div className="mb-4">
                    <p className="text-[11px] text-zinc-400 mb-1.5">ID présence</p>
                    <input
                      type="number"
                      placeholder="ex: 123"
                      value={valPresenceId}
                      onChange={e => setValPresenceId(e.target.value)}
                      className={cn(inputCls, 'w-full')}
                    />
                  </div>
                  <button
                    disabled={!valPresenceId || valLoading}
                    onClick={handleValidate}
                    className={cn(btn('emerald'), 'w-full')}
                  >
                    {valLoading ? 'Validation…' : 'Valider la présence'}
                  </button>
                  <div className="mt-3">
                    <p className="text-[11px] text-zinc-300">
                      L'ID est visible dans le flux live ci-dessus.
                    </p>
                  </div>
                  {valResult && <div className="mt-2"><ResultBanner result={valResult} /></div>}
                </div>

                {/* ── Sync offline ── */}
                <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <UploadCloud size={13} className="text-zinc-500" />
                    <span className="text-xs font-semibold text-zinc-700">Sync offline → online</span>
                  </div>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Collez un tableau JSON d'opérations collectées hors ligne.
                  </p>
                  <div className="mb-1.5">
                    <p className="text-[11px] text-zinc-400 mb-1.5">Payload JSON</p>
                    <textarea
                      ref={syncRef}
                      rows={5}
                      value={syncJson}
                      onChange={e => setSyncJson(e.target.value)}
                      placeholder={`[\n  { "studentId": 42, "scanMethod": "QR_CODE" },\n  { "studentId": 99, "scanMethod": "NFC" }\n]`}
                      className="w-full px-3 py-2 text-xs font-mono rounded-lg border border-zinc-200 bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 resize-none placeholder:text-zinc-300 transition-all"
                    />
                  </div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] text-zinc-300">
                      <code className="bg-zinc-100 px-1 py-0.5 rounded">studentId</code> requis · <code className="bg-zinc-100 px-1 py-0.5 rounded">scannedAt</code> optionnel
                    </span>
                    {syncJson && (
                      <button
                        onClick={() => setSyncJson('')}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 transition-colors"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                  <button
                    disabled={!syncJson.trim() || syncLoading}
                    onClick={handleSync}
                    className={cn(btn('zinc'), 'w-full flex items-center justify-center gap-2')}
                  >
                    <Clock size={12} />
                    {syncLoading ? 'Synchronisation…' : 'Lancer la sync'}
                  </button>
                  {syncResult && <div className="mt-3"><ResultBanner result={syncResult} /></div>}
                </div>

              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
