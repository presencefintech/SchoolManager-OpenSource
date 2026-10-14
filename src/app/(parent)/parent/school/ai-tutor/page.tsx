'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery } from '@tanstack/react-query'
import { MessageSquarePlus } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, EmptyState, ErrorState, ListSkeleton, NoStudent, PageHeader, Pill, Spinner, StudentSwitcher } from '@/components/parent/ui'

export default function AiTutorHomePage() {
  const router = useRouter()
  const { studentId } = useSelectedStudent()
  const status = useQuery({
    queryKey: ['parent', 'ai-status', studentId],
    queryFn: () => parentApi.aiTutorStatus(studentId as number),
    enabled: studentId != null,
  })
  const sessions = useQuery({
    queryKey: parentKeys.aiSessions(studentId ?? 0),
    queryFn: () => parentApi.aiTutorSessions(studentId as number),
    enabled: studentId != null,
  })
  const create = useMutation({
    mutationFn: () => parentApi.aiTutorCreate(studentId as number),
    onSuccess: (s) => router.push(`/parent/school/ai-tutor/${s.id}`),
  })

  if (studentId == null) return <NoStudent />
  const enabled = (status.data as { enabled?: boolean } | undefined)?.enabled !== false

  return (
    <>
      <PageHeader title="Tuteur IA" subtitle="Aide à la compréhension des leçons" />
      <StudentSwitcher />
      {!enabled && (
        <Card className="mb-4 text-sm">Le tuteur IA n&apos;est pas activé pour votre établissement.</Card>
      )}
      <button
        type="button"
        disabled={!enabled || create.isPending}
        onClick={() => create.mutate()}
        className="mb-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-medium text-white disabled:opacity-50"
      >
        {create.isPending ? <Spinner /> : <MessageSquarePlus className="h-4 w-4" />} Nouvelle conversation
      </button>
      {create.isError && (
        <p role="alert" className="mb-3 text-sm text-red-600">
          {getApiErrorMessage(create.error)}
        </p>
      )}
      {sessions.isLoading ? (
        <ListSkeleton rows={3} />
      ) : sessions.isError ? (
        <ErrorState onRetry={() => void sessions.refetch()} />
      ) : (sessions.data ?? []).length === 0 ? (
        <EmptyState title="Aucune conversation" />
      ) : (
        <ul className="space-y-3">
          {sessions.data!.map((s) => (
            <li key={s.id}>
              <Link
                href={`/parent/school/ai-tutor/${s.id}`}
                className="flex items-center justify-between gap-3 rounded-2xl border border-line bg-surface p-4"
              >
                <div>
                  <p className="font-medium">{s.subject || 'Conversation'}</p>
                  <p className="text-xs text-zinc-500">
                    {s.createdAt && new Date(s.createdAt).toLocaleDateString('fr-FR')} · {s.messageCount ?? 0} messages
                  </p>
                </div>
                {s.closedAt ? <Pill>Terminée</Pill> : <Pill tone="green">En cours</Pill>}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
