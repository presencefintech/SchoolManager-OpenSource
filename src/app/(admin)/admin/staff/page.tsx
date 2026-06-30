'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Users, Plus, Trash2, Loader2, X, Mail, Phone, BookOpen, CheckCircle, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useStaff, useCreateStaff, useDisableStaff } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import type { CreateStaffPayload } from '@/types/admin'
import { Skeleton } from '@/components/ui/skeleton'

function Sk({ className }: { className?: string }) {
  return <div className={cn('rounded-xl bg-zinc-100 animate-pulse', className)} />
}

const ROLE_CFG: Record<string, { label: string; cls: string }> = {
  ADMIN:   { label: 'Admin',      cls: 'bg-indigo-50 text-indigo-700' },
  TEACHER: { label: 'Enseignant', cls: 'bg-emerald-50 text-emerald-700' },
  FINANCE: { label: 'Finance',    cls: 'bg-amber-50 text-amber-700' },
}

export default function StaffPage() {
  const { data: staff, isLoading } = useStaff()
  const createMutation = useCreateStaff()
  const disableMutation = useDisableStaff()
  const [showModal, setShowModal] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState<CreateStaffPayload>({
    firstName: '', lastName: '', email: '', password: '', role: 'TEACHER',
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    try {
      await createMutation.mutateAsync(form)
      setShowModal(false)
      setForm({ firstName: '', lastName: '', email: '', password: '', role: 'TEACHER' })
    } catch (err) {
      setError(getApiErrorMessage(err))
    }
  }

  async function handleDisable(id: number) {
    if (!confirm('Désactiver ce membre du personnel ?')) return
    await disableMutation.mutateAsync(id)
  }

  return (
    <div className="min-h-screen bg-zinc-50">
      <motion.div
        className="bg-white border-b border-zinc-200"
        initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
      >
        <div className="max-w-5xl mx-auto flex items-center justify-between px-8 py-6">
          <div>
            <h1 className="text-2xl font-semibold text-zinc-900">Personnel</h1>
            <p className="text-sm text-zinc-400 mt-0.5">{staff?.length ?? 0} membre{(staff?.length ?? 0) !== 1 ? 's' : ''}</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <Plus size={15} />
            Ajouter
          </button>
        </div>
      </motion.div>

      <div className="max-w-5xl mx-auto px-8 py-8 space-y-5">
        {!isLoading && staff && staff.length > 0 && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Total membres', value: staff.length,                                     icon: Users,       bg: 'bg-indigo-50',  iconCls: 'text-indigo-600' },
              { label: 'Enseignants',   value: staff.filter(m => m.role === 'TEACHER').length,   icon: BookOpen,    bg: 'bg-emerald-50', iconCls: 'text-emerald-600' },
              { label: 'Finance',       value: staff.filter(m => m.role === 'FINANCE').length,   icon: TrendingUp,  bg: 'bg-amber-50',   iconCls: 'text-amber-600' },
              { label: 'Actifs',        value: staff.filter(m => m.status === 'ACTIVE').length,  icon: CheckCircle, bg: 'bg-blue-50',    iconCls: 'text-blue-600' },
            ].map(({ label, value, icon: Icon, bg, iconCls }) => (
              <div key={label} className="bg-white rounded-2xl border border-zinc-100 px-4 py-4 flex items-center gap-3 shadow-sm">
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', bg)}>
                  <Icon size={15} className={iconCls} />
                </div>
                <div>
                  <p className="text-[11px] text-zinc-400 uppercase tracking-wide">{label}</p>
                  <p className="text-xl font-bold text-zinc-900 leading-none tabular-nums mt-0.5">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="bg-white rounded-xl border border-zinc-200 shadow-[0_1px_4px_rgba(0,0,0,0.06)] overflow-hidden">
          {isLoading ? (
            <div className="p-6 space-y-3">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14" />)}</div>
          ) : staff?.length ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-zinc-100">
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Nom</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Contact</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Rôle</th>
                  <th className="text-left text-xs font-semibold text-zinc-400 uppercase tracking-wide px-6 py-3">Statut</th>
                  <th className="px-6 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-50">
                {staff.map((member) => {
                  const roleCfg = ROLE_CFG[member.role] ?? { label: member.role, cls: 'bg-zinc-100 text-zinc-500' }
                  return (
                    <tr key={member.id} className="hover:bg-zinc-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-xs font-bold text-emerald-700">
                              {(member.firstName?.[0] ?? '') + (member.lastName?.[0] ?? '')}
                            </span>
                          </div>
                          <p className="text-sm font-medium text-zinc-900">{member.firstName} {member.lastName}</p>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-0.5">
                          {member.email && <p className="text-xs text-zinc-500 flex items-center gap-1"><Mail size={10} />{member.email}</p>}
                          {member.phone && <p className="text-xs text-zinc-500 flex items-center gap-1"><Phone size={10} />{member.phone}</p>}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full', roleCfg.cls)}>{roleCfg.label}</span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={cn('text-xs font-medium px-2 py-1 rounded-full',
                          member.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500'
                        )}>
                          {member.status === 'ACTIVE' ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {member.role !== 'ADMIN' && (
                          <button
                            onClick={() => handleDisable(member.id)}
                            disabled={disableMutation.isPending}
                            className="p-1.5 rounded-lg text-zinc-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 gap-2 text-sm text-zinc-400">
              <Users size={28} className="text-zinc-200" />
              Aucun membre du personnel
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md"
          >
            <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-100">
              <h2 className="text-base font-semibold text-zinc-900">Nouveau membre</h2>
              <button onClick={() => setShowModal(false)} className="p-1.5 rounded-lg hover:bg-zinc-100 text-zinc-400 transition-colors">
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {(['firstName', 'lastName'] as const).map((field) => (
                  <div key={field}>
                    <label className="block text-xs font-medium text-zinc-600 mb-1">
                      {field === 'firstName' ? 'Prénom' : 'Nom'}
                    </label>
                    <input
                      value={form[field]}
                      onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
                      required
                      className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                    />
                  </div>
                ))}
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Email</label>
                <input
                  type="email" value={form.email}
                  onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Mot de passe</label>
                <input
                  type="password" value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  required minLength={8}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-600 mb-1">Rôle</label>
                <select
                  value={form.role}
                  onChange={e => setForm(f => ({ ...f, role: e.target.value as 'TEACHER' | 'FINANCE' }))}
                  className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400"
                >
                  <option value="TEACHER">Enseignant</option>
                  <option value="FINANCE">Finance</option>
                </select>
              </div>
              {error && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button" onClick={() => setShowModal(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit" disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-sm font-medium transition-colors"
                >
                  {createMutation.isPending && <Loader2 size={14} className="animate-spin" />}
                  Créer
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  )
}
