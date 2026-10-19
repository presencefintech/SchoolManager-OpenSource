'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BarChart3, CheckCircle2, Send } from 'lucide-react'
import { apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { teacherQuizzesApi } from '@/lib/teacher/api/school-work.api'
import { Card, ErrorState, ListSkeleton, PageHeader, btnGhost, btnPrimary, formatDate } from '@/components/teacher/ui'
import { WorkStatusBadge } from '@/components/teacher/work-status'
import { cn } from '@/lib/utils'

export default function TeacherQuizDetailPage() {
  const params = useParams<{ quizId: string }>()
  const id = Number(params.quizId)
  const qc = useQueryClient()

  const q = useQuery({ queryKey: ['teacher', 'quizzes', 'detail', id], queryFn: () => teacherQuizzesApi.get(id) })
  const publish = useMutation({
    mutationFn: () => teacherQuizzesApi.publish(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['teacher', 'quizzes'] }),
  })

  const z = q.data

  return (
    <div className="space-y-6">
      <Link href="/teacher/quizzes" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> QCM
      </Link>
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError || !z ? (
        <ErrorState message={apiErrorMessage(q.error, 'QCM introuvable.')} onRetry={() => q.refetch()} />
      ) : (
        <>
          <PageHeader
            title={z.title}
            subtitle={[z.className, z.dueDate ? `jusqu'au ${formatDate(z.dueDate)}` : null, `${z.submissionCount} participation(s)`]
              .filter(Boolean)
              .join(' · ')}
            actions={
              <>
                <WorkStatusBadge status={z.status} />
                {z.status === 'DRAFT' && (
                  <button type="button" className={btnPrimary} disabled={publish.isPending} onClick={() => publish.mutate()}>
                    <Send className="h-4 w-4" /> Publier
                  </button>
                )}
                {z.status !== 'DRAFT' && (
                  <Link href={`/teacher/quizzes/${id}/stats`} className={btnGhost}>
                    <BarChart3 className="h-4 w-4" /> Statistiques
                  </Link>
                )}
              </>
            }
          />
          {publish.isError && <ErrorState message={apiErrorMessage(publish.error, 'Publication impossible.')} />}
          {z.description && <Card className="whitespace-pre-wrap text-sm">{z.description}</Card>}

          <div className="space-y-3">
            {z.questions
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((question, i) => (
                <Card key={question.id || i} className="space-y-2">
                  <p className="font-medium">
                    {i + 1}. {question.text}
                  </p>
                  <ul className="space-y-1">
                    {Object.entries(question.options).map(([letter, label]) => {
                      const correct = letter === question.correctOption
                      return (
                        <li
                          key={letter}
                          className={cn(
                            'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm',
                            correct ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-950',
                          )}
                        >
                          <span className="w-5 font-mono text-slate-500">{letter}</span>
                          <span className="flex-1">{label}</span>
                          {correct && <CheckCircle2 className="h-4 w-4" />}
                        </li>
                      )
                    })}
                  </ul>
                </Card>
              ))}
          </div>
        </>
      )}
    </div>
  )
}
