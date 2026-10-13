'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, NoStudent, PageHeader, Pill, StudentSwitcher } from '@/components/parent/ui'

export default function ParentQuizzesPage() {
  const { studentId } = useSelectedStudent()
  const list = useQuery({
    queryKey: parentKeys.quizzes(studentId ?? 0),
    queryFn: () => parentApi.quizzes(studentId as number),
    enabled: studentId != null,
  })

  if (studentId == null) return <NoStudent />

  return (
    <>
      <PageHeader title="Quiz" />
      <StudentSwitcher />
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="Aucun quiz" />
      ) : (
        <ul className="space-y-3">
          {list.data!.map((q) => (
            <li key={q.id}>
              <Link
                href={`/parent/school/quizzes/${q.id}`}
                className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-md"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-semibold">{q.title}</p>
                  <p className="text-sm text-zinc-500">
                    {[q.questionCount != null && `${q.questionCount} questions`, q.teacherName].filter(Boolean).join(' · ')}
                  </p>
                  <div className="mt-1">
                    {q.submission ? (
                      <Pill tone="green">
                        {q.submission.score}/{q.submission.maxScore}
                      </Pill>
                    ) : (
                      <Pill>À faire</Pill>
                    )}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 shrink-0 text-zinc-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
