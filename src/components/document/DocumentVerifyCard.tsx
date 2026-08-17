'use client'

import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  Calendar,
  FileCheck2,
  Hash,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react'
import {
  documentIntegrityLabel,
  documentVerifyReasonLabel,
  formatDocumentDate,
} from '@/lib/document/verify-document'
import type { DocumentVerifyResult } from '@/types/document-verify'

export function DocumentVerifyCard({ result }: { result: DocumentVerifyResult }) {
  if (!result.valid) {
    return (
      <div className="rounded-2xl border border-red-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100">
            <AlertTriangle className="h-7 w-7 text-red-600" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-red-900">Document non authentique</h1>
            <p className="mt-1 text-sm text-red-700">{documentVerifyReasonLabel(result.reason)}</p>
          </div>
          <p className="text-xs text-zinc-500 max-w-sm">
            Cette fiche ne peut pas être validée. Demandez une nouvelle impression au guichet de
            l&apos;établissement.
          </p>
        </div>
      </div>
    )
  }

  const isCertified = result.integrityLevel === 'CERTIFIED'
  const isSuspect = result.integrityLevel === 'SUSPECT'
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
              <ShieldCheck className="h-7 w-7" />
            ) : (
              <ShieldAlert className="h-7 w-7" />
            )}
          </div>
        )}
        <p className="text-xs font-medium uppercase tracking-wider text-white/80">
          {result.docTypeLabel}
        </p>
        <h1 className="mt-1 text-lg font-semibold">{documentIntegrityLabel(result.integrityLevel)}</h1>
        <p className="mt-1 text-sm text-white/90">{result.schoolName}</p>
      </div>

      <div className="space-y-3 p-5 text-sm">
        <div className="flex items-start gap-3">
          <User className="mt-0.5 h-4 w-4 text-zinc-400" />
          <div>
            <p className="font-medium text-zinc-800">{result.studentName}</p>
            <p className="text-xs text-zinc-500">Matricule {result.studentMatricule}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <FileCheck2 className="mt-0.5 h-4 w-4 text-zinc-400" />
          <div>
            <p className="text-zinc-800">
              {result.className ?? 'Classe non renseignée'}
              {result.academicYear ? ` · ${result.academicYear}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Hash className="mt-0.5 h-4 w-4 text-zinc-400" />
          <div>
            <p className="font-mono text-xs text-zinc-800">{result.documentRef}</p>
            <p className="font-mono text-xs text-emerald-700 mt-0.5">{result.publicVerifyCode}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <Calendar className="mt-0.5 h-4 w-4 text-zinc-400" />
          <p className="text-zinc-700">Émis le {formatDocumentDate(result.issuedAt)}</p>
        </div>
        <div className="flex items-start gap-3">
          <Building2 className="mt-0.5 h-4 w-4 text-zinc-400" />
          <p className="text-zinc-700">
            {[result.schoolAddress, result.schoolCity].filter(Boolean).join(', ') ||
              result.schoolName}
          </p>
        </div>
        {isCertified ? (
          <div className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
            <BadgeCheck className="h-4 w-4" />
            Document généré et signé par SchoolManager
          </div>
        ) : null}
      </div>
    </div>
  )
}
