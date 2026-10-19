'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Camera } from 'lucide-react'
import { declarationsApi, formatPaymentCode } from '@/lib/parent/declarations.api'
import { formatMoney } from '@/lib/parent/api'
import { useSelectedStudent } from '@/lib/parent/hooks'
import { getApiErrorMessage } from '@/lib/api/client'
import { Card, ErrorState, ListSkeleton, NoStudent, PageHeader, Spinner } from '@/components/parent/ui'

const field = 'w-full rounded-xl border border-line bg-canvas px-3 py-2.5 text-base sm:text-sm'
const MAX_PROOF_BYTES = 8 * 1024 * 1024

function localInputNow(): string {
  const d = new Date()
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset())
  return d.toISOString().slice(0, 16)
}

export default function NewDeclarationPage() {
  const router = useRouter()
  const qc = useQueryClient()
  const { studentId } = useSelectedStudent()

  const children = useQuery({ queryKey: ['parent', 'declarations', 'children'], queryFn: declarationsApi.children })
  const channels = useQuery({ queryKey: ['parent', 'declarations', 'channels'], queryFn: declarationsApi.channels })
  const settings = useQuery({ queryKey: ['parent', 'declarations', 'settings'], queryFn: declarationsApi.settings })

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [splitMode, setSplitMode] = useState<'EQUAL' | 'CUSTOM'>('EQUAL')
  const [custom, setCustom] = useState<Record<number, string>>({})
  const [provider, setProvider] = useState('')
  const [transactionRef, setTransactionRef] = useState('')
  const [amount, setAmount] = useState('')
  const [currency, setCurrency] = useState('USD')
  const [paidAt, setPaidAt] = useState(localInputNow())
  const [payerPhone, setPayerPhone] = useState('')
  const [payerName, setPayerName] = useState('')
  const [note, setNote] = useState('')
  const [proof, setProof] = useState<File | null>(null)
  const [error, setError] = useState<string | null>(null)

  // Enfant actif présélectionné dès que la liste est chargée.
  const effectiveSelected = useMemo(() => {
    if (selected.size > 0) return selected
    if (studentId != null && children.data?.some((c) => c.studentId === studentId)) return new Set([studentId])
    return selected
  }, [selected, studentId, children.data])

  const create = useMutation({
    mutationFn: () => {
      const ids = [...effectiveSelected]
      const total = Number(amount)
      const grouped = ids.length > 1
      return declarationsApi.submit({
        studentId: ids[0],
        provider,
        transactionRef: transactionRef.trim(),
        amount: total,
        currency,
        paidAt: new Date(paidAt).toISOString(),
        splitMode: grouped ? splitMode : 'EQUAL',
        allocations: grouped
          ? ids.map((id) => ({ studentId: id, ...(splitMode === 'CUSTOM' ? { amount: Number(custom[id]) } : {}) }))
          : [],
        payerPhone: payerPhone.trim() || undefined,
        payerName: payerName.trim() || undefined,
        note: note.trim() || undefined,
        proof: proof as File,
      })
    },
    onSuccess: (d) => {
      void qc.invalidateQueries({ queryKey: ['parent', 'declarations'] })
      router.push(`/parent/finance/declarations/${d.id}`)
    },
    onError: (err) => setError(getApiErrorMessage(err)),
  })

  const toggle = (id: number) => {
    const next = new Set(effectiveSelected)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelected(next)
  }

  const onSubmit = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const ids = [...effectiveSelected]
    const total = Number(amount)
    if (ids.length === 0) return setError('Choisissez au moins un enfant.')
    if (!provider) return setError('Choisissez le moyen de paiement utilisé.')
    if (transactionRef.trim().length < 4) return setError('Saisissez la référence de la transaction (reçue par SMS).')
    if (!Number.isFinite(total) || total <= 0) return setError('Montant invalide.')
    if (!proof) return setError('Ajoutez la capture d’écran du SMS de confirmation.')
    if (ids.length > 1 && splitMode === 'CUSTOM') {
      const sum = ids.reduce((acc, id) => acc + (Number(custom[id]) || 0), 0)
      if (Math.abs(sum - total) > 0.01) return setError(`La somme des parts (${sum.toFixed(2)}) doit être égale au montant (${total.toFixed(2)}).`)
    }
    create.mutate()
  }

  const onFile = (file: File | null) => {
    if (file && file.size > MAX_PROOF_BYTES) {
      setError('La capture dépasse 8 Mo.')
      return
    }
    setError(null)
    setProof(file)
  }

  if (children.isLoading) return <ListSkeleton />
  if (children.isError) return <ErrorState message={getApiErrorMessage(children.error)} onRetry={() => void children.refetch()} />
  if ((children.data?.length ?? 0) === 0) return <NoStudent />

  const hint = channels.data?.find((c) => c.code === provider)?.hint

  return (
    <>
      <Link href="/parent/finance/declarations" className="mb-3 inline-flex items-center gap-1 text-sm text-zinc-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Déclarations
      </Link>
      <PageHeader
        title="Déclarer un paiement"
        subtitle={
          settings.data?.instant
            ? 'Validation immédiate : votre reçu est disponible dès l’envoi.'
            : 'L’école vérifie la capture avant de valider le paiement.'
        }
      />
      <form onSubmit={onSubmit} className="space-y-4">
        <Card className="space-y-3">
          <h2 className="font-semibold">Enfant(s) concerné(s)</h2>
          {children.data!.map((c) => (
            <label key={c.studentId} className="flex items-center gap-3 rounded-xl border border-line px-3 py-2">
              <input type="checkbox" checked={effectiveSelected.has(c.studentId)} onChange={() => toggle(c.studentId)} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{c.studentName}</p>
                <p className="truncate text-xs text-zinc-500">
                  {[c.className, c.paymentCode ? `code ${formatPaymentCode(c.paymentCode)}` : null].filter(Boolean).join(' · ')}
                  {c.feesBalance > 0 ? ` · reste ${formatMoney(c.feesBalance, currency)}` : ''}
                </p>
              </div>
              {effectiveSelected.size > 1 && splitMode === 'CUSTOM' && effectiveSelected.has(c.studentId) && (
                <input
                  className="w-24 rounded-lg border border-line bg-canvas px-2 py-1 text-right text-sm"
                  inputMode="decimal"
                  placeholder="Part"
                  value={custom[c.studentId] ?? ''}
                  onChange={(e) => setCustom((m) => ({ ...m, [c.studentId]: e.target.value }))}
                />
              )}
            </label>
          ))}
          {effectiveSelected.size > 1 && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={splitMode === 'EQUAL'} onChange={() => setSplitMode('EQUAL')} /> Répartition égale
              </label>
              <label className="flex items-center gap-1.5">
                <input type="radio" checked={splitMode === 'CUSTOM'} onChange={() => setSplitMode('CUSTOM')} /> Montants personnalisés
              </label>
            </div>
          )}
        </Card>

        <Card className="space-y-3">
          <h2 className="font-semibold">Paiement effectué</h2>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Moyen de paiement</span>
            <select className={field} value={provider} onChange={(e) => setProvider(e.target.value)}>
              <option value="">Choisir…</option>
              {channels.data?.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.displayName}
                </option>
              ))}
            </select>
            {hint && <span className="mt-1 block text-xs text-zinc-500">{hint}</span>}
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Référence de la transaction</span>
            <input className={field} value={transactionRef} onChange={(e) => setTransactionRef(e.target.value)} placeholder="Reçue par SMS" />
          </label>
          <div className="grid grid-cols-[1fr_96px] gap-3">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Montant total</span>
              <input className={field} inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Devise</span>
              <select className={field} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                <option value="USD">USD</option>
                <option value="CDF">CDF</option>
              </select>
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Date et heure du paiement</span>
            <input type="datetime-local" className={field} value={paidAt} max={localInputNow()} onChange={(e) => setPaidAt(e.target.value)} />
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Téléphone payeur (facultatif)</span>
              <input className={field} inputMode="tel" value={payerPhone} onChange={(e) => setPayerPhone(e.target.value)} />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Nom du payeur (facultatif)</span>
              <input className={field} value={payerName} onChange={(e) => setPayerName(e.target.value)} />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium">Note (facultatif)</span>
            <textarea rows={2} className={field} value={note} onChange={(e) => setNote(e.target.value)} />
          </label>
        </Card>

        <Card className="space-y-2">
          <h2 className="font-semibold">Capture du SMS de confirmation</h2>
          <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-line px-3 py-4 text-sm text-zinc-600">
            <Camera className="h-5 w-5" />
            {proof ? proof.name : 'Choisir une image (JPG, PNG)'}
            <input type="file" accept="image/*" className="sr-only" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
          </label>
        </Card>

        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={create.isPending}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-3 font-medium text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {create.isPending && <Spinner />} Envoyer la déclaration
        </button>
      </form>
    </>
  )
}
