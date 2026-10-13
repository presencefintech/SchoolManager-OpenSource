'use client'

import Link from 'next/link'
import { ChevronRight, Plus } from 'lucide-react'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { formatMoney, studentDisplayName } from '@/lib/parent/api'
import { Avatar, Card, ListSkeleton, NoStudent, PageHeader, Pill } from '@/components/parent/ui'

export default function ParentStudentsPage() {
  const { students, isLoading } = useSelectedStudent()

  return (
    <>
      <PageHeader
        title="Mes enfants"
        action={
          <Link
            href="/parent/students/claim"
            className="inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-sm font-medium text-white"
          >
            <Plus className="h-4 w-4" /> Lier
          </Link>
        }
      />
      {isLoading ? (
        <ListSkeleton />
      ) : students.length === 0 ? (
        <NoStudent />
      ) : (
        <ul className="space-y-3">
          {students.map((s) => {
            const name = studentDisplayName(s)
            return (
              <li key={s.id}>
                <Link href={`/parent/students/${s.id}`}>
                  <Card className="flex items-center gap-3 transition hover:shadow-md">
                    <Avatar name={name} src={s.photo} size={48} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">{name}</p>
                      <p className="truncate text-sm text-zinc-500">
                        {[s.className, s.matricule].filter(Boolean).join(' · ') || '—'}
                      </p>
                      <div className="mt-1 flex gap-2">
                        {s.attendanceRate != null && <Pill>{Math.round(s.attendanceRate)} % présence</Pill>}
                        {s.balance != null && s.balance > 0 && <Pill tone="amber">{formatMoney(s.balance)}</Pill>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-zinc-400" />
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      <div className="mt-6 text-center">
        <Link href="/parent/students/pre-enroll" className="text-sm font-medium text-teal-700 underline underline-offset-2">
          Pré-inscrire un nouvel enfant
        </Link>
      </div>
    </>
  )
}
