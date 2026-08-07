'use client'

import { ExternalLink, MessageCircle, Printer } from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import { resolveBackendUploadHref } from '@/lib/finance/download-blob'

export type ThermalReceiptPayload = {
  url?: string
  whatsapp?: string | null
  receiptData?: {
    transaction?: {
      receiptId?: string
      reference?: string
      amount?: string
      currency?: string
      method?: string
      className?: string | null
    }
    entities?: {
      studentName?: string
      studentMatricule?: string
      parentName?: string
      parentPhone?: string | null
      schoolName?: string
      schoolAddress?: string | null
      schoolPhone?: string | null
      schoolEmail?: string | null
      schoolSlogan?: string | null
      schoolDevise?: string | null
      schoolLogoUrl?: string | null
      isCrossSite?: boolean
      enrollmentSchoolName?: string | null
      collectionSchoolName?: string | null
    }
    motive?: {
      summaryLabel?: string
      feeLines?: Array<{ label: string; amount: string; periodLabel?: string | null }>
    }
    billingSummary?: {
      remainingBalance?: number
      nextDueMonthYear?: string | null
      overdueCount?: number
      currency?: string
    }
    cashier?: { displayName?: string }
    security?: { publicVerifyCode?: string; verifyUrl?: string }
  }
}

function resolveLogoSrc(logoUrl: string | null | undefined): string | null {
  return resolveBackendUploadHref(logoUrl)
}

/** Aperçu ticket post-encaissement (données serveur). */
export function ReceiptTicketPreview({
  thermal,
  onPrint,
}: {
  thermal: ThermalReceiptPayload
  onPrint?: () => void
}) {
  const rd = thermal.receiptData
  const tx = rd?.transaction
  const entities = rd?.entities
  const billing = rd?.billingSummary
  const currency = (tx?.currency || billing?.currency || 'USD') as 'USD' | 'CDF' | 'EUR'
  const logoSrc = resolveLogoSrc(entities?.schoolLogoUrl)
  const pdfHref = resolveBackendUploadHref(thermal.url)

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 overflow-hidden">
      <div className="border-b border-dashed border-zinc-300 bg-white px-4 py-3 text-center">
        {logoSrc ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={logoSrc}
            alt=""
            className="mx-auto mb-2 h-10 max-w-[120px] object-contain"
          />
        ) : null}
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-400">
          {entities?.schoolName ?? 'Reçu officiel'}
        </p>
        {entities?.schoolAddress ? (
          <p className="mt-0.5 text-[10px] text-zinc-500">{entities.schoolAddress}</p>
        ) : null}
        {entities?.schoolPhone ? (
          <p className="text-[10px] text-zinc-500">Tél. {entities.schoolPhone}</p>
        ) : null}
        {entities?.schoolEmail ? (
          <p className="text-[10px] text-zinc-500">{entities.schoolEmail}</p>
        ) : null}
        {entities?.schoolSlogan ? (
          <p className="text-[10px] text-zinc-500 italic">{entities.schoolSlogan}</p>
        ) : null}
        {entities?.schoolDevise ? (
          <p className="text-[10px] text-zinc-500">« {entities.schoolDevise} »</p>
        ) : null}
        <p className="mt-1 text-sm font-bold text-zinc-900 tabular-nums">
          {tx?.receiptId ?? '—'}
        </p>
        {tx?.reference ? (
          <p className="text-[11px] text-zinc-500 mt-0.5">Réf. {tx.reference}</p>
        ) : null}
      </div>

      <div className="px-4 py-3 space-y-2 text-xs">
        <div className="flex justify-between gap-2">
          <span className="text-zinc-500">Élève</span>
          <span className="font-medium text-zinc-900 text-right">
            {entities?.studentName ?? '—'}
            {entities?.studentMatricule ? (
              <span className="block text-[10px] font-normal text-zinc-400">
                {entities.studentMatricule}
              </span>
            ) : null}
          </span>
        </div>
        {entities?.isCrossSite ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-[10px] text-amber-950 space-y-0.5">
            <p>
              <span className="font-semibold">Inscrit :</span>{' '}
              {entities.enrollmentSchoolName ?? '—'}
            </p>
            <p>
              <span className="font-semibold">Encaissé :</span>{' '}
              {entities.collectionSchoolName ?? '—'}
            </p>
          </div>
        ) : null}
        <div className="flex justify-between gap-2">
          <span className="text-zinc-500">Montant</span>
          <span className="font-semibold tabular-nums text-emerald-700">
            {tx?.amount != null
              ? formatMoney(Number(tx.amount), currency)
              : '—'}
          </span>
        </div>
        {tx?.method ? (
          <div className="flex justify-between gap-2">
            <span className="text-zinc-500">Mode</span>
            <span className="font-medium text-zinc-800">{tx.method}</span>
          </div>
        ) : null}
        {rd?.motive?.summaryLabel ? (
          <p className="text-[11px] text-zinc-600 border-t border-zinc-200/80 pt-2">
            {rd.motive.summaryLabel}
          </p>
        ) : null}
        {rd?.motive?.feeLines && rd.motive.feeLines.length > 0 ? (
          <ul className="space-y-1 border-t border-zinc-200/80 pt-2 max-h-24 overflow-y-auto">
            {rd.motive.feeLines.slice(0, 6).map((line, i) => (
              <li key={`${line.label}-${i}`} className="flex justify-between gap-2 text-[11px]">
                <span className="text-zinc-600 truncate">
                  {line.label}
                  {line.periodLabel ? ` · ${line.periodLabel}` : ''}
                </span>
                <span className="tabular-nums text-zinc-800 shrink-0">{line.amount}</span>
              </li>
            ))}
          </ul>
        ) : null}
        {billing ? (
          <div className="rounded-lg bg-white border border-zinc-100 px-2.5 py-2 text-[11px] space-y-1">
            <div className="flex justify-between">
              <span className="text-zinc-500">Solde restant</span>
              <span className="font-semibold tabular-nums text-zinc-900">
                {formatMoney(Number(billing.remainingBalance ?? 0), currency)}
              </span>
            </div>
            {billing.nextDueMonthYear ? (
              <div className="flex justify-between text-zinc-500">
                <span>Prochaine échéance</span>
                <span>{billing.nextDueMonthYear}</span>
              </div>
            ) : null}
            {(billing.overdueCount ?? 0) > 0 ? (
              <p className="text-amber-700">
                {billing.overdueCount} ligne{billing.overdueCount! > 1 ? 's' : ''} en retard
              </p>
            ) : null}
          </div>
        ) : null}
        {rd?.cashier?.displayName ? (
          <p className="text-[10px] text-zinc-400 pt-1">Caissier · {rd.cashier.displayName}</p>
        ) : null}
        {rd?.security?.publicVerifyCode ? (
          <p className="text-[10px] font-mono text-zinc-500">
            Vérif. {rd.security.publicVerifyCode}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2 border-t border-zinc-200 bg-white px-3 py-2.5">
        {onPrint ? (
          <button
            type="button"
            onClick={onPrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
          >
            <Printer size={12} />
            Imprimer
          </button>
        ) : null}
        {pdfHref ? (
          <a
            href={pdfHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-2.5 py-1.5 text-[11px] font-medium text-zinc-700 hover:bg-zinc-50"
          >
            <ExternalLink size={12} />
            Ouvrir PDF
          </a>
        ) : null}
        {thermal.whatsapp ? (
          <a
            href={thermal.whatsapp}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
          >
            <MessageCircle size={12} />
            WhatsApp parent
          </a>
        ) : null}
      </div>
    </div>
  )
}
