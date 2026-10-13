'use client'

import { useEffect } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle2 } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, PageHeader, Pill, Spinner } from '@/components/parent/ui'

export default function AnnouncementDetailPage() {
  const { announcementId } = useParams<{ announcementId: string }>()
  const queryClient = useQueryClient()
  const key = ['parent', 'announcement', announcementId] as const
  const announcement = useQuery({ queryKey: key, queryFn: () => parentApi.announcement(announcementId) })

  const ack = useMutation({
    mutationFn: (body: { markRead?: boolean; agree?: boolean }) =>
      parentApi.acknowledgeAnnouncement(announcementId, body),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: parentKeys.announcements })
      void queryClient.invalidateQueries({ queryKey: parentKeys.dashboard })
    },
  })

  const a = announcement.data
  const shouldMarkRead = !!a && !a.isRead
  useEffect(() => {
    if (shouldMarkRead) ack.mutate({ markRead: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shouldMarkRead])

  if (announcement.isLoading) return <ListSkeleton rows={2} />
  if (announcement.isError || !a) return <ErrorState onRetry={() => void announcement.refetch()} />

  return (
    <>
      <PageHeader
        title={a.title ?? 'Communiqué'}
        subtitle={a.publishedAt ? new Date(a.publishedAt).toLocaleDateString('fr-FR', { dateStyle: 'long' }) : undefined}
      />
      <Card className="space-y-4">
        <div className="whitespace-pre-wrap text-sm leading-relaxed">{a.body ?? a.excerpt}</div>
        {a.requiresAgreement &&
          (a.isAgreed ? (
            <Pill tone="green">
              <CheckCircle2 className="mr-1 h-3 w-3" /> Lu et approuvé
            </Pill>
          ) : (
            <button
              type="button"
              disabled={ack.isPending}
              onClick={() => ack.mutate({ markRead: true, agree: true })}
              className="inline-flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {ack.isPending && <Spinner />} J&apos;ai lu et j&apos;accepte
            </button>
          ))}
        {ack.isError && (
          <p role="alert" className="text-sm text-red-600">
            {getApiErrorMessage(ack.error)}
          </p>
        )}
      </Card>
    </>
  )
}
