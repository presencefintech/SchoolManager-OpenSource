'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { ArrowLeft, ArrowRightLeft, ArchiveRestore, Copy, Loader2, Trash2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import {
  useDuplicateStudents,
  useArchivedStudents,
  useMergePreview,
  useMergeStudents,
  useRestoreStudent,
} from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import type { DuplicateCandidate, DuplicatePair } from '@/lib/admin/api/students.api'

type Tab = 'duplicates' | 'archived'

const THRESHOLDS = [
  { value: 1, label: 'Noms identiques' },
  { value: 0.85, label: 'Très proches (85 %)' },
  { value: 0.75, label: 'Proches (75 %)' },
]

const REASON_LABEL: Record<DuplicatePair['reason'], string> = {
  EXACT_NAME: 'Même nom',
  SIMILAR_NAME: 'Nom très proche',
  SAME_PHONE_AND_BIRTH: 'Même téléphone + naissance',
}

const TABLE_LABEL: Record<string, string> = {
  Payment: 'Paiements',
  Presence: 'Présences',
  Enrollment: 'Inscriptions',
  Invoice: 'Factures',
  ParentStudent: 'Liens parents',
  StudentFeeAssignment: 'Frais assignés',
  StudentBalanceHistory: 'Historique de solde',
  Moratorium: 'Moratoires',
  Scholarship: 'Bourses',
  PaymentIntent: 'Intentions de paiement',
  PaymentDeclaration: 'Déclarations de paiement',
  AttendanceSheetLine: 'Feuilles de présence',
  DisciplinaryAction: 'Sanctions',
  AssignmentSubmission: 'Devoirs rendus',
  QuizSubmission: 'Quiz rendus',
  Notification: 'Notifications',
}

function fmtDate(iso: string | null | undefined) {
  if (!iso) return '—'
  const d = new Date(iso)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleDateString('fr-FR')
}

function fullName(s: Pick<DuplicateCandidate, 'firstName' | 'lastName' | 'postnom'>) {
  return formatStudentFullName({ firstName: s.firstName, lastName: s.lastName, postnom: s.postnom })
}

function StudentCard({
  s,
  role,
}: {
  s: DuplicateCandidate
  role?: 'principale' | 'secondaire'
}) {
  return (
    <div
      className={cn(
        'rounded-xl border p-4 space-y-1.5 text-sm',
        role === 'principale' && 'border-emerald-300 bg-emerald-50/50',
        role === 'secondaire' && 'border-amber-300 bg-amber-50/50',
        !role && 'border-zinc-200 bg-white',
      )}
    >
      {role && (
        <span
          className={cn(
            'inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full',
            role === 'principale' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700',
          )}
        >
          {role === 'principale' ? 'Fiche principale (conservée)' : 'Fiche secondaire (archivée)'}
        </span>
      )}
      <p className="font-semibold text-zinc-900">{fullName(s)}</p>
      <dl className="grid grid-cols-[88px_1fr] gap-x-2 gap-y-0.5 text-xs text-zinc-600">
        <dt className="text-zinc-400">Matricule</dt>
        <dd className="font-mono">{s.matricule}</dd>
        <dt className="text-zinc-400">Classe</dt>
        <dd>{s.class?.name ?? '—'}</dd>
        <dt className="text-zinc-400">Sexe</dt>
        <dd>{s.gender ?? '—'}</dd>
        <dt className="text-zinc-400">Naissance</dt>
        <dd>{fmtDate(s.dateOfBirth)}</dd>
        <dt className="text-zinc-400">Téléphone</dt>
        <dd>{s.emergencyContactPhone ?? '—'}</dd>
        <dt className="text-zinc-400">Créée le</dt>
        <dd>{fmtDate(s.createdAt)}</dd>
      </dl>
    </div>
  )
}

function MergeDialog({
  target,
  source,
  onClose,
}: {
  target: DuplicateCandidate
  source: DuplicateCandidate
  onClose: () => void
}) {
  const toast = useToast()
  const { data: preview, isLoading } = useMergePreview(target.id, source.id)
  const mergeMutation = useMergeStudents()
  const moves = Object.entries(preview?.willMove ?? {})

  async function confirm() {
    try {
      const res = await mergeMutation.mutateAsync({ targetId: target.id, sourceId: source.id })
      const movedTotal = Object.values(res.summary).reduce((n, v) => n + v.moved, 0)
      toast.success('Fiches fusionnées', `${movedTotal} élément(s) rattaché(s) à ${fullName(target)}.`)
      onClose()
    } catch (error) {
      toast.error('Fusion impossible', getApiErrorMessage(error))
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl p-6 space-y-4 max-h-[90vh] overflow-y-auto" role="dialog" aria-modal="true">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Confirmer la fusion</h3>
            <p className="text-sm text-zinc-500 mt-1">
              Tout le contenu de la fiche secondaire est rattaché à la fiche principale, puis la secondaire est archivée.
              Elle reste restaurable depuis la corbeille.
            </p>
          </div>
          <button onClick={onClose} className="p-1 text-zinc-400 hover:text-zinc-700" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>

        <div className="grid sm:grid-cols-[1fr_auto_1fr] gap-3 items-center">
          <StudentCard s={target} role="principale" />
          <ArrowRightLeft size={18} className="text-zinc-300 hidden sm:block rotate-180" />
          <StudentCard s={source} role="secondaire" />
        </div>

        <div className="rounded-xl bg-zinc-50 border border-zinc-100 p-3 text-xs text-zinc-600">
          <p className="font-medium text-zinc-700 mb-1">Éléments qui seront déplacés vers la fiche principale</p>
          {isLoading ? (
            <p className="flex items-center gap-2 text-zinc-400"><Loader2 size={12} className="animate-spin" /> Analyse…</p>
          ) : moves.length === 0 ? (
            <p className="text-zinc-400">Aucun (la fiche secondaire n’a ni paiement, ni présence).</p>
          ) : (
            <ul className="grid sm:grid-cols-2 gap-x-6 gap-y-0.5">
              {moves.map(([table, n]) => (
                <li key={table} className="flex justify-between">
                  <span>{TABLE_LABEL[table] ?? table}</span>
                  <span className="font-mono text-zinc-800">{n}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50"
          >
            Annuler
          </button>
          <button
            onClick={confirm}
            disabled={mergeMutation.isPending || isLoading}
            className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-300 text-white text-sm font-medium"
          >
            {mergeMutation.isPending ? 'Fusion…' : 'Confirmer la fusion'}
          </button>
        </div>
      </div>
    </div>
  )
}

function DuplicatesTab() {
  const [threshold, setThreshold] = useState(0.85)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [merge, setMerge] = useState<{ target: DuplicateCandidate; source: DuplicateCandidate } | null>(null)
  const { data, isLoading, isError } = useDuplicateStudents(threshold)

  const pairs = useMemo(
    () => (data?.pairs ?? []).filter((p) => !dismissed.has(`${p.a.id}-${p.b.id}`)),
    [data, dismissed],
  )

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-zinc-600">
          {isLoading
            ? 'Analyse des fiches…'
            : `${pairs.length} paire(s) suspecte(s) parmi ${data?.scanned ?? 0} élèves.`}
        </p>
        <select
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value))}
          className="px-3 py-2 rounded-lg border border-zinc-200 text-sm bg-white"
        >
          {THRESHOLDS.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {isError && <p className="text-sm text-red-600">Impossible de charger les doublons.</p>}

      {!isLoading && pairs.length === 0 && !isError && (
        <div className="rounded-2xl border border-dashed border-zinc-200 bg-white p-10 text-center text-sm text-zinc-400">
          Aucun doublon détecté à ce niveau de ressemblance.
        </div>
      )}

      <div className="space-y-3">
        {pairs.map((p) => (
          <div key={`${p.a.id}-${p.b.id}`} className="rounded-2xl border border-zinc-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium px-2 py-1 rounded-full bg-amber-50 text-amber-700">
                {REASON_LABEL[p.reason]} · {Math.round(p.score * 100)} %
              </span>
              <button
                onClick={() => setDismissed((d) => new Set(d).add(`${p.a.id}-${p.b.id}`))}
                className="text-xs text-zinc-400 hover:text-zinc-700"
              >
                Ce ne sont pas des doublons
              </button>
            </div>
            <div className="grid md:grid-cols-2 gap-3">
              <div className="space-y-2">
                <StudentCard s={p.a} />
                <button
                  onClick={() => setMerge({ target: p.a, source: p.b })}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium"
                >
                  Garder cette fiche, fusionner l’autre
                </button>
              </div>
              <div className="space-y-2">
                <StudentCard s={p.b} />
                <button
                  onClick={() => setMerge({ target: p.b, source: p.a })}
                  className="w-full px-3 py-2 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-sm font-medium"
                >
                  Garder cette fiche, fusionner l’autre
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {merge && <MergeDialog target={merge.target} source={merge.source} onClose={() => setMerge(null)} />}
    </div>
  )
}

function ArchivedTab() {
  const toast = useToast()
  const [page, setPage] = useState(1)
  const { data, isLoading } = useArchivedStudents({ page, limit: 25 })
  const restore = useRestoreStudent()
  const items = data?.items ?? []

  async function handleRestore(id: number, name: string) {
    try {
      await restore.mutateAsync(id)
      toast.success('Élève restauré', name)
    } catch (error) {
      toast.error('Restauration impossible', getApiErrorMessage(error))
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-zinc-600">
        {isLoading ? 'Chargement…' : `${data?.meta.total ?? 0} fiche(s) archivée(s).`} Les fiches archivées n’apparaissent
        plus dans les listes mais conservent leur historique.
      </p>
      <div className="rounded-2xl border border-zinc-200 bg-white overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-zinc-50 text-xs text-zinc-500">
            <tr>
              <th className="text-left px-5 py-3 font-medium">Élève</th>
              <th className="text-left px-5 py-3 font-medium">Classe</th>
              <th className="text-left px-5 py-3 font-medium">Matricule</th>
              <th className="text-left px-5 py-3 font-medium">Archivé le</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {items.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-3 font-medium text-zinc-900">{fullName(s)}</td>
                <td className="px-5 py-3 text-zinc-600">{s.class?.name ?? '—'}</td>
                <td className="px-5 py-3 font-mono text-zinc-400">{s.matricule}</td>
                <td className="px-5 py-3 text-zinc-600">{fmtDate(s.deletedAt)}</td>
                <td className="px-5 py-3 text-right">
                  <button
                    onClick={() => handleRestore(s.id, fullName(s))}
                    disabled={restore.isPending}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-medium"
                  >
                    <ArchiveRestore size={14} /> Restaurer
                  </button>
                </td>
              </tr>
            ))}
            {!isLoading && items.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-zinc-400">La corbeille est vide.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {(data?.meta.totalPages ?? 1) > 1 && (
        <div className="flex items-center justify-end gap-2 text-sm">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40"
          >
            Précédent
          </button>
          <span className="text-zinc-500">{page} / {data?.meta.totalPages}</span>
          <button
            disabled={page >= (data?.meta.totalPages ?? 1)}
            onClick={() => setPage((p) => p + 1)}
            className="px-3 py-1.5 rounded-lg border border-zinc-200 disabled:opacity-40"
          >
            Suivant
          </button>
        </div>
      )}
    </div>
  )
}

export default function StudentMergePage() {
  const [tab, setTab] = useState<Tab>('duplicates')

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="max-w-6xl mx-auto px-8 py-6 space-y-3">
          <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-800">
            <ArrowLeft size={14} /> Élèves
          </Link>
          <h1 className="text-2xl font-semibold text-zinc-900">Doublons &amp; corbeille</h1>
          <div className="flex gap-2">
            {([
              { id: 'duplicates', label: 'Doublons à fusionner', icon: Copy },
              { id: 'archived', label: 'Corbeille', icon: Trash2 },
            ] as const).map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setTab(id)}
                className={cn(
                  'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors',
                  tab === id ? 'bg-emerald-600 text-white' : 'bg-zinc-100 text-zinc-600 hover:bg-zinc-200',
                )}
              >
                <Icon size={14} /> {label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      <div className="max-w-6xl mx-auto px-8 py-6">
        {tab === 'duplicates' ? <DuplicatesTab /> : <ArchivedTab />}
      </div>
    </div>
  )
}
