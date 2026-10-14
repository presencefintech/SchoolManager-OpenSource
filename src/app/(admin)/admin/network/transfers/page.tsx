'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, Download, FileText, RefreshCw, Search } from 'lucide-react'
import { networkApi } from '@/lib/network/network.api'
import { cn } from '@/lib/utils'
import { useAuth } from '@/providers/auth-provider'

function monthBounds(): { from: string; to: string } {
  const now = new Date()
  const from = new Date(now.getFullYear(), now.getMonth(), 1)
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export default function NetworkTransfersPage() {
  const { user } = useAuth()
  const bounds = useMemo(() => monthBounds(), [])
  const [q, setQ] = useState('')
  const [from, setFrom] = useState(bounds.from)
  const [to, setTo] = useState(bounds.to)
  const [sourceSchoolId, setSourceSchoolId] = useState('')
  const [targetSchoolId, setTargetSchoolId] = useState('')
  const [downloadingId, setDownloadingId] = useState<number | null>(null)

  const campusesQuery = useQuery({
    queryKey: ['network', 'campuses'],
    queryFn: () => networkApi.listCampuses(),
    enabled: Boolean(user),
    staleTime: 60_000,
  })

  const transfersQuery = useQuery({
    queryKey: [
      'network',
      'transfers',
      q,
      from,
      to,
      sourceSchoolId,
      targetSchoolId,
    ],
    queryFn: () =>
      networkApi.listTransfers({
        q: q.trim() || undefined,
        from,
        to,
        sourceSchoolId: sourceSchoolId ? Number(sourceSchoolId) : undefined,
        targetSchoolId: targetSchoolId ? Number(targetSchoolId) : undefined,
        take: 100,
      }),
    enabled: Boolean(user),
    staleTime: 15_000,
  })

  const campuses = campusesQuery.data?.campuses ?? []
  const items = transfersQuery.data?.items ?? []
  const total = transfersQuery.data?.total ?? 0

  async function onDownloadCertificate(id: number) {
    setDownloadingId(id)
    try {
      await networkApi.downloadTransferCertificate(id)
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
      <header className="rounded-3xl border border-zinc-200 bg-gradient-to-br from-zinc-50 via-white to-emerald-50 px-5 py-6 sm:px-7">
        <Link
          href="/admin/network"
          className="inline-flex items-center gap-1 text-xs font-medium text-zinc-500 hover:text-zinc-800"
        >
          <ArrowLeft size={12} />
          Réseau
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-zinc-900">
          Registre de conformité des transferts inter-campus
        </h1>
        <p className="mt-1 text-sm text-zinc-600">
          Attestations officielles PDF · {total} mouvement{total > 1 ? 's' : ''}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/network/cfo"
            className="rounded-xl bg-emerald-700 px-3 py-2 text-xs font-semibold text-white"
          >
            Tableau de bord Direction
          </Link>
          <button
            type="button"
            onClick={() => void transfersQuery.refetch()}
            className="inline-flex items-center gap-1.5 rounded-xl border border-zinc-200 bg-white px-3 py-2 text-xs font-medium"
          >
            <RefreshCw
              size={13}
              className={cn(transfersQuery.isFetching && 'animate-spin')}
            />
            Actualiser
          </button>
        </div>
      </header>

      <div className="grid gap-3 rounded-2xl border border-zinc-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-5">
        <label className="text-xs text-zinc-600 lg:col-span-2">
          Recherche (nom / matricule)
          <div className="relative mt-1">
            <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Ex. MULUMBA / 2026-…"
              className="w-full rounded-lg border border-zinc-200 py-2 pl-8 pr-3 text-sm"
            />
          </div>
        </label>
        <label className="text-xs text-zinc-600">
          Établissement d’origine
          <select
            value={sourceSchoolId}
            onChange={(e) => setSourceSchoolId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
          >
            <option value="">Tous</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-zinc-600">
          Établissement d’accueil
          <select
            value={targetSchoolId}
            onChange={(e) => setTargetSchoolId(e.target.value)}
            className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
          >
            <option value="">Tous</option>
            {campuses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs text-zinc-600">
            Du
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            />
          </label>
          <label className="text-xs text-zinc-600">
            Au
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-2 text-sm"
            />
          </label>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl border border-zinc-200 bg-white">
        {transfersQuery.isLoading ? (
          <div className="h-40 animate-pulse bg-zinc-50" />
        ) : transfersQuery.isError ? (
          <p className="p-6 text-center text-sm text-rose-600">Impossible de charger le registre.</p>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-zinc-500">Aucun transfert sur ces filtres.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-50 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Élève</th>
                  <th className="px-4 py-3 font-medium">De</th>
                  <th className="px-4 py-3 font-medium">Vers</th>
                  <th className="px-4 py-3 font-medium">Motif</th>
                  <th className="px-4 py-3 font-medium">Attestation</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {items.map((row) => (
                  <tr key={row.id}>
                    <td className="px-4 py-3 text-zinc-600">
                      {new Date(row.transferredAt).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium text-zinc-900">{row.studentName}</p>
                      <p className="text-xs text-zinc-500">{row.matricule}</p>
                    </td>
                    <td className="px-4 py-3 text-zinc-700">{row.sourceSchoolName}</td>
                    <td className="px-4 py-3 text-zinc-700">{row.targetSchoolName}</td>
                    <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-500">
                      {row.reason || '—'}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        type="button"
                        onClick={() => void onDownloadCertificate(row.id)}
                        disabled={downloadingId === row.id}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-50"
                      >
                        {downloadingId === row.id ? (
                          <Download size={13} className="animate-pulse" />
                        ) : (
                          <FileText size={13} />
                        )}
                        PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
