'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Inbox, Loader2, RefreshCw, UserCircle, UserPlus, Users } from 'lucide-react'
import { useApproveEnrollment, useIntakeInbox } from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { cn } from '@/lib/utils'

type Kind = 'PRE_ENROLLMENT' | 'STUDENT_APPLICATION' | 'PENDING_ENROLLMENT' | ''

const KIND_META: Record<
  Exclude<Kind, ''>,
  { label: string; icon: React.ElementType; tone: string }
> = {
  PRE_ENROLLMENT: {
    label: 'Pré-inscription',
    icon: UserCircle,
    tone: 'bg-sky-50 text-sky-700 border-sky-100',
  },
  STUDENT_APPLICATION: {
    label: 'Candidature',
    icon: Users,
    tone: 'bg-violet-50 text-violet-700 border-violet-100',
  },
  PENDING_ENROLLMENT: {
    label: 'Pending parent',
    icon: UserPlus,
    tone: 'bg-amber-50 text-amber-800 border-amber-100',
  },
}

function formatWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString('fr-FR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return iso
  }
}

export default function AdminIntakePage() {
  const toast = useToast()
  const [kind, setKind] = useState<Kind>('')
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching, refetch } = useIntakeInbox({
    kind: kind || undefined,
    page,
    limit: 40,
  })
  const approve = useApproveEnrollment()

  const items = data?.items ?? []
  const meta = data?.meta
  const counts = useMemo(
    () =>
      meta?.byKind ?? {
        PRE_ENROLLMENT: 0,
        STUDENT_APPLICATION: 0,
        PENDING_ENROLLMENT: 0,
      },
    [meta],
  )

  async function handleApprovePending(id: number) {
    try {
      const res = await approve.mutateAsync(id)
      const pack = res.data?.explicitFeePack
      if (pack?.assigned?.length) {
        toast.success(
          'Approuvé',
          `Élève activé — ${pack.assigned.length} barème(s) EXPLICIT appliqués.`,
        )
      } else {
        toast.success('Approuvé', 'Élève activé (matricule + QR).')
      }
      if (pack?.skipped?.length) {
        toast.error('Frais partiels', `${pack.skipped.length} barème(s) non attribués.`)
      }
      void refetch()
    } catch (err) {
      toast.error('Approbation impossible', getApiErrorMessage(err))
    }
  }

  return (
    <div className="space-y-6 p-6 max-w-5xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
            <Inbox size={18} />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-zinc-900">Boîte d&apos;entrée</h1>
            <p className="text-sm text-zinc-500">
              Pré-inscriptions, candidatures et dossiers parent en attente — une seule file.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => void refetch()}
          className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50"
        >
          <RefreshCw size={12} className={cn(isFetching && 'animate-spin')} />
          Actualiser
        </button>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {(Object.keys(KIND_META) as Exclude<Kind, ''>[]).map((k) => {
          const m = KIND_META[k]
          const Icon = m.icon
          return (
            <button
              key={k}
              type="button"
              onClick={() => {
                setKind((prev) => (prev === k ? '' : k))
                setPage(1)
              }}
              className={cn(
                'rounded-2xl border p-4 text-left transition-colors',
                kind === k ? m.tone : 'border-zinc-100 bg-white hover:bg-zinc-50',
              )}
            >
              <div className="flex items-center gap-2 text-xs font-medium">
                <Icon size={14} />
                {m.label}
              </div>
              <p className="mt-2 text-2xl font-semibold tabular-nums text-zinc-900">
                {counts[k] ?? 0}
              </p>
            </button>
          )
        })}
      </div>

      <div className="rounded-2xl border border-zinc-100 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center gap-2 py-16 text-sm text-zinc-500">
            <Loader2 size={16} className="animate-spin" /> Chargement…
          </div>
        ) : items.length === 0 ? (
          <div className="py-16 text-center text-sm text-zinc-500">
            Aucune demande ouverte{kind ? ' pour ce filtre' : ''}.
          </div>
        ) : (
          <ul className="divide-y divide-zinc-100">
            {items.map((item) => {
              const metaKind = KIND_META[item.kind]
              const Icon = metaKind.icon
              return (
                <li
                  key={`${item.kind}-${item.id}`}
                  className="flex flex-wrap items-center justify-between gap-3 px-4 py-3.5 hover:bg-zinc-50/80"
                >
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium',
                          metaKind.tone,
                        )}
                      >
                        <Icon size={10} />
                        {metaKind.label}
                      </span>
                      <span className="text-[10px] uppercase tracking-wide text-zinc-400">
                        {item.status}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-zinc-900 truncate">{item.studentName}</p>
                    <p className="text-xs text-zinc-500">
                      {item.className ?? 'Classe non précisée'} · {formatWhen(item.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {item.kind === 'PENDING_ENROLLMENT' && (
                      <button
                        type="button"
                        disabled={approve.isPending}
                        onClick={() => void handleApprovePending(item.id)}
                        className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                      >
                        Approuver
                      </button>
                    )}
                    <Link
                      href={item.href}
                      className="rounded-xl border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-white"
                    >
                      Ouvrir
                    </Link>
                  </div>
                </li>
              )
            })}
          </ul>
        )}

        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-zinc-100 px-4 py-3 text-xs text-zinc-500">
            <span>
              Page {meta.page} / {meta.totalPages} · {meta.total} dossier(s)
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:opacity-40"
              >
                Préc.
              </button>
              <button
                type="button"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-zinc-200 px-2.5 py-1 disabled:opacity-40"
              >
                Suiv.
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
