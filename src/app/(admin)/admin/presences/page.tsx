'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { fadeUp, stagger } from '@/lib/animations'
import {
  CheckCircle2, XCircle, Clock, ShieldAlert, Activity,
  QrCode, Plus, Users, RefreshCw, CheckCheck, Trash2, X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  usePresenceStats, usePresenceLiveFeed, usePresenceHeatmap, usePresenceAlerts,
  useRecordPresence, useBulkRecordPresence, useValidatePresence, useDeletePresence,
  useGenerateSessionQR, useStudents, useClasses,
} from '@/lib/hooks/use-admin'
import type { RecordPresencePayload, BulkPresencePayload } from '@/types/admin'
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

function SearchCombobox<T extends { id: number }>({
  label, placeholder, value, onSelect, displayValue, items, onSearch, loading,
}: {
  label: string
  placeholder: string
  value: number
  onSelect: (item: T) => void
  displayValue: (item: T) => string
  items: T[]
  onSearch: (q: string) => void
  loading: boolean
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [selectedLabel, setSelectedLabel] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [])

  function handleInput(q: string) {
    setQuery(q)
    setSelectedLabel('')
    onSelect({ id: 0 } as T)
    onSearch(q)
    setOpen(q.length > 0)
  }

  function pick(item: T) {
    setSelectedLabel(displayValue(item))
    setQuery('')
    setOpen(false)
    onSelect(item)
  }

  return (
    <div ref={ref}>
      <label className="block text-xs font-medium text-zinc-600 mb-1.5">{label}</label>
      <div className="relative">
        <input
          type="text"
          value={selectedLabel || query}
          onChange={e => handleInput(e.target.value)}
          onFocus={() => { if (query.length > 0) setOpen(true) }}
          placeholder={placeholder}
          className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
          autoComplete="off"
        />
        {value > 0 && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-400">#{value}</span>
        )}
        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white rounded-lg border border-zinc-200 shadow-lg max-h-48 overflow-y-auto">
            {loading && <div className="px-3 py-2 text-xs text-zinc-400">Recherche…</div>}
            {!loading && items.length === 0 && <div className="px-3 py-2 text-xs text-zinc-400">Aucun résultat</div>}
            {items.map(item => (
              <button
                key={item.id}
                type="button"
                onMouseDown={() => pick(item)}
                className="w-full text-left px-3 py-2 text-sm hover:bg-zinc-50 transition-colors"
              >
                {displayValue(item)}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ManualRecordModal({ onClose }: { onClose: () => void }) {
  const [form, setForm] = useState<RecordPresencePayload>({ studentId: 0, classId: 0, status: 'PRESENT' })
  const record = useRecordPresence()

  const { data: classesData, isFetching: classesLoading } = useClasses()
  const { data: studentsData, isFetching: studentsLoading } = useStudents(
    form.classId ? { classId: form.classId, limit: 200 } : undefined
  )

  const classes = classesData ?? []
  const students = studentsData?.data ?? []

  const selectCls = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400 bg-white disabled:bg-zinc-50 disabled:text-zinc-400'

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.studentId || !form.classId) return
    await record.mutateAsync(form)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Enregistrement manuel</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          {/* Étape 1 — Classe */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Classe {classesLoading && <span className="text-zinc-400">(chargement…)</span>}
            </label>
            <select
              value={form.classId || ''}
              onChange={e => setForm(f => ({ ...f, classId: Number(e.target.value), studentId: 0 }))}
              className={selectCls}
            >
              <option value="">— Choisir une classe —</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>{(c as any).name ?? `Classe #${c.id}`}</option>
              ))}
            </select>
          </div>

          {/* Étape 2 — Élève (actif seulement si classe choisie) */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">
              Élève {form.classId && studentsLoading && <span className="text-zinc-400">(chargement…)</span>}
            </label>
            <select
              value={form.studentId || ''}
              onChange={e => setForm(f => ({ ...f, studentId: Number(e.target.value) }))}
              disabled={!form.classId}
              className={selectCls}
            >
              <option value="">
                {!form.classId ? '— Choisir d\'abord une classe —' : students.length === 0 && !studentsLoading ? 'Aucun élève dans cette classe' : '— Choisir un élève —'}
              </option>
              {students.map(s => (
                <option key={s.id} value={s.id}>
                  {`${(s as any).firstName ?? ''} ${(s as any).lastName ?? ''}`.trim() || `Élève #${s.id}`}
                  {s.matricule ? ` (${s.matricule})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Statut */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Statut</label>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value as RecordPresencePayload['status'] }))}
              className={selectCls}
            >
              <option value="PRESENT">Présent</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Retard</option>
            </select>
          </div>

          {/* Date optionnelle */}
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Date de session (optionnel)</label>
            <input
              type="datetime-local"
              value={form.sessionDate ?? ''}
              onChange={e => setForm(f => ({ ...f, sessionDate: e.target.value || undefined }))}
              className={selectCls}
            />
          </div>

          {record.isError && <p className="text-xs text-red-600 text-center">Erreur lors de l'enregistrement</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={record.isPending || !form.studentId || !form.classId}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {record.isPending ? 'Enregistrement…' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function BulkRecordModal({ onClose }: { onClose: () => void }) {
  const [classId, setClassId] = useState('')
  const [status, setStatus] = useState<'PRESENT' | 'ABSENT' | 'LATE'>('PRESENT')
  const [studentIdsRaw, setStudentIdsRaw] = useState('')
  const [sessionDate, setSessionDate] = useState('')
  const bulk = useBulkRecordPresence()

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const studentIds = studentIdsRaw.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0)
    if (!studentIds.length || !classId) return
    const payload: BulkPresencePayload = { studentIds, classId: Number(classId), status, sessionDate: sessionDate || undefined }
    await bulk.mutateAsync(payload)
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900">Enregistrement groupé</h2>
          <button onClick={onClose} className="text-zinc-400 hover:text-zinc-600 transition-colors"><X size={18} /></button>
        </div>
        <form onSubmit={submit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">IDs Élèves (séparés par virgule)</label>
            <input
              type="text" required
              value={studentIdsRaw} onChange={e => setStudentIdsRaw(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="ex: 12, 15, 22, 34"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">ID Classe</label>
            <input
              type="number" required min={1}
              value={classId} onChange={e => setClassId(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
              placeholder="ex: 5"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Statut</label>
            <select value={status} onChange={e => setStatus(e.target.value as typeof status)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400">
              <option value="PRESENT">Présent</option>
              <option value="ABSENT">Absent</option>
              <option value="LATE">Retard</option>
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-600 mb-1.5">Date de session (optionnel)</label>
            <input
              type="datetime-local"
              value={sessionDate} onChange={e => setSessionDate(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
            />
          </div>
          {bulk.isError && <p className="text-xs text-red-600 text-center">Erreur lors de l'enregistrement groupé</p>}
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border border-zinc-200 text-zinc-600 hover:bg-zinc-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={bulk.isPending}
              className="flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {bulk.isPending ? 'Enregistrement…' : 'Enregistrer tout'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function QRKioskModal({ onClose }: { onClose: () => void }) {
  const [classId, setClassId] = useState('')
  const generate = useGenerateSessionQR()

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
                <label className="block text-xs font-medium text-zinc-600 mb-1.5">ID Classe</label>
                <input
                  type="number" min={1} value={classId} onChange={e => setClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/30 focus:border-emerald-400"
                  placeholder="ex: 5"
                />
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
  const [tab, setTab] = useState<Tab>('live')
  const [showManual, setShowManual] = useState(false)
  const [showBulk, setShowBulk] = useState(false)
  const [showQR, setShowQR] = useState(false)

  const { data: stats, isLoading: loadingStats } = usePresenceStats()
  const { data: feed, isLoading: loadingFeed, refetch: refetchFeed } = usePresenceLiveFeed({ limit: 50 })
  const { data: alerts, isLoading: loadingAlerts } = usePresenceAlerts()

  const validate = useValidatePresence()
  const del = useDeletePresence()

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
    { key: 'alerts',  label: `Alertes fraude${alerts?.length ? ` (${alerts.length})` : ''}` },
  ]

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
              <HeatmapChart />
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
                            'text-xs font-semibold px-2 py-0.5 rounded-full',
                            alert.fraudScore >= 70 ? 'bg-red-50 text-red-700' : alert.fraudScore >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-zinc-100 text-zinc-500',
                          )}>
                            Score {alert.fraudScore}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => { if (alert.presence?.id) validate.mutate({ id: alert.presence.id }) }}
                              disabled={validate.isPending || !alert.presence?.id}
                              title="Valider la présence"
                              className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 disabled:opacity-40 transition-colors"
                            >
                              <CheckCheck size={14} />
                            </button>
                            <button
                              onClick={() => { if (alert.presence?.id) del.mutate({ id: alert.presence.id, reason: 'Fraude avérée' }) }}
                              disabled={del.isPending || !alert.presence?.id}
                              title="Supprimer (fraude)"
                              className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 disabled:opacity-40 transition-colors"
                            >
                              <Trash2 size={14} />
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
      {showBulk   && <BulkRecordModal  onClose={() => setShowBulk(false)}   />}
      {showQR     && <QRKioskModal     onClose={() => setShowQR(false)}      />}
    </div>
  )
}
