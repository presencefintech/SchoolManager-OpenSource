'use client'

import { Suspense, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  BookOpen,
  CheckSquare,
  CreditCard,
  Download,
  GraduationCap,
  Loader2,
  Printer,
  RefreshCw,
  Square,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { getApiErrorMessage } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import { printPdfBlob } from '@/lib/finance/download-blob'
import { enrollmentsApi } from '@/lib/admin/api/enrollments.api'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { useClasses, useEnrollmentsByClass } from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import type { EnrollmentListItem } from '@/types/admin'

type BusyAction = 'class-print' | 'class-dl' | 'sel-print' | 'sel-dl' | 'one' | null

function isCardEligible(student: EnrollmentListItem): boolean {
  return Boolean(student.matricule) && Boolean(student.qrcodeHmac) && student.status === 'ACTIVE'
}

function cardIneligibleReason(student: EnrollmentListItem): string {
  if (student.status !== 'ACTIVE') return 'Inscription non finalisée'
  if (!student.matricule) return 'Matricule manquant'
  if (!student.qrcodeHmac) return 'QR code manquant'
  return ''
}

export default function StudentCardsPage() {
  return (
    <Suspense fallback={null}>
      <StudentCardsPageContent />
    </Suspense>
  )
}

function StudentCardsPageContent() {
  const toast = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialClassId = Number(searchParams.get('classId') ?? '') || 0

  const [classId, setClassId] = useState(initialClassId)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [busy, setBusy] = useState<BusyAction>(null)

  const { data: classes = [], isLoading: classesLoading } = useClasses({ isActive: true })
  const { data: students = [], isLoading: studentsLoading, refetch, isFetching } = useEnrollmentsByClass(classId)

  useEffect(() => {
    const fromUrl = Number(searchParams.get('classId') ?? '') || 0
    if (fromUrl && fromUrl !== classId) setClassId(fromUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams])

  useEffect(() => {
    setSelected(new Set())
  }, [classId])

  const eligible = useMemo(() => students.filter(isCardEligible), [students])
  const skipped = students.length - eligible.length
  const selectedIds = useMemo(() => Array.from(selected), [selected])
  const allEligibleSelected = eligible.length > 0 && eligible.every((s) => selected.has(s.id))

  function selectClass(nextId: number) {
    setClassId(nextId)
    const params = new URLSearchParams(searchParams.toString())
    if (nextId) params.set('classId', String(nextId))
    else params.delete('classId')
    const qs = params.toString()
    router.replace(qs ? `/admin/cards?${qs}` : '/admin/cards', { scroll: false })
  }

  function toggleStudent(id: number) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAllEligible() {
    if (allEligibleSelected) {
      setSelected(new Set())
      return
    }
    setSelected(new Set(eligible.map((s) => s.id)))
  }

  async function runPdf(
    action: BusyAction,
    factory: () => Promise<{ blob: Blob; filename: string }>,
    mode: 'print' | 'download',
  ) {
    setBusy(action)
    try {
      const { blob, filename } = await factory()
      if (mode === 'download') {
        triggerBlobDownload(blob, filename)
        toast.success('PDF prêt', filename)
      } else {
        await printPdfBlob(blob)
        toast.success('Impression', 'Dialogue d’impression ouvert')
      }
    } catch (error) {
      toast.error('Cartes élèves', getApiErrorMessage(error))
    } finally {
      setBusy(null)
    }
  }

  const selectedClass = classes.find((c) => c.id === classId)
  const loadingList = Boolean(classId) && (studentsLoading || isFetching)

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Guichet"
        title="Cartes élèves"
        subtitle="Feuilles A4 · 8 cartes CR80 par page · matricule et QR requis"
        actions={
          <button
            type="button"
            onClick={() => refetch()}
            disabled={!classId || loadingList}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg bg-white/10 text-white ring-1 ring-white/15 hover:bg-white/15 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={cn(isFetching && 'animate-spin')} />
            Actualiser
          </button>
        }
        quickLinks={[
          { href: '/admin/students', label: 'Élèves', icon: GraduationCap },
          { href: '/admin/classes', label: 'Classes', icon: BookOpen },
        ]}
        metrics={[
          {
            label: 'Élèves',
            value: classId ? students.length : '—',
            loading: loadingList,
            icon: GraduationCap,
          },
          {
            label: 'Imprimables',
            value: classId ? eligible.length : '—',
            loading: loadingList,
            icon: CreditCard,
          },
          {
            label: 'Sélection',
            value: selectedIds.length,
            icon: CheckSquare,
          },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-4">
        <div className="bg-white rounded-xl border border-zinc-200 p-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <label className="flex-1 min-w-0">
            <span className="block text-xs font-medium text-zinc-600 mb-1.5">Classe</span>
            <select
              value={classId || ''}
              onChange={(e) => selectClass(Number(e.target.value) || 0)}
              disabled={classesLoading}
              className="w-full px-3 py-2.5 rounded-xl border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40 focus:border-emerald-400"
            >
              <option value="">— Choisir une classe —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                  {c.studentCount != null ? ` · ${c.studentCount} élève${c.studentCount > 1 ? 's' : ''}` : ''}
                </option>
              ))}
            </select>
          </label>
          {classId > 0 && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!eligible.length || busy != null}
                onClick={() =>
                  runPdf('class-print', () => enrollmentsApi.downloadClassCardsPdf(classId), 'print')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {busy === 'class-print' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                Imprimer la classe
              </button>
              <button
                type="button"
                disabled={!eligible.length || busy != null}
                onClick={() =>
                  runPdf('class-dl', () => enrollmentsApi.downloadClassCardsPdf(classId), 'download')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-zinc-200 text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
              >
                {busy === 'class-dl' ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                PDF classe
              </button>
              <button
                type="button"
                disabled={selectedIds.length === 0 || busy != null}
                onClick={() =>
                  runPdf('sel-print', () => enrollmentsApi.downloadBatchCardsPdf(selectedIds), 'print')
                }
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-sm font-semibold border border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 disabled:opacity-50"
              >
                {busy === 'sel-print' ? <Loader2 size={14} className="animate-spin" /> : <Printer size={14} />}
                Imprimer la sélection
              </button>
            </div>
          )}
        </div>

        {!classId ? (
          <div className="bg-white rounded-xl border border-dashed border-zinc-300 p-14 text-center">
            <CreditCard size={40} className="mx-auto text-zinc-300 mb-3" />
            <p className="text-base font-semibold text-zinc-800">Choisissez une classe</p>
            <p className="text-sm text-zinc-500 mt-1 max-w-md mx-auto">
              Imprimez toutes les cartes d’une classe, ou une sélection d’élèves au guichet.
            </p>
          </div>
        ) : loadingList ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-sm text-zinc-400">
            Chargement des élèves…
          </div>
        ) : students.length === 0 ? (
          <div className="bg-white rounded-xl border border-zinc-200 p-10 text-center text-sm text-zinc-500">
            Aucun élève dans {selectedClass?.name ?? 'cette classe'}.
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-b border-zinc-100">
              <button
                type="button"
                onClick={toggleAllEligible}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-700 hover:text-zinc-900"
              >
                {allEligibleSelected ? <CheckSquare size={16} className="text-emerald-600" /> : <Square size={16} />}
                {allEligibleSelected ? 'Tout désélectionner' : 'Sélectionner les imprimables'}
              </button>
              {skipped > 0 && (
                <p className="text-xs text-amber-700">
                  {skipped} élève{skipped > 1 ? 's' : ''} sans matricule/QR/inscription finalisée — non imprimable
                  {skipped > 1 ? 's' : ''}
                </p>
              )}
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-zinc-50 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">
                  <th className="px-4 py-2.5 w-10" />
                  <th className="px-4 py-2.5 text-left">Élève</th>
                  <th className="px-4 py-2.5 text-left">Matricule</th>
                  <th className="px-4 py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {students.map((student) => {
                  const ok = isCardEligible(student)
                  return (
                    <tr key={student.id} className={cn(!ok && 'bg-zinc-50/70 text-zinc-400')}>
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          disabled={!ok}
                          onClick={() => toggleStudent(student.id)}
                          className="disabled:opacity-30"
                          title={ok ? 'Sélectionner' : cardIneligibleReason(student)}
                        >
                          {selected.has(student.id) ? (
                            <CheckSquare size={16} className="text-emerald-600" />
                          ) : (
                            <Square size={16} />
                          )}
                        </button>
                      </td>
                      <td className="px-4 py-2.5">
                        <Link
                          href={`/admin/students/${student.id}`}
                          className="font-medium text-zinc-800 hover:text-emerald-700"
                        >
                          {formatStudentFullName(student)}
                        </Link>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{student.matricule ?? '—'}</td>
                      <td className="px-4 py-2.5 text-right">
                        {ok && (
                          <button
                            type="button"
                            disabled={busy != null}
                            onClick={() =>
                              runPdf(
                                'one',
                                () => enrollmentsApi.downloadStudentCardPdf(student.id),
                                'print',
                              )
                            }
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-zinc-600 hover:bg-zinc-100 disabled:opacity-50"
                          >
                            {busy === 'one' ? <Loader2 size={12} className="animate-spin" /> : <Printer size={12} />}
                            Imprimer
                          </button>
                        )}
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
  )
}
