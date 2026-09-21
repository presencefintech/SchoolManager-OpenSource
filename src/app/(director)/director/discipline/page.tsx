'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { ShieldAlert, RefreshCw, Plus, X, Gavel, Send, CheckCircle2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  directorDisciplineApi,
  type DisciplineIncidentItem,
  type DisciplineSeverity,
} from '@/lib/admin/api/director-discipline.api'
import { directorsApi } from '@/lib/admin/api/directors.api'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

const SEVERITY_LABEL: Record<DisciplineSeverity, string> = {
  MINOR: 'Mineur',
  MAJOR: 'Majeur',
  SEVERE: 'Grave',
}

const SEVERITY_STYLE: Record<DisciplineSeverity, string> = {
  MINOR: 'bg-zinc-100 text-zinc-700',
  MAJOR: 'bg-amber-50 text-amber-800',
  SEVERE: 'bg-red-50 text-red-700',
}

const STATUS_LABEL: Record<DisciplineIncidentItem['status'], string> = {
  OPEN: 'Ouvert',
  DELIBERATED: 'Délibéré',
  TRANSMITTED_TO_ADMIN: 'Transmis admin',
  CLOSED: 'Clôturé',
}

function StatusBadge({ status }: { status: DisciplineIncidentItem['status'] }) {
  const styles: Record<DisciplineIncidentItem['status'], string> = {
    OPEN: 'bg-amber-50 text-amber-800',
    DELIBERATED: 'bg-sky-50 text-sky-700',
    TRANSMITTED_TO_ADMIN: 'bg-indigo-50 text-indigo-700',
    CLOSED: 'bg-emerald-50 text-emerald-700',
  }
  return (
    <span className={cn('px-2 py-0.5 rounded-full text-[11px] font-semibold', styles[status])}>
      {STATUS_LABEL[status]}
    </span>
  )
}

function DeliberationModal({
  item,
  onClose,
  onSubmit,
  busy,
}: {
  item: DisciplineIncidentItem
  onClose: () => void
  onSubmit: (decision: string, recommendation: string, transmit: boolean) => void
  busy: boolean
}) {
  const [decision, setDecision] = useState('')
  const [recommendation, setRecommendation] = useState('')
  const [transmit, setTransmit] = useState(item.severity === 'SEVERE')

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col"
      >
        <div className="flex items-start justify-between gap-3 px-6 py-5 border-b border-zinc-100">
          <h2 className="text-base font-semibold text-zinc-900 flex items-center gap-2">
            <Gavel size={16} className="text-indigo-600" />
            Conseil de discipline
          </h2>
          <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400">
            <X size={16} />
          </button>
        </div>
        <div className="px-6 py-4 overflow-y-auto flex-1 space-y-4">
          <p className="text-xs text-zinc-500">
            {item.nature} · {SEVERITY_LABEL[item.severity]} ·{' '}
            {new Date(item.occurredAt).toLocaleDateString('fr-FR')}
          </p>
          <div>
            <label className="text-xs font-medium text-zinc-600">Décision du conseil</label>
            <textarea
              value={decision}
              onChange={(e) => setDecision(e.target.value)}
              rows={3}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              placeholder="Avertissement, blâme, exclusion temporaire proposée…"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Recommandation (optionnel)</label>
            <textarea
              value={recommendation}
              onChange={(e) => setRecommendation(e.target.value)}
              rows={2}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input type="checkbox" checked={transmit} onChange={(e) => setTransmit(e.target.checked)} />
            Transmettre à l’administrateur (sanction lourde : exclusion, dossier)
          </label>
        </div>
        <div className="px-6 py-4 border-t border-zinc-100 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || decision.trim().length < 3}
            onClick={() => onSubmit(decision.trim(), recommendation.trim(), transmit)}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {transmit ? <Send size={13} /> : <CheckCircle2 size={13} />}
            {transmit ? 'Délibérer & transmettre' : 'Enregistrer la décision'}
          </button>
        </div>
      </motion.div>
    </div>
  )
}

export default function DirectorDisciplinePage() {
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<DisciplineIncidentItem['status'] | ''>('')
  const [deliberating, setDeliberating] = useState<DisciplineIncidentItem | null>(null)
  const [form, setForm] = useState({
    studentQuery: '',
    studentId: '',
    classId: '',
    occurredAt: new Date().toISOString().slice(0, 10),
    severity: 'MINOR' as DisciplineSeverity,
    nature: '',
    description: '',
  })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const classesQuery = useQuery({
    queryKey: ['director', 'classes'],
    queryFn: () => directorsApi.myClasses(),
    staleTime: 60_000,
  })

  const listQuery = useQuery({
    queryKey: ['director', 'discipline', statusFilter],
    queryFn: () =>
      directorDisciplineApi.list({ limit: 50, ...(statusFilter ? { status: statusFilter } : {}) }),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorDisciplineApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'discipline'] }),
  })

  const deliberateMut = useMutation({
    mutationFn: ({ id, decision, recommendation, transmit }: { id: number; decision: string; recommendation: string; transmit: boolean }) =>
      directorDisciplineApi.deliberate(id, {
        decision,
        recommendation: recommendation || undefined,
        transmitToAdmin: transmit,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'discipline'] })
      setDeliberating(null)
    },
  })

  const items = listQuery.data?.items ?? []
  const classes = classesQuery.data ?? []
  const openCount = items.filter((i) => i.status === 'OPEN').length
  const severeCount = items.filter((i) => i.severity === 'SEVERE').length

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.studentId) {
      setErr('Indiquez l’identifiant de l’élève (matricule / ID interne).')
      return
    }
    if (form.nature.trim().length < 3 || form.description.trim().length < 3) {
      setErr('Nature et description sont requises.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        studentId: Number(form.studentId),
        classId: form.classId ? Number(form.classId) : undefined,
        occurredAt: form.occurredAt,
        severity: form.severity,
        nature: form.nature.trim(),
        description: form.description.trim(),
      })
      setOk(`Incident enregistré (#${created.id})`)
      setForm({
        studentQuery: '',
        studentId: '',
        classId: '',
        occurredAt: new Date().toISOString().slice(0, 10),
        severity: 'MINOR',
        nature: '',
        description: '',
      })
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Discipline élèves"
        subtitle="Incidents, délibérations et suivi disciplinaire de votre périmètre"
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
          <DirectorKpiCard label="Incidents" value={items.length} icon={ShieldAlert} tone="amber" />
          <DirectorKpiCard label="Ouverts" value={openCount} hint="En attente de délibération" icon={ShieldAlert} tone="amber" />
          <DirectorKpiCard label="Graves" value={severeCount} icon={Gavel} tone="indigo" />
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
              Nouvel incident
            </h2>

            <div>
              <label className="text-xs font-medium text-zinc-600">ID élève (matricule interne)</label>
              <input
                value={form.studentId}
                onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value.replace(/\D/g, '') }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                placeholder="Depuis la fiche élève"
                inputMode="numeric"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Classe (optionnel)</label>
              <select
                value={form.classId}
                onChange={(e) => setForm((f) => ({ ...f, classId: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
              >
                <option value="">—</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-zinc-600">Date</label>
                <input
                  type="date"
                  value={form.occurredAt}
                  onChange={(e) => setForm((f) => ({ ...f, occurredAt: e.target.value }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-zinc-600">Gravité</label>
                <select
                  value={form.severity}
                  onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as DisciplineSeverity }))}
                  className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
                >
                  <option value="MINOR">Mineur</option>
                  <option value="MAJOR">Majeur</option>
                  <option value="SEVERE">Grave</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Nature</label>
              <input
                value={form.nature}
                onChange={(e) => setForm((f) => ({ ...f, nature: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
                placeholder="Bagarre, indiscipline, fraude à l’examen…"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                rows={3}
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
              {createMut.isPending ? 'Enregistrement…' : 'Consigner l’incident'}
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
              <div className="flex gap-1 flex-wrap justify-end">
                {(['', 'OPEN', 'DELIBERATED', 'TRANSMITTED_TO_ADMIN', 'CLOSED'] as const).map((s) => (
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
                    {s ? STATUS_LABEL[s] : 'Tous'}
                  </button>
                ))}
              </div>
            </div>

            {listQuery.isLoading ? (
              <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
            ) : items.length === 0 ? (
              <DirectorEmptyState
                icon={ShieldAlert}
                title="Aucun incident"
                description="Les incidents disciplinaires de votre périmètre apparaîtront ici."
              />
            ) : (
              <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
                {items.map((item) => (
                  <li key={item.id} className="px-4 py-3 hover:bg-zinc-50/80">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <StatusBadge status={item.status} />
                          <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', SEVERITY_STYLE[item.severity])}>
                            {SEVERITY_LABEL[item.severity]}
                          </span>
                          <span className="text-[11px] text-zinc-400">
                            {new Date(item.occurredAt).toLocaleDateString('fr-FR')}
                          </span>
                        </div>
                        <p className="mt-1 text-sm font-semibold text-zinc-900">
                          {item.student ? `${item.student.lastName} ${item.student.firstName}` : `Élève #${item.studentId}`}
                          {item.className ? ` · ${item.className}` : ''}
                        </p>
                        <p className="text-xs text-zinc-500 mt-0.5">{item.nature}</p>
                        <p className="text-xs text-zinc-400 line-clamp-2 mt-0.5">{item.description}</p>
                        {item.decision && (
                          <p className="text-xs text-indigo-700 mt-1">Décision : {item.decision}</p>
                        )}
                      </div>
                      {item.status === 'OPEN' && (
                        <button
                          type="button"
                          onClick={() => setDeliberating(item)}
                          className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Gavel size={12} /> Délibérer
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </motion.div>
        </div>
      </div>

      {deliberating && (
        <DeliberationModal
          item={deliberating}
          busy={deliberateMut.isPending}
          onClose={() => setDeliberating(null)}
          onSubmit={(decision, recommendation, transmit) =>
            deliberateMut
              .mutateAsync({ id: deliberating.id, decision, recommendation, transmit })
              .catch((e) => setErr(getApiErrorMessage(e)))
          }
        />
      )}
    </div>
  )
}
