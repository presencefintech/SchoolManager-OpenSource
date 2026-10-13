'use client'

import { useQuery } from '@tanstack/react-query'
import { parentApi } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/parent/ui'

export default function SecurityLogsPage() {
  const logs = useQuery({
    queryKey: parentKeys.securityLogs,
    queryFn: () => parentApi.securityLogs({ page: 1, limit: 50 }),
  })

  return (
    <>
      <PageHeader title="Journal de sécurité" subtitle="Connexions et actions sensibles sur votre compte" />
      {logs.isLoading ? (
        <ListSkeleton />
      ) : logs.isError ? (
        <ErrorState onRetry={() => void logs.refetch()} />
      ) : (logs.data ?? []).length === 0 ? (
        <EmptyState title="Aucun événement" />
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
          {logs.data!.map((l, i) => (
            <li key={l.id ?? i} className="px-4 py-3">
              <p className="text-sm font-medium">{l.description ?? l.action ?? l.type}</p>
              <p className="text-xs text-zinc-500">
                {[l.createdAt && new Date(l.createdAt).toLocaleString('fr-FR'), l.device, l.ipAddress]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
