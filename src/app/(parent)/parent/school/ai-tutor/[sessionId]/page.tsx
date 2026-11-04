'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Send } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { ErrorState, ListSkeleton, PageHeader, Spinner } from '@/components/parent/ui'
import { cn } from '@/lib/utils'

export default function AiTutorChatPage() {
  const { sessionId } = useParams<{ sessionId: string }>()
  const { studentId } = useSelectedStudent()
  const queryClient = useQueryClient()
  const key = parentKeys.aiSession(studentId ?? 0, sessionId)
  const session = useQuery({
    queryKey: key,
    queryFn: () => parentApi.aiTutorSession(studentId as number, sessionId),
    enabled: studentId != null,
  })
  const [question, setQuestion] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  const ask = useMutation({
    mutationFn: (q: string) => parentApi.aiTutorAsk(studentId as number, sessionId, q),
    onSuccess: () => {
      setQuestion('')
      void queryClient.invalidateQueries({ queryKey: key })
    },
  })
  const close = useMutation({
    mutationFn: () => parentApi.aiTutorClose(studentId as number, sessionId),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: parentKeys.aiSessions(studentId ?? 0) })
    },
  })

  const messages = session.data?.messages ?? []
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length])

  if (session.isLoading || studentId == null) return <ListSkeleton />
  if (session.isError || !session.data) return <ErrorState onRetry={() => void session.refetch()} />
  const closed = !!session.data.closedAt

  return (
    <div className="flex min-h-[70vh] flex-col">
      <PageHeader
        title={session.data.subject || 'Tuteur IA'}
        action={
          !closed && (
            <button
              type="button"
              onClick={() => close.mutate()}
              disabled={close.isPending}
              className="text-sm text-zinc-500 underline underline-offset-2"
            >
              Terminer
            </button>
          )
        }
      />
      <div className="flex-1 space-y-3" aria-live="polite">
        {messages.map((m) => {
          const tutor = m.role === 'TUTOR'
          return (
            <div key={m.id} className={cn('flex', tutor ? 'justify-start' : 'justify-end')}>
              <div
                className={cn(
                  'max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-sm',
                  tutor ? 'bg-surface border border-line' : 'bg-teal-600 text-white',
                )}
              >
                {m.content}
              </div>
            </div>
          )
        })}
        {ask.isPending && (
          <div className="flex justify-start">
            <div className="rounded-2xl border border-line bg-surface px-3 py-2">
              <Spinner />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      {ask.isError && (
        <p role="alert" className="mt-2 text-sm text-red-600">
          {getApiErrorMessage(ask.error)}
        </p>
      )}
      {closed ? (
        <p className="mt-4 text-center text-sm text-zinc-500">Cette conversation est terminée.</p>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault()
            const q = question.trim()
            if (q) ask.mutate(q)
          }}
          className="sticky bottom-24 mt-4 flex gap-2 md:bottom-4"
        >
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Posez votre question…"
            aria-label="Votre question"
            className="min-w-0 flex-1 rounded-xl border border-line bg-surface px-3 py-2.5"
          />
          <button
            type="submit"
            disabled={!question.trim() || ask.isPending}
            aria-label="Envoyer"
            className="rounded-xl bg-teal-600 px-4 text-white disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      )}
    </div>
  )
}
