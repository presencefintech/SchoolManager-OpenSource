'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ExternalLink, Loader2, Moon, Sun, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUpdateSchoolSaas } from '@/lib/hooks/use-super-admin'
import { useToast } from '@/providers/toast-provider'
import type { School, SchoolFeaturesMap, SchoolLifecycleStatus } from '@/types/super-admin'

const FEATURE_LABELS: { key: keyof SchoolFeaturesMap; label: string; hint: string }[] = [
  { key: 'printing', label: 'Impression cartes PVC', hint: 'PDF / batch cartes élèves' },
  { key: 'mobile_app', label: 'Application mobile', hint: 'Parents & enseignants' },
  { key: 'finance_reports', label: 'Rapports finance', hint: 'Exports & tableaux de bord' },
]

function StatusBadge({ status }: { status?: SchoolLifecycleStatus | string }) {
  const s = status ?? 'ACTIVE'
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300',
    SUSPENDED: 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300',
    PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300',
    EXPIRED: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-700 dark:text-zinc-200',
  }
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-[11px] font-semibold', map[s] ?? map.ACTIVE)}>
      {s}
    </span>
  )
}

function CapacityBar({ count, capacity }: { count: number; capacity: number | null | undefined }) {
  if (!capacity || capacity <= 0) {
    return <p className="text-xs text-zinc-500 dark:text-zinc-400">{count} élèves · capacité non définie</p>
  }
  const pct = Math.min(100, Math.round((count / capacity) * 100))
  const tone = pct >= 95 ? 'bg-red-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500'
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-xs text-zinc-600 dark:text-zinc-300">
        <span>
          {count} / {capacity} élèves
        </span>
        <span>{pct}%</span>
      </div>
      <div className="h-2 rounded-full bg-zinc-200 dark:bg-zinc-700 overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', tone)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function SchoolSaasDrawer({
  school,
  open,
  onClose,
  dark,
}: {
  school: School | null
  open: boolean
  onClose: () => void
  dark?: boolean
}) {
  const toast = useToast()
  const schoolId = school?.id ?? 0
  const mutation = useUpdateSchoolSaas(schoolId)

  const [status, setStatus] = useState<SchoolLifecycleStatus>('ACTIVE')
  const [tier, setTier] = useState<'BASIC' | 'PREMIUM' | 'ENTERPRISE'>('BASIC')
  const [contractExpiry, setContractExpiry] = useState('')
  const [capacity, setCapacity] = useState('')
  const [features, setFeatures] = useState<SchoolFeaturesMap>({
    printing: false,
    mobile_app: true,
    finance_reports: true,
  })
  const [cardPrinting, setCardPrinting] = useState(false)

  useEffect(() => {
    if (!school) return
    setStatus((school.status as SchoolLifecycleStatus) ?? (school.active ? 'ACTIVE' : 'SUSPENDED'))
    setTier((school.subscriptionTier as 'BASIC' | 'PREMIUM' | 'ENTERPRISE') || 'BASIC')
    setContractExpiry(school.contractExpiry ? school.contractExpiry.slice(0, 10) : '')
    setCapacity(school.studentCapacity != null ? String(school.studentCapacity) : '')
    setFeatures({
      printing: school.features?.printing ?? school.cardPrintingAllowed ?? false,
      mobile_app: school.features?.mobile_app ?? true,
      finance_reports: school.features?.finance_reports ?? true,
    })
    setCardPrinting(Boolean(school.cardPrintingAllowed ?? school.features?.printing))
  }, [school])

  if (!open || !school) return null

  const studentCount = school.studentCount ?? school._count?.students ?? 0

  async function persist(partial: Parameters<typeof mutation.mutateAsync>[0]) {
    try {
      await mutation.mutateAsync(partial)
      toast.success('Contrôles SaaS mis à jour')
    } catch {
      toast.error('Échec de la mise à jour')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button type="button" className="absolute inset-0 bg-black/40" aria-label="Fermer" onClick={onClose} />
      <aside
        className={cn(
          'relative h-full w-full max-w-md overflow-y-auto border-l shadow-2xl',
          dark
            ? 'bg-zinc-950 border-zinc-800 text-zinc-100'
            : 'bg-white border-zinc-200 text-zinc-900',
        )}
      >
        <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-zinc-200 dark:border-zinc-800 bg-inherit px-5 py-4">
          <div>
            <p className="text-[11px] uppercase tracking-wide text-zinc-500">Pilotage SaaS</p>
            <h2 className="text-lg font-semibold leading-tight">{school.name}</h2>
            <div className="mt-2">
              <StatusBadge status={status} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-6 px-5 py-5">
          <CapacityBar count={studentCount} capacity={school.studentCapacity} />

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Modules</h3>
            {FEATURE_LABELS.map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex items-center justify-between gap-3 rounded-xl border border-zinc-200 dark:border-zinc-800 px-3 py-2.5"
              >
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-[11px] text-zinc-500">{hint}</p>
                </div>
                <input
                  type="checkbox"
                  className="h-5 w-9 accent-indigo-600"
                  checked={Boolean(features[key])}
                  disabled={mutation.isPending}
                  onChange={(e) => {
                    const next = { ...features, [key]: e.target.checked }
                    setFeatures(next)
                    if (key === 'printing') setCardPrinting(e.target.checked)
                    void persist({
                      features: { [key]: e.target.checked },
                      ...(key === 'printing' ? { cardPrintingAllowed: e.target.checked } : {}),
                    })
                  }}
                />
              </label>
            ))}
            <label className="flex items-center justify-between gap-3 rounded-xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/50 dark:bg-indigo-950/30 px-3 py-2.5">
              <div>
                <p className="text-sm font-medium">cardPrintingAllowed</p>
                <p className="text-[11px] text-zinc-500">Flag dédié impression PVC</p>
              </div>
              <input
                type="checkbox"
                className="h-5 w-9 accent-indigo-600"
                checked={cardPrinting}
                disabled={mutation.isPending}
                onChange={(e) => {
                  setCardPrinting(e.target.checked)
                  setFeatures((f) => ({ ...f, printing: e.target.checked }))
                  void persist({ cardPrintingAllowed: e.target.checked })
                }}
              />
            </label>
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-semibold">Contrat</h3>
            <label className="block text-xs text-zinc-500">
              Statut
              <select
                value={status}
                onChange={(e) => {
                  const v = e.target.value as SchoolLifecycleStatus
                  setStatus(v)
                  void persist({ status: v })
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              >
                {(['ACTIVE', 'PENDING', 'SUSPENDED', 'EXPIRED'] as const).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-500">
              Tier
              <select
                value={tier}
                onChange={(e) => {
                  const v = e.target.value as 'BASIC' | 'PREMIUM' | 'ENTERPRISE'
                  setTier(v)
                  void persist({ subscriptionTier: v })
                }}
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              >
                {(['BASIC', 'PREMIUM', 'ENTERPRISE'] as const).map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-500">
              Expiration contrat
              <input
                type="date"
                value={contractExpiry}
                onChange={(e) => setContractExpiry(e.target.value)}
                onBlur={() =>
                  void persist({
                    contractExpiry: contractExpiry ? new Date(contractExpiry).toISOString() : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-500">
              Capacité théorique élèves
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                onBlur={() =>
                  void persist({
                    studentCapacity: capacity.trim() ? Number(capacity) : null,
                  })
                }
                className="mt-1 w-full rounded-lg border border-zinc-300 dark:border-zinc-700 bg-transparent px-3 py-2 text-sm"
              />
            </label>
          </section>

          <Link
            href={`/super-admin/schools/${school.id}`}
            className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600 dark:text-indigo-400"
          >
            Fiche complète <ExternalLink size={14} />
          </Link>

          {mutation.isPending ? (
            <p className="flex items-center gap-2 text-xs text-zinc-500">
              <Loader2 size={14} className="animate-spin" /> Enregistrement…
            </p>
          ) : null}
        </div>
      </aside>
    </div>
  )
}

export function ThemeToggle({
  dark,
  onToggle,
}: {
  dark: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="inline-flex items-center gap-2 rounded-lg border border-zinc-300 dark:border-zinc-700 px-3 py-1.5 text-xs font-medium"
      title="Basculer thème"
    >
      {dark ? <Sun size={14} /> : <Moon size={14} />}
      {dark ? 'Clair' : 'Sombre'}
    </button>
  )
}

export { StatusBadge, CapacityBar }
