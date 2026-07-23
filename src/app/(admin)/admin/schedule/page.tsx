'use client'

import { useMemo, useState } from 'react'
import {
  BookOpen,
  CalendarClock,
  LayoutGrid,
  List,
  Plus,
  RefreshCw,
  School,
  AlertTriangle,
  Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import {
  useAcademicSessions,
  useClasses,
  useClassPeriods,
  useCreateClassPeriod,
  useUpdateClassPeriod,
  useDeactivateClassPeriod,
} from '@/lib/hooks/use-admin'
import type { ClassPeriodItem, CreateClassPeriodPayload } from '@/types/admin'
import {
  PeriodFormModal,
  emptyPeriodForm,
  periodToForm,
} from '@/components/admin/schedule/PeriodFormModal'
import { WeekGrid } from '@/components/admin/schedule/WeekGrid'
import { ScheduleTable } from '@/components/admin/schedule/ScheduleTable'
import {
  DAY_LABELS,
  buildTeacherOptions,
  detectAllOverlaps,
} from '@/components/admin/schedule/schedule.utils'

const selectCls =
  'w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400'

type ViewMode = 'grid' | 'list'

function ConfirmDeactivateDialog({
  period,
  busy,
  onCancel,
  onConfirm,
}: {
  period: ClassPeriodItem
  busy: boolean
  onCancel: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden ring-1 ring-zinc-200">
        <div className="px-6 py-5 border-b border-zinc-100">
          <h3 className="text-base font-semibold text-zinc-900">Retirer ce créneau ?</h3>
          <p className="text-sm text-zinc-500 mt-1.5 leading-relaxed">
            <span className="font-medium text-zinc-800">
              {DAY_LABELS[period.dayOfWeek]} · {period.start}–{period.end}
            </span>
            <br />
            {period.subject ? `${period.subject} · ` : ''}
            {period.className ?? `Classe #${period.classId}`}
            {period.teacherName ? ` · ${period.teacherName}` : ''}
          </p>
          <p className="text-xs text-zinc-400 mt-2">
            Le créneau sera désactivé (soft delete) et disparaîtra de l&apos;app enseignant.
          </p>
        </div>
        <div className="px-6 py-4 bg-zinc-50/80 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-xl border border-zinc-200 bg-white text-zinc-700 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold rounded-xl bg-rose-600 text-white hover:bg-rose-700 disabled:opacity-50"
          >
            {busy ? 'Suppression…' : 'Confirmer'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AdminSchedulePage() {
  const { data: sessions = [] } = useAcademicSessions()
  const defaultYear = useMemo(
    () => sessions.find((s) => s.isCurrent)?.label ?? sessions[0]?.label ?? '2025-2026',
    [sessions],
  )

  const [academicYear, setAcademicYear] = useState('')
  const [classFilter, setClassFilter] = useState('')
  const [teacherFilter, setTeacherFilter] = useState('')
  const [dayFilter, setDayFilter] = useState('')
  const [view, setView] = useState<ViewMode>('grid')
  const [showCreate, setShowCreate] = useState(false)
  const [editItem, setEditItem] = useState<ClassPeriodItem | null>(null)
  const [pendingDelete, setPendingDelete] = useState<ClassPeriodItem | null>(null)
  const [formError, setFormError] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  const year = academicYear || defaultYear
  const { data: classes = [], isLoading: classesLoading } = useClasses({ isActive: true })

  const listParams = useMemo(
    () => ({
      academicYear: year,
      activeOnly: true,
    }),
    [year],
  )

  const { data: allPeriods = [], isLoading, refetch, isFetching } = useClassPeriods(listParams)
  const createPeriod = useCreateClassPeriod()
  const updatePeriod = useUpdateClassPeriod()
  const deactivatePeriod = useDeactivateClassPeriod()

  const teachers = useMemo(
    () => buildTeacherOptions(classes, allPeriods),
    [classes, allPeriods],
  )

  const filteredPeriods = useMemo(() => {
    return allPeriods.filter((p) => {
      if (classFilter && p.classId !== Number(classFilter)) return false
      if (teacherFilter && p.teacherId !== Number(teacherFilter)) return false
      if (dayFilter && p.dayOfWeek !== Number(dayFilter)) return false
      return true
    })
  }, [allPeriods, classFilter, teacherFilter, dayFilter])

  const overlapIds = useMemo(() => detectAllOverlaps(allPeriods), [allPeriods])
  const conflictCount = useMemo(
    () => allPeriods.filter((p) => overlapIds.has(p.id)).length,
    [allPeriods, overlapIds],
  )
  const uniqueTeachers = useMemo(
    () => new Set(allPeriods.map((p) => p.teacherId)).size,
    [allPeriods],
  )
  const uniqueClasses = useMemo(
    () => new Set(allPeriods.map((p) => p.classId)).size,
    [allPeriods],
  )

  function flash(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 2800)
  }

  async function handleCreate(payload: CreateClassPeriodPayload) {
    setFormError(null)
    try {
      await createPeriod.mutateAsync(payload)
      setShowCreate(false)
      flash('Créneau ajouté à l’emploi du temps')
    } catch (err) {
      setFormError(getApiErrorMessage(err))
    }
  }

  async function handleUpdate(payload: CreateClassPeriodPayload) {
    if (!editItem) return
    setFormError(null)
    try {
      await updatePeriod.mutateAsync({ id: editItem.id, payload })
      setEditItem(null)
      flash('Créneau mis à jour')
    } catch (err) {
      setFormError(getApiErrorMessage(err))
    }
  }

  async function handleDeactivate() {
    if (!pendingDelete) return
    try {
      await deactivatePeriod.mutateAsync(pendingDelete.id)
      setPendingDelete(null)
      flash('Créneau retiré')
    } catch {
      setPendingDelete(null)
    }
  }

  const yearOptions = useMemo(() => {
    const labels = sessions.map((s) => s.label)
    if (!labels.includes(defaultYear)) labels.unshift(defaultYear)
    return Array.from(new Set(labels))
  }, [sessions, defaultYear])

  const loading = isLoading || classesLoading

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Pédagogie"
        title="Emploi du temps"
        subtitle="Planifiez les créneaux hebdomadaires — synchronisés avec l’app mobile enseignant."
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
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setShowCreate(true)
              }}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-semibold rounded-lg bg-white text-emerald-950 hover:bg-emerald-50 transition-colors"
            >
              <Plus size={14} />
              Nouveau créneau
            </button>
          </>
        }
        quickLinks={[
          { href: '/admin/classes', label: 'Classes', icon: BookOpen },
          { href: '/admin/teachers', label: 'Enseignants', icon: School },
          { href: '/admin/presences', label: 'Présences', icon: Users },
        ]}
        metrics={[
          {
            label: 'Créneaux',
            value: loading ? '…' : allPeriods.length,
            loading,
            icon: CalendarClock,
          },
          {
            label: 'Classes couvertes',
            value: loading ? '…' : uniqueClasses,
            loading,
            valueClassName: 'text-sky-300',
            icon: BookOpen,
          },
          {
            label: 'Enseignants',
            value: loading ? '…' : uniqueTeachers,
            loading,
            valueClassName: 'text-emerald-300',
            icon: School,
          },
          {
            label: 'Conflits',
            value: loading ? '…' : conflictCount,
            loading,
            valueClassName: conflictCount > 0 ? 'text-amber-300' : 'text-white',
            icon: AlertTriangle,
          },
        ]}
        footer={
          !loading ? (
            <span>
              Année <strong className="text-white">{year}</strong>
              {conflictCount > 0 ? (
                <>
                  {' '}
                  · <strong className="text-amber-200">{conflictCount} créneau(x)</strong> en
                  chevauchement — à corriger avant publication mobile.
                </>
              ) : (
                <> · Aucun chevauchement détecté</>
              )}
            </span>
          ) : undefined
        }
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {conflictCount > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
            <AlertTriangle size={18} className="text-amber-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-semibold">Chevauchements d’horaires détectés</p>
              <p className="text-amber-800/90 text-xs mt-0.5 leading-relaxed">
                Un même enseignant a plusieurs cours au même moment. Les créneaux concernés sont
                surlignés dans la grille et le tableau. La création de nouveaux chevauchements est
                bloquée.
              </p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-2xl border border-zinc-200/80 shadow-sm p-4">
          <div className="flex flex-col lg:flex-row lg:items-end gap-3">
            <div className="min-w-[140px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                Année
              </label>
              <select
                value={year}
                onChange={(e) => setAcademicYear(e.target.value)}
                className={selectCls}
              >
                {yearOptions.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                Classe
              </label>
              <select
                value={classFilter}
                onChange={(e) => setClassFilter(e.target.value)}
                className={selectCls}
              >
                <option value="">Toutes les classes</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex-1 min-w-[160px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                Enseignant
              </label>
              <select
                value={teacherFilter}
                onChange={(e) => setTeacherFilter(e.target.value)}
                className={selectCls}
              >
                <option value="">Tous les enseignants</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="min-w-[140px]">
              <label className="block text-[11px] font-semibold uppercase tracking-wide text-zinc-500 mb-1.5">
                Jour
              </label>
              <select
                value={dayFilter}
                onChange={(e) => setDayFilter(e.target.value)}
                className={selectCls}
              >
                <option value="">Tous les jours</option>
                {Object.entries(DAY_LABELS).map(([v, label]) => (
                  <option key={v} value={v}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex rounded-xl border border-zinc-200 p-1 bg-zinc-50 self-end">
              <button
                type="button"
                onClick={() => setView('grid')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                  view === 'grid'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700',
                )}
              >
                <LayoutGrid size={14} />
                Grille
              </button>
              <button
                type="button"
                onClick={() => setView('list')}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold transition-colors',
                  view === 'list'
                    ? 'bg-white text-emerald-800 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-700',
                )}
              >
                <List size={14} />
                Liste
              </button>
            </div>
          </div>
          {(classFilter || teacherFilter || dayFilter) && (
            <div className="mt-3 flex items-center gap-2 text-xs text-zinc-500">
              <span>
                {filteredPeriods.length} créneau{filteredPeriods.length !== 1 ? 'x' : ''} affiché
                {filteredPeriods.length !== 1 ? 's' : ''}
              </span>
              <button
                type="button"
                className="text-emerald-700 font-medium hover:underline"
                onClick={() => {
                  setClassFilter('')
                  setTeacherFilter('')
                  setDayFilter('')
                }}
              >
                Réinitialiser les filtres
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-16 text-center">
            <div className="inline-block w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="mt-3 text-sm text-zinc-400">Chargement de l’emploi du temps…</p>
          </div>
        ) : allPeriods.length === 0 ? (
          <div className="bg-white rounded-2xl border border-dashed border-zinc-300 p-14 text-center">
            <CalendarClock size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-semibold text-zinc-800">Aucun créneau pour {year}</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto leading-relaxed">
              Créez le premier créneau pour alimenter le tableau de bord et l’écran emploi du temps
              des enseignants.
            </p>
            <button
              type="button"
              onClick={() => {
                setFormError(null)
                setShowCreate(true)
              }}
              className="mt-5 inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-emerald-600 text-white hover:bg-emerald-700"
            >
              <Plus size={15} />
              Ajouter un créneau
            </button>
          </div>
        ) : filteredPeriods.length === 0 ? (
          <div className="bg-white rounded-2xl border border-zinc-200 p-12 text-center text-sm text-zinc-500">
            Aucun créneau ne correspond aux filtres sélectionnés.
          </div>
        ) : view === 'grid' ? (
          <WeekGrid
            periods={filteredPeriods}
            overlapIds={overlapIds}
            onEdit={(p) => {
              setFormError(null)
              setEditItem(p)
            }}
            onDeactivate={setPendingDelete}
          />
        ) : (
          <ScheduleTable
            periods={filteredPeriods}
            overlapIds={overlapIds}
            onEdit={(p) => {
              setFormError(null)
              setEditItem(p)
            }}
            onDeactivate={setPendingDelete}
            busyId={deactivatePeriod.isPending ? pendingDelete?.id : null}
          />
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 right-6 z-[60] rounded-xl bg-slate-900 text-white text-sm font-medium px-4 py-3 shadow-xl ring-1 ring-white/10">
          {toast}
        </div>
      )}

      {showCreate && (
        <PeriodFormModal
          title="Nouveau créneau"
          initial={emptyPeriodForm(year)}
          classes={classes}
          teachers={teachers}
          existingPeriods={allPeriods}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
          busy={createPeriod.isPending}
          error={formError}
        />
      )}

      {editItem && (
        <PeriodFormModal
          title="Modifier le créneau"
          initial={periodToForm(editItem)}
          classes={classes}
          teachers={teachers}
          existingPeriods={allPeriods}
          excludePeriodId={editItem.id}
          onClose={() => setEditItem(null)}
          onSubmit={handleUpdate}
          busy={updatePeriod.isPending}
          error={formError}
        />
      )}

      {pendingDelete && (
        <ConfirmDeactivateDialog
          period={pendingDelete}
          busy={deactivatePeriod.isPending}
          onCancel={() => setPendingDelete(null)}
          onConfirm={handleDeactivate}
        />
      )}
    </div>
  )
}
