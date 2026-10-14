'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { EmptyState, ErrorState, ListSkeleton, NoStudent, PageHeader, Pill, StudentSwitcher } from '@/components/parent/ui'

export default function ParentAssignmentsPage() {
  const { studentId } = useSelectedStudent()
  const list = useQuery({
    queryKey: parentKeys.assignments(studentId ?? 0),
    queryFn: () => parentApi.assignments(studentId as number),
    enabled: studentId != null,
  })

  if (studentId == null) return <NoStudent />

  return (
    <>
      <PageHeader title="Devoirs" />
      <StudentSwitcher />
      {list.isLoading ? (
        <ListSkeleton />
      ) : list.isError ? (
        <ErrorState onRetry={() => void list.refetch()} />
      ) : (list.data ?? []).length === 0 ? (
        <EmptyState title="Aucun devoir" hint="Les devoirs publiés par les enseignants apparaîtront ici." />
      ) : (
        <ul className="space-y-3">
          {list.data!.map((a) => {
            const sub = a.submission
            return (
              <li key={a.id}>
                <Link
                  href={`/parent/school/assignments/${a.id}`}
                  className="flex items-center gap-3 rounded-2xl border border-line bg-surface p-4 transition hover:shadow-md"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold">{a.title}</p>
                    <p className="text-sm text-zinc-500">
                      {[a.subject, a.teacherName].filter(Boolean).join(' · ')}
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
                      {a.dueDate && <span className="text-zinc-500">Pour le {new Date(a.dueDate).toLocaleDateString('fr-FR')}</span>}
                      {sub?.grade != null ? (
                        <Pill tone="green">
                          {sub.grade}/{sub.maxGrade}
                        </Pill>
                      ) : sub ? (
                        <Pill tone="amber">Rendu</Pill>
                      ) : (
                        <Pill>À rendre</Pill>
                      )}
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
