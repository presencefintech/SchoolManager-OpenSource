'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, CalendarCheck, QrCode, School, ShieldCheck, Wallet } from 'lucide-react'
import { parentApi, formatMoney, studentDisplayName } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Avatar, Card, EmptyState, ErrorState, ListSkeleton, PageHeader, Pill, statusTone } from '@/components/parent/ui'

const STATUS_LABEL: Record<string, string> = {
  PRESENT: 'Présent',
  ABSENT: 'Absent',
  LATE: 'En retard',
  EXCUSED: 'Excusé',
  EXITED: 'Sorti',
}

export default function StudentDetailPage() {
  const params = useParams<{ studentId: string }>()
  const studentId = Number(params.studentId)
  const { students } = useSelectedStudent()
  const student = students.find((s) => s.id === studentId)
  const name = student ? studentDisplayName(student) : 'Élève'

  const attendance = useQuery({
    queryKey: parentKeys.attendance(studentId),
    queryFn: () => parentApi.attendance(studentId, { page: 1, limit: 20 }),
    enabled: Number.isFinite(studentId),
  })

  const entries = attendance.data?.data ?? []

  return (
    <div className="space-y-4">
      <PageHeader title={name} subtitle={[student?.className, student?.matricule].filter(Boolean).join(' · ')} />

      <Card className="flex items-center gap-3">
        <Avatar name={name} src={student?.photo} size={64} />
        <div className="flex flex-wrap gap-2">
          {student?.isSecure && (
            <Pill tone="green">
              <ShieldCheck className="mr-1 h-3 w-3" /> Profil sécurisé
            </Pill>
          )}
          {student?.attendanceRate != null && <Pill>{Math.round(student.attendanceRate)} % de présence</Pill>}
          {student?.balance != null && student.balance > 0 && <Pill tone="amber">Solde {formatMoney(student.balance)}</Pill>}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
        <QuickLink href={`/parent/students/${studentId}/class`} icon={School} label="Classe" />
        <QuickLink href={`/parent/students/${studentId}/attendance`} icon={CalendarCheck} label="Présences" />
        <QuickLink href={`/parent/students/${studentId}/pass`} icon={QrCode} label="Pass" />
        <QuickLink href={`/parent/finance?student=${studentId}`} icon={Wallet} label="Finance" />
        <QuickLink href={`/parent/school?student=${studentId}`} icon={BookOpen} label="Scolarité" />
      </div>

      <section aria-label="Présences récentes">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Présences récentes</h2>
          <Link href={`/parent/students/${studentId}/attendance`} className="text-sm font-medium text-teal-700 underline underline-offset-2">
            Tout l’historique
          </Link>
        </div>
        {attendance.isLoading ? (
          <ListSkeleton rows={3} />
        ) : attendance.isError ? (
          <ErrorState onRetry={() => void attendance.refetch()} />
        ) : entries.length === 0 ? (
          <EmptyState title="Aucun pointage enregistré" />
        ) : (
          <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
            {entries.map((e) => (
              <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <p className="text-sm font-medium">
                    {new Date(e.scannedAt).toLocaleDateString('fr-FR', {
                      weekday: 'short',
                      day: '2-digit',
                      month: 'short',
                    })}{' '}
                    ·{' '}
                    {new Date(e.scannedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                  <p className="text-xs text-zinc-500">{e.direction === 'EXIT' ? 'Sortie' : 'Arrivée'}{e.method ? ` · ${e.method}` : ''}</p>
                </div>
                <Pill tone={statusTone(e.status)}>{STATUS_LABEL[e.status] ?? e.status}</Pill>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}

function QuickLink({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-1 rounded-2xl border border-line bg-surface p-3 text-sm font-medium transition hover:shadow-md"
    >
      <Icon className="h-6 w-6 text-teal-600" />
      {label}
    </Link>
  )
}
