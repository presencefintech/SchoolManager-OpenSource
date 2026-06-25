'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, RefreshCw, BookOpen, Users, TrendingUp, ToggleLeft, Search, ChevronRight } from 'lucide-react'
import { useClasses, useCreateClass, useToggleClassStatus, useRollover } from '@/lib/hooks/use-admin'
import type { CreateClassPayload, RolloverPayload } from '@/types/admin'

const fadeUp = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.28, ease: 'easeOut' } } }
const stagger = { hidden: {}, show: { transition: { staggerChildren: 0.07 } } }

function CreateClassModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useCreateClass()
  const [form, setForm] = useState<CreateClassPayload>({ name: '', level: '', capacity: undefined, teacherId: undefined })
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync({ ...form, capacity: form.capacity ? Number(form.capacity) : undefined })
      onClose()
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors de la création')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-5">Nouvelle classe</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Nom *</label>
            <input
              required
              value={form.name}
              onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
              placeholder="Ex: 6ème A"
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-zinc-500 mb-1">Niveau</label>
            <input
              value={form.level ?? ''}
              onChange={e => setForm(p => ({ ...p, level: e.target.value }))}
              placeholder="Ex: Collège, Lycée..."
              className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Capacité max</label>
              <input
                type="number"
                min={1}
                value={form.capacity ?? ''}
                onChange={e => setForm(p => ({ ...p, capacity: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="30"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">ID Professeur</label>
              <input
                type="number"
                min={1}
                value={form.teacherId ?? ''}
                onChange={e => setForm(p => ({ ...p, teacherId: e.target.value ? Number(e.target.value) : undefined }))}
                placeholder="Optionnel"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
          </div>
          {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
          <div className="flex gap-2 pt-2">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 transition-colors">
              Annuler
            </button>
            <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors">
              {isPending ? 'Création...' : 'Créer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function RolloverModal({ onClose }: { onClose: () => void }) {
  const { mutateAsync, isPending } = useRollover()
  const [form, setForm] = useState<RolloverPayload>({ fromYear: '', toYear: '' })
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    try {
      await mutateAsync(form)
      setSuccess(true)
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Erreur lors du passage annuel')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 mx-4">
        <h2 className="text-lg font-semibold text-zinc-900 mb-1">Passage annuel</h2>
        <p className="text-xs text-zinc-400 mb-5">Migre toutes les classes vers la nouvelle année scolaire</p>
        {success ? (
          <div className="text-center py-6">
            <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
              <TrendingUp size={20} className="text-emerald-600" />
            </div>
            <p className="text-sm font-medium text-zinc-800">Passage annuel effectué</p>
            <button onClick={onClose} className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white">Fermer</button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Année source</label>
              <input
                required
                value={form.fromYear}
                onChange={e => setForm(p => ({ ...p, fromYear: e.target.value }))}
                placeholder="2024-2025"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-zinc-500 mb-1">Nouvelle année</label>
              <input
                required
                value={form.toYear}
                onChange={e => setForm(p => ({ ...p, toYear: e.target.value }))}
                placeholder="2025-2026"
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
              />
            </div>
            {error && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
            <div className="flex gap-2 pt-2">
              <button type="button" onClick={onClose} className="flex-1 px-4 py-2 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50">
                Annuler
              </button>
              <button type="submit" disabled={isPending} className="flex-1 px-4 py-2 rounded-xl bg-amber-500 text-sm text-white font-medium hover:bg-amber-600 disabled:opacity-50">
                {isPending ? 'En cours...' : 'Lancer'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}

export default function ClassesPage() {
  const [search, setSearch] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showRollover, setShowRollover] = useState(false)
  const { data: classes = [], isLoading, refetch } = useClasses()
  const { mutate: toggle } = useToggleClassStatus()

  const filtered = classes.filter(c =>
    !search || c.name.toLowerCase().includes(search.toLowerCase()) || c.level?.toLowerCase().includes(search.toLowerCase())
  )

  const active = classes.filter(c => c.isActive).length
  const totalStudents = classes.reduce((acc, c) => acc + (c.studentCount ?? 0), 0)

  return (
    <div className="min-h-screen bg-zinc-50/50">
      <div className="max-w-6xl mx-auto px-6 py-8 space-y-6">
        {/* Header */}
        <motion.div
          className="flex items-center justify-between"
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
        >
          <div>
            <h1 className="text-2xl font-bold text-zinc-900">Classes</h1>
            <p className="text-sm text-zinc-500 mt-0.5">{classes.length} classe{classes.length !== 1 ? 's' : ''} · {active} actives · {totalStudents} élèves</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowRollover(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl border border-amber-200 bg-amber-50 text-sm text-amber-700 font-medium hover:bg-amber-100 transition-colors"
            >
              <RefreshCw size={14} />
              Passage annuel
            </button>
            <button
              onClick={() => setShowCreate(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 text-sm text-white font-medium hover:bg-emerald-700 transition-colors shadow-sm"
            >
              <Plus size={14} />
              Nouvelle classe
            </button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div className="grid grid-cols-3 gap-4" variants={stagger} initial="hidden" animate="show">
          {[
            { label: 'Total classes', value: classes.length, icon: BookOpen, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Élèves inscrits', value: totalStudents, icon: Users, color: 'text-emerald-600', bg: 'bg-emerald-50' },
            { label: 'Classes actives', value: active, icon: TrendingUp, color: 'text-violet-600', bg: 'bg-violet-50' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <motion.div key={label} variants={fadeUp} className="bg-white rounded-2xl border border-zinc-100 p-5 shadow-sm">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl ${bg} flex items-center justify-center`}>
                  <Icon size={16} className={color} />
                </div>
                <div>
                  <p className="text-xs text-zinc-500">{label}</p>
                  <p className="text-2xl font-bold text-zinc-900">{value}</p>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>

        {/* Search */}
        <div className="relative">
          <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Rechercher par nom ou niveau..."
            className="w-full pl-9 pr-4 py-2.5 bg-white border border-zinc-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
        </div>

        {/* Table */}
        <motion.div
          className="bg-white rounded-2xl border border-zinc-100 shadow-sm overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.15 }}
        >
          {isLoading ? (
            <div className="p-12 text-center text-zinc-400 text-sm">Chargement...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <BookOpen size={32} className="mx-auto text-zinc-300 mb-3" />
              <p className="text-zinc-500 text-sm">{search ? 'Aucun résultat' : 'Aucune classe créée'}</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-100 bg-zinc-50/50">
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Classe</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Niveau</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Élèves</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Capacité</th>
                  <th className="text-left px-5 py-3 text-xs font-semibold text-zinc-500">Statut</th>
                  <th className="px-5 py-3" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((cls) => (
                  <tr key={cls.id} className="border-b border-zinc-50 hover:bg-zinc-50/50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">{cls.name}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{cls.level ?? '—'}</td>
                    <td className="px-5 py-3.5 text-zinc-700">{cls.studentCount ?? 0}</td>
                    <td className="px-5 py-3.5 text-zinc-500">{cls.capacity ?? '—'}</td>
                    <td className="px-5 py-3.5">
                      <button
                        onClick={() => toggle(cls.id)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          cls.isActive
                            ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            : 'bg-zinc-100 text-zinc-500 hover:bg-zinc-200'
                        }`}
                      >
                        <ToggleLeft size={11} />
                        {cls.isActive ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <Link
                        href={`/admin/classes/${cls.id}`}
                        className="inline-flex items-center gap-1 text-xs text-emerald-600 hover:text-emerald-700 font-medium"
                      >
                        Voir
                        <ChevronRight size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </motion.div>
      </div>

      {showCreate && <CreateClassModal onClose={() => setShowCreate(false)} />}
      {showRollover && <RolloverModal onClose={() => setShowRollover(false)} />}
    </div>
  )
}
