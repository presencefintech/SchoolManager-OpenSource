'use client'

import Link from 'next/link'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Bell, CheckCheck } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage, type TeacherNotification } from '@/lib/teacher/api/mobile.api'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, btnGhost, formatDateTime } from '@/components/teacher/ui'
import { cn } from '@/lib/utils'

/** Lien profond vers l'écran concerné, comme dans l'app mobile. */
function targetHref(n: TeacherNotification): string | null {
  if (n.assignmentId) return `/teacher/assignments/${n.assignmentId}`
  if (n.sheetId && n.classId) return `/teacher/attendance/sheet?classId=${n.classId}`
  if (n.studentId) return `/teacher/students/${n.studentId}`
  if (n.classId) return `/teacher/classes/${n.classId}`
  return null
}

export default function TeacherNotificationsPage() {
  const qc = useQueryClient()
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'notifications'],
    queryFn: teacherMobileApi.notifications,
    refetchInterval: 60_000,
  })

  const invalidate = () => {
    void qc.invalidateQueries({ queryKey: ['teacher', 'mobile', 'notifications'] })
    void qc.invalidateQueries({ queryKey: ['teacher', 'mobile', 'unread'] })
  }

  const markOne = useMutation({ mutationFn: (id: number) => teacherMobileApi.markNotificationRead(id), onSuccess: invalidate })
  const markAll = useMutation({ mutationFn: () => teacherMobileApi.markAllNotificationsRead(), onSuccess: invalidate })

  const items = q.data ?? []
  const unread = items.filter((n) => !n.isRead).length

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<Bell className="h-6 w-6 text-teal-600" />}
        title="Notifications"
        subtitle={unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Vous êtes à jour.'}
        actions={
          <button type="button" className={btnGhost} disabled={unread === 0 || markAll.isPending} onClick={() => markAll.mutate()}>
            <CheckCheck className="h-4 w-4" /> Tout marquer comme lu
          </button>
        }
      />
      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger les notifications.')} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState>Aucune notification.</EmptyState>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const href = targetHref(n)
            const body = (
              <Card className={cn('flex items-start justify-between gap-3', !n.isRead && 'border-teal-300 bg-teal-50/40 dark:bg-teal-950/20')}>
                <div className="min-w-0">
                  <p className="font-medium">{n.title}</p>
                  {n.message && <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-300">{n.message}</p>}
                  <p className="mt-1 text-xs text-slate-400">
                    {formatDateTime(n.createdAt)}
                    {n.className ? ` · ${n.className}` : ''}
                  </p>
                </div>
                {!n.isRead && (
                  <button
                    type="button"
                    className="shrink-0 text-xs text-teal-700 hover:underline"
                    onClick={(e) => {
                      e.preventDefault()
                      markOne.mutate(n.id)
                    }}
                  >
                    Marquer lu
                  </button>
                )}
              </Card>
            )
            return href ? (
              <Link key={n.id} href={href} onClick={() => !n.isRead && markOne.mutate(n.id)}>
                {body}
              </Link>
            ) : (
              <div key={n.id}>{body}</div>
            )
          })}
        </div>
      )}
    </div>
  )
}
