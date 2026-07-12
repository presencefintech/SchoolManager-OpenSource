'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'
import { Search } from 'lucide-react'

export function VerifyManualForm({
  initialReceiptNumber = '',
  initialCode = '',
}: {
  initialReceiptNumber?: string
  initialCode?: string
}) {
  const router = useRouter()
  const [receiptNumber, setReceiptNumber] = useState(initialReceiptNumber)
  const [code, setCode] = useState(initialCode)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    const params = new URLSearchParams()
    if (receiptNumber.trim()) params.set('receiptNumber', receiptNumber.trim())
    if (code.trim()) params.set('code', code.trim().toUpperCase())
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
          Saisissez le numéro de reçu et le code PF imprimé sur le ticket de caisse.
        </p>
      </div>

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

      <label className="block">
        <span className="text-xs font-medium text-zinc-600">Code PF</span>
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="PF-0001-2506-A7F3"
          className="mt-1 w-full rounded-lg border border-zinc-200 px-3 py-2 text-sm font-mono uppercase focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          required
        />
      </label>

      <button
        type="submit"
        className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
      >
        <Search size={16} />
        Vérifier le reçu
      </button>
    </form>
  )
}
