'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Settings } from 'lucide-react'
import { parentApi } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/parent/ui'
import { cn } from '@/lib/utils'

export default function ParentNotificationsPage() {
  const [unreadOnly, setUnreadOnly] = useState(false)
  const list = useQuery({
    queryKey: [...parentKeys.notifications, unreadOnly],
    queryFn: () => parentApi.notifications({ page: 1, limit: 50, unreadOnly }),
  })

  return (
    <>
      <PageHeader
        title="Notifications"
        action={
          <Link
            href="/parent/profile/notifications"
            aria-label="Réglages des notifications"
            className="rounded-full p-2 text-zinc-500 hover:bg-slate-100 dark:hover:bg-slate-900"
          >
            <Settings className="h-5 w-5" />
          </Link>
        }
      />
      <div className="mb-3 flex gap-2" role="tablist">
        {[
          { label: 'Toutes', value: false },
          { label: 'Non lues', value: true },
        ].map((t) => (
          <button
            key={t.label}
            role="tab"
            aria-selected={unreadOnly === t.value}
            onClick={() => setUnreadOnly(t.value)}
            className={cn(
              'rounded-full px-3 py-1 text-sm',
              unreadOnly === t.value ? 'bg-teal-600 text-white' : 'border border-line bg-surface',
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="Aucune notification" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {list.data!.map((n) => {
            const read = n.isRead ?? n.read ?? false
            return (
              <li key={n.id} className="flex gap-3 px-4 py-3">
                {!read && <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-teal-600" aria-label="Non lue" />}
                <div className="min-w-0">
                  <p className={cn('text-sm', !read && 'font-semibold')}>{n.title ?? n.message ?? n.body}</p>
                  {n.title && (n.message ?? n.body) && (
                    <p className="text-sm text-zinc-500">{n.message ?? n.body}</p>
                  )}
                  {n.createdAt && (
                    <p className="mt-0.5 text-xs text-zinc-400">{new Date(n.createdAt).toLocaleString('fr-FR')}</p>
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
