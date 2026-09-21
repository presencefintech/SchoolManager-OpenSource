'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, RefreshCw, Plus, CheckCircle2, XCircle, Forward, MessageSquare } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  directorStaffApi,
  type LeaveStatus,
  type TeacherNoteKind,
} from '@/lib/admin/api/director-staff.api'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

const LEAVE_LABEL: Record<LeaveStatus, string> = {
  REQUESTED: 'Demandé',
  APPROVED: 'Approuvé',
  REJECTED: 'Refusé',
  FORWARDED_TO_ADMIN: 'Transmis admin',
}

const LEAVE_STYLE: Record<LeaveStatus, string> = {
  REQUESTED: 'bg-amber-50 text-amber-800',
  APPROVED: 'bg-emerald-50 text-emerald-700',
  REJECTED: 'bg-red-50 text-red-700',
  FORWARDED_TO_ADMIN: 'bg-indigo-50 text-indigo-700',
}

const NOTE_LABEL: Record<TeacherNoteKind, string> = {
  OBSERVATION: 'Observation',
  WARNING: 'Avertissement',
  COMMENDATION: 'Félicitation',
}

const NOTE_STYLE: Record<TeacherNoteKind, string> = {
  OBSERVATION: 'bg-zinc-100 text-zinc-700',
  WARNING: 'bg-red-50 text-red-700',
  COMMENDATION: 'bg-emerald-50 text-emerald-700',
}

function LeavesTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ teacherId: '', fromDate: '', toDate: '', reason: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const teachersQuery = useQuery({
    queryKey: ['director', 'staff', 'teachers'],
    queryFn: () => directorStaffApi.myTeachers(),
    staleTime: 60_000,
  })

  const leavesQuery = useQuery({
    queryKey: ['director', 'staff', 'leaves'],
    queryFn: () => directorStaffApi.listLeaves(),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorStaffApi.createLeave,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'staff', 'leaves'] }),
  })

  const decideMut = useMutation({
    mutationFn: ({ id, decision, note }: { id: number; decision: 'APPROVED' | 'REJECTED' | 'FORWARDED_TO_ADMIN'; note?: string }) =>
      directorStaffApi.decideLeave(id, decision, note),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'staff', 'leaves'] }),
  })

  const teachers = teachersQuery.data ?? []
  const leaves = leavesQuery.data ?? []
  const pendingCount = leaves.filter((l) => l.status === 'REQUESTED').length

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.teacherId || !form.fromDate || !form.toDate) {
      setErr('Enseignant et dates sont requis.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        teacherId: Number(form.teacherId),
        fromDate: form.fromDate,
        toDate: form.toDate,
        reason: form.reason.trim(),
      })
      setOk(`Congé enregistré (#${created.id})`)
      setForm({ teacherId: '', fromDate: '', toDate: '', reason: '' })
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <DirectorKpiCard label="Enseignants" value={teachers.length} icon={Users} tone="emerald" />
        <DirectorKpiCard label="Congés" value={leaves.length} icon={CheckCircle2} tone="sky" />
        <DirectorKpiCard label="En attente" value={pendingCount} icon={MessageSquare} tone="amber" />
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
            Saisir une demande de congé
          </h2>
          <p className="text-[11px] text-zinc-400 -mt-2">
            Pas de portail enseignant : le directeur consigne la demande faite en personne.
          </p>
          <div>
            <label className="text-xs font-medium text-zinc-600">Enseignant</label>
            <select
              value={form.teacherId}
              onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              <option value="">— Sélectionner —</option>
              {teachers.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.firstName} {t.lastName}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-600">Du</label>
              <input
                type="date"
                value={form.fromDate}
                onChange={(e) => setForm((f) => ({ ...f, fromDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-600">Au</label>
              <input
                type="date"
                value={form.toDate}
                onChange={(e) => setForm((f) => ({ ...f, toDate: e.target.value }))}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Motif</label>
            <textarea
              value={form.reason}
              onChange={(e) => setForm((f) => ({ ...f, reason: e.target.value }))}
              rows={2}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              placeholder="Maladie, événement familial…"
            />
          </div>
          {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
          {ok && <p className="text-xs text-emerald-600">{ok}</p>}
          <button
            type="submit"
            disabled={createMut.isPending}
            className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
          >
            {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-800">Demandes ({leaves.length})</h2>
          </div>
          {leavesQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : leaves.length === 0 ? (
            <DirectorEmptyState icon={Users} title="Aucun congé" description="Les demandes de congé enseignant apparaîtront ici." />
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
              {leaves.map((l) => (
                <li key={l.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', LEAVE_STYLE[l.status])}>
                          {LEAVE_LABEL[l.status]}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(l.fromDate).toLocaleDateString('fr-FR')} → {new Date(l.toDate).toLocaleDateString('fr-FR')}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">
                        {l.teacher ? `${l.teacher.firstName} ${l.teacher.lastName}` : `Enseignant #${l.teacherId}`}
                      </p>
                      <p className="text-xs text-zinc-500 mt-0.5">{l.reason}</p>
                    </div>
                    {l.status === 'REQUESTED' && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => decideMut.mutateAsync({ id: l.id, decision: 'APPROVED' }).catch((e) => setErr(getApiErrorMessage(e)))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={12} /> Approuver
                        </button>
                        <button
                          type="button"
                          onClick={() => decideMut.mutateAsync({ id: l.id, decision: 'REJECTED' }).catch((e) => setErr(getApiErrorMessage(e)))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        >
                          <XCircle size={12} /> Refuser
                        </button>
                        <button
                          type="button"
                          onClick={() => decideMut.mutateAsync({ id: l.id, decision: 'FORWARDED_TO_ADMIN' }).catch((e) => setErr(getApiErrorMessage(e)))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                        >
                          <Forward size={12} /> Transmettre
                        </button>
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </motion.div>
      </div>
    </div>
  )
}

function NotesTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ teacherId: '', kind: 'OBSERVATION' as TeacherNoteKind, note: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const teachersQuery = useQuery({
    queryKey: ['director', 'staff', 'teachers'],
    queryFn: () => directorStaffApi.myTeachers(),
    staleTime: 60_000,
  })

  const notesQuery = useQuery({
    queryKey: ['director', 'staff', 'notes'],
    queryFn: () => directorStaffApi.listNotes(),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorStaffApi.createNote,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'staff', 'notes'] }),
  })

  const teachers = teachersQuery.data ?? []
  const notes = notesQuery.data ?? []

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.teacherId || form.note.trim().length < 3) {
      setErr('Enseignant et note sont requis.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        teacherId: Number(form.teacherId),
        kind: form.kind,
        note: form.note.trim(),
      })
      setOk(`Note enregistrée (#${created.id})`)
      setForm({ teacherId: '', kind: 'OBSERVATION', note: '' })
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <motion.form
        onSubmit={onSubmit}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-2 rounded-2xl border border-zinc-200 bg-white p-5 space-y-4 h-fit"
      >
        <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <Plus size={14} className="text-emerald-600" />
          Nouvelle note
        </h2>
        <div>
          <label className="text-xs font-medium text-zinc-600">Enseignant</label>
          <select
            value={form.teacherId}
            onChange={(e) => setForm((f) => ({ ...f, teacherId: e.target.value }))}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
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
          <label className="text-xs font-medium text-zinc-600">Type</label>
          <select
            value={form.kind}
            onChange={(e) => setForm((f) => ({ ...f, kind: e.target.value as TeacherNoteKind }))}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="OBSERVATION">Observation</option>
            <option value="WARNING">Avertissement</option>
            <option value="COMMENDATION">Félicitation</option>
          </select>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600">Note</label>
          <textarea
            value={form.note}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
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
          {createMut.isPending ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-800">Historique ({notes.length})</h2>
        </div>
        {notesQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
        ) : notes.length === 0 ? (
          <DirectorEmptyState icon={MessageSquare} title="Aucune note" description="Observations, avertissements et félicitations apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
            {notes.map((n) => (
              <li key={n.id} className="px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', NOTE_STYLE[n.kind])}>
                    {NOTE_LABEL[n.kind]}
                  </span>
                  <span className="text-[11px] text-zinc-400">
                    {new Date(n.createdAt).toLocaleDateString('fr-FR')}
                  </span>
                </div>
                <p className="text-sm text-zinc-800 mt-1">{n.note}</p>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  )
}

export default function DirectorPersonnelPage() {
  const [tab, setTab] = useState<'leaves' | 'notes'>('leaves')

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Personnel enseignant"
        subtitle="Suivi RH léger de votre équipe pédagogique — les décisions d’embauche restent Admin"
        actions={
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl border border-zinc-200 bg-white hover:bg-zinc-50"
          >
            <RefreshCw size={14} />
            Actualiser
          </button>
        }
      />
      <div className="max-w-6xl mx-auto px-6 sm:px-8 pt-6">
        <div className="inline-flex gap-1 p-1 bg-zinc-100 rounded-xl">
          <button
            type="button"
            onClick={() => setTab('leaves')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'leaves' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            Congés
          </button>
          <button
            type="button"
            onClick={() => setTab('notes')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'notes' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            Notes & évaluations
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
        {tab === 'leaves' ? <LeavesTab /> : <NotesTab />}
      </div>
    </div>
  )
}
