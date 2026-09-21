'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Handshake, RefreshCw, Plus, CheckCircle2, XCircle, FileBarChart2, Send } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import {
  directorOutreachApi,
  type MeetingStatus,
  type ReportPeriod,
  type ReportStatus,
} from '@/lib/admin/api/director-outreach.api'
import { directorsApi } from '@/lib/admin/api/directors.api'
import {
  DirectorPageHeader,
  DirectorEmptyState,
  DirectorKpiCard,
} from '@/components/director/director-ui'

const MEETING_LABEL: Record<MeetingStatus, string> = {
  SCHEDULED: 'Planifiée',
  HELD: 'Tenue',
  CANCELLED: 'Annulée',
}

const MEETING_STYLE: Record<MeetingStatus, string> = {
  SCHEDULED: 'bg-amber-50 text-amber-800',
  HELD: 'bg-emerald-50 text-emerald-700',
  CANCELLED: 'bg-zinc-100 text-zinc-500',
}

const REPORT_LABEL: Record<ReportStatus, string> = {
  DRAFT: 'Brouillon',
  FINALIZED: 'Finalisé',
  SUBMITTED: 'Envoyé EPSP',
}

const REPORT_STYLE: Record<ReportStatus, string> = {
  DRAFT: 'bg-zinc-100 text-zinc-700',
  FINALIZED: 'bg-sky-50 text-sky-700',
  SUBMITTED: 'bg-emerald-50 text-emerald-700',
}

function MeetingsTab() {
  const qc = useQueryClient()
  const [holding, setHolding] = useState<number | null>(null)
  const [minutes, setMinutes] = useState('')
  const [attendeeCount, setAttendeeCount] = useState('')
  const [form, setForm] = useState({ title: '', sectionId: '', scheduledAt: '', location: '', agenda: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const sectionsQuery = useQuery({
    queryKey: ['director', 'sections'],
    queryFn: () => directorsApi.mySections(),
    staleTime: 60_000,
  })

  const meetingsQuery = useQuery({
    queryKey: ['director', 'meetings'],
    queryFn: () => directorOutreachApi.listMeetings(),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorOutreachApi.createMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'meetings'] }),
  })

  const holdMut = useMutation({
    mutationFn: ({ id, minutes, attendeeCount }: { id: number; minutes: string; attendeeCount?: number }) =>
      directorOutreachApi.markMeetingHeld(id, { minutes, attendeeCount }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['director', 'meetings'] })
      setHolding(null)
      setMinutes('')
      setAttendeeCount('')
    },
  })

  const cancelMut = useMutation({
    mutationFn: directorOutreachApi.cancelMeeting,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'meetings'] }),
  })

  const sections = sectionsQuery.data ?? []
  const meetings = meetingsQuery.data ?? []
  const scheduledCount = meetings.filter((m) => m.status === 'SCHEDULED').length

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.title.trim() || !form.scheduledAt) {
      setErr('Titre et date sont requis.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        title: form.title.trim(),
        sectionId: form.sectionId ? Number(form.sectionId) : null,
        scheduledAt: form.scheduledAt,
        location: form.location.trim() || undefined,
        agenda: form.agenda.trim() || undefined,
      })
      setOk(`Réunion planifiée (#${created.id})`)
      setForm({ title: '', sectionId: '', scheduledAt: '', location: '', agenda: '' })
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        <DirectorKpiCard label="Réunions" value={meetings.length} icon={Handshake} tone="emerald" />
        <DirectorKpiCard label="Planifiées" value={scheduledCount} icon={Handshake} tone="amber" />
        <DirectorKpiCard
          label="Tenues"
          value={meetings.filter((m) => m.status === 'HELD').length}
          icon={CheckCircle2}
          tone="sky"
        />
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
            Planifier une réunion
          </h2>
          <div>
            <label className="text-xs font-medium text-zinc-600">Titre</label>
            <input
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              placeholder="Réunion parents — 1er trimestre"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Section (optionnel)</label>
            <select
              value={form.sectionId}
              onChange={(e) => setForm((f) => ({ ...f, sectionId: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              <option value="">Toute l’école</option>
              {sections.map((s) => (
                <option key={s.sectionId} value={s.sectionId}>
                  {s.section.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Date & heure</label>
            <input
              type="datetime-local"
              value={form.scheduledAt}
              onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Lieu (optionnel)</label>
            <input
              value={form.location}
              onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Ordre du jour (optionnel)</label>
            <textarea
              value={form.agenda}
              onChange={(e) => setForm((f) => ({ ...f, agenda: e.target.value }))}
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
            {createMut.isPending ? 'Enregistrement…' : 'Planifier'}
          </button>
        </motion.form>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
        >
          <div className="px-4 py-3 border-b border-zinc-100">
            <h2 className="text-sm font-semibold text-zinc-800">Historique ({meetings.length})</h2>
          </div>
          {meetingsQuery.isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : meetings.length === 0 ? (
            <DirectorEmptyState icon={Handshake} title="Aucune réunion" description="Planifiez une réunion de parents pour votre périmètre." />
          ) : (
            <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
              {meetings.map((m) => (
                <li key={m.id} className="px-4 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', MEETING_STYLE[m.status])}>
                          {MEETING_LABEL[m.status]}
                        </span>
                        <span className="text-[11px] text-zinc-400">
                          {new Date(m.scheduledAt).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' })}
                        </span>
                      </div>
                      <p className="mt-1 text-sm font-semibold text-zinc-900">{m.title}</p>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        {m.sectionName ? `Section · ${m.sectionName}` : 'Toute l’école'}
                        {m.location ? ` · ${m.location}` : ''}
                      </p>
                      {m.minutes && <p className="text-xs text-zinc-500 mt-1 line-clamp-2">Compte-rendu : {m.minutes}</p>}

                      {holding === m.id && (
                        <div className="mt-2 space-y-2 bg-zinc-50 rounded-lg p-3">
                          <textarea
                            value={minutes}
                            onChange={(e) => setMinutes(e.target.value)}
                            rows={2}
                            className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg"
                            placeholder="Compte-rendu de la réunion…"
                          />
                          <input
                            value={attendeeCount}
                            onChange={(e) => setAttendeeCount(e.target.value.replace(/\D/g, ''))}
                            className="w-full px-2 py-1.5 text-xs border border-zinc-200 rounded-lg"
                            placeholder="Nombre de participants (optionnel)"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={holdMut.isPending || minutes.trim().length < 3}
                              onClick={() =>
                                holdMut
                                  .mutateAsync({
                                    id: m.id,
                                    minutes: minutes.trim(),
                                    attendeeCount: attendeeCount ? Number(attendeeCount) : undefined,
                                  })
                                  .catch((e) => setErr(getApiErrorMessage(e)))
                              }
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                            >
                              Confirmer
                            </button>
                            <button
                              type="button"
                              onClick={() => setHolding(null)}
                              className="px-3 py-1.5 rounded-lg border border-zinc-200 text-xs text-zinc-600"
                            >
                              Annuler
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    {m.status === 'SCHEDULED' && holding !== m.id && (
                      <div className="flex flex-col gap-1 flex-shrink-0">
                        <button
                          type="button"
                          onClick={() => setHolding(m.id)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                        >
                          <CheckCircle2 size={12} /> Marquer tenue
                        </button>
                        <button
                          type="button"
                          onClick={() => cancelMut.mutateAsync(m.id).catch((e) => setErr(getApiErrorMessage(e)))}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-zinc-200 text-zinc-700 hover:bg-zinc-100"
                        >
                          <XCircle size={12} /> Annuler
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

function ReportsTab() {
  const qc = useQueryClient()
  const [form, setForm] = useState({ period: 'QUARTERLY' as ReportPeriod, from: '', to: '', summary: '' })
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const reportsQuery = useQuery({
    queryKey: ['director', 'reports'],
    queryFn: () => directorOutreachApi.listReports(),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: directorOutreachApi.createReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'reports'] }),
  })

  const finalizeMut = useMutation({
    mutationFn: directorOutreachApi.finalizeReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'reports'] }),
  })

  const submitMut = useMutation({
    mutationFn: directorOutreachApi.submitReport,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['director', 'reports'] }),
  })

  const reports = reportsQuery.data ?? []

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!form.from || !form.to || form.summary.trim().length < 3) {
      setErr('Période et synthèse sont requises.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        period: form.period,
        from: form.from,
        to: form.to,
        summary: form.summary.trim(),
      })
      setOk(`Rapport enregistré (#${created.id})`)
      setForm({ period: 'QUARTERLY', from: '', to: '', summary: '' })
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
          Nouveau rapport périodique
        </h2>
        <p className="text-[11px] text-zinc-400 -mt-2">
          Pour l’inspection EPSP — statut « Envoyé » atteste seulement que le rapport a été remis, pas d’envoi automatique.
        </p>
        <div>
          <label className="text-xs font-medium text-zinc-600">Période</label>
          <select
            value={form.period}
            onChange={(e) => setForm((f) => ({ ...f, period: e.target.value as ReportPeriod }))}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="MONTHLY">Mensuel</option>
            <option value="QUARTERLY">Trimestriel</option>
            <option value="SEMESTER">Semestriel</option>
            <option value="ANNUAL">Annuel</option>
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Du</label>
            <input
              type="date"
              value={form.from}
              onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-600">Au</label>
            <input
              type="date"
              value={form.to}
              onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-zinc-600">Synthèse</label>
          <textarea
            value={form.summary}
            onChange={(e) => setForm((f) => ({ ...f, summary: e.target.value }))}
            rows={4}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            placeholder="Effectifs, taux de présence, faits marquants…"
          />
        </div>
        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {ok && <p className="text-xs text-emerald-600">{ok}</p>}
        <button
          type="submit"
          disabled={createMut.isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
        >
          {createMut.isPending ? 'Enregistrement…' : 'Enregistrer (brouillon)'}
        </button>
      </motion.form>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="lg:col-span-3 rounded-2xl border border-zinc-200 bg-white overflow-hidden"
      >
        <div className="px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-800">Rapports ({reports.length})</h2>
        </div>
        {reportsQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
        ) : reports.length === 0 ? (
          <DirectorEmptyState icon={FileBarChart2} title="Aucun rapport" description="Vos rapports périodiques pour l’inspection apparaîtront ici." />
        ) : (
          <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
            {reports.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={cn('text-[11px] font-semibold px-2 py-0.5 rounded-full', REPORT_STYLE[r.status])}>
                        {REPORT_LABEL[r.status]}
                      </span>
                      <span className="text-[11px] text-zinc-400">
                        {new Date(r.from).toLocaleDateString('fr-FR')} → {new Date(r.to).toLocaleDateString('fr-FR')}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-600 mt-1 line-clamp-3">{r.summary}</p>
                  </div>
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    {r.status === 'DRAFT' && (
                      <button
                        type="button"
                        onClick={() => finalizeMut.mutateAsync(r.id).catch((e) => setErr(getApiErrorMessage(e)))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-sky-200 text-sky-700 hover:bg-sky-50"
                      >
                        <CheckCircle2 size={12} /> Finaliser
                      </button>
                    )}
                    {r.status === 'FINALIZED' && (
                      <button
                        type="button"
                        onClick={() => submitMut.mutateAsync(r.id).catch((e) => setErr(getApiErrorMessage(e)))}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                      >
                        <Send size={12} /> Marquer envoyé
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </motion.div>
    </div>
  )
}

export default function DirectorParentsInspectionPage() {
  const [tab, setTab] = useState<'meetings' | 'reports'>('meetings')

  return (
    <div className="min-h-screen bg-zinc-50">
      <DirectorPageHeader
        title="Parents & inspection"
        subtitle="Réunions de parents et rapports périodiques pour l’EPSP"
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
            onClick={() => setTab('meetings')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'meetings' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            Réunions parents
          </button>
          <button
            type="button"
            onClick={() => setTab('reports')}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              tab === 'reports' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'
            )}
          >
            Rapports EPSP
          </button>
        </div>
      </div>
      <div className="max-w-6xl mx-auto px-6 sm:px-8 py-6">
        {tab === 'meetings' ? <MeetingsTab /> : <ReportsTab />}
      </div>
    </div>
  )
}
