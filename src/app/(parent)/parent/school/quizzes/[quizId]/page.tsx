'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi, type QuizQuestion } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, PageHeader, Pill, Spinner } from '@/components/parent/ui'
import { cn } from '@/lib/utils'

/** Normalise les options d'une question : `{A: '…'}` ou `[{key,label}]` → `[letter, text]`. */
function optionEntries(q: QuizQuestion): [string, string][] {
  const o = q.options
  if (!o) return []
  if (Array.isArray(o)) return o.map((x, i) => [x.key ?? String.fromCharCode(65 + i), x.label ?? x.text ?? ''])
  return Object.entries(o)
}

export default function QuizPlayPage() {
  const { quizId } = useParams<{ quizId: string }>()
  const { studentId } = useSelectedStudent()
  const queryClient = useQueryClient()
  const quiz = useQuery({
    queryKey: ['parent', 'quiz', studentId, quizId],
    queryFn: () => parentApi.quiz(studentId as number, quizId),
    enabled: studentId != null,
  })
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [result, setResult] = useState<{ score?: number; maxScore?: number; percentage?: number } | null>(null)

  const submit = useMutation({
    mutationFn: () => parentApi.submitQuiz(studentId as number, quizId, answers),
    onSuccess: (data) => {
      setResult(data as { score?: number; maxScore?: number; percentage?: number })
      void queryClient.invalidateQueries({ queryKey: parentKeys.quizzes(studentId ?? 0) })
    },
  })

  if (quiz.isLoading || studentId == null) return <ListSkeleton />
  if (quiz.isError || !quiz.data) return <ErrorState onRetry={() => void quiz.refetch()} />

  const q = quiz.data
  const questions = [...(q.questions ?? [])].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
  const done = result ?? q.submission
  const answered = Object.keys(answers).length

  if (done) {
    return (
      <>
        <PageHeader title={q.title ?? 'Quiz'} />
        <Card className="space-y-2 text-center">
          <p className="text-sm text-zinc-500">Résultat</p>
          <p className="text-3xl font-bold">
            {done.score}/{done.maxScore}
          </p>
          {done.percentage != null && <Pill tone={done.percentage >= 50 ? 'green' : 'amber'}>{done.percentage} %</Pill>}
        </Card>
      </>
    )
  }

  return (
    <>
      <PageHeader title={q.title ?? 'Quiz'} subtitle={q.description} />
      <div className="space-y-4">
        {questions.map((question, idx) => (
          <Card key={question.id} className="space-y-3">
            <p className="font-medium">
              {idx + 1}. {question.text}
            </p>
            <div className="space-y-2" role="radiogroup" aria-label={`Question ${idx + 1}`}>
              {optionEntries(question).map(([letter, text]) => {
                const active = answers[String(question.id)] === letter
                return (
                  <button
                    key={letter}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setAnswers((a) => ({ ...a, [String(question.id)]: letter }))}
                    className={cn(
                      'flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left text-sm',
                      active ? 'border-teal-600 bg-teal-50 dark:bg-teal-950/40' : 'border-line',
                    )}
                  >
                    <span className="font-semibold">{letter}</span>
                    <span>{text}</span>
                  </button>
                )
              })}
            </div>
          </Card>
        ))}
        {submit.isError && (
          <p role="alert" className="text-sm text-red-600">
            {getApiErrorMessage(submit.error)}
          </p>
        )}
        <button
          type="button"
          disabled={answered < questions.length || submit.isPending}
          onClick={() => submit.mutate()}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-medium text-white disabled:opacity-50"
        >
          {submit.isPending && <Spinner />} Valider ({answered}/{questions.length})
        </button>
      </div>
    </>
  )
}
