'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import {
  Plus, RefreshCw, BookOpen, Users, TrendingUp, ToggleLeft, ChevronRight,
  GraduationCap, LayoutGrid, ArrowRight, Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { AdminMultiCriteriaSearch } from '@/components/admin/shared/admin-multi-criteria-search'
import { useMultiCriteriaSearch } from '@/lib/hooks/use-multi-criteria-search'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'
import { classesApi } from '@/lib/admin/api'
import { triggerBlobDownload } from '@/lib/download-blob'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  useClasses, useCreateClass, useToggleClassStatus, useRollover,
  useSections, useOptions, useAcademicSessions,
} from '@/lib/hooks/use-admin'
import type { ClassListItem, CreateClassPayload, RolloverPayload } from '@/types/admin'
import { useToast } from '@/providers/toast-provider'

const CLASS_FILTER_DEFAULTS = {
  search: '',
  isActive: '',
  sectionId: '',
  optionId: '',
  academicYear: '',
  occupancy: '',
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-lg bg-zinc-100 animate-pulse', className)} />
}

function occupancyPct(cls: ClassListItem): number | null {
  if (!cls.capacity || cls.capacity <= 0) return null
  return Math.min(100, Math.round(((cls.studentCount ?? 0) / cls.capacity) * 100))
}

function OccupancyBar({ pct }: { pct: number }) {
  const color = pct >= 95 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="flex items-center gap-2 min-w-[88px]">
      <div className="flex-1 h-1.5 rounded-full bg-zinc-100 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[11px] text-zinc-500 tabular-nums w-8 text-right">{pct}%</span>
    </div>
  )
}

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateClass()
  const { data: sections = [] } = useSections()
  const { data: sessions = [] } = useAcademicSessions()
  const [form, setForm] = useState<CreateClassPayload>({
    name: '',
    academicYear: '',
    sectionId: 0,
    optionId: 0,
    level: '',
    capacity: undefined,
    teacherId: undefined,
  })
  const { data: options = [] } = useOptions(form.sectionId || undefined)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.sectionId || !form.optionId || !form.academicYear) {
      setError('Section, option et année scolaire sont requis')
      return
    }
    try {
      await mutateAsync({
        ...form,
        capacity: form.capacity ? Number(form.capacity) : undefined,
      })
      onClose()
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erreur lors de la création')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Nouvelle classe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Section *</label>
            <select
              required
              value={form.sectionId || ''}
              onChange={(e) => setForm((p) => ({ ...p, sectionId: Number(e.target.value), optionId: 0 }))}
              className={inputCls}
            >
              <option value="">— Choisir —</option>
              {sections.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Option *</label>
            <select
              required
              value={form.optionId || ''}
              disabled={!form.sectionId}
              onChange={(e) => setForm((p) => ({ ...p, optionId: Number(e.target.value) }))}
              className={inputCls}
            >
              <option value="">— Choisir —</option>
              {options.map((o) => (
                <option key={o.id} value={o.id}>{o.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Année scolaire *</label>
            {sessions.length > 0 ? (
              <select
                required
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                className={inputCls}
              >
                <option value="">— Choisir —</option>
                {sessions.map((s) => (
                  <option key={s.id} value={s.label}>
                    {s.label}{s.isCurrent ? ' (courante)' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <input
                required
                value={form.academicYear}
                onChange={(e) => setForm((p) => ({ ...p, academicYear: e.target.value }))}
                placeholder="2025-2026"
                pattern="\d{4}-\d{4}"
                className={inputCls}
              />
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nom *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="Ex: 6ème A"
              className={inputCls}
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Niveau</label>
            <input
              value={form.level ?? ''}
              onChange={(e) => setForm((p) => ({ ...p, level: e.target.value }))}
              placeholder="Ex: Collège, Lycée..."
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Capacité max</label>
              <input
                type="number"
                min={1}
                value={form.capacity ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, capacity: e.target.value ? Number(e.target.value) : undefined }))
                }
                placeholder="30"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Professeur</label>
              <input
                type="number"
                min={1}
                value={form.teacherId ?? ''}
                onChange={(e) =>
                  setForm((p) => ({ ...p, teacherId: e.target.value ? Number(e.target.value) : undefined }))
                }
                placeholder="Optionnel"
                className={inputCls}
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50"
            >
              {isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RolloverModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useRollover()
  const [form, setForm] = useState<RolloverPayload>({ fromYear: '', toYear: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync(form)
      setSuccess(true)
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
      setError(msg ?? 'Erreur lors du passage annuel')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Passage annuel</h2>
        <p className="text-xs text-zinc-400 mb-5">Migre toutes les classes vers la nouvelle année scolaire</p>
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-zinc-800">Passage annuel effectué</p>
            <button type="button" onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">
              Fermer
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Année source</label>
              <input
                required
                value={form.fromYear}
                onChange={(e) => setForm((p) => ({ ...p, fromYear: e.target.value }))}
                placeholder="2024-2025"
                className={inputCls}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Nouvelle année</label>
              <input
                required
                value={form.toYear}
                onChange={(e) => setForm((p) => ({ ...p, toYear: e.target.value }))}
                placeholder="2025-2026"
                className={inputCls}
              />
            </div>
            {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                Annuler
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="flex-1 px-4 py-2 rounded-xl bg-amber-500 text-sm text-white font-medium hover:bg-amber-600 disabled:opacity-50"
              >
                {isPending ? 'En cours...' : 'Lancer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const { user, isLoading: authLoading } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const [showCreate, setShowCreate] = useState(false)
  const [showRollover, setShowRollover] = useState(false)
  const {
    draft: filterDraft,
    applied: filters,
    setField: setFilterField,
    apply: applyFilters,
    reset: resetFilters,
    removeFilter,
  } = useMultiCriteriaSearch(CLASS_FILTER_DEFAULTS)

  const { data: sections = [] } = useSections()
  const sectionIdForOptions = filterDraft.sectionId ? Number(filterDraft.sectionId) : undefined
  const { data: options = [] } = useOptions(sectionIdForOptions)
  const { data: sessions = [] } = useAcademicSessions()

  const apiParams = useMemo(
    () => ({
      ...(filters.search ? { search: String(filters.search) } : {}),
      ...(filters.isActive === 'true' ? { isActive: true } : filters.isActive === 'false' ? { isActive: false } : {}),
      ...(filters.sectionId ? { sectionId: Number(filters.sectionId) } : {}),
      ...(filters.optionId ? { optionId: Number(filters.optionId) } : {}),
      ...(filters.academicYear ? { academicYear: String(filters.academicYear) } : {}),
    }),
    [filters],
  )

  const { data: classes = [], isPending, refetch, isFetching } = useClasses(apiParams)
  const { mutate: toggle } = useToggleClassStatus()
  const toast = useToast()

  async function downloadRoster(classId: number, className?: string) {
    try {
      const blob = await classesApi.exportClass(classId)
      triggerBlobDownload(blob, `liste-${className || classId}.csv`)
    } catch (error) {
      toast.error('Liste de classe', getApiErrorMessage(error))
    }
  }

  const loading = useQueryLoading(authLoading || isPending)

  const filtered = useMemo(() => {
    const occ = String(filters.occupancy ?? '')
    if (!occ) return classes
    return classes.filter((c) => {
      const pct = occupancyPct(c)
      if (pct == null) return occ === 'unknown'
      if (occ === 'high') return pct >= 90
      if (occ === 'medium') return pct >= 70 && pct < 90
      if (occ === 'low') return pct < 70
      return true
    })
  }, [classes, filters.occupancy])

  const filterChips = useMemo(() => {
    const chips: { id: string; label: string }[] = []
    if (filters.search) chips.push({ id: 'search', label: `Texte : ${filters.search}` })
    if (filters.isActive === 'true') chips.push({ id: 'isActive', label: 'Actives' })
    if (filters.isActive === 'false') chips.push({ id: 'isActive', label: 'Inactives' })
    if (filters.sectionId) {
      const name = sections.find((s) => s.id === Number(filters.sectionId))?.name ?? filters.sectionId
      chips.push({ id: 'sectionId', label: `Section : ${name}` })
    }
    if (filters.optionId) {
      const name = options.find((o) => o.id === Number(filters.optionId))?.name ?? filters.optionId
      chips.push({ id: 'optionId', label: `Option : ${name}` })
    }
    if (filters.academicYear) chips.push({ id: 'academicYear', label: `Année : ${filters.academicYear}` })
    if (filters.occupancy === 'high') chips.push({ id: 'occupancy', label: 'Remplissage ≥ 90%' })
    if (filters.occupancy === 'medium') chips.push({ id: 'occupancy', label: 'Remplissage 70–89%' })
    if (filters.occupancy === 'low') chips.push({ id: 'occupancy', label: 'Remplissage < 70%' })
    if (filters.occupancy === 'unknown') chips.push({ id: 'occupancy', label: 'Sans capacité' })
    return chips
  }, [filters, sections, options])

  const active = classes.filter((c) => c.isActive).length
  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount ?? 0), 0)
  const avgFill = useMemo(() => {
    const withCap = classes.filter((c) => c.capacity && c.capacity > 0)
    if (!withCap.length) return null
    const sum = withCap.reduce((acc, c) => acc + ((c.studentCount ?? 0) / (c.capacity ?? 1)) * 100, 0)
    return Math.round(sum / withCap.length)
  }, [classes])

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Structure scolaire"
        title="Classes"
        subtitle={`${classes.length} classe${classes.length !== 1 ? 's' : ''} · ${active} active${active !== 1 ? 's' : ''}`}
        actions={
          <>
            <button
              type="button"
              onClick={() => refetch()}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors"
            >
              <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
              Actualiser
            </button>
            {!deskOnly && (
              <>
            <button
              type="button"
              onClick={() => setShowRollover(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-amber-500/20 text-amber-100 ring-1 ring-amber-400/30 hover:bg-amber-500/30 transition-colors"
            >
              <TrendingUp size={14} />
              Passage annuel
            </button>
            <button
              type="button"
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 transition-colors"
            >
              <Plus size={14} />
              Nouvelle classe
            </button>
              </>
            )}
          </>
        }
        quickLinks={[
          { href: '/admin/students', label: 'Élèves', icon: GraduationCap },
          { href: '/admin/enrollments', label: 'Inscriptions', icon: Users },
          { href: '/admin/presences', label: 'Présences', icon: LayoutGrid },
        ]}
        metrics={[
          { label: 'Total classes', value: loading ? '…' : classes.length, loading, icon: BookOpen },
          {
            label: 'Élèves inscrits',
            value: loading ? '…' : totalStudents,
            loading,
            valueClassName: 'text-emerald-300',
            icon: Users,
          },
          {
            label: 'Classes actives',
            value: loading ? '…' : active,
            loading,
            valueClassName: 'text-sky-300',
            icon: TrendingUp,
          },
          {
            label: 'Remplissage moy.',
            value: loading ? '…' : avgFill != null ? `${avgFill}%` : '—',
            loading,
            valueClassName: avgFill != null && avgFill >= 90 ? 'text-amber-300' : 'text-white',
            icon: LayoutGrid,
          },
        ]}
        footer={
          !loading && avgFill != null ? (
            <span>
              Taux de remplissage moyen sur les classes avec capacité définie :{' '}
              <strong className="text-white">{avgFill}%</strong>
            </span>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        <AdminMultiCriteriaSearch
          title="Filtrer les classes"
          primaryPlaceholder="Nom, niveau, section, option…"
          values={filterDraft}
          onChange={(id, value) => {
            setFilterField(id as keyof typeof CLASS_FILTER_DEFAULTS, value)
            if (id === 'sectionId') setFilterField('optionId', '')
          }}
          onApply={applyFilters}
          onReset={resetFilters}
          activeChips={filterChips}
          onRemoveChip={(id) => removeFilter(id as keyof typeof CLASS_FILTER_DEFAULTS)}
          resultCount={filtered.length}
          loading={loading}
          fields={[
            {
              id: 'isActive',
              type: 'select',
              label: 'Statut',
              options: [
                { value: 'true', label: 'Active' },
                { value: 'false', label: 'Inactive' },
              ],
            },
            {
              id: 'sectionId',
              type: 'select',
              label: 'Section',
              options: sections.map((s) => ({ value: String(s.id), label: s.name })),
            },
            {
              id: 'optionId',
              type: 'select',
              label: 'Option',
              options: options.map((o) => ({ value: String(o.id), label: o.name })),
            },
            {
              id: 'academicYear',
              type: 'select',
              label: 'Année scolaire',
              options: sessions.map((s) => ({
                value: s.label,
                label: s.isCurrent ? `${s.label} (courante)` : s.label,
              })),
            },
            {
              id: 'occupancy',
              type: 'select',
              label: 'Remplissage',
              options: [
                { value: 'high', label: 'Saturé (≥ 90%)' },
                { value: 'medium', label: 'Élevé (70–89%)' },
                { value: 'low', label: 'Disponible (< 70%)' },
                { value: 'unknown', label: 'Sans capacité définie' },
              ],
            },
          ]}
        />

        <div className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-zinc-100 bg-zinc-50/60">
            <div className="flex items-center gap-2">
              <BookOpen size={16} className="text-emerald-600" />
              <span className="text-sm font-semibold text-zinc-800">Registre des classes</span>
            </div>
            <Link
              href="/admin/dashboard"
              className="text-xs font-medium text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
            >
              Dashboard <ArrowRight size={12} />
            </Link>
          </div>

          {loading ? (
            <div className="p-6 space-y-3">
              {[...Array(6)].map((_, i) => (
                <Sk key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-zinc-100 flex items-center justify-center mx-auto mb-4">
                <BookOpen size={24} className="text-zinc-300" />
              </div>
              <p className="text-sm font-medium text-zinc-700">
                {filterChips.length ? 'Aucun résultat pour ces critères' : 'Aucune classe créée'}
              </p>
              <p className="text-xs text-zinc-400 mt-1 mb-4">
                {filterChips.length
                  ? 'Modifiez les filtres ou réinitialisez la recherche.'
                  : 'Commencez par structurer votre établissement.'}
              </p>
              {!filterChips.length && !deskOnly && (
                <button
                  type="button"
                  onClick={() => setShowCreate(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700"
                >
                  <Plus size={14} />
                  Créer une classe
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-white">
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Classe</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Parcours</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Effectif</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Remplissage</th>
                    <th className="text-left px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">Statut</th>
                    <th className="px-5 py-3" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-50">
                  {filtered.map((cls) => {
                    const pct = occupancyPct(cls)
                    return (
                      <tr key={cls.id} className="hover:bg-emerald-50/30 transition-colors group">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-zinc-900">{cls.name}</p>
                          <p className="text-xs text-zinc-400 mt-0.5">{cls.level ?? cls.academicYear ?? '—'}</p>
                        </td>
                        <td className="px-5 py-4 text-zinc-600">
                          <p className="text-sm">{cls.sectionName ?? '—'}</p>
                          {cls.optionName && (
                            <p className="text-xs text-zinc-400">{cls.optionName}</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="font-semibold text-zinc-800 tabular-nums">{cls.studentCount ?? 0}</span>
                          {cls.capacity != null && (
                            <span className="text-zinc-400 text-xs"> / {cls.capacity}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {pct != null ? (
                            <OccupancyBar pct={pct} />
                          ) : (
                            <span className="text-xs text-zinc-400">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {deskOnly ? (
                            <span className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
                              cls.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100'
                                : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200',
                            )}>
                              {cls.isActive ? 'Active' : 'Inactive'}
                            </span>
                          ) : (
                          <button
                            type="button"
                            onClick={() => toggle(cls.id)}
                            className={cn(
                              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                              cls.isActive
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100 hover:bg-emerald-100'
                                : 'bg-zinc-100 text-zinc-500 ring-1 ring-zinc-200 hover:bg-zinc-200',
                            )}
                          >
                            <ToggleLeft size={11} />
                            {cls.isActive ? 'Active' : 'Inactive'}
                          </button>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="inline-flex items-center gap-3">
                            <button
                              type="button"
                              onClick={() => void downloadRoster(cls.id, cls.name)}
                              className="text-xs font-medium text-zinc-500 hover:text-emerald-700 inline-flex items-center gap-1"
                            >
                              <Download size={12} />
                              Liste
                            </button>
                            <Link
                              href={`/admin/cards?classId=${cls.id}`}
                              className="text-xs font-medium text-zinc-500 hover:text-emerald-700"
                            >
                              Cartes
                            </Link>
                            <Link
                              href={`/admin/classes/${cls.id}`}
                              className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-600 hover:text-emerald-800 opacity-80 group-hover:opacity-100"
                            >
                              Ouvrir
                              <ChevronRight size={14} />
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} />}
      {showRollover && <RolloverModal onClose={() => setShowRollover(false)} />}
    </div>
  )
}
