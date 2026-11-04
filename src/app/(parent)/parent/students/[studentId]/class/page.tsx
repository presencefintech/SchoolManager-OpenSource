'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Phone } from 'lucide-react'
import { asList, parentApi, studentDisplayName } from '@/lib/parent/api'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { getApiErrorMessage } from '@/lib/api/client'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader } from '@/components/parent/ui'

type Rec = Record<string, unknown>
const str = (v: unknown) => (v == null ? '' : String(v).trim())

function scalarEntries(data: Rec | undefined): Array<[string, string]> {
  return Object.entries(data ?? {})
    .filter(([, v]) => v != null && typeof v !== 'object' && str(v) !== '')
    .map(([k, v]) => [k, str(v)])
}

function InfoCard({ title, data }: { title: string; data: Rec | undefined }) {
  const rows = scalarEntries(data)
  if (rows.length === 0) return null
  return (
    <Card className="space-y-2">
      <h2 className="font-semibold">{title}</h2>
      <dl className="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex justify-between gap-3 border-b border-line py-1.5">
            <dt className="text-zinc-500">{k}</dt>
            <dd className="text-right font-medium">{v}</dd>
          </div>
        ))}
      </dl>
    </Card>
  )
}

export default function ParentClassHubPage() {
  const params = useParams<{ studentId: string }>()
  const studentId = Number(params.studentId)
  const { students } = useSelectedStudent()
  // L'identifiant de classe n'est exposé que par le cercle de l'école (comme dans l'app mobile).
  const circle = useQuery({ queryKey: ['parent', 'school-circle'], queryFn: parentApi.schoolCircle, staleTime: 60_000 })

  const student = students.find((s) => s.id === studentId)
  const circleChild = [...(circle.data?.children ?? []), ...(circle.data?.students ?? [])].find(
    (c) => Number(c.studentId ?? c.id) === studentId,
  )
  const rawClassId = Number(circleChild?.classId)
  const classId = Number.isFinite(rawClassId) && rawClassId > 0 ? rawClassId : undefined
  const homeroom = (circleChild?.teacher ?? null) as Record<string, unknown> | null

  const details = useQuery({
    queryKey: ['parent', 'class', classId, 'details'],
    queryFn: () => parentApi.classDetails(classId as number),
    enabled: classId != null,
  })
  const logistics = useQuery({
    queryKey: ['parent', 'class', classId, 'logistics'],
    queryFn: () => parentApi.classLogistics(classId as number),
    enabled: classId != null,
  })
  const contacts = useQuery({
    queryKey: ['parent', 'class', classId, 'contacts'],
    queryFn: async () => asList<Rec>(await parentApi.classContacts(classId as number)),
    enabled: classId != null,
  })

  const name = student ? studentDisplayName(student) : 'Élève'

  return (
    <div className="space-y-4">
      <Link href={`/parent/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> {name}
      </Link>
      <PageHeader title={student?.className ? `Classe ${student.className}` : 'Classe'} subtitle="Informations pratiques et contacts de la classe." />

      {classId == null ? (
        circle.isLoading ? (
          <ListSkeleton rows={3} />
        ) : (
          <EmptyState title="Classe introuvable" hint="La classe de cet enfant n'est pas encore renseignée." />
        )
      ) : (
        <>
          {homeroom && str(homeroom.name) && (
            <Card className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs uppercase text-zinc-500">{str(homeroom.roleLabel) || 'Titulaire'}</p>
                <p className="truncate font-medium">{str(homeroom.name)}</p>
              </div>
              {str(homeroom.phone) && (
                <a href={`tel:${str(homeroom.phone)}`} className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
                  <Phone className="h-4 w-4" /> {str(homeroom.phone)}
                </a>
              )}
            </Card>
          )}
          {details.isLoading ? <ListSkeleton rows={2} /> : details.isError ? <ErrorState message={getApiErrorMessage(details.error)} onRetry={() => void details.refetch()} /> : <InfoCard title="Informations" data={details.data} />}
          {logistics.isLoading ? null : logistics.isError ? null : <InfoCard title="Logistique" data={logistics.data} />}

          <section className="space-y-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-500">Contacts</h2>
            {contacts.isLoading ? (
              <ListSkeleton rows={2} />
            ) : contacts.isError ? (
              <ErrorState message={getApiErrorMessage(contacts.error)} onRetry={() => void contacts.refetch()} />
            ) : (contacts.data?.length ?? 0) === 0 ? (
              <EmptyState title="Aucun contact" />
            ) : (
              <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
                {contacts.data!.map((c, i) => {
                  const label =
                    str(c.name ?? c.fullName) || [str(c.firstName), str(c.lastName)].filter(Boolean).join(' ') || str(c.role) || 'Contact'
                  const phone = str(c.phone ?? c.telephone)
                  return (
                    <li key={str(c.id) || i} className="flex items-center justify-between gap-3 px-4 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{label}</p>
                        {str(c.role ?? c.relationship) && <p className="truncate text-xs text-zinc-500">{str(c.role ?? c.relationship)}</p>}
                      </div>
                      {phone && (
                        <a href={`tel:${phone}`} className="inline-flex items-center gap-1 text-sm text-teal-700 hover:underline">
                          <Phone className="h-4 w-4" /> {phone}
                        </a>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  )
}
