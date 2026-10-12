'use client'

import { useState } from 'react'
import { HeartHandshake, Plus, RefreshCw, Ban, Users2 } from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { getApiErrorMessage } from '@/lib/api/client'
import { useFeeStructures } from '@/lib/hooks/admin/finance'
import { FinanceStudentSearchField } from '@/components/finance/student-search-field'
import {
  financeScholarshipApi,
  type ScholarshipItem,
  type SponsorType,
} from '@/lib/admin/api/finance-scholarship.api'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { FinancePageHeader, FinancePageShell, FinancePanel, FinanceEmptyState } from '@/components/finance/finance-page-shell'

const SPONSOR_TYPE_LABEL: Record<SponsorType, string> = {
  NGO: 'ONG',
  COMPANY: 'Entreprise',
  INDIVIDUAL: 'Particulier',
}

function SponsorsPanel({ onCreated }: { onCreated: () => void }) {
  const qc = useQueryClient()
  const [name, setName] = useState('')
  const [type, setType] = useState<SponsorType>('INDIVIDUAL')
  const [err, setErr] = useState('')

  const sponsorsQuery = useQuery({
    queryKey: ['finance', 'sponsors'],
    queryFn: () => financeScholarshipApi.listSponsors(),
    staleTime: 60_000,
  })

  const createMut = useMutation({
    mutationFn: () => financeScholarshipApi.createSponsor({ name: name.trim(), type }),
    onSuccess: () => {
      setName('')
      qc.invalidateQueries({ queryKey: ['finance', 'sponsors'] })
      onCreated()
    },
  })

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    if (!name.trim()) return
    try {
      await createMut.mutateAsync()
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  const sponsors = sponsorsQuery.data ?? []

  return (
    <FinancePanel title="Sponsors" icon={Users2}>
      <form onSubmit={handleCreate} className="flex flex-wrap items-center gap-2 px-5 py-4 border-b border-zinc-100">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nom du sponsor (ONG, entreprise, particulier…)"
          className="px-3 py-2 text-sm border border-zinc-200 rounded-xl flex-1 min-w-[200px]"
        />
        <select
          value={type}
          onChange={(e) => setType(e.target.value as SponsorType)}
          className="px-3 py-2 text-sm border border-zinc-200 rounded-xl bg-white"
        >
          {(Object.keys(SPONSOR_TYPE_LABEL) as SponsorType[]).map((t) => (
            <option key={t} value={t}>
              {SPONSOR_TYPE_LABEL[t]}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={!name.trim() || createMut.isPending}
          className="inline-flex items-center gap-1.5 px-3 py-2 text-sm rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          <Plus size={14} /> Ajouter
        </button>
      </form>
      {err && <p className="mx-5 mt-3 text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}

      {sponsorsQuery.isLoading ? (
        <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
      ) : sponsors.length === 0 ? (
        <FinanceEmptyState icon={Users2} title="Aucun sponsor" description="Ajoutez un premier sponsor ci-dessus." />
      ) : (
        <ul className="divide-y divide-zinc-50">
          {sponsors.map((s) => (
            <li key={s.id} className="px-5 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-zinc-900">{s.name}</p>
                <p className="text-[11px] text-zinc-400">{SPONSOR_TYPE_LABEL[s.type]}</p>
              </div>
            </li>
          ))}
        </ul>
      )}
    </FinancePanel>
  )
}

function ScholarshipsPanel() {
  const { format: formatMoney } = useSchoolMoney()
  const qc = useQueryClient()
  const [studentId, setStudentId] = useState(0)
  const [sponsorId, setSponsorId] = useState<number | ''>('')
  const [feeStructureId, setFeeStructureId] = useState<number | ''>('')
  const [type, setType] = useState<'EXEMPT' | 'OVERRIDE'>('EXEMPT')
  const [percentOverride, setPercentOverride] = useState('')
  const [reason, setReason] = useState('')
  const [err, setErr] = useState('')
  const [ok, setOk] = useState('')

  const sponsorsQuery = useQuery({
    queryKey: ['finance', 'sponsors'],
    queryFn: () => financeScholarshipApi.listSponsors(),
    staleTime: 60_000,
  })
  const feeStructuresQuery = useFeeStructures({ isActive: true })
  const listQuery = useQuery({
    queryKey: ['finance', 'scholarships'],
    queryFn: () => financeScholarshipApi.listScholarships(),
    staleTime: 20_000,
  })

  const createMut = useMutation({
    mutationFn: financeScholarshipApi.createScholarship,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'scholarships'] }),
  })
  const endMut = useMutation({
    mutationFn: (id: number) => financeScholarshipApi.endScholarship(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance', 'scholarships'] }),
  })

  const sponsors = sponsorsQuery.data ?? []
  const feeStructures = feeStructuresQuery.data ?? []
  const items = listQuery.data ?? []

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setErr('')
    setOk('')
    if (!studentId || !sponsorId || !feeStructureId || reason.trim().length < 3) {
      setErr('Élève, sponsor, barème de frais et motif sont requis.')
      return
    }
    try {
      const created = await createMut.mutateAsync({
        studentId,
        sponsorId: Number(sponsorId),
        feeStructureId: Number(feeStructureId),
        type,
        percentOverride: type === 'OVERRIDE' && percentOverride ? Number(percentOverride) : undefined,
        reason: reason.trim(),
      })
      setOk(`Bourse créée (#${created.id})`)
      setStudentId(0)
      setSponsorId('')
      setFeeStructureId('')
      setPercentOverride('')
      setReason('')
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  async function handleEnd(item: ScholarshipItem) {
    if (!window.confirm(`Terminer la bourse de ${item.student?.firstName ?? 'cet élève'} ?`)) return
    try {
      await endMut.mutateAsync(item.id)
    } catch (error) {
      setErr(getApiErrorMessage(error))
    }
  }

  return (
    <div className="grid lg:grid-cols-5 gap-6">
      <form
        onSubmit={handleCreate}
        className="lg:col-span-2 rounded-2xl border border-zinc-200/70 bg-white p-5 space-y-4 h-fit"
      >
        <h2 className="text-sm font-semibold text-zinc-800 flex items-center gap-2">
          <Plus size={14} className="text-emerald-600" />
          Nouvelle bourse
        </h2>

        <FinanceStudentSearchField studentId={studentId} onSelect={(id) => setStudentId(id)} required />

        <div>
          <label className="text-xs font-medium text-zinc-600">Sponsor</label>
          <select
            value={sponsorId}
            onChange={(e) => setSponsorId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="">—</option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-600">Barème de frais couvert</label>
          <select
            value={feeStructureId}
            onChange={(e) => setFeeStructureId(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
          >
            <option value="">—</option>
            {feeStructures.map((f) => (
              <option key={f.id} value={f.id}>
                {f.label} ({formatMoney(f.amount)})
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-600">Prise en charge</label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as 'EXEMPT' | 'OVERRIDE')}
              className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg bg-white"
            >
              <option value="EXEMPT">Totale (exemption)</option>
              <option value="OVERRIDE">Partielle (%)</option>
            </select>
          </div>
          {type === 'OVERRIDE' && (
            <div>
              <label className="text-xs font-medium text-zinc-600">% pris en charge</label>
              <input
                type="number"
                min={0}
                max={100}
                value={percentOverride}
                onChange={(e) => setPercentOverride(e.target.value)}
                className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
              />
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-600">Motif</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={2}
            className="mt-1 w-full px-3 py-2 text-sm border border-zinc-200 rounded-lg"
            placeholder="Bourse ONG Espoir — rentrée 2026…"
          />
        </div>

        {err && <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2">{err}</p>}
        {ok && <p className="text-xs text-emerald-600">{ok}</p>}
        <button
          type="submit"
          disabled={createMut.isPending}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:bg-emerald-400"
        >
          {createMut.isPending ? 'Enregistrement…' : 'Créer la bourse'}
        </button>
      </form>

      <div className="lg:col-span-3 rounded-2xl border border-zinc-200/70 bg-white overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <h2 className="text-sm font-semibold text-zinc-800">Bourses ({items.length})</h2>
          <button
            type="button"
            onClick={() => listQuery.refetch()}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs rounded-lg border border-zinc-200 hover:bg-zinc-50"
          >
            <RefreshCw size={12} className={cn(listQuery.isFetching && 'animate-spin')} />
            Actualiser
          </button>
        </div>

        {listQuery.isLoading ? (
          <div className="p-8 text-center text-sm text-zinc-400">Chargement…</div>
        ) : items.length === 0 ? (
          <FinanceEmptyState icon={HeartHandshake} title="Aucune bourse" description="Créez la première bourse à gauche." />
        ) : (
          <ul className="divide-y divide-zinc-100 max-h-[36rem] overflow-y-auto">
            {items.map((item) => (
              <li key={item.id} className="px-4 py-3 hover:bg-zinc-50/80">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={cn(
                          'text-[11px] font-semibold px-2 py-0.5 rounded-full',
                          item.active ? 'bg-emerald-50 text-emerald-700' : 'bg-zinc-100 text-zinc-500',
                        )}
                      >
                        {item.active ? 'Active' : 'Terminée'}
                      </span>
                      <span className="text-[11px] text-zinc-400">{item.sponsor.name}</span>
                    </div>
                    <p className="mt-1 text-sm font-semibold text-zinc-900">
                      {item.student ? `${item.student.lastName} ${item.student.firstName}` : `Élève #${item.studentId}`}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {item.feeAssignment.feeStructureName} · {item.feeAssignment.type === 'EXEMPT' ? 'Exemption totale' : 'Partielle'}
                    </p>
                  </div>
                  {item.active && (
                    <button
                      type="button"
                      onClick={() => handleEnd(item)}
                      className="flex-shrink-0 inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-red-200 text-red-700 hover:bg-red-50"
                    >
                      <Ban size={12} /> Terminer
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

export default function FinanceBoursesPage() {
  const [refreshTick, setRefreshTick] = useState(0)

  return (
    <FinancePageShell>
      <FinancePageHeader
        title="Bourses & subventions"
        subtitle="Suivi des élèves financés par un sponsor — s'appuie sur l'exemption de frais existante"
      />
      <SponsorsPanel onCreated={() => setRefreshTick((t) => t + 1)} />
      <ScholarshipsPanel key={refreshTick} />
    </FinancePageShell>
  )
}
