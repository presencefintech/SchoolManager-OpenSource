'use client'

import { useState } from 'react'
import { motion, type Variants } from 'framer-motion'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Users, TrendingUp, DollarSign, BookOpen, ToggleLeft, Download, UserPlus, ArrowRightLeft, Pencil, AlertTriangle } from 'lucide-react'

const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } },
} satisfies Variants
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }
import { useClassDetail, useClassStats, useClassAudit, useToggleClassStatus, useAssignStudents, useTransferStudents, useClasses, useEnrollmentsByClass, useUpdateClass, useClassConflicts, useStaff } from '@/lib/hooks/use-admin'
import { classesApi } from '@/lib/admin/api'
import { enrollmentsApi } from '@/lib/admin/api/enrollments.api'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { StudentMultiSelect } from '@/components/admin/shared/student-multi-select'
import type { ClassDetail } from '@/types/admin'
import { formatMoney } from '@/lib/finance/currency'
import { useAuth } from '@/providers/auth-provider'
import { isItDesk } from '@/types/auth'

function AssignModal({ classId, onClose }: { classId: number; onClose: () => void }) {
  const { mutateAsync, isPending } = useAssignStudents()
  const [studentIds, setStudentIds] = useState<number[]>([])
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!studentIds.length) { setError('Sélectionnez au moins un élève'); return }
    try {
      await mutateAsync({ classId, studentIds })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Affecter des élèves</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StudentMultiSelect
            studentIds={studentIds}
            onSelect={setStudentIds}
            label="Élèves à affecter"
            required
          />
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? 'En cours...' : 'Affecter'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function TransferModal({ classId, onClose }: { classId: number; onClose: () => void }) {
  const { mutateAsync, isPending } = useTransferStudents()
  const { data: classes = [] } = useClasses()
  const [studentIds, setStudentIds] = useState<number[]>([])
  const [targetClassId, setTargetClassId] = useState<number | ''>('')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!studentIds.length) { setError('Sélectionnez au moins un élève'); return }
    if (!targetClassId) { setError('Sélectionnez une classe cible'); return }
    try {
      await mutateAsync({ classId, studentIds, targetClassId: Number(targetClassId) })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Transférer des élèves</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <StudentMultiSelect
            studentIds={studentIds}
            onSelect={setStudentIds}
            label="Élèves à transférer"
            required
          />
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Classe de destination</label>
            <select
              required
              value={targetClassId}
              onChange={e => setTargetClassId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Sélectionner...</option>
              {classes.filter(c => c.id !== classId && c.isActive).map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-blue-600 text-sm text-white font-medium hover:bg-blue-700 disabled:opacity-50">
              {isPending ? 'Transfert...' : 'Transférer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function EditModal({ cls, onClose }: { cls: ClassDetail; onClose: () => void }) {
  const { mutateAsync, isPending } = useUpdateClass()
  const { data: staff = [] } = useStaff()
  const teachers = staff.filter((m: any) => m.role === 'TEACHER')
  const [name, setName] = useState(cls.name)
  const [capacity, setCapacity] = useState(cls.capacity ?? '')
  const [teacherId, setTeacherId] = useState<number | ''>(cls.teacherId ?? '')
  const [error, setError] = useState<string | null>(null)

  const { data: conflicts = [] } = useClassConflicts(teacherId ? Number(teacherId) : undefined)
  const hasConflicts = teacherId !== '' && Number(teacherId) !== cls.teacherId && conflicts.length > 0

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!name.trim()) { setError('Le nom est requis'); return }
    try {
      await mutateAsync({
        id: cls.id,
        payload: {
          name: name.trim(),
          capacity: capacity === '' ? undefined : Number(capacity),
          teacherId: teacherId === '' ? undefined : Number(teacherId),
        },
      })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Modifier la classe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nom</label>
            <input
              value={name}
              onChange={e => setName(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Capacité</label>
            <input
              type="number" min={0}
              value={capacity}
              onChange={e => setCapacity(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Enseignant</label>
            <select
              value={teacherId}
              onChange={e => setTeacherId(e.target.value === '' ? '' : Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            >
              <option value="">Aucun</option>
              {teachers.map((t: any) => (
                <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
              ))}
            </select>
            {hasConflicts && (
              <div className="flex items-start gap-2 mt-2 px-3 py-2 rounded-lg bg-amber-50 border border-amber-100">
                <AlertTriangle size={13} className="text-amber-500 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-amber-700">
                  Cet enseignant est déjà affecté à {conflicts.length} autre{conflicts.length > 1 ? 's' : ''} classe{conflicts.length > 1 ? 's' : ''} sur ce créneau.
                </p>
              </div>
            )}
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">Annuler</button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50">
              {isPending ? 'En cours...' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

type Tab = 'eleves' | 'stats' | 'audit'

export default function ClassDetailPage() {
  const { id } = useParams<{ id: string }>()
  const classId = Number(id)
  const router = useRouter()
  const { user } = useAuth()
  const deskOnly = isItDesk(user?.role)
  const [tab, setTab] = useState<Tab>('eleves')
  const [showAssign, setShowAssign] = useState(false)
  const [showTransfer, setShowTransfer] = useState(false)
  const [showEdit, setShowEdit] = useState(false)

  const { data: cls, isLoading } = useClassDetail(classId)
  const { data: stats } = useClassStats(classId, !deskOnly)
  const { data: audit = [] } = useClassAudit(classId, !deskOnly)
  const { data: students = [] } = useEnrollmentsByClass(classId)
  const { mutate: toggle } = useToggleClassStatus()

  function handleExport() {
    classesApi.exportClass(classId).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `liste-classe-${cls?.name ?? classId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleExportContacts() {
    classesApi.exportContacts(classId).then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `contacts-classe-${cls?.name ?? classId}.csv`
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  function handleClassCertificates() {
    enrollmentsApi.downloadClassCertificatesPdf(classId).then(({ blob, filename }) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    })
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-sm text-zinc-400">Chargement...</div>
      </div>
    )
  }

  if (!cls) {
    return (
      <div className="min-h-screen bg-zinc-50/50 flex items-center justify-center">
        <div className="text-sm text-zinc-400">Classe introuvable</div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-5xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-start gap-4"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <button onClick={() => router.back()} className="mt-1 p-2 rounded-xl hover:bg-zinc-100 transition-colors text-zinc-400">
            <ArrowLeft size={16} />
          </button>
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold text-zinc-900">{cls.name}</h1>
              {cls.level && (
                <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-600 font-medium">{cls.level}</span>
              )}
              <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cls.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                {cls.isActive ? 'Active' : 'Inactive'}
              </span>
            </div>
            {cls.description && <p className="text-sm text-zinc-500 mt-1">{cls.description}</p>}
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {!deskOnly && (
            <button onClick={() => setShowEdit(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Pencil size={12} />
              Modifier
            </button>
            )}
            <button onClick={() => setShowAssign(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <UserPlus size={12} />
              Affecter
            </button>
            <button onClick={() => setShowTransfer(true)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <ArrowRightLeft size={12} />
              Transférer
            </button>
            <button onClick={handleExport} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Download size={12} />
              Liste CSV
            </button>
            <button onClick={handleExportContacts} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <Users size={12} />
              Contacts
            </button>
            <button onClick={handleClassCertificates} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <BookOpen size={12} />
              Attestations
            </button>
            {!deskOnly && (
            <button onClick={() => toggle(classId)} className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 transition-colors">
              <ToggleLeft size={12} />
              {cls.isActive ? 'Désactiver' : 'Activer'}
            </button>
            )}
          </div>
        </motion.div>

        {/* Stats */}
        {!deskOnly && stats && (
          <motion.div className="grid grid-cols-4 gap-4" variants={stagger} initial="hidden" animate="show">
            {[
              { label: 'Élèves', value: stats.studentCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Taux présence', value: `${stats.attendanceRate?.toFixed(1) ?? 0}%`, icon: TrendingUp, color: 'text-emerald-600', bg: 'bg-emerald-50' },
              { label: 'Total dû', value: stats.totalDue ? formatMoney(stats.totalDue) : '—', icon: DollarSign, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Total payé', value: stats.totalPaid ? formatMoney(stats.totalPaid) : '—', icon: DollarSign, color: 'text-violet-600', bg: 'bg-violet-50' },
            ].map(({ label, value, icon: Icon, color, bg }) => (
              <motion.div key={label} variants={fadeUp} className="bg-white rounded-2xl border border-zinc-100 p-4 shadow-sm">
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center flex-shrink-0`}>
                    <Icon size={14} className={color} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs text-zinc-400">{label}</p>
                    <p className="text-lg font-bold text-zinc-900 truncate">{value}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 bg-zinc-100 p-1 rounded-xl w-fit">
          {(deskOnly
            ? ([['eleves', 'Élèves']] as [Tab, string][])
            : ([['eleves', 'Élèves'], ['stats', 'Statistiques'], ['audit', 'Audit']] as [Tab, string][])
          ).map(([t, label]) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${tab === t ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500 hover:text-zinc-700'}`}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {tab === 'eleves' && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {!students.length ? (
              <div className="p-12 text-center">
                <Users size={32} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-500">Aucun élève affecté à cette classe</p>
                <button onClick={() => setShowAssign(true)} className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">
                  <UserPlus size={14} /> Affecter des élèves
                </button>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-100 bg-zinc-50/50">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Nom</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Matricule</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {students.map(s => (
                    <tr key={s.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                      <td className="px-5 py-3 font-medium text-zinc-900">{formatStudentFullName(s)}</td>
                      <td className="px-5 py-3 text-zinc-500 font-mono text-xs">{s.matricule ?? '—'}</td>
                      <td className="px-5 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {s.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {tab === 'stats' && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm p-6">
            {stats ? (
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Présents aujourd'hui</p>
                  <p className="text-2xl font-bold text-emerald-600">{stats.presentToday ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Absents aujourd'hui</p>
                  <p className="text-2xl font-bold text-red-500">{stats.absentToday ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Balance financière</p>
                  <p className={`text-2xl font-bold ${(stats.balance ?? 0) < 0 ? 'text-red-500' : 'text-zinc-900'}`}>
                    {stats.balance != null ? formatMoney(stats.balance) : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-zinc-400 mb-1">Taux de présence</p>
                  <div className="flex items-end gap-2">
                    <p className="text-2xl font-bold text-zinc-900">{stats.attendanceRate?.toFixed(1) ?? 0}%</p>
                  </div>
                  <div className="mt-2 h-2 bg-zinc-100 rounded-full overflow-hidden">
                    <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${stats.attendanceRate ?? 0}%` }} />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-zinc-400 text-center py-8">Statistiques non disponibles</p>
            )}
          </div>
        )}

        {tab === 'audit' && (
          <div className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden">
            {!audit.length ? (
              <div className="p-12 text-center">
                <BookOpen size={32} className="mx-auto text-zinc-300 mb-3" />
                <p className="text-sm text-zinc-500">Aucun événement d'audit</p>
              </div>
            ) : (
              <div className="divide-y divide-zinc-50">
                {audit.map(entry => (
                  <div key={entry.id} className="px-5 py-3.5 flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-zinc-300 mt-1.5 flex-shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-zinc-700 uppercase tracking-wide">{entry.action}</span>
                        {((entry as any).actor?.firstName || entry.actor) && (
                          <span className="text-xs text-zinc-400">
                            par {(entry as any).actor?.firstName
                              ? `${(entry as any).actor.firstName} ${(entry as any).actor.lastName ?? ''}`.trim()
                              : entry.actor}
                          </span>
                        )}
                      </div>
                      {entry.description && <p className="text-xs text-zinc-500 mt-0.5">{entry.description}</p>}
                    </div>
                    <span className="text-xs text-zinc-400 flex-shrink-0">
                      {new Date(entry.createdAt).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {showAssign && <AssignModal classId={classId} onClose={() => setShowAssign(false)} />}
      {showTransfer && <TransferModal classId={classId} onClose={() => setShowTransfer(false)} />}
      {showEdit && cls && <EditModal cls={cls} onClose={() => setShowEdit(false)} />}
    </div>
  )
}
