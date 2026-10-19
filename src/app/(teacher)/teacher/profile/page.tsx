'use client'

import { UserRound } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { SecurityProfilePanel } from '@/components/auth/security-profile-panel'
import { Card, PageHeader } from '@/components/teacher/ui'

export default function TeacherProfilePage() {
  const { user } = useAuth()
  const rows: Array<[string, string | null | undefined]> = [
    ['Nom', [user?.firstName, user?.lastName].filter(Boolean).join(' ')],
    ['Email', user?.email],
    ['Téléphone', (user as { phone?: string | null } | null)?.phone],
    ['Rôle', 'Enseignant'],
  ]

  return (
    <div className="space-y-6">
      <PageHeader icon={<UserRound className="h-6 w-6 text-teal-600" />} title="Mon profil" subtitle="Informations du compte et sécurité." />
      <Card>
        <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
          {rows.map(([label, value]) => (
            <div key={label} className="flex justify-between gap-3 border-b border-slate-100 py-1.5 text-sm dark:border-slate-800">
              <dt className="text-slate-500">{label}</dt>
              <dd className="text-right font-medium">{value || '—'}</dd>
            </div>
          ))}
        </dl>
      </Card>
      <SecurityProfilePanel />
    </div>
  )
}
