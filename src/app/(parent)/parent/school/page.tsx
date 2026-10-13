'use client'

import Link from 'next/link'
import { BookOpenCheck, Bot, ClipboardList, ShieldCheck } from 'lucide-react'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ListSkeleton, NoStudent, PageHeader, StudentSwitcher } from '@/components/parent/ui'

const ITEMS = [
  { href: '/parent/school/assignments', icon: ClipboardList, label: 'Devoirs', hint: 'À rendre et notes' },
  { href: '/parent/school/quizzes', icon: BookOpenCheck, label: 'Quiz', hint: "Exercices d'entraînement" },
  { href: '/parent/school/ai-tutor', icon: Bot, label: 'Tuteur IA', hint: "Aide aux devoirs" },
  { href: '/parent/school/circle', icon: ShieldCheck, label: "Cercle de l'école", hint: 'Contacts, remise, absences' },
]

/** Hub scolarité (équivalent `parent_academic_hub.dart`). */
export default function ParentSchoolHubPage() {
  const { studentId, isLoading } = useSelectedStudent()
  if (isLoading) return <ListSkeleton />
  if (studentId == null) return <NoStudent />

  return (
    <>
      <PageHeader title="Scolarité" />
      <StudentSwitcher />
      <div className="grid grid-cols-2 gap-3">
        {ITEMS.map(({ href, icon: Icon, label, hint }) => (
          <Link key={href} href={href}>
            <Card className="flex h-full flex-col gap-2 transition hover:shadow-md">
              <Icon className="h-6 w-6 text-teal-600" />
              <p className="font-semibold">{label}</p>
              <p className="text-xs text-zinc-500">{hint}</p>
            </Card>
          </Link>
        ))}
      </div>
    </>
  )
}
