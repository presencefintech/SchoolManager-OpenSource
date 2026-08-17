'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Search } from 'lucide-react'

type VerifyKind = 'receipt' | 'document'

export function VerifyManualForm({
  initialReceiptNumber = '',
  initialDocumentRef = '',
  initialCode = '',
  initialKind = 'receipt',
}: {
  initialReceiptNumber?: string
  initialDocumentRef?: string
  initialCode?: string
  initialKind?: VerifyKind
}) {
  const router = useRouter()
  const [kind, setKind] = useState<VerifyKind>(initialKind)
  const [receiptNumber, setReceiptNumber] = useState(initialReceiptNumber)
  const [documentRef, setDocumentRef] = useState(initialDocumentRef)
  const [code, setCode] = useState(initialCode)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (kind === 'receipt') {
      if (receiptNumber.trim()) params.set('receiptNumber', receiptNumber.trim())
      if (code.trim()) params.set('code', code.trim().toUpperCase())
    } else {
      if (documentRef.trim()) params.set('documentRef', documentRef.trim())
      if (code.trim()) params.set('code', code.trim().toUpperCase())
    }
    router.push(`/verify?${params.toString()}`)
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div>
        <h2 className="text-sm font-semibold text-zinc-800">Vérification manuelle</h2>
        <p className="mt-1 text-xs text-zinc-500">
          Reçu de caisse (code PF) ou fiche d&apos;inscription (code SM) imprimés par SchoolManager.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-1 rounded-lg bg-zinc-100 p-1">
        <button
          type="button"
          onClick={() => setKind('receipt')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            kind === 'receipt' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          Reçu (PF)
        </button>
        <button
          type="button"
          onClick={() => setKind('document')}
          className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
            kind === 'document' ? 'bg-white text-zinc-900 shadow-sm' : 'text-zinc-500'
          }`}
        >
          Fiche (SM)
        </button>
      </div>

      {kind === 'receipt' ? (
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">Numéro de reçu</span>
          <input
            type="text"
            value={receiptNumber}
            onChange={(e) => setReceiptNumber(e.target.value)}
            placeholder="REC-2025-06-0042"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </label>
      ) : (
        <label className="block">
          <span className="text-xs font-medium text-zinc-600">N° document</span>
          <input
            type="text"
            value={documentRef}
            onChange={(e) => setDocumentRef(e.target.value)}
            placeholder="INS-2026-00042"
            className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            required
          />
        </label>
      )}

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">
          {kind === 'receipt' ? 'Code PF' : 'Code SM'}
        </span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder={kind === 'receipt' ? 'PF-0001-2506-A7F3' : 'SM-0001-2608-A7F3'}
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          required
        />
      </label>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <Search size={16} />
        {kind === 'receipt' ? 'Vérifier le reçu' : 'Vérifier la fiche'}
      </button>
    </form>
  )
}
