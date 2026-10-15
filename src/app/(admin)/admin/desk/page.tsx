'use client'

import { Suspense, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle, Camera, ClipboardList, CreditCard, Contact, FileCheck, Inbox,
  Search, UserPlus, Users,
} from 'lucide-react'
import { AdminModuleHero } from '@/components/admin/shared/admin-module-hero'
import { StudentPaymentStatusWidget } from '@/components/finance/student-payment-status-widget'
import { CashJournalReport } from '@/components/finance/cash-journal-report'
import { useIncompleteDossiers, useIntakeInbox, useStudents } from '@/lib/hooks/use-admin'
import { useQueryLoading } from '@/lib/hooks/use-auth-query'
import { cn } from '@/lib/utils'

const GAPS: { id: string; label: string }[] = [
  { id: '', label: 'Tous' },
  { id: 'photo', label: 'Photo' },
  { id: 'parent', label: 'Parent' },
  { id: 'birthCertificate', label: 'Acte' },
  { id: 'emergency', label: 'Urgence' },
  { id: 'class', label: 'Classe' },
  { id: 'pickup', label: 'Cartes parent' },
]

export default function DeskHomePage() {
  return (
    <Suspense fallback={null}>
      <DeskHomeContent />
    </Suspense>
  )
}

function DeskHomeContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [q, setQ] = useState('')
  const [applied, setApplied] = useState('')
  const [gap, setGap] = useState(() => searchParams.get('gap') ?? '')
  const [page, setPage] = useState(1)

  const inbox = useIntakeInbox({ page: 1, limit: 1 })
  const incomplete = useIncompleteDossiers({ page, limit: 15, gap: gap || undefined })
  const search = useStudents(
    { search: applied, page: 1, limit: 8, status: 'ACTIVE' },
    { enabled: applied.length >= 2 },
  )

  const loading = useQueryLoading(incomplete.isPending)
  const counts = incomplete.data?.counts
  const inboxTotal = inbox.data?.meta?.total ?? 0
  const incompleteTotal = incomplete.data?.total ?? 0
  const missingPhoto = counts?.photo ?? 0
  const missingParent = counts?.parent ?? 0
  const missingPickup = counts?.pickup ?? 0

  const results = useMemo(() => search.data?.data ?? [], [search.data])

  return (
    <div className="min-h-full bg-[#e8ecf4]">
      <AdminModuleHero
        eyebrow="Secrétariat"
        title="Guichet inscriptions"
        subtitle="Recherche, dossiers incomplets et cartes parent"
        quickLinks={[
          { href: '/admin/inbox', label: 'Boîte d’entrée', icon: Inbox },
          { href: '/admin/enrollments', label: 'Inscrire', icon: UserPlus },
          { href: '/admin/students/batch-photos', label: 'Import photos', icon: Camera },
          { href: '/admin/finance/controle', label: 'Dettes / en ordre', icon: ClipboardList },
          { href: '/admin/cards', label: 'Cartes', icon: CreditCard },
        ]}
        metrics={[
          { label: 'À traiter', value: loading ? '…' : inboxTotal, loading, icon: Inbox },
          { label: 'Dossiers incomplets', value: loading ? '…' : incompleteTotal, loading, icon: ClipboardList, valueClassName: incompleteTotal > 0 ? 'text-amber-300' : 'text-white' },
          { label: 'Sans photo', value: loading ? '…' : missingPhoto, loading, icon: Camera },
          { label: 'Sans parent', value: loading ? '…' : missingParent, loading, icon: Users },
          { label: 'Sans carte parent', value: loading ? '…' : missingPickup, loading, icon: Contact, valueClassName: missingPickup > 0 ? 'text-amber-300' : 'text-white' },
        ]}
      />

      <div className="max-w-7xl mx-auto px-6 lg:px-8 py-6 space-y-5">
        <StudentPaymentStatusWidget href="/admin/finance/controle" />
        <CashJournalReport />

        {missingPhoto > 0 && (
          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-amber-900">
              <Camera size={16} className="shrink-0" />
              <span>
                <strong className="font-semibold">{missingPhoto}</strong> dossier(s) sans photo —
                importez un lot nommé <span className="font-mono text-xs">104.jpg</span> / matricule.
              </span>
            </div>
            <Link
              href="/admin/students/batch-photos"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
            >
              Import batch photos
            </Link>
          </div>
        )}

        <form
          className="bg-white rounded-xl border border-zinc-200 p-4 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setApplied(q.trim())
          }}
        >
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Matricule, nom, prénom…"
              className="w-full pl-9 pr-3 py-2.5 text-sm rounded-lg border border-zinc-200 focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <button type="submit" className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700">
            Rechercher
          </button>
        </form>

        {applied.length >= 2 && (
          <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-100 text-sm font-semibold text-zinc-800">
              Résultats pour « {applied} »
            </div>
            {search.isFetching ? (
              <p className="p-6 text-sm text-zinc-400">Recherche…</p>
            ) : results.length === 0 ? (
              <p className="p-6 text-sm text-zinc-400">Aucun élève trouvé.</p>
            ) : (
              <ul className="divide-y divide-zinc-50">
                {results.map((s) => (
                  <li key={s.id}>
                    <Link
                      href={`/admin/students/${s.id}`}
                      className="flex items-center justify-between px-4 py-3 hover:bg-emerald-50/40"
                    >
                      <div>
                        <p className="text-sm font-medium text-zinc-900">
                          {s.lastName} {s.firstName}
                        </p>
                        <p className="text-xs text-zinc-500">
                          {s.matricule ?? '—'} · {s.className ?? 'Sans classe'}
                        </p>
                      </div>
                      <span className="text-xs text-emerald-700 font-medium">Ouvrir</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-100 flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-500" />
              <h2 className="text-sm font-semibold text-zinc-800">Dossiers incomplets</h2>
            </div>
            <div className="flex gap-1 flex-wrap">
              {GAPS.map((g) => (
                <button
                  key={g.id || 'all'}
                  type="button"
                  onClick={() => {
                    setGap(g.id)
                    setPage(1)
                  }}
                  className={cn(
                    'px-2.5 py-1 rounded-full text-[11px] font-medium border',
                    gap === g.id
                      ? 'bg-zinc-900 text-white border-zinc-900'
                      : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>

          {incomplete.isLoading ? (
            <p className="p-6 text-sm text-zinc-400">Chargement…</p>
          ) : !incomplete.data?.items.length ? (
            <p className="p-8 text-center text-sm text-zinc-400">Aucun dossier incomplet pour ce filtre.</p>
          ) : (
            <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/60 text-[11px] uppercase tracking-wide text-zinc-400">
                  <th className="text-left px-4 py-2">Élève</th>
                  <th className="text-left px-4 py-2">Classe</th>
                  <th className="text-left px-4 py-2">Manques</th>
                  <th className="px-4 py-2" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {incomplete.data.items.map((row) => (
                  <tr key={row.id} className="hover:bg-amber-50/30">
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{row.name}</p>
                      <p className="text-xs text-zinc-400 font-mono">{row.matricule}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-600">{row.className ?? '—'}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {row.missingLabels.map((label) => (
                          <span key={label} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-100">
                            {label}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          router.push(
                            gap === 'pickup'
                              ? `/admin/students/${row.id}?doc=pickup`
                              : `/admin/students/${row.id}`,
                          )
                        }
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900"
                      >
                        Compléter
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          )}

          {(incomplete.data?.totalPages ?? 1) > 1 && (
            <div className="flex justify-center gap-3 px-4 py-3 border-t border-zinc-100">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="text-xs px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40"
              >
                Précédent
              </button>
              <span className="text-xs text-zinc-500 py-1">
                {page} / {incomplete.data?.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= (incomplete.data?.totalPages ?? 1)}
                onClick={() => setPage((p) => p + 1)}
                className="text-xs px-3 py-1 rounded-lg border border-zinc-200 disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          )}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          {[
            { href: '/admin/cards', label: 'Imprimer des cartes', icon: CreditCard },
            { href: '/admin/finance/controle', label: 'Listes dette / en ordre', icon: ClipboardList },
            { href: '/admin/students', label: 'Attestations élèves', icon: FileCheck },
          ].map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="bg-white rounded-xl border border-zinc-200 p-4 hover:border-emerald-200 hover:shadow-sm transition-all flex items-center gap-3"
            >
              <card.icon size={18} className="text-emerald-600" />
              <span className="text-sm font-medium text-zinc-800">{card.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
