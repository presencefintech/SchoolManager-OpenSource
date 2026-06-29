'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, ChevronDown, BarChart3, ClipboardList, Download, Users } from 'lucide-react'
import { useFinanceClasses, useClassFinancialStatus, useClassAudit, useClassStudents, useExportClassPayments } from '@/lib/hooks/use-finance'

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
import { fadeUp, stagger } from '@/lib/animations'
import { Skeleton } from '@/components/ui/skeleton'

function Sk({ className }: { className?: string }) {
  return <div className={`rounded-xl bg-zinc-100 animate-pulse ${className ?? ''}`} />
}

function ClassDetail({ classId }: { classId: number }) {
  const { data: status, isLoading: loadingStatus } = useClassFinancialStatus(classId)
  const { data: audit, isLoading: loadingAudit } = useClassAudit(classId)
  const { data: studentsData, isLoading: loadingStudents } = useClassStudents(classId)

  const st = status as any
  const auditEntries: any[] = Array.isArray(audit) ? audit : (audit as any)?.data ?? []
  const students: any[] = Array.isArray(studentsData) ? studentsData : []

  return (
    <div className="mt-4 space-y-4">
      {/* Ligne 1 : statut financier + audit */}
      <div className="grid grid-cols-2 gap-4">
        {/* Statut financier */}
        <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-700">Statut financier</h4>
          </div>
          {loadingStatus ? (
            <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : (st?.metrics || st?.financial?.metrics) ? (
            <div className="space-y-1.5">
              {[
                ['Élèves inscrits', st.financial?.metrics?.studentCount ?? '—'],
                ['Taux de recouvrement', st.financial?.metrics?.recoveryRate != null ? `${Number(st.financial.metrics.recoveryRate).toFixed(1)} %` : '—'],
                ['Total dû', st.financial?.metrics?.totalDebt != null ? `${Number(st.financial.metrics.totalDebt).toLocaleString('fr-FR')} F` : '—'],
                ['Total encaissé', st.metrics?.totalPaid != null ? `${Number(st.metrics.totalPaid).toLocaleString('fr-FR')} F` : '—'],
                ['Présences enregistrées', st.metrics?.attendanceCount ?? '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-0.5 border-b border-zinc-100 last:border-0">
                  <span className="text-xs text-zinc-500">{k}</span>
                  <span className="text-xs font-semibold text-zinc-800">{String(v)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-zinc-400">Aucune donnée</p>
          )}
        </div>

        {/* Audit trail */}
        <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4">
          <div className="flex items-center gap-2 mb-3">
            <ClipboardList size={13} className="text-zinc-400" />
            <h4 className="text-xs font-semibold text-zinc-700">Audit trail</h4>
          </div>
          {loadingAudit ? (
            <div className="space-y-2">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
          ) : auditEntries.length === 0 ? (
            <p className="text-xs text-zinc-400">Aucun événement</p>
          ) : (
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {auditEntries.slice(0, 10).map((e: any, i: number) => (
                <div key={i} className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-zinc-300 mt-1.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{e.action ?? e.type ?? '—'}</p>
                    {e.createdAt && (
                      <p className="text-[10px] text-zinc-400">{new Date(e.createdAt).toLocaleDateString('fr-FR')}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Ligne 2 : liste des élèves */}
      <div className="bg-zinc-50 rounded-xl border border-zinc-100 p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users size={13} className="text-zinc-400" />
          <h4 className="text-xs font-semibold text-zinc-700">Élèves</h4>
          {students.length > 0 && (
            <span className="ml-auto text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-200 text-zinc-600 font-medium">{students.length}</span>
          )}
        </div>
        {loadingStudents ? (
          <div className="space-y-2">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-8" />)}</div>
        ) : students.length === 0 ? (
          <p className="text-xs text-zinc-400">Aucun élève actif</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-zinc-200">
                  <th className="text-left py-1.5 pr-4 font-semibold text-zinc-500">Nom</th>
                  <th className="text-left py-1.5 pr-4 font-semibold text-zinc-500">Matricule</th>
                  <th className="text-right py-1.5 pr-4 font-semibold text-zinc-500">Total dû</th>
                  <th className="text-right py-1.5 pr-4 font-semibold text-zinc-500">Payé</th>
                  <th className="text-right py-1.5 font-semibold text-zinc-500">Solde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 max-h-56 overflow-y-auto">
                {students.map((s: any) => {
                  const enr = s.enrollments?.[0]
                  const balance = Number(enr?.balance ?? 0)
                  return (
                    <tr key={s.id} className="hover:bg-zinc-100/60">
                      <td className="py-2 pr-4 font-medium text-zinc-800">{s.firstName} {s.lastName}</td>
                      <td className="py-2 pr-4 font-mono text-zinc-400">{s.matricule ?? '—'}</td>
                      <td className="py-2 pr-4 text-right text-zinc-600">{enr ? `${Number(enr.totalAmount).toLocaleString('fr-FR')} F` : '—'}</td>
                      <td className="py-2 pr-4 text-right text-emerald-600">{enr ? `${Number(enr.paidAmount).toLocaleString('fr-FR')} F` : '—'}</td>
                      <td className={`py-2 text-right font-semibold ${balance > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
                        {enr ? `${balance.toLocaleString('fr-FR')} F` : '—'}
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

export default function ClassesPage() {
  const { data: classesData, isLoading } = useFinanceClasses()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  const exportClass = useExportClassPayments()

  async function handleExport(classId: number, className: string, e: React.MouseEvent) {
    e.stopPropagation()
    try {
      const blob = await exportClass.mutateAsync(classId)
      downloadBlob(blob, `classe-${className.replace(/\s+/g, '-')}-paiements.csv`)
    } catch {}
  }

  const classes: any[] = Array.isArray(classesData) ? classesData : (classesData as any)?.data ?? []

  return (
    <div className="px-8 py-8 space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        <h1 className="text-2xl font-bold text-zinc-900">Classes</h1>
        <p className="text-sm text-zinc-500 mt-0.5">Suivi financier par classe</p>
      </motion.div>

      <motion.div variants={fadeUp} initial="hidden" animate="show" className="bg-white rounded-2xl border border-zinc-100 shadow-sm">
        <div className="px-5 py-4 border-b border-zinc-100 flex items-center gap-2">
          <BookOpen size={14} className="text-zinc-400" />
          <h2 className="text-sm font-semibold text-zinc-900">Liste des classes</h2>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
          </div>
        ) : classes.length === 0 ? (
          <div className="py-12 text-center">
            <BookOpen size={24} className="mx-auto text-zinc-300 mb-2" />
            <p className="text-sm text-zinc-400">Aucune classe</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100">
            {classes.map((c: any) => {
              const isOpen = selectedId === c.id
              return (
                <div key={c.id}>
                  <button
                    onClick={() => setSelectedId(isOpen ? null : c.id)}
                    className="w-full flex items-center justify-between px-5 py-4 hover:bg-zinc-50/50 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
                        <BookOpen size={14} className="text-emerald-600" />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-zinc-900">{c.name}</p>
                        <p className="text-xs text-zinc-400">
                          {c.level ? `${c.level} · ` : ''}{c._count?.students ?? 0} élève(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {c.isActive !== undefined && (
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${c.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'}`}>
                          {c.isActive ? 'Active' : 'Inactive'}
                        </span>
                      )}
                      <button
                        onClick={(e) => handleExport(c.id, c.name, e)}
                        disabled={exportClass.isPending}
                        className="p-1.5 rounded-lg border border-zinc-200 text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600 transition-colors disabled:opacity-40"
                        title="Exporter les paiements"
                      >
                        <Download size={12} />
                      </button>
                      <ChevronDown
                        size={15}
                        className={`text-zinc-400 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5">
                      <ClassDetail classId={c.id} />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </motion.div>
    </div>
  )
}
