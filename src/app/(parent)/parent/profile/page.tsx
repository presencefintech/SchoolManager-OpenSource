'use client'

import Link from 'next/link'
import { useQueryClient } from '@tanstack/react-query'
import { Bell, ChevronRight, KeyRound, LogOut, ShieldCheck, UsersRound } from 'lucide-react'
import { useAuth } from '@/providers/auth-provider'
import { Avatar, Card, PageHeader } from '@/components/parent/ui'

export default function ParentProfilePage() {
  const { user, logout } = useAuth()
  const queryClient = useQueryClient()
  const name = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()

  return (
    <>
      <PageHeader title="Profil" />
      <Card className="mb-4 flex items-center gap-3">
        <Avatar name={name || 'P'} size={56} />
        <div className="min-w-0">
          <p className="truncate font-semibold">{name || 'Parent'}</p>
          <p className="truncate text-sm text-zinc-500">{user?.email}</p>
          {user?.phone && <p className="truncate text-sm text-zinc-500">{user.phone}</p>}
        </div>
      </Card>

      <ul className="divide-y divide-line overflow-hidden rounded-2xl border border-line bg-surface">
        <Item href="/parent/students" icon={UsersRound} label="Mes enfants" />
        <Item href="/parent/profile/notifications" icon={Bell} label="Réglages des notifications" />
        <Item href="/parent/profile/security" icon={ShieldCheck} label="Journal de sécurité" />
        <Item href="/parent/profile/password" icon={KeyRound} label="Changer le mot de passe" />
      </ul>

      <button
        type="button"
        onClick={() => {
          queryClient.clear()
          void logout()
        }}
        className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-line px-4 py-2.5 font-medium text-red-600"
      >
        <LogOut className="h-4 w-4" /> Se déconnecter
      </button>
    </>
  )
}

function Item({
  href,
  icon: Icon,
  label,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
}) {
  return (
    <li>
      <Link href={href} className="flex items-center gap-3 px-4 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-900">
        <Icon className="h-5 w-5 text-teal-600" />
        <span className="flex-1 text-sm font-medium">{label}</span>
        <ChevronRight className="h-4 w-4 text-zinc-400" />
      </Link>
    </li>
  )
}
