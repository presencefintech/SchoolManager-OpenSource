'use client'

import { FormEvent, useMemo, useRef, useState } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import {
  Ticket,
  Printer,
  Ban,
  CheckCircle2,
  Search,
  RefreshCw,
} from 'lucide-react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { presencesApi, type GatePassRecord } from '@/lib/admin/api/presences.api'
import { useStudents } from '@/lib/hooks/use-admin'
import { useToast } from '@/providers/toast-provider'
import { getApiErrorMessage } from '@/lib/api/client'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { cn } from '@/lib/utils'

const STATUS_LABEL: Record<string, string> = {
  ISSUED: 'Actif',
  USED: 'Utilisé',
  REVOKED: 'Révoqué',
  EXPIRED: 'Expiré',
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

function GatePassTicket({ pass }: { pass: GatePassRecord }) {
  const printRef = useRef<HTMLDivElement>(null)

  const onPrint = () => {
    const node = printRef.current
    if (!node) return
    const win = window.open('', '_blank', 'noopener,noreferrer,width=480,height=720')
    if (!win) return
    win.document.write(`<!doctype html><html><head><title>${pass.passCode}</title>
      <style>
        body { font-family: system-ui, sans-serif; padding: 24px; color: #0f172a; }
        .card { border: 2px solid #0f172a; border-radius: 16px; padding: 24px; max-width: 360px; margin: 0 auto; text-align: center; }
        h1 { font-size: 18px; margin: 0 0 4px; }
        .meta { font-size: 13px; color: #475569; margin: 8px 0; }
        .code { font-size: 22px; font-weight: 700; letter-spacing: 0.08em; margin: 12px 0; }
        .qr { display: flex; justify-content: center; margin: 16px 0; }
        .reason { font-size: 14px; margin-top: 12px; }
      </style></head><body>${node.innerHTML}
      <script>window.onload=()=>{window.print();}</script></body></html>`)
    win.document.close()
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div ref={printRef} className="card text-center">
        <h1 className="text-lg font-bold">{pass.label ?? (pass.passType === 'ENTRY' ? "Billet d'entrée" : 'Billet de sortie')}</h1>
        <p className="meta text-sm text-slate-500">Complexe scolaire — Préfet de Discipline</p>
        <p className="mt-2 text-base font-semibold">{pass.studentName}</p>
        {pass.class?.name ? <p className="text-sm text-slate-500">{pass.class.name}</p> : null}
        <p className="code font-mono text-xl font-bold tracking-wider">{pass.passCode}</p>
        <div className="qr my-3 flex justify-center">
          <QRCodeSVG value={pass.passCode} size={140} level="M" includeMargin />
        </div>
        <p className="reason text-sm">
          <span className="font-medium">Motif :</span> {pass.reason}
        </p>
        <p className="meta text-xs text-slate-500">
          Valable le {new Date(pass.validOn).toLocaleDateString('fr-FR')}
        </p>
      </div>
      <button
        type="button"
        onClick={onPrint}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-800"
      >
        <Printer className="h-4 w-4" />
        Imprimer / PDF
      </button>
    </div>
  )
}

export default function AdminGatePassesPage() {
  const toast = useToast()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [studentId, setStudentId] = useState<number>(0)
  const [passType, setPassType] = useState<'ENTRY' | 'EXIT'>('ENTRY')
  const [reason, setReason] = useState('')
  const [validOn, setValidOn] = useState(todayIsoDate())
  const [note, setNote] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ISSUED')
  const [issued, setIssued] = useState<GatePassRecord | null>(null)
  const [redeemCode, setRedeemCode] = useState('')

  const { data: studentsData } = useStudents(
    { search: search.trim() || undefined, limit: 30 },
    { enabled: search.trim().length >= 2 || studentId > 0 },
  )
  const students = studentsData?.data ?? []

  const listQuery = useQuery({
    queryKey: ['admin', 'gate-passes', statusFilter, studentId || null],
    queryFn: () =>
      presencesApi.listGatePasses({
        status: statusFilter || undefined,
        studentId: studentId || undefined,
        validOn: statusFilter === 'ISSUED' ? todayIsoDate() : undefined,
      }),
    staleTime: 15_000,
  })

  const issueMut = useMutation({
    mutationFn: () =>
      presencesApi.issueGatePass({
        studentId,
        passType,
        reason: reason.trim(),
        validOn,
        note: note.trim() || null,
      }),
    onSuccess: (pass) => {
      setIssued(pass)
      toast.success('Billet signé et émis.')
      void qc.invalidateQueries({ queryKey: ['admin', 'gate-passes'] })
      setReason('')
      setNote('')
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const revokeMut = useMutation({
    mutationFn: (id: number) => presencesApi.revokeGatePass(id, 'Révoqué depuis le panneau discipline'),
    onSuccess: () => {
      toast.success('Billet révoqué.')
      void qc.invalidateQueries({ queryKey: ['admin', 'gate-passes'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const redeemMut = useMutation({
    mutationFn: () => presencesApi.useGatePass(redeemCode.trim()),
    onSuccess: (res) => {
      toast.success(res.message ?? 'Billet consommé — présence justifiée.')
      setRedeemCode('')
      void qc.invalidateQueries({ queryKey: ['admin', 'gate-passes'] })
    },
    onError: (err) => toast.error(getApiErrorMessage(err)),
  })

  const selectedStudent = useMemo(
    () => students.find((s) => s.id === studentId),
    [students, studentId],
  )

  const onIssue = (e: FormEvent) => {
    e.preventDefault()
    if (!studentId) {
      toast.error('Sélectionnez un élève.')
      return
    }
    if (reason.trim().length < 3) {
      toast.error('Indiquez un motif (3 caractères min.).')
      return
    }
    issueMut.mutate()
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
          <Ticket className="h-6 w-6 text-violet-600" />
          Billets d&apos;entrée / sortie
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Émission et signature par le Préfet de Discipline — QR imprimable pour le portail.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <form onSubmit={onIssue} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Émettre un billet</h2>

          <div>
            <label className="mb-1 block text-sm font-medium">Élève</label>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Nom, postnom, matricule…"
                className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm focus:border-violet-400 focus:outline-none focus:ring-2 focus:ring-violet-500/20"
              />
            </div>
            {search.trim().length >= 2 && (
              <ul className="mt-2 max-h-40 overflow-auto rounded-xl border border-slate-100 bg-slate-50">
                {students.map((s) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setStudentId(s.id)
                        setSearch(formatStudentFullName(s))
                      }}
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-violet-50',
                        studentId === s.id && 'bg-violet-50 font-medium',
                      )}
                    >
                      <span>{formatStudentFullName(s)}</span>
                      <span className="text-xs text-slate-400">{s.matricule}</span>
                    </button>
                  </li>
                ))}
                {students.length === 0 && (
                  <li className="px-3 py-2 text-sm text-slate-400">Aucun résultat</li>
                )}
              </ul>
            )}
            {selectedStudent && (
              <p className="mt-1 text-xs text-emerald-700">
                Sélection : {formatStudentFullName(selectedStudent)} ({selectedStudent.matricule})
              </p>
            )}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm font-medium">Type</label>
              <select
                value={passType}
                onChange={(e) => setPassType(e.target.value as 'ENTRY' | 'EXIT')}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              >
                <option value="ENTRY">Billet d&apos;entrée (réadmission)</option>
                <option value="EXIT">Billet de sortie</option>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium">Valable le</label>
              <input
                type="date"
                value={validOn}
                onChange={(e) => setValidOn(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Motif</label>
            <input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex. rendez-vous médical, retard justifié…"
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium">Note (optionnel)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>

          <button
            type="submit"
            disabled={issueMut.isPending}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-violet-500 disabled:opacity-60"
          >
            <Ticket className="h-4 w-4" />
            {issueMut.isPending ? 'Signature…' : 'Signer et émettre'}
          </button>
        </form>

        <div className="space-y-4">
          {issued ? (
            <GatePassTicket pass={issued} />
          ) : (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-400">
              Le billet signé s&apos;affichera ici avec QR imprimable.
            </div>
          )}

          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">
              Scanner / consommer un billet
            </h2>
            <p className="mb-3 text-xs text-slate-500">
              Au portail : un billet d&apos;entrée justifie l&apos;absence/retard (statut Excusé).
            </p>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                if (!redeemCode.trim()) return
                redeemMut.mutate()
              }}
            >
              <input
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value.toUpperCase())}
                placeholder="Code BP-…"
                className="flex-1 rounded-xl border border-slate-200 px-3 py-2 font-mono text-sm uppercase"
              />
              <button
                type="submit"
                disabled={redeemMut.isPending}
                className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" />
                Valider
              </button>
            </form>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Historique</h2>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-lg border border-slate-200 px-2 py-1.5 text-sm"
            >
              <option value="ISSUED">Actifs</option>
              <option value="USED">Utilisés</option>
              <option value="REVOKED">Révoqués</option>
              <option value="">Tous</option>
            </select>
            <button
              type="button"
              onClick={() => void listQuery.refetch()}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1.5 text-sm hover:bg-slate-50"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', listQuery.isFetching && 'animate-spin')} />
              Actualiser
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="border-b text-xs uppercase text-slate-400">
              <tr>
                <th className="px-2 py-2">Code</th>
                <th className="px-2 py-2">Élève</th>
                <th className="px-2 py-2">Type</th>
                <th className="px-2 py-2">Motif</th>
                <th className="px-2 py-2">Statut</th>
                <th className="px-2 py-2" />
              </tr>
            </thead>
            <tbody>
              {(listQuery.data ?? []).map((row) => (
                <tr key={row.id} className="border-b border-slate-50">
                  <td className="px-2 py-2 font-mono text-xs">{row.passCode}</td>
                  <td className="px-2 py-2">{row.studentName ?? `#${row.studentId}`}</td>
                  <td className="px-2 py-2">{row.passType === 'ENTRY' ? 'Entrée' : 'Sortie'}</td>
                  <td className="max-w-[220px] truncate px-2 py-2">{row.reason}</td>
                  <td className="px-2 py-2">{STATUS_LABEL[row.status] ?? row.status}</td>
                  <td className="px-2 py-2 text-right">
                    {row.status === 'ISSUED' && (
                      <button
                        type="button"
                        onClick={() => {
                          setIssued(row)
                          if (window.confirm('Révoquer ce billet ?')) revokeMut.mutate(row.id)
                        }}
                        className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-rose-700 hover:bg-rose-50"
                      >
                        <Ban className="h-3.5 w-3.5" />
                        Révoquer
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setIssued(row)}
                      className="ml-1 rounded-lg px-2 py-1 text-xs text-violet-700 hover:bg-violet-50"
                    >
                      Voir QR
                    </button>
                  </td>
                </tr>
              ))}
              {!listQuery.isLoading && (listQuery.data?.length ?? 0) === 0 && (
                <tr>
                  <td colSpan={6} className="px-2 py-6 text-center text-slate-400">
                    Aucun billet pour ce filtre.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
