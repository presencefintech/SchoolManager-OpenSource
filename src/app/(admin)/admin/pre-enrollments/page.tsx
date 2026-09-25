'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import { Plus, RefreshCw, Search, UserPlus, CheckCircle2, XCircle, Clock } from 'lucide-react'
import {
  usePreEnrollments,
  useCreatePreEnrollment,
  useUpdatePreEnrollmentStatus,
  useSchoolSections,
  useSchoolOptions,
  useSchoolClasses,
} from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import { cn } from '@/lib/utils'
import type {
  CreatePreEnrollmentPayload,
  PreEnrollmentRecord,
  PreEnrollmentStatus,
} from '@/types/pre-enrollment'
import {
  PRE_ENROLLMENT_STATUS_CLASSES,
  PRE_ENROLLMENT_STATUS_LABELS,
} from '@/types/pre-enrollment'
import { formatRdcFullName, formatStudentFullName } from '@/lib/utils/student-name.util'
import { findSectionById, sectionRequiresOption } from '@/lib/academic/rdc-section-cycle'

const STATUS_FILTERS: { value: '' | PreEnrollmentStatus; label: string }[] = [
  { value: '', label: 'Tous' },
  { value: 'PENDING', label: 'En attente' },
  { value: 'UNDER_REVIEW', label: 'En revue' },
  { value: 'APPROVED', label: 'Approuvées' },
  { value: 'COMPLETED', label: 'Finalisées' },
  { value: 'REJECTED', label: 'Rejetées' },
]

const NEXT_ACTIONS: Partial<Record<PreEnrollmentStatus, { status: PreEnrollmentStatus; label: string; tone: 'primary' | 'danger' | 'neutral' }[]>> = {
  PENDING: [
    { status: 'UNDER_REVIEW', label: 'Mettre en revue', tone: 'neutral' },
    { status: 'APPROVED', label: 'Approuver', tone: 'primary' },
    { status: 'REJECTED', label: 'Rejeter', tone: 'danger' },
  ],
  UNDER_REVIEW: [
    { status: 'APPROVED', label: 'Approuver', tone: 'primary' },
    { status: 'REJECTED', label: 'Rejeter', tone: 'danger' },
    { status: 'PENDING', label: 'Revenir en attente', tone: 'neutral' },
  ],
  APPROVED: [
    { status: 'COMPLETED', label: 'Finaliser (créer élève)', tone: 'primary' },
    { status: 'REJECTED', label: 'Rejeter', tone: 'danger' },
  ],
}

function currentAcademicYear(): string {
  const y = new Date().getFullYear()
  return `${y}-${y + 1}`
}

function CreatePreEnrollmentModal({ onClose }: { onClose: () => void }) {
  const toast = useToast()
  const create = useCreatePreEnrollment()
  const { data: sections = [] } = useSchoolSections()
  const [sectionId, setSectionId] = useState(0)
  const [optionId, setOptionId] = useState(0)
  const [classroomId, setClassroomId] = useState(0)
  const [academicYear, setAcademicYear] = useState(currentAcademicYear())
  const { data: options = [] } = useSchoolOptions(sectionId)
  const selectedSection = findSectionById(sections, sectionId)
  const requiresOption = sectionRequiresOption(selectedSection)
  const { data: classes = [] } = useSchoolClasses(
    sectionId,
    requiresOption ? optionId : undefined,
    academicYear,
  )
  const [form, setForm] = useState({
    lastName: '',
    postnom: '',
    firstName: '',
    prenom: '',
    gender: 'M' as 'M' | 'F',
    dateOfBirth: '',
    placeOfBirth: '',
    nationality: 'Congolaise',
    parentPhone: '',
    parentEmail: '',
    emergencyContactName: '',
    emergencyContactPhone: '',
    bloodGroup: '',
    allergies: '',
    medicalNotes: '',
  })
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    setOptionId(0)
    setClassroomId(0)
  }, [sectionId])

  useEffect(() => {
    setClassroomId(0)
  }, [optionId])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!sectionId || !classroomId) {
      setError('Sélectionnez une section et une classe')
      return
    }
    if (requiresOption && !optionId) {
      setError('Sélectionnez une option / filière pour ce cycle')
      return
    }
    setError(null)
    const payload: CreatePreEnrollmentPayload = {
      studentInfo: {
        lastName: form.lastName.trim(),
        postnom: form.postnom.trim(),
        firstName: form.firstName.trim(),
        ...(form.prenom.trim() ? { prenom: form.prenom.trim() } : {}),
        gender: form.gender,
        ...(form.dateOfBirth.trim() ? { dateOfBirth: form.dateOfBirth } : {}),
        placeOfBirth: form.placeOfBirth.trim(),
        nationality: form.nationality.trim() || 'Congolaise',
        parentPhone: form.parentPhone.trim(),
        parentEmail: form.parentEmail.trim() || undefined,
        emergencyContactName: form.emergencyContactName.trim(),
        emergencyContactPhone: form.emergencyContactPhone.trim(),
        bloodGroup: form.bloodGroup.trim() || undefined,
        allergies: form.allergies.trim() || undefined,
        medicalNotes: form.medicalNotes.trim() || undefined,
        preferredLanguage: 'fr',
      },
      academicChoices: {
        sectionId,
        ...(optionId > 0 ? { optionId } : {}),
      },
      academicYear,
      classroomId,
    }
    try {
      await create.mutateAsync(payload)
      toast.success('Demande créée', 'La pré-inscription a été enregistrée.')
      onClose()
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  const inputCls = 'w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-zinc-100 bg-white px-6 py-4">
          <h2 className="text-lg font-semibold text-zinc-900">Nouvelle pré-inscription</h2>
          <button type="button" onClick={onClose} className="text-zinc-400 hover:text-zinc-600">✕</button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 p-6">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Nom *</label>
              <input required className={inputCls} value={form.lastName} onChange={(e) => setForm((p) => ({ ...p, lastName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Postnom *</label>
              <input required className={inputCls} value={form.postnom} onChange={(e) => setForm((p) => ({ ...p, postnom: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Prénom *</label>
              <input required className={inputCls} value={form.firstName} onChange={(e) => setForm((p) => ({ ...p, firstName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Prénom admin (opt.)</label>
              <input className={inputCls} value={form.prenom} onChange={(e) => setForm((p) => ({ ...p, prenom: e.target.value }))} placeholder="Si différent du prénom" />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Genre *</label>
              <select required className={inputCls} value={form.gender} onChange={(e) => setForm((p) => ({ ...p, gender: e.target.value as 'M' | 'F' }))}>
                <option value="M">Masculin</option>
                <option value="F">Féminin</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Date de naissance</label>
              <input type="date" className={inputCls} value={form.dateOfBirth} onChange={(e) => setForm((p) => ({ ...p, dateOfBirth: e.target.value }))} />
              <p className="text-[11px] text-zinc-400 mt-1">Optionnel</p>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-medium text-zinc-500">Lieu de naissance *</label>
              <input required className={inputCls} value={form.placeOfBirth} onChange={(e) => setForm((p) => ({ ...p, placeOfBirth: e.target.value }))} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Section *</label>
              <select required className={inputCls} value={sectionId || ''} onChange={(e) => setSectionId(Number(e.target.value))}>
                <option value="">—</option>
                {sections.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </div>
            {requiresOption && (
            <div>
              <label className="text-xs font-medium text-zinc-500">Option *</label>
              <select
                required
                className={inputCls}
                value={optionId || ''}
                onChange={(e) => setOptionId(Number(e.target.value))}
                disabled={!sectionId}
              >
                <option value="">— Choisir une filière —</option>
                {options.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
              </select>
            </div>
            )}
            <div>
              <label className="text-xs font-medium text-zinc-500">Classe *</label>
              <select
                required
                className={inputCls}
                value={classroomId || ''}
                onChange={(e) => setClassroomId(Number(e.target.value))}
                disabled={!sectionId || (requiresOption && !optionId)}
              >
                <option value="">—</option>
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-zinc-500">Tél. parent *</label>
              <input required className={inputCls} value={form.parentPhone} onChange={(e) => setForm((p) => ({ ...p, parentPhone: e.target.value }))} placeholder="+243..." />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Email parent</label>
              <input type="email" className={inputCls} value={form.parentEmail} onChange={(e) => setForm((p) => ({ ...p, parentEmail: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Contact urgence *</label>
              <input required className={inputCls} value={form.emergencyContactName} onChange={(e) => setForm((p) => ({ ...p, emergencyContactName: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-medium text-zinc-500">Tél. urgence *</label>
              <input required className={inputCls} value={form.emergencyContactPhone} onChange={(e) => setForm((p) => ({ ...p, emergencyContactPhone: e.target.value }))} />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="rounded-xl border border-zinc-200 px-4 py-2 text-sm text-zinc-600">Annuler</button>
            <button type="submit" disabled={create.isPending} className="rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50">
              {create.isPending ? 'Enregistrement…' : 'Créer la demande'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function StatusBadge({ status }: { status: PreEnrollmentStatus }) {
  return (
    <span className={cn('text-xs font-medium px-2 py-0.5 rounded-full', PRE_ENROLLMENT_STATUS_CLASSES[status])}>
      {PRE_ENROLLMENT_STATUS_LABELS[status]}
    </span>
  )
}

export default function PreEnrollmentsPage() {
  return (
    <Suspense fallback={null}>
      <PreEnrollmentsPageContent />
    </Suspense>
  )
}

function PreEnrollmentsPageContent() {
  const toast = useToast()
  const searchParams = useSearchParams()
  const [statusFilter, setStatusFilter] = useState<'' | PreEnrollmentStatus>('PENDING')
  const [search, setSearch] = useState('')
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [reviewComment, setReviewComment] = useState('')

  const { data, isLoading, refetch, isFetching } = usePreEnrollments({
    status: statusFilter || undefined,
    limit: 50,
  })
  const updateStatus = useUpdatePreEnrollmentStatus()

  const items = useMemo(() => data?.data ?? [], [data])

  useEffect(() => {
    const focus = searchParams.get('focus')
    if (focus) setSelectedId(Number(focus))
  }, [searchParams])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return items
    return items.filter((item) => {
      const info = item.studentInfo
      const haystack = [
        info.lastName,
        info.postnom,
        info.firstName,
        info.prenom,
        info.parentPhone,
        info.emergencyContactName,
        item.academicChoices.sectionName,
        item.academicChoices.optionName,
        item.class?.name,
      ].filter(Boolean).join(' ').toLowerCase()
      return haystack.includes(q)
    })
  }, [items, search])

  const selected = filtered.find((i) => i.id === selectedId) ?? items.find((i) => i.id === selectedId) ?? null

  async function handleStatusChange(item: PreEnrollmentRecord, status: PreEnrollmentStatus) {
    if (status === 'REJECTED' && !reviewComment.trim()) {
      toast.warning('Commentaire requis', 'Indiquez le motif du rejet.')
      return
    }
    try {
      await updateStatus.mutateAsync({
        id: item.id,
        status,
        comment: reviewComment.trim() || undefined,
      })
      toast.success('Statut mis à jour', PRE_ENROLLMENT_STATUS_LABELS[status])
      setReviewComment('')
    } catch (err) {
      toast.error('Échec', getApiErrorMessage(err))
    }
  }

  const stats = useMemo(() => ({
    total: items.length,
    pending: items.filter((i) => i.status === 'PENDING').length,
    approved: items.filter((i) => i.status === 'APPROVED').length,
  }), [items])

  return (
    <div className="px-8 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Pré-inscriptions</h1>
          <p className="text-sm text-zinc-500 mt-0.5">Demandes web — validation et finalisation</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            <RefreshCw size={14} className={isFetching ? 'animate-spin' : ''} />
            Actualiser
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-3 py-2 text-sm font-medium text-white hover:bg-indigo-700"
          >
            <Plus size={14} />
            Nouvelle demande
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-amber-100 bg-amber-50/60 px-4 py-3 text-sm text-amber-900">
        Les dossiers soumis depuis l&apos;app parent apparaissent dans la{' '}
        <Link href="/admin/inbox?kind=PENDING_ENROLLMENT" className="font-semibold underline underline-offset-2">
          boîte d&apos;entrée
        </Link>
        {' '}ou sous{' '}
        <Link href="/admin/enrollments?status=PENDING_ENROLLMENT" className="font-semibold underline underline-offset-2">
          Inscriptions → Pré-inscription parent
        </Link>
        .
      </div>

      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <p className="text-xs text-zinc-500">Affichées</p>
          <p className="text-2xl font-bold text-zinc-900">{stats.total}</p>
        </div>
        <div className="rounded-xl border border-amber-100 bg-amber-50/50 p-4">
          <p className="text-xs text-amber-700">En attente</p>
          <p className="text-2xl font-bold text-amber-800">{stats.pending}</p>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-4">
          <p className="text-xs text-emerald-700">Approuvées</p>
          <p className="text-2xl font-bold text-emerald-800">{stats.approved}</p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 rounded-xl bg-zinc-100 p-1">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.value || 'all'}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-medium transition-colors',
                statusFilter === f.value ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher un candidat…"
            className="w-full rounded-xl border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
          ) : filtered.length === 0 ? (
            <div className="py-16 text-center">
              <Clock size={28} className="mx-auto text-zinc-200 mb-2" />
              <p className="text-sm text-zinc-400">Aucune demande pour ce filtre</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Candidat</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Scolarité</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Soumis</th>
                  <th className="px-5 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-400">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {filtered.map((item) => (
                  <tr
                    key={item.id}
                    onClick={() => setSelectedId(item.id)}
                    className={cn(
                      'cursor-pointer hover:bg-zinc-50 transition-colors',
                      selectedId === item.id && 'bg-indigo-50/40',
                    )}
                  >
                    <td className="px-5 py-3">
                      <p className="text-sm font-medium text-zinc-900">
                        {formatRdcFullName(item.studentInfo)}
                      </p>
                      <p className="text-xs text-zinc-400">{formatStudentFullName(item.studentInfo)} · {item.studentInfo.parentPhone}</p>
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-600">
                      {item.academicChoices.sectionName ?? `Section #${item.academicChoices.sectionId}`}
                      {' · '}
                      {item.academicChoices.optionName
                        ?? (item.academicChoices.optionId
                          ? `Option #${item.academicChoices.optionId}`
                          : '—')}
                      {item.class?.name ? ` · ${item.class.name}` : ''}
                    </td>
                    <td className="px-5 py-3 text-sm text-zinc-400">
                      {new Date(item.createdAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-5 py-3">
                      <StatusBadge status={item.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}
        </div>

        <aside className="rounded-xl border border-zinc-200 bg-white h-fit">
          <div className="border-b border-zinc-100 px-5 py-4">
            <h2 className="text-sm font-semibold text-zinc-800">Détail & décision</h2>
          </div>
          {!selected ? (
            <p className="p-8 text-center text-sm text-zinc-500">Sélectionnez une demande</p>
          ) : (
            <div className="space-y-4 p-5">
              <div>
                <p className="text-base font-semibold text-zinc-900">
                  {formatRdcFullName(selected.studentInfo)}
                </p>
                <p className="text-xs text-zinc-500">{formatStudentFullName(selected.studentInfo)}</p>
                <div className="mt-2"><StatusBadge status={selected.status} /></div>
              </div>

              <dl className="space-y-2 text-xs">
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Naissance</dt><dd className="text-zinc-800">{selected.studentInfo.placeOfBirth}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Parent</dt><dd className="text-zinc-800">{selected.studentInfo.parentPhone}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Urgence</dt><dd className="text-zinc-800">{selected.studentInfo.emergencyContactName}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Section</dt><dd className="text-zinc-800">{selected.academicChoices.sectionName ?? selected.academicChoices.sectionId}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Option</dt><dd className="text-zinc-800">{selected.academicChoices.optionName ?? selected.academicChoices.optionId ?? '—'}</dd></div>
                <div className="flex justify-between gap-2"><dt className="text-zinc-500">Classe</dt><dd className="text-zinc-800">{selected.class?.name ?? (selected.classroomId ? `#${selected.classroomId}` : '—')}</dd></div>
              </dl>

              {selected.comment && (
                <div className="rounded-lg bg-amber-50 border border-amber-100 px-3 py-2 text-xs text-amber-800">
                  {selected.comment}
                </div>
              )}

              {(NEXT_ACTIONS[selected.status] ?? []).length > 0 && (
                <div className="space-y-2 pt-2 border-t border-zinc-100">
                  <label className="block text-xs font-medium text-zinc-500">Note / motif</label>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    rows={2}
                    className="w-full rounded-xl border border-zinc-200 bg-zinc-50/80 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-400/40"
                    placeholder="Obligatoire pour un rejet"
                  />
                  <div className="flex flex-wrap gap-2">
                    {(NEXT_ACTIONS[selected.status] ?? []).map((action) => (
                      <button
                        key={action.status}
                        disabled={updateStatus.isPending}
                        onClick={() => handleStatusChange(selected, action.status)}
                        className={cn(
                          'inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50',
                          action.tone === 'primary' && 'bg-emerald-600 text-white hover:bg-emerald-700',
                          action.tone === 'danger' && 'bg-red-50 text-red-700 hover:bg-red-100',
                          action.tone === 'neutral' && 'bg-zinc-100 text-zinc-700 hover:bg-zinc-200',
                        )}
                      >
                        {action.tone === 'primary' && <CheckCircle2 size={12} />}
                        {action.tone === 'danger' && <XCircle size={12} />}
                        {action.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </aside>
      </div>

      {showCreate && <CreatePreEnrollmentModal onClose={() => setShowCreate(false)} />}
    </div>
  )
}
