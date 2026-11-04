'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { RefreshCw, BookOpen, QrCode, CheckCircle, XCircle, Clock, Phone, Mail } from 'lucide-react'
import { useTeacherDashboard, useTeacherScans, useForceValidatePresence, useUpdateTeacherClasses, useStaff, useTeacherPerformance, useTeacherDisciplinary, useAddTeacherDisciplinary } from '@/lib/hooks/use-admin'
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'

function ScanStatusIcon({ status }: { status: string }) {
  if (status === 'PRESENT') return <CheckCircle size={14} className="text-emerald-500" />
  if (status === 'ABSENT') return <XCircle size={14} className="text-red-400" />
  return <Clock size={14} className="text-yellow-500" />
}

function TeacherDetail({
  teacherId,
  teacherProfileId,
  onBack,
}: {
  teacherId: number
  teacherProfileId?: number | null
  onBack: () => void
}) {
  const toast = useToast()
  const { data: dashboard, isLoading: dashLoading } = useTeacherDashboard(teacherId)
  const { data: scans, isLoading: scansLoading } = useTeacherScans(teacherId)
  const forceValidate = useForceValidatePresence()
  const updateClasses = useUpdateTeacherClasses()
  const { data: performance, isLoading: perfLoading } = useTeacherPerformance(teacherProfileId)
  const { data: sanctions = [], isLoading: sanctionsLoading } = useTeacherDisciplinary(teacherProfileId)
  const addSanction = useAddTeacherDisciplinary(teacherProfileId)

  const [classInput, setClassInput] = useState('')
  const [sanctionType, setSanctionType] = useState<'WARNING' | 'BLAME' | 'SUSPENSION' | 'OTHER'>('WARNING')
  const [sanctionReason, setSanctionReason] = useState('')

  const teacher = dashboard?.teacher
  const stats = dashboard?.stats

  const handleForceValidate = (presenceId: number) => {
    forceValidate.mutate({ presenceId, status: 'PRESENT' })
  }

  const handleUpdateClasses = () => {
    const ids = classInput.split(',').map(s => Number(s.trim())).filter(Boolean)
    if (!ids.length) return
    updateClasses.mutate({ teacherId, classIds: ids }, { onSuccess: () => setClassInput('') })
  }

  const handleAddSanction = () => {
    if (!teacherProfileId || sanctionReason.trim().length < 8) {
      toast.error('Motif trop court', 'Indiquez au moins 8 caractères.')
      return
    }
    addSanction.mutate(
      {
        infractionDate: new Date().toISOString(),
        reason: sanctionReason.trim(),
        sanctionType,
      },
      {
        onSuccess: () => {
          toast.success('Sanction enregistrée')
          setSanctionReason('')
        },
        onError: (err) => toast.error('Échec', getApiErrorMessage(err)),
      },
    )
  }

  if (dashLoading) return <div className="p-6 text-center text-sm text-zinc-400">Chargement…</div>
  if (!dashboard) return <div className="p-6 text-center text-sm text-red-400">Enseignant introuvable</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-sm text-zinc-400 hover:text-zinc-600 transition-colors">← Retour</button>
        <h2 className="text-base font-semibold text-zinc-800">
          {teacher?.firstName} {teacher?.lastName}
          {teacher?.email && <span className="ml-2 text-sm font-normal text-zinc-400">{teacher.email}</span>}
        </h2>
      </div>

      {stats && (
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(stats).map(([key, val]) => (
            <div key={key} className="bg-white rounded-xl border border-zinc-200 p-4">
              <p className="text-xs text-zinc-500 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</p>
              <p className="text-xl font-bold text-zinc-900 mt-0.5">{String(val)}</p>
            </div>
          ))}
        </div>
      )}

      {teacherProfileId ? (
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="bg-white rounded-xl border border-zinc-200 p-4">
            <h3 className="text-sm font-semibold text-zinc-700 mb-3">Performance pédagogique</h3>
            {perfLoading ? (
              <p className="text-sm text-zinc-400">Chargement…</p>
            ) : performance ? (
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <dt className="text-xs text-zinc-500">Soumissions à temps</dt>
                  <dd className="font-semibold tabular-nums">
                    {performance.onTimeSubmissionRate != null
                      ? `${performance.onTimeSubmissionRate}%`
                      : '—'}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Fiches soumises</dt>
                  <dd className="font-semibold tabular-nums">{performance.submittedCount}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Approuvées 1er passage</dt>
                  <dd className="font-semibold tabular-nums">{performance.approvedFirstPass}</dd>
                </div>
                <div>
                  <dt className="text-xs text-zinc-500">Sanctions</dt>
                  <dd className="font-semibold tabular-nums">{performance.sanctionCount}</dd>
                </div>
              </dl>
            ) : (
              <p className="text-sm text-zinc-400">Données indisponibles</p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-zinc-200 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-zinc-700">Discipline</h3>
            {sanctionsLoading ? (
              <p className="text-sm text-zinc-400">Chargement…</p>
            ) : sanctions.length === 0 ? (
              <p className="text-sm text-zinc-400">Aucune sanction enregistrée</p>
            ) : (
              <ul className="space-y-2 max-h-36 overflow-y-auto text-sm">
                {sanctions.slice(0, 8).map((s) => (
                  <li key={s.id} className="rounded-lg bg-zinc-50 px-2.5 py-2">
                    <p className="font-medium text-zinc-800">{s.sanctionType}</p>
                    <p className="text-xs text-zinc-500 line-clamp-2">{s.reason}</p>
                  </li>
                ))}
              </ul>
            )}
            <div className="border-t border-zinc-100 pt-3 space-y-2">
              <select
                value={sanctionType}
                onChange={(e) => setSanctionType(e.target.value as typeof sanctionType)}
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              >
                <option value="WARNING">Avertissement</option>
                <option value="BLAME">Blâme</option>
                <option value="SUSPENSION">Suspension</option>
                <option value="OTHER">Autre</option>
              </select>
              <textarea
                value={sanctionReason}
                onChange={(e) => setSanctionReason(e.target.value)}
                placeholder="Motif (8 caractères min.)"
                rows={2}
                className="w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
              />
              <button
                type="button"
                disabled={addSanction.isPending}
                onClick={handleAddSanction}
                className="w-full rounded-lg bg-rose-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                Enregistrer une sanction
              </button>
            </div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
          Profil enseignant (Teacher.id) manquant — performance / discipline indisponibles.
        </p>
      )}

      {dashboard.classes?.length > 0 && (
        <div className="bg-white rounded-xl border border-zinc-200 p-4">
          <h3 className="text-sm font-semibold text-zinc-700 mb-3 flex items-center gap-1.5">
            <BookOpen size={14} /> Classes assignées
          </h3>
          <div className="flex flex-wrap gap-2">
            {dashboard.classes.map((c: { id: number; name: string }) => (
              <span key={c.id} className="text-xs px-2.5 py-1 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                {c.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-zinc-200 p-4">
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Modifier les classes</h3>
        <div className="flex gap-2">
          <input
            value={classInput}
            onChange={e => setClassInput(e.target.value)}
            placeholder="IDs séparés par des virgules (ex: 1,2,3)"
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          <button
            onClick={handleUpdateClasses}
            disabled={!classInput || updateClasses.isPending}
            className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            Mettre à jour
          </button>
        </div>
        {updateClasses.isSuccess && <p className="mt-1.5 text-xs text-emerald-600">Classes mises à jour</p>}
        {updateClasses.isError && <p className="mt-1.5 text-xs text-red-500">Erreur</p>}
      </div>

      <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-zinc-100 flex items-center gap-1.5">
          <QrCode size={14} className="text-zinc-400" />
          <h3 className="text-sm font-semibold text-zinc-700">Scans récents</h3>
        </div>
        {scansLoading ? (
          <div className="p-6 text-center text-sm text-zinc-400">Chargement…</div>
        ) : !scans?.length ? (
          <div className="p-6 text-center text-sm text-zinc-400">Aucun scan</div>
        ) : (
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-zinc-50 text-xs text-zinc-500 uppercase tracking-wide">
                <th className="px-4 py-2 text-left">Élève</th>
                <th className="px-4 py-2 text-left">Classe</th>
                <th className="px-4 py-2 text-left">Statut</th>
                <th className="px-4 py-2 text-left">Date</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {scans.map(s => (
                <tr key={s.id} className="hover:bg-zinc-50">
                  <td className="px-4 py-2.5 font-medium text-zinc-800">{s.studentName ?? `#${s.studentId}`}</td>
                  <td className="px-4 py-2.5 text-zinc-500">{s.className ?? '—'}</td>
                  <td className="px-4 py-2.5">
                    <span className="flex items-center gap-1"><ScanStatusIcon status={s.status} />{s.status}</span>
                  </td>
                  <td className="px-4 py-2.5 text-zinc-500 text-xs">
                    {s.scannedAt ? new Date(s.scannedAt).toLocaleString('fr') : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    {s.status !== 'PRESENT' && (
                      <button
                        onClick={() => handleForceValidate(s.id)}
                        disabled={forceValidate.isPending}
                        className="text-xs px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
                      >
                        Forcer présent
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>
    </div>
  )
}

function TeacherCard({ teacher, onSelect }: { teacher: { id: number; userId: number; firstName?: string; lastName?: string; email?: string; classes?: { id: number; name: string }[] }; onSelect: () => void }) {
  return (
    <div
      onClick={onSelect}
      className="bg-white rounded-xl border border-zinc-200 p-4 cursor-pointer hover:shadow-sm hover:border-zinc-300 transition-all"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="font-medium text-zinc-800 text-sm">{teacher.firstName} {teacher.lastName}</p>
          {teacher.email && <p className="text-xs text-zinc-400 mt-0.5">{teacher.email}</p>}
        </div>
        <span className="text-xs text-zinc-400">#{teacher.userId}</span>
      </div>
      {teacher.classes?.length ? (
        <div className="mt-3 flex flex-wrap gap-1">
          {teacher.classes.slice(0, 3).map((c: { id: number; name: string }) => (
            <span key={c.id} className="text-[11px] px-2 py-0.5 bg-zinc-100 text-zinc-500 rounded-full">{c.name}</span>
          ))}
          {teacher.classes.length > 3 && (
            <span className="text-[11px] px-2 py-0.5 text-zinc-400">+{teacher.classes.length - 3}</span>
          )}
        </div>
      ) : (
        <p className="mt-2 text-xs text-zinc-300">Aucune classe assignée</p>
      )}
    </div>
  )
}

export default function TeachersPage() {
  const { user } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const [selectedProfileId, setSelectedProfileId] = useState<number | null>(null)
  const [selectValue, setSelectValue] = useState('')
  const { data: staff, isLoading: staffLoading } = useStaff()
  const teachers = (staff ?? []).filter(s => s.role === 'TEACHER')

  if (!deskOnly && selectedId) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <TeacherDetail
          teacherId={selectedId}
          teacherProfileId={selectedProfileId}
          onBack={() => {
            setSelectedId(null)
            setSelectedProfileId(null)
            setSelectValue('')
          }}
        />
      </div>
    )
  }

  const handleLoad = () => {
    const id = Number(selectValue)
    if (!id) return
    const member = teachers.find((t) => t.id === id)
    setSelectedId(id)
    setSelectedProfileId(member?.teacherProfileId ?? null)
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-xl font-bold text-zinc-900">Enseignants</h1>
        <p className="text-sm text-zinc-500 mt-0.5">
          {deskOnly ? 'Annuaire de contact du secrétariat' : 'Support et gestion des enseignants'}
        </p>
      </motion.div>

      {deskOnly ? (
        staffLoading ? (
          <p className="text-sm text-zinc-400">Chargement…</p>
        ) : teachers.length === 0 ? (
          <div className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 text-center">
            <BookOpen size={32} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-500">Aucun enseignant trouvé dans l&apos;établissement.</p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-3">
            {teachers.map((t) => (
              <div key={t.id} className="bg-white rounded-xl border border-zinc-200 p-4">
                <p className="font-medium text-zinc-800 text-sm">
                  {t.firstName ?? ''} {t.lastName ?? ''}
                </p>
                {t.email && (
                  <p className="text-xs text-zinc-500 mt-1.5 inline-flex items-center gap-1.5">
                    <Mail size={12} /> {t.email}
                  </p>
                )}
                {t.phone && (
                  <p className="text-xs text-zinc-500 mt-1 inline-flex items-center gap-1.5">
                    <Phone size={12} /> {t.phone}
                  </p>
                )}
              </div>
            ))}
          </div>
        )
      ) : (
      <motion.div
        className="bg-white rounded-xl border border-zinc-200 p-4"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, delay: 0.08 }}
      >
        <h3 className="text-sm font-semibold text-zinc-700 mb-3">Accéder au dashboard d&apos;un enseignant</h3>
        <div className="flex gap-2">
          <select
            value={selectValue}
            onChange={e => setSelectValue(e.target.value)}
            disabled={staffLoading}
            className="flex-1 px-3 py-2 text-sm border border-zinc-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            <option value="">
              {staffLoading ? 'Chargement…' : teachers.length === 0 ? 'Aucun enseignant' : '— Sélectionner un enseignant —'}
            </option>
            {teachers.map(t => (
              <option key={t.id} value={String(t.id)}>
                {t.firstName ?? ''} {t.lastName ?? ''}{t.email ? ` (${t.email})` : ''}
              </option>
            ))}
          </select>
          <button
            onClick={handleLoad}
            disabled={!selectValue}
            className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={14} />
            Charger
          </button>
        </div>
      </motion.div>
      )}

      {!deskOnly && teachers.length === 0 && !staffLoading && (
        <motion.div
          className="bg-zinc-50 rounded-xl border border-zinc-200 p-6 text-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.16 }}
        >
          <BookOpen size={32} className="mx-auto text-zinc-300 mb-2" />
          <p className="text-sm text-zinc-500">Aucun enseignant trouvé dans l&apos;établissement.</p>
        </motion.div>
      )}
    </div>
  )
}
