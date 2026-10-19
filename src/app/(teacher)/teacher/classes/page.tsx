'use client'

import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowRight, School, Users } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/teacher/ui'

export default function TeacherClassesPage() {
  const q = useQuery({ queryKey: ['teacher', 'mobile', 'classes'], queryFn: teacherMobileApi.dashboard })

  return (
    <div className="space-y-6">
      <PageHeader
        icon={<School className="h-6 w-6 text-teal-600" />}
        title="Mes classes"
        subtitle="Accédez aux élèves, aux statistiques et aux contacts de chaque classe."
      />
      {q.isLoading ? (
        <ListSkeleton />
      ) : q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, 'Impossible de charger vos classes.')} onRetry={() => q.refetch()} />
      ) : (q.data?.classes.length ?? 0) === 0 ? (
        <EmptyState>Aucune classe ne vous est assignée pour le moment.</EmptyState>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {q.data!.classes.map((c) => (
            <Link key={c.id} href={`/teacher/classes/${c.id}`}>
              <Card className="flex items-center justify-between transition hover:border-teal-400">
                <div>
                  <p className="font-semibold">{c.name}</p>
                  <p className="mt-1 flex items-center gap-1 text-sm text-slate-500">
                    <Users className="h-3.5 w-3.5" />
                    {c.studentCount} élève{c.studentCount > 1 ? 's' : ''}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
