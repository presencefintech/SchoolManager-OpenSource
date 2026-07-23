'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  BookOpen, Search, Users, TrendingUp, AlertTriangle, CheckCircle2,
  XCircle, ChevronLeft, ChevronRight, Lock, Unlock, RefreshCw,
  Copy, Download, Clock, ShieldCheck, ArrowRight, Loader2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useSchools, useClasses, useCapacityAlerts, useClassSetup, useClassPerformance, useClassAuditTrail } from '@/lib/hooks/use-super-admin'
import { superAdminApi } from '@/lib/superAdmin/api'
import type { ClassItem } from '@/types/super-admin'
import { formatMoney } from '@/lib/finance/currency'

/* ─── helpers ─────────────────────────────────────────────────── */

function fmtCount(n: number) {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ─── ClassCard ───────────────────────────────────────────────── */

function ClassCard({
  cls,
  selected,
  onClick,
}: {
  cls: ClassItem
  selected: boolean
  onClick: () => void
}) {
  const pct = cls.maxStudents ? Math.round((cls._count.students / cls.maxStudents) * 100) : null
  const isFull = pct !== null && pct >= 100
  const isWarn = pct !== null && pct >= 90 && !isFull

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-4 py-3.5 flex items-center gap-3.5 hover:bg-zinc-50 transition-colors',
        selected && 'bg-indigo-50 hover:bg-indigo-50',
      )}
    >
      <div className={cn(
        'w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold',
        selected ? 'bg-indigo-600 text-white' : 'bg-zinc-100 text-zinc-600',
      )}>
        {cls.name.slice(0, 2).toUpperCase()}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-zinc-800 truncate">{cls.name}</p>
          {cls.isLocked && <Lock size={11} className="text-amber-500 flex-shrink-0" />}
          {!cls.isActive && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-zinc-100 text-zinc-400">Inactive</span>
          )}
        </div>
        <p className="text-xs text-zinc-400 truncate">
          {cls.teacher?.user.firstName} {cls.teacher?.user.lastName ?? 'Sans enseignant'} · {cls.academicYear}
        </p>
      </div>

      <div className="flex flex-col items-end gap-1 flex-shrink-0">
        <div className="flex items-center gap-1">
          <Users size={11} className="text-zinc-400" />
          <span className="text-xs tabular-nums text-zinc-500">{cls._count.students}</span>
          {cls.maxStudents && <span className="text-xs text-zinc-300">/{cls.maxStudents}</span>}
        </div>
        {pct !== null && (
          <div className="w-16 h-1 rounded-full bg-zinc-100 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all', isFull ? 'bg-red-500' : isWarn ? 'bg-amber-400' : 'bg-emerald-400')}
              style={{ width: `${Math.min(pct, 100)}%` }}
            />
          </div>
        )}
      </div>
    </button>
  )
}

/* ─── ClassDetail ─────────────────────────────────────────────── */

function ClassDetail({ cls }: { cls: ClassItem }) {
  const { data: setup, isLoading: setupLoading } = useClassSetup(cls.id)
  const { data: perf, isLoading: perfLoading } = useClassPerformance(cls.id)
  const { data: audit, isLoading: auditLoading } = useClassAuditTrail(cls.id)
  const [exporting, setExporting] = useState(false)

  const handleExport = async () => {
    setExporting(true)
    try {
      const data = await superAdminApi.exportFull(cls.id)
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `classe-${cls.name}-${cls.academicYear}.json`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header classe */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-4 flex items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-semibold text-zinc-900">{cls.name}</h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            {cls.teacher?.user.firstName} {cls.teacher?.user.lastName ?? 'Sans enseignant'} ·{' '}
            {cls.academicYear} · {cls._count.students} élève{cls._count.students !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="flex items-center gap-2 px-3.5 py-2 text-sm border border-zinc-200 rounded-lg text-zinc-600 hover:bg-zinc-50 transition-all disabled:opacity-50"
        >
          {exporting ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
          Exporter
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Setup score */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-800">Complétude de configuration</h4>
            <ShieldCheck size={15} className="text-zinc-400" />
          </div>

          {setupLoading ? (
            <div className="space-y-2">
              <div className="h-3 w-3/4 bg-zinc-100 rounded animate-pulse" />
              <div className="h-2 bg-zinc-100 rounded animate-pulse" />
            </div>
          ) : setup ? (
            <>
              <div className="flex items-end gap-2 mb-3">
                <span className="text-4xl font-bold text-zinc-900 tabular-nums leading-none">{setup.completenessScore}%</span>
                <span className={cn('text-sm font-medium mb-0.5', setup.isValid ? 'text-emerald-600' : 'text-amber-600')}>
                  {setup.isValid ? 'Valide' : 'Incomplet'}
                </span>
              </div>
              <div className="w-full h-2 bg-zinc-100 rounded-full mb-4 overflow-hidden">
                <div
                  className={cn('h-full rounded-full', setup.isValid ? 'bg-emerald-500' : 'bg-amber-400')}
                  style={{ width: `${setup.completenessScore}%` }}
                />
              </div>
              {setup.errors.length > 0 && (
                <ul className="space-y-1.5">
                  {setup.errors.map((err, i) => (
                    <li key={i} className="flex items-center gap-2 text-xs text-rose-600">
                      <XCircle size={12} className="flex-shrink-0" />
                      {err}
                    </li>
                  ))}
                </ul>
              )}
              {setup.isValid && (
                <p className="flex items-center gap-2 text-xs text-emerald-600">
                  <CheckCircle2 size={12} />
                  Configuration complète
                </p>
              )}
            </>
          ) : (
            <p className="text-sm text-zinc-400">Données non disponibles</p>
          )}
        </div>

        {/* Performance stats */}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5">
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-sm font-semibold text-zinc-800">Performance</h4>
            <TrendingUp size={15} className="text-zinc-400" />
          </div>

          {perfLoading ? (
            <div className="grid grid-cols-2 gap-3">
              {[...Array(4)].map((_, i) => <div key={i} className="h-14 bg-zinc-100 rounded-lg animate-pulse" />)}
            </div>
          ) : perf ? (
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: 'Présences', value: fmtCount(perf.metrics.attendanceCount), sub: 'total scans', color: 'text-indigo-600' },
                { label: 'Collecté', value: formatMoney(perf.metrics.totalPaid), sub: 'USD', color: 'text-emerald-600' },
                { label: 'Dette', value: formatMoney(perf.metrics.totalDebt), sub: 'USD', color: 'text-rose-600' },
                { label: 'Taux recouvrement', value: `${Math.round(perf.financial.metrics.recoveryRate)}%`, sub: `${perf.financial.metrics.studentCount} élèves`, color: 'text-amber-600' },
              ].map(({ label, value, sub, color }) => (
                <div key={label} className="bg-zinc-50 rounded-lg px-3 py-3">
                  <p className="text-[10px] text-zinc-400 uppercase tracking-wide mb-1">{label}</p>
                  <p className={cn('text-lg font-bold tabular-nums leading-none', color)}>{value}</p>
                  <p className="text-[10px] text-zinc-400 mt-0.5">{sub}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-zinc-400">Données non disponibles</p>
          )}
        </div>
      </div>

      {/* Audit trail */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-zinc-800">Audit trail</h4>
          <Clock size={14} className="text-zinc-400" />
        </div>

        {auditLoading ? (
          <div className="divide-y divide-zinc-100">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-5 py-3.5 flex gap-3">
                <div className="w-24 h-3 bg-zinc-100 rounded animate-pulse" />
                <div className="flex-1 h-3 bg-zinc-100 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : audit?.length ? (
          <div className="divide-y divide-zinc-100 max-h-64 overflow-y-auto">
            {audit.map((log) => (
              <div key={log.id} className="px-5 py-3 flex items-start gap-3">
                <span className="text-[10px] text-zinc-400 tabular-nums whitespace-nowrap pt-0.5">
                  {fmtDate(log.createdAt)}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-zinc-700">{log.action}</p>
                  {log.description && <p className="text-xs text-zinc-400 mt-0.5 truncate">{log.description}</p>}
                </div>
                {log.user && (
                  <span className="text-[10px] text-zinc-400 whitespace-nowrap">
                    {log.user.firstName} {log.user.lastName}
                  </span>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="px-5 py-8 text-center">
            <p className="text-sm text-zinc-400">Aucun log d&apos;audit</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── ToolsTab ────────────────────────────────────────────────── */

function ToolsTab({ schoolId, schools }: { schoolId: number; schools: { id: number; name: string }[] }) {
  /* Rollover */
  const [fromYear, setFromYear] = useState('')
  const [toYear, setToYear] = useState('')
  const [rolloverSchoolId, setRolloverSchoolId] = useState(schoolId)
  const [rollingOver, setRollingOver] = useState(false)
  const [rolloverResult, setRolloverResult] = useState<{ count: number } | null>(null)

  /* Teacher conflicts */
  const [teacherId, setTeacherId] = useState('')
  const [conflictYear, setConflictYear] = useState('')
  const [checkingConflicts, setCheckingConflicts] = useState(false)
  const [conflicts, setConflicts] = useState<{ isOverloaded: boolean; assignmentCount: number; assignedClasses: { id: number; name: string }[] } | null>(null)

  /* Duplicate */
  const [dupClassId, setDupClassId] = useState('')
  const [dupName, setDupName] = useState('')
  const [duplicating, setDuplicating] = useState(false)
  const [dupResult, setDupResult] = useState<string | null>(null)

  const handleRollover = async () => {
    if (!fromYear || !toYear || !rolloverSchoolId) return
    setRollingOver(true)
    setRolloverResult(null)
    try {
      const res = await superAdminApi.rollover(rolloverSchoolId, fromYear, toYear)
      setRolloverResult({ count: res.count })
    } finally {
      setRollingOver(false)
    }
  }

  const handleConflicts = async () => {
    if (!teacherId || !conflictYear) return
    setCheckingConflicts(true)
    setConflicts(null)
    try {
      const res = await superAdminApi.getTeacherConflicts(Number(teacherId), conflictYear)
      setConflicts(res)
    } finally {
      setCheckingConflicts(false)
    }
  }

  const handleDuplicate = async () => {
    if (!dupClassId || !dupName) return
    setDuplicating(true)
    setDupResult(null)
    try {
      await superAdminApi.duplicate(Number(dupClassId), dupName)
      setDupResult(`Classe dupliquée avec le nom "${dupName}"`)
      setDupClassId('')
      setDupName('')
    } catch {
      setDupResult('Erreur lors de la duplication')
    } finally {
      setDuplicating(false)
    }
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {/* Rollover */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800">Rollover d&apos;année</h4>
          <p className="text-xs text-zinc-400 mt-0.5">Crée les classes de l&apos;année suivante</p>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Établissement</label>
            <select
              value={rolloverSchoolId}
              onChange={(e) => setRolloverSchoolId(Number(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {schools.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="2023-2024"
              value={fromYear}
              onChange={(e) => setFromYear(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
            <ArrowRight size={14} className="text-zinc-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="2024-2025"
              value={toYear}
              onChange={(e) => setToYear(e.target.value)}
              className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <button
          onClick={handleRollover}
          disabled={rollingOver || !fromYear || !toYear}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {rollingOver ? <Loader2 size={13} className="animate-spin" /> : <RefreshCw size={13} />}
          Lancer le rollover
        </button>

        {rolloverResult && (
          <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2.5">
            <CheckCircle2 size={14} />
            {rolloverResult.count} classe{rolloverResult.count !== 1 ? 's' : ''} créée{rolloverResult.count !== 1 ? 's' : ''}
          </div>
        )}
      </div>

      {/* Teacher conflicts */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800">Conflits enseignant</h4>
          <p className="text-xs text-zinc-400 mt-0.5">Vérifie si un prof est assigné à plusieurs classes</p>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">ID enseignant</label>
            <input
              type="number"
              placeholder="Ex: 12"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Année académique</label>
            <input
              type="text"
              placeholder="2024-2025"
              value={conflictYear}
              onChange={(e) => setConflictYear(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <button
          onClick={handleConflicts}
          disabled={checkingConflicts || !teacherId || !conflictYear}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {checkingConflicts ? <Loader2 size={13} className="animate-spin" /> : <Search size={13} />}
          Vérifier
        </button>

        {conflicts && (
          <div className={cn('rounded-lg px-3 py-2.5 text-sm', conflicts.isOverloaded ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
            {conflicts.isOverloaded ? (
              <>
                <p className="font-medium flex items-center gap-1.5">
                  <AlertTriangle size={13} />
                  Surcharge ({conflicts.assignmentCount} classes)
                </p>
                <ul className="mt-1.5 space-y-0.5">
                  {conflicts.assignedClasses.map((c) => (
                    <li key={c.id} className="text-xs">· {c.name}</li>
                  ))}
                </ul>
              </>
            ) : (
              <p className="flex items-center gap-1.5">
                <CheckCircle2 size={13} />
                Aucun conflit ({conflicts.assignmentCount} classe)
              </p>
            )}
          </div>
        )}
      </div>

      {/* Duplicate */}
      <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-5 py-5 space-y-4">
        <div>
          <h4 className="text-sm font-semibold text-zinc-800">Dupliquer une classe</h4>
          <p className="text-xs text-zinc-400 mt-0.5">Copie la structure (sans les élèves)</p>
        </div>

        <div className="space-y-2.5">
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">ID classe source</label>
            <input
              type="number"
              placeholder="Ex: 5"
              value={dupClassId}
              onChange={(e) => setDupClassId(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div>
            <label className="text-xs text-zinc-500 mb-1 block">Nom de la nouvelle classe</label>
            <input
              type="text"
              placeholder="Ex: 6ème B"
              value={dupName}
              onChange={(e) => setDupName(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>

        <button
          onClick={handleDuplicate}
          disabled={duplicating || !dupClassId || !dupName}
          className="w-full flex items-center justify-center gap-2 py-2.5 text-sm font-medium bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
        >
          {duplicating ? <Loader2 size={13} className="animate-spin" /> : <Copy size={13} />}
          Dupliquer
        </button>

        {dupResult && (
          <div className={cn('flex items-center gap-2 text-sm rounded-lg px-3 py-2.5', dupResult.startsWith('Erreur') ? 'bg-rose-50 text-rose-700' : 'bg-emerald-50 text-emerald-700')}>
            {dupResult.startsWith('Erreur') ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
            {dupResult}
          </div>
        )}
      </div>
    </div>
  )
}

/* ─── main page ───────────────────────────────────────────────── */

export default function ClassesPage() {
  const [activeTab, setActiveTab] = useState<'classes' | 'tools'>('classes')
  const [schoolId, setSchoolId] = useState(0)
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedClass, setSelectedClass] = useState<ClassItem | null>(null)

  const { data: schools, isLoading: schoolsLoading } = useSchools()
  const { data: classList, isLoading: classLoading } = useClasses(schoolId, { page, limit: 20, name: debouncedSearch || undefined })
  const { data: capacityAlerts } = useCapacityAlerts(schoolId)

  const handleSearch = (v: string) => {
    setSearch(v)
    clearTimeout((window as any).__classSearchTimer)
    ;(window as any).__classSearchTimer = setTimeout(() => { setDebouncedSearch(v); setPage(1) }, 400)
  }

  const handleSelectClass = (cls: ClassItem) => {
    setSelectedClass((prev) => prev?.id === cls.id ? null : cls)
  }

  const fullSchools = schools?.map((s) => ({ id: s.id, name: s.name })) ?? []

  return (
    <div className="px-8 py-8 space-y-7 max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        className="flex items-center justify-between"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.25 }}
      >
        <div>
          <h1 className="text-3xl font-bold text-zinc-900 tracking-tight">Gestion des classes</h1>
          <p className="text-sm text-zinc-500 mt-1">Liste, audit, performances, rollover et conflits enseignants</p>
        </div>
        <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center shadow-sm">
          <BookOpen size={18} className="text-white" />
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('classes')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'classes' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
        >
          <BookOpen size={14} />
          Classes
        </button>
        <button
          onClick={() => setActiveTab('tools')}
          className={cn('flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-all', activeTab === 'tools' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700')}
        >
          <RefreshCw size={14} />
          Outils
        </button>
      </div>

      {/* School selector */}
      <div className="flex items-center gap-3">
        <label className="text-sm font-medium text-zinc-600 whitespace-nowrap">Établissement</label>
        {schoolsLoading ? (
          <div className="h-10 w-56 bg-zinc-100 rounded-lg animate-pulse" />
        ) : (
          <select
            value={schoolId}
            onChange={(e) => { setSchoolId(Number(e.target.value)); setSelectedClass(null); setPage(1) }}
            className="px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 min-w-[220px]"
          >
            <option value={0}>Sélectionner un établissement</option>
            {schools?.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        )}
      </div>

      {/* Tools tab */}
      {activeTab === 'tools' && (
        !schoolId ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-8 py-14 text-center">
            <BookOpen size={32} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-medium text-zinc-500">Sélectionnez un établissement pour accéder aux outils</p>
          </div>
        ) : (
          <ToolsTab schoolId={schoolId} schools={fullSchools} />
        )
      )}

      {/* Classes tab */}
      {activeTab === 'classes' && (
        !schoolId ? (
          <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] px-8 py-16 text-center">
            <BookOpen size={36} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-medium text-zinc-500">Sélectionnez un établissement</p>
            <p className="text-sm text-zinc-400 mt-1">La liste des classes apparaîtra ici</p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Capacity alerts banner */}
            {capacityAlerts && capacityAlerts.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-3.5 flex items-start gap-3">
                <AlertTriangle size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-amber-800">{capacityAlerts.length} alerte{capacityAlerts.length !== 1 ? 's' : ''} de capacité</p>
                  <div className="flex flex-wrap gap-2 mt-1.5">
                    {capacityAlerts.map((a) => (
                      <span
                        key={a.id}
                        className={cn(
                          'px-2 py-0.5 text-xs rounded-full font-medium',
                          a.status === 'FULL' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700',
                        )}
                      >
                        {a.name} — {a.occupancyRate}%
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            <div className={cn('grid gap-5', selectedClass ? 'grid-cols-[340px_1fr]' : 'grid-cols-1')}>
              {/* Class list */}
              <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
                <div className="px-4 py-3.5 border-b border-zinc-100">
                  <div className="relative">
                    <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                    <input
                      type="text"
                      placeholder="Rechercher une classe..."
                      value={search}
                      onChange={(e) => handleSearch(e.target.value)}
                      className="w-full pl-7 pr-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400"
                    />
                  </div>
                  {classList && (
                    <p className="text-xs text-zinc-400 mt-2 tabular-nums">{classList.meta.total} classe{classList.meta.total !== 1 ? 's' : ''}</p>
                  )}
                </div>

                {classLoading ? (
                  <div className="divide-y divide-zinc-100">
                    {[...Array(6)].map((_, i) => (
                      <div key={i} className="px-4 py-3.5 flex items-center gap-3">
                        <div className="w-9 h-9 bg-zinc-100 rounded-xl animate-pulse" />
                        <div className="flex-1 space-y-2">
                          <div className="h-3 w-32 bg-zinc-100 rounded animate-pulse" />
                          <div className="h-2 w-20 bg-zinc-100 rounded animate-pulse" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : classList?.data?.length ? (
                  <>
                    <div className="divide-y divide-zinc-100 max-h-[520px] overflow-y-auto">
                      {classList.data.map((cls) => (
                        <ClassCard
                          key={cls.id}
                          cls={cls}
                          selected={selectedClass?.id === cls.id}
                          onClick={() => handleSelectClass(cls)}
                        />
                      ))}
                    </div>

                    {classList.meta.total > 20 && (
                      <div className="px-4 py-3 border-t border-zinc-100 flex items-center justify-between">
                        <p className="text-xs text-zinc-400 tabular-nums">Page {page}</p>
                        <div className="flex gap-1">
                          <button
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                            disabled={page === 1}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                          >
                            <ChevronLeft size={13} />
                          </button>
                          <button
                            onClick={() => setPage((p) => p + 1)}
                            disabled={classList.data.length < 20}
                            className="p-1.5 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 disabled:opacity-40"
                          >
                            <ChevronRight size={13} />
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="px-4 py-12 text-center">
                    <BookOpen size={24} className="mx-auto text-zinc-300 mb-2" />
                    <p className="text-sm text-zinc-400">Aucune classe</p>
                  </div>
                )}
              </div>

              {/* Class detail panel */}
              {selectedClass && <ClassDetail cls={selectedClass} />}
            </div>

            {/* Legend */}
            {!selectedClass && (
              <p className="text-xs text-zinc-400 text-center">
                Cliquez sur une classe pour afficher setup, performances et audit trail
              </p>
            )}
          </div>
        )
      )}
    </div>
  )
}
