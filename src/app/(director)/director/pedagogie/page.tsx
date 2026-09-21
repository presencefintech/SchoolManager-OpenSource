'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { GraduationCap, RefreshCw, Plus, X, CheckCircle2, Star } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  directorVisitsApi,
  type ClassVisitCriterion,
  type ClassVisitItem,
} from '@/lib/admin/api/director-visits.api'
import { directorStaffApi } from '@/lib/admin/api/director-staff.api'
import { directorsApi } from '@/lib/admin/api/directors.api'
import { Skeleton } from '@/components/ui/skeleton'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

const CRITERIA_TEMPLATE: Array<{ key: string; label: string }> = [
  { key: 'programme', label: 'Maîtrise du programme' },
  { key: 'gestion', label: 'Gestion de la classe' },
  { key: 'ponctualite', label: 'Ponctualité / assiduité' },
  { key: 'pedagogie', label: 'Méthode pédagogique' },
  { key: 'relation', label: 'Relation avec les élèves' },
]

function StatusBadge({ status }: { status: ClassVisitItem['status'] }) {
  return (
    <span
      className={cn(
        'px-2 py-0.5 rounded-full text-[11px] font-semibold',
        status === 'FINALIZED' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-700'
      )}
    >
      {status === 'FINALIZED' ? 'Finalisée' : 'Brouillon'}
    </span>
  )
}

function emptyCriteria(): ClassVisitCriterion[] {
  return CRITERIA_TEMPLATE.map((c) => ({ ...c, score: 3 }))
}

export default function DirectorPedagogiePage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<ClassVisitItem['status'] | ''>('')
  const [selected, setSelected] = useState<ClassVisitItem | null>(null)
  const [form, setForm] = useState({
    teacherId: '',
    classId: '',
    subject: '',
    visitedAt: new Date().toISOString().slice(0, 10),
    observations: '',
    recommendations: '',
    criteria: emptyCriteria(),
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const teachersQuery = useQuery({
    queryKey: ['director', 'staff', 'teachers'],
    queryFn: () => directorStaffApi.myTeachers(),
    staleTime: 60_000,
  })

  const classesQuery = useQuery({
    queryKey: ['director', 'classes'],
    queryFn: () => directorsApi.myClasses(),
    staleTime: 60_000,
  })

  const listQuery = useQuery({
    queryKey: ['director', 'visits', statusFilter],
    queryFn: () =>
      directorVisitsApi.list({ limit: 50, ...(statusFilter ? { status: statusFilter } : {}) }),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorVisitsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'visits'] }),
  })

  const finalizeMut = useMutation({
    mutationFn: directorVisitsApi.finalize,
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['director', 'visits'] })
      setSelected((cur) => (cur && updated ? { ...cur, ...updated } : cur))
    },
  })

  const items = listQuery.data?.items ?? []
  const teachers = teachersQuery.data ?? []
  const classes = classesQuery.data ?? []
  const finalizedCount = items.filter((i) => i.status === 'FINALIZED').length
  const avgScore =
    items.length > 0
      ? Math.round(
          (items.reduce((sum, i) => sum + (i.averageScore ?? 0), 0) / items.length) * 10
        ) / 10
      : null

  function updateCriterion(key: string, score: number) {
    setForm((f) => ({
      ...f,
      criteria: f.criteria.map((c) => (c.key === key ? { ...c, score } : c)),
    }))
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.teacherId || !form.classId) {
      setErr('Sélectionnez un enseignant et une classe.')
      return
    }
    if (form.observations.trim().length < 3) {
      setErr('Les observations sont requises.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        teacherId: Number(form.teacherId),
        classId: Number(form.classId),
        subject: form.subject.trim() || undefined,
        visitedAt: form.visitedAt,
        criteria: form.criteria,
        observations: form.observations.trim(),
        recommendations: form.recommendations.trim() || undefined,
      })
      setOk(`Fiche de visite enregistrée (#${created.id})`)
      setForm({
        teacherId: '',
        classId: '',
        subject: '',
        visitedAt: new Date().toISOString().slice(0, 10),
        observations: '',
        recommendations: '',
        criteria: emptyCriteria(),
      })
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Supervision pédagogique"
        subtitle="Visites de classe et suivi des enseignants de votre périmètre"
        actions={
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={cn(listQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
      />

      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-8 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
          {listQuery.isLoading ? (
            [...Array(3)].map((_, i) => <Skeleton key={i} className="h-24 rounded-2xl" />)
          ) : (
            <>
              <DirectorKpiCard
                label="Visites"
                value={items.length}
                icon={GraduationCap}
                tone="emerald"
              />
              <DirectorKpiCard
                label="Finalisées"
                value={finalizedCount}
                hint="Fiches verrouillées"
                icon={CheckCircle2}
                tone="sky"
              />
              <DirectorKpiCard
                label="Score moyen"
                value={avgScore != null ? `${avgScore}/5` : '—'}
                hint="Toutes visites confondues"
                icon={Star}
                tone="indigo"
              />
            </>
          )}
        </div>

        <div className="grid lg:grid-cols-5 gap-6">
          <motion.form
            onSubmit={onSubmit}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 h-fit"
          >
            <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
              <Plus size={14} className="text-emerald-600" />
              Nouvelle fiche de visite
            </h2>

            <div>
              <label className="text-xs font-medium text-zinc-600">Enseignant</label>
              <select
                value={form.teacherId}
                onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-emerald-200"
              >
                <option value="">— Sélectionner —</option>
                {teachers.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.firstName} {t.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Classe</label>
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
              >
                <option value="">— Sélectionner —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600">Matière (optionnel)</label>
                <input
                  value={form.subject}
                  onChange={(e) => setForm((f) => ({ ...f, subject: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                  placeholder="Français…"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Date de visite</label>
                <input
                  type="date"
                  value={form.visitedAt}
                  onChange={(e) => setForm((f) => ({ ...f, visitedAt: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-medium text-zinc-600">Grille d’évaluation</label>
              {form.criteria.map((c) => (
                <div key={c.key} className="flex items-center justify-between gap-3">
                  <span className="text-xs text-zinc-600 flex-1">{c.label}</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => updateCriterion(c.key, n)}
                        className={cn(
                          'w-6 h-6 rounded-md text-[11px] font-semibold border',
                          c.score >= n
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-zinc-400 border-zinc-200'
                        )}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div>
              <label className="text-xs font-medium text-zinc-600">Observations</label>
              <textarea
                value={form.observations}
                onChange={(e) => setForm((f) => ({ ...f, observations: e.target.value }))}
                rows={3}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                placeholder="Constats de la visite…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Recommandations (optionnel)</label>
              <textarea
                value={form.recommendations}
                onChange={(e) => setForm((f) => ({ ...f, recommendations: e.target.value }))}
                rows={2}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>

            {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
            {ok && <p className="text-xs text-emerald-600">{ok}</p>}
            <button
              type="submit"
              disabled={createMut.isPending}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
            >
              {createMut.isPending ? 'Enregistrement…' : 'Enregistrer la fiche (brouillon)'}
            </button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
              <h2 className="text-sm font-semibold text-zinc-800">
                Historique ({listQuery.data?.total ?? items.length})
              </h2>
              <div className="flex gap-1">
                {(['', 'DRAFT', 'FINALIZED'] as const).map((s) => (
                  <button
                    key={s || 'ALL'}
                    type="button"
                    onClick={() => setStatusFilter(s)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                      statusFilter === s
                        ? 'bg-zinc-900 text-white border-zinc-900'
                        : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50'
                    )}
                  >
                    {s || 'Toutes'}
                  </button>
                ))}
              </div>
            </div>

            {listQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
            ) : items.length === 0 ? (
              <DirectorEmptyState
                icon={GraduationCap}
                title="Aucune visite de classe"
                description="Programmez votre première visite pour suivre la pratique pédagogique de vos enseignants."
              />
            ) : (
              <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3 hover:bg-zinc-50/80">
                    <button
                      type="button"
                      onClick={() => setSelected(item)}
                      className="w-full text-left"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <StatusBadge status={item.status} />
                        <span className="text-[11px] text-zinc-400">
                          {new Date(item.visitedAt).toLocaleDateString('fr-FR')}
                        </span>
                        {item.averageScore != null && (
                          <span className="text-[11px] font-semibold text-indigo-700">
                            {item.averageScore}/5
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {item.teacher ? `${item.teacher.firstName} ${item.teacher.lastName}` : 'Enseignant'}
                        {item.class ? ` · ${item.class.name}` : ''}
                      </p>
                      <p className="text-xs text-zinc-500 line-clamp-2 mt-0.5">{item.observations}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[85vh] flex flex-col"
          >
            <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-zinc-100">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <StatusBadge status={selected.status} />
                  <span className="text-[11px] text-zinc-400">#{selected.id}</span>
                </div>
                <h2 className="text-base font-semibold text-zinc-900">
                  {selected.teacher
                    ? `${selected.teacher.firstName} ${selected.teacher.lastName}`
                    : 'Enseignant'}
                  {selected.class ? ` · ${selected.class.name}` : ''}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400"
              >
                <X size={16} />
              </button>
            </div>
            <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
              <div className="space-y-1.5">
                {selected.criteria.map((c) => (
                  <div key={c.key} className="flex items-center justify-between text-sm">
                    <span className="text-zinc-600">{c.label}</span>
                    <span className="font-semibold text-zinc-900">{c.score}/5</span>
                  </div>
                ))}
              </div>
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                  Observations
                </p>
                <p className="text-sm text-zinc-800 whitespace-pre-wrap">{selected.observations}</p>
              </div>
              {selected.recommendations && (
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-zinc-400 mb-1">
                    Recommandations
                  </p>
                  <p className="text-sm text-zinc-800 whitespace-pre-wrap">{selected.recommendations}</p>
                </div>
              )}
            </div>
            <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
              >
                Fermer
              </button>
              {selected.status === 'DRAFT' && (
                <button
                  type="button"
                  disabled={finalizeMut.isPending}
                  onClick={() =>
                    finalizeMut
                      .mutateAsync(selected.id)
                      .catch((e) => setErr(getApiErrorMessage(e)))
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 size={13} /> Finaliser
                </button>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </div>
  )
}
