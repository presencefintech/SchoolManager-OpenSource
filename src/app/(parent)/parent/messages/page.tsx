'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { parentApi } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, PageHeader, Pill } from '@/components/parent/ui'

const URGENCY: Record<string, { label: string; tone: 'red' | 'amber' | 'slate' }> = {
  CRITICAL: { label: 'Urgent', tone: 'red' },
  HIGH: { label: 'Important', tone: 'amber' },
  MEDIUM: { label: 'Info', tone: 'slate' },
}

/** Communiqués de l'école (`announcement_list_screen.dart`). */
export default function ParentMessagesPage() {
  const list = useQuery({ queryKey: parentKeys.announcements, queryFn: () => parentApi.announcements() })

  return (
    <>
      <PageHeader
        title="Communiqués"
        subtitle="Messages officiels de l'école"
        action={
          <Link href="/parent/notifications" className="text-sm font-medium text-teal-700 underline underline-offset-2">
            Notifications
          </Link>
        }
      />
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="Aucun communiqué" hint="Les annonces de l'école apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {list.data!.map((a) => {
            const u = URGENCY[a.urgency ?? '']
            return (
              <li key={a.id}>
                <Link
                  href={`/parent/messages/${a.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-md"
                >
                  {!a.isRead && <span className="h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-label="Non lu" />}
                  <div className="min-w-0 flex-1">
                    <p className={`truncate ${a.isRead ? '' : 'font-semibold'}`}>{a.title}</p>
                    {a.excerpt && <p className="line-clamp-2 text-sm text-zinc-500">{a.excerpt}</p>}
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                      {a.publishedAt && <span>{new Date(a.publishedAt).toLocaleDateString('fr-FR')}</span>}
                      {u && <Pill tone={u.tone}>{u.label}</Pill>}
                      {a.requiresAgreement && !a.isAgreed && <Pill tone="amber">À confirmer</Pill>}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
