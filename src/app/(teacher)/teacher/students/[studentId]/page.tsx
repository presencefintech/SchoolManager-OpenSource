'use client'

import Link from 'next/link'
import { useParams, useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone, UserRound } from 'lucide-react'
import { teacherMobileApi, apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { Card, ErrorState, ListSkeleton, PageHeader, StatTile, pct } from '@/components/teacher/ui'

export default function TeacherStudentProfilePage() {
  const params = useParams<{ studentId: string }>()
  const router = useRouter()
  const studentId = Number(params.studentId)
  const q = useQuery({
    queryKey: ['teacher', 'mobile', 'student', studentId],
    queryFn: () => teacherMobileApi.studentProfile(studentId),
  })

  return (
    <div className="space-y-6">
      <button type="button" onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour
      </button>
      {q.isError ? (
        <ErrorState message={apiErrorMessage(q.error, 'Profil introuvable.')} onRetry={() => q.refetch()} />
      ) : !q.data ? (
        <ListSkeleton rows={3} />
      ) : (
        <>
          <PageHeader
            icon={<UserRound className="h-6 w-6 text-teal-600" />}
            title={q.data!.fullName || 'Élève'}
            subtitle={[q.data!.className, q.data!.matricule].filter(Boolean).join(' · ')}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="Présences enregistrées" value={q.data!.totalPresences ?? '—'} />
            <StatTile label="Taux de présence" value={pct(q.data!.attendanceRate)} tone="good" />
          </div>
          {q.data!.parentContact && (
            <Card className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Contact du parent</span>
              <a href={`tel:${q.data!.parentContact}`} className="inline-flex items-center gap-1 font-medium text-teal-700 hover:underline">
                <Phone className="h-4 w-4" />
                {q.data!.parentContact}
              </a>
            </Card>
          )}
          <Link href="/teacher/classes" className="text-sm text-teal-700 hover:underline">
            Retour à mes classes
          </Link>
        </>
      )}
    </div>
  )
}
