'use client'

import { useState } from 'react'
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Hash,
  MapPin,
  Mail,
  Phone,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import {
  formatReceiptDate,
  formatReceiptMethod,
  integrityLevelLabel,
  receiptVerifyReasonLabel,
} from '@/lib/receipt/verify-receipt'
import type { ReceiptVerifyResult } from '@/types/receipt-verify'

export function ReceiptVerifyCard({ result }: { result: ReceiptVerifyResult }) {
  if (!result.valid) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-red-900">Reçu non authentique</h1>
            <p className="mt-1 text-sm text-red-700">{receiptVerifyReasonLabel(result.reason)}</p>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            Ce document ne peut pas être validé. Contactez l&apos;établissement ou demandez un
            nouveau reçu au guichet.
          </p>
        </div>
      </div>
    )
  }

  const isCertified = result.integrityLevel === 'CERTIFIED'
  const isSuspect = result.integrityLevel === 'SUSPECT'
  const amount = formatMoney(Number(result.amount), result.currency as 'USD' | 'CDF')

  const headerClass = isCertified
    ? 'bg-gradient-to-br from-emerald-600 to-teal-600'
    : isSuspect
      ? 'bg-gradient-to-br from-amber-500 to-orange-600'
      : 'bg-gradient-to-br from-red-600 to-rose-600'

  const borderClass = isCertified
    ? 'border-emerald-200'
    : isSuspect
      ? 'border-amber-200'
      : 'border-red-200'

  return (
    <div className={`rounded-2xl border ${borderClass} bg-white shadow-sm overflow-hidden`}>
      <div className={`${headerClass} px-6 py-5 text-center text-white`}>
        {result.schoolLogoUrl ? (
          <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-xl bg-white/95 p-1.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={result.schoolLogoUrl}
              alt={result.schoolName}
              className="max-h-full max-w-full object-contain"
            />
          </div>
        ) : (
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/15">
            {isCertified ? (
              <BadgeCheck className="h-8 w-8" />
            ) : (
              <ShieldAlert className="h-8 w-8" />
            )}
          </div>
        )}

        <h1 className="text-lg font-semibold">
          {isCertified ? 'Reçu authentique' : isSuspect ? 'Reçu à contrôler' : 'Reçu rejeté'}
        </h1>
        <p className="mt-1 text-sm text-white/90">{result.schoolName}</p>
        <IntegrityBadge level={result.integrityLevel} />
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="text-center">
          <p className="text-xs uppercase tracking-wide text-zinc-400">Montant payé</p>
          <p className="mt-1 text-3xl font-bold tabular-nums text-zinc-900">{amount}</p>
          {result.cdfEquivalent != null && result.currency !== 'CDF' && (
            <p className="mt-1 text-sm text-zinc-500">
              ≈ {formatMoney(result.cdfEquivalent, 'CDF')}
              {result.exchangeRate ? ` (taux ${result.exchangeRate.toLocaleString('fr-FR')})` : ''}
            </p>
          )}
        </div>

        {result.feeLines.length > 0 && (
          <div className="rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="text-xs font-medium uppercase tracking-wide text-zinc-400 mb-2">
              Détail des frais
            </p>
            <ul className="space-y-1.5 text-sm">
              {result.feeLines.map((line, i) => (
                <li key={`${line.label}-${i}`} className="flex justify-between gap-2">
                  <span className="text-zinc-600">
                    {line.label}
                    {line.periodLabel ? (
                      <span className="text-zinc-400"> · {line.periodLabel}</span>
                    ) : null}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-800">
                    {formatMoney(Number(line.amount), line.currency as 'USD' | 'CDF')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="space-y-3 text-sm">
          <Row icon={User} label="Élève" value={result.studentName} />
          {result.studentMatricule ? (
            <Row icon={Hash} label="Matricule" value={result.studentMatricule} mono />
          ) : null}
          {result.className ? (
            <Row icon={Building2} label="Classe" value={result.className} />
          ) : null}
          <Row icon={Hash} label="N° reçu" value={result.receiptNumber} mono />
          <Row icon={CreditCard} label="Motif" value={result.motiveSummary} />
          <Row icon={CreditCard} label="Mode" value={formatReceiptMethod(result.method)} />
          <Row icon={Calendar} label="Confirmé le" value={formatReceiptDate(result.confirmedAt)} />
          <Row icon={User} label="Encaissé par" value={result.orchestratedBy} />
          {result.schoolAddress ? (
            <Row icon={MapPin} label="Adresse" value={result.schoolAddress} />
          ) : null}
          {result.schoolPhone ? (
            <Row icon={Phone} label="Téléphone" value={result.schoolPhone} />
          ) : null}
          {result.schoolEmail ? (
            <Row icon={Mail} label="Email" value={result.schoolEmail} />
          ) : null}
        </dl>

        <CopyableCode code={result.publicVerifyCode} />

        <div
          className={`flex items-center gap-2 rounded-xl border px-3 py-2.5 text-xs ${
            isCertified
              ? 'border-emerald-100 bg-emerald-50/80 text-emerald-900'
              : 'border-amber-100 bg-amber-50/80 text-amber-900'
          }`}
        >
          {isCertified ? (
            <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <ShieldAlert size={16} className="shrink-0 text-amber-600" />
          )}
          <span>
            {result.algorithm} · signature {result.hmacValid ? 'valide' : 'à contrôler'} · vérifié
            le {formatReceiptDate(result.verifiedAt)}
          </span>
        </div>
      </div>
    </div>
  )
}

function IntegrityBadge({ level }: { level: string }) {
  const label = integrityLevelLabel(level)
  const styles =
    level === 'CERTIFIED'
      ? 'bg-white/20 text-white'
      : level === 'SUSPECT'
        ? 'bg-white/25 text-white'
        : 'bg-red-900/30 text-white'

  return (
    <span className={`mt-2 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide ${styles}`}>
      {label}
    </span>
  )
}

function CopyableCode({ code }: { code: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
      <p className="text-xs text-zinc-400 mb-1">Code de vérification (ticket)</p>
      <div className="flex items-center justify-between gap-2">
        <code className="font-mono text-sm font-semibold text-zinc-800">{code}</code>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-white px-2 py-1 text-xs text-zinc-600 hover:bg-zinc-100"
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
          {copied ? 'Copié' : 'Copier'}
        </button>
      </div>
    </div>
  )
}

function Row({
  icon: Icon,
  label,
  value,
  mono,
}: {
  icon: React.ElementType
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="text-zinc-400 mt-0.5 shrink-0" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-zinc-400">{label}</dt>
        <dd className={`text-zinc-800 font-medium break-words ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </dd>
      </div>
    </div>
  )
}
