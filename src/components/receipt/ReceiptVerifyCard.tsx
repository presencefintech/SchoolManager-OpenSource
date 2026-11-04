'use client'

import { useEffect, useMemo, useState, type ElementType } from 'react'
import {
  AlertTriangle,
  Building2,
  Calendar,
  Check,
  Copy,
  CreditCard,
  Download,
  Hash,
  Mail,
  MapPin,
  Phone,
  Share2,
  ShieldAlert,
  ShieldCheck,
  User,
} from 'lucide-react'
import { formatMoney } from '@/lib/finance/currency'
import {
  formatReceiptDate,
  formatReceiptMethod,
  receiptVerifyReasonLabel,
} from '@/lib/receipt/verify-receipt'
import {
  buildReceiptShareText,
  buildReceiptShareTitle,
  shareReceiptPayload,
} from '@/lib/receipt/share-receipt'
import type { ReceiptMarketingLinks, ReceiptVerifyResult, ReceiptVerifySuccess } from '@/types/receipt-verify'

const FALLBACK_ACCENT = '#0f4c5c'
const FALLBACK_MARKETING: ReceiptMarketingLinks = {
  brand: 'PresenceFintech',
  certifiedBadge: 'Reçu certifié et sécurisé par PresenceFintech',
  websiteUrl: 'https://www.presence-fintech.com',
  salesEmail: 'support@presence-fintech.com',
  whatsappUrl:
    'https://wa.me/243973987886?text=Bonjour%2C%20je%20d%C3%A9couvre%20PresenceFintech%20via%20un%20re%C3%A7u%20scolaire%20et%20je%20souhaite%20%C3%A9quiper%20mon%20%C3%A9tablissement.',
  ctaTitle: 'Vous dirigez une école ?',
  ctaText:
    'Modernisez votre gestion avec PresenceFintech — encaissements, reçus certifiés et suivi des soldes, au standard d’une banque.',
  ctaWhatsAppLabel: 'Contactez-nous sur WhatsApp',
}
function xmlLite(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;')
}
export function ReceiptVerifyCard({
  result,
  proofQuery = '',
}: {
  result: ReceiptVerifyResult
  proofQuery?: string
}) {
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
  return <CertifiedReceipt result={result} proofQuery={proofQuery} />
}
function CertifiedReceipt({
  result,
  proofQuery,
}: {
  result: ReceiptVerifySuccess
  proofQuery: string
}) {
  const accent = /^#[0-9a-fA-F]{3,8}$/.test(result.schoolAccentColor || '')
    ? result.schoolAccentColor
    : FALLBACK_ACCENT
  const marketing = result.marketing ?? FALLBACK_MARKETING
  const amount = formatMoney(Number(result.amount), result.currency as 'USD' | 'CDF')
  const balance = formatMoney(Number(result.balanceDue || 0), result.currency as 'USD' | 'CDF')
  const logoSrc = useMemo(
    () => receiptAssetSrc(result, proofQuery, 'logo'),
    [result, proofQuery],
  )
  const pdfHref = useMemo(
    () => receiptAssetSrc(result, proofQuery, 'pdf'),
    [result, proofQuery],
  )
  const eventsHref = useMemo(
    () => (proofQuery ? `/api/v1/receipts/${encodeURIComponent(result.receiptNumber)}/events?${proofQuery}` : null),
    [result.receiptNumber, proofQuery],
  )
  const b2bHref = useMemo(
    () =>
      proofQuery
        ? `/api/v1/receipts/${encodeURIComponent(result.receiptNumber)}/go/whatsapp?${proofQuery}`
        : marketing.whatsappUrl,
    [result.receiptNumber, proofQuery, marketing.whatsappUrl],
  )
  const watermarkStyle = useMemo(() => {
    const label = `${xmlLite(result.schoolName)} · Sécurisé par PresenceFintech`
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="460" height="200"><text x="20" y="110" fill="#12202a" fill-opacity="0.055" font-size="14" font-family="sans-serif" font-weight="700" transform="rotate(-28 230 100)">${label}</text></svg>`
    return {
      backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
      backgroundRepeat: 'repeat',
      backgroundSize: '460px 200px',
    } as const
  }, [result.schoolName])

  useEffect(() => {
    if (!eventsHref || typeof window === 'undefined') return
    const key = `pf-rv-${result.receiptNumber}`
    try {
      if (sessionStorage.getItem(key)) return
      sessionStorage.setItem(key, '1')
    } catch {
      /* private mode */
    }
    try {
      navigator.sendBeacon?.(
        eventsHref,
        new Blob([JSON.stringify({ event: 'PUBLIC_VIEW' })], { type: 'application/json' }),
      )
    } catch {
      /* ignore */
    }
  }, [eventsHref, result.receiptNumber])

  const sharePayload = useMemo(
    () => ({
      title: buildReceiptShareTitle(result.schoolName, result.receiptNumber),
      text: buildReceiptShareText({
        schoolName: result.schoolName,
        studentName: result.studentName,
        receiptNumber: result.receiptNumber,
        amountLabel: amount,
        verifyUrl: result.verifyUrl,
      }),
      url: result.verifyUrl,
    }),
    [result, amount],
  )

  return (
    <div className="space-y-4" style={{ ['--receipt-accent' as string]: accent }}>
      <article className="relative overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-[0_18px_50px_rgba(18,32,42,0.08)]">
        <div
          className="pointer-events-none absolute inset-0 z-0 max-sm:opacity-30"
          style={watermarkStyle}
          aria-hidden
        />

        <div className="relative z-[1]">
        <div
          className="h-1.5"
          style={{ background: accent }}
        />

        <header className="flex items-center gap-4 border-b border-zinc-100 px-6 py-5">
          {logoSrc ? (
            <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50 p-1.5">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoSrc}
                alt={result.schoolName}
                width={72}
                height={72}
                decoding="async"
                className="max-h-full max-w-full object-contain"
              />
            </div>
          ) : (
            <div
              className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-2xl border text-2xl font-semibold"
              style={{ color: accent, borderColor: `${accent}33`, background: `${accent}10` }}
            >
              {result.schoolName.slice(0, 1).toUpperCase()}
            </div>
          )}
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-900">{result.schoolName}</h1>
            <p className="mt-0.5 text-sm text-zinc-500">
              {[result.schoolAddress, result.schoolPhone].filter(Boolean).join(' · ') ||
                'Reçu officiel de paiement'}
            </p>
          </div>
        </header>

        <div className="px-6 pt-4">
          <span
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[11px] font-semibold tracking-wide"
            style={{ background: `${accent}14`, color: accent }}
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_0_4px_rgba(16,185,129,0.15)]" />
            {marketing.certifiedBadge}
          </span>
        </div>

        <div className="px-6 py-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-zinc-400">
            Montant encaissé
          </p>
          <p className="mt-1 inline-block rounded-lg bg-white px-3 py-1 text-3xl font-bold tabular-nums tracking-tight text-zinc-900">
            {amount}
          </p>
          {result.cdfEquivalent != null && result.currency !== 'CDF' && (
            <p className="mt-1 text-sm text-zinc-500">
              ≈ {formatMoney(result.cdfEquivalent, 'CDF')}
              {result.exchangeRate ? ` (taux ${result.exchangeRate.toLocaleString('fr-FR')})` : ''}
            </p>
          )}
        </div>

        {result.feeLines.length > 0 && (
          <div className="mx-6 mb-4 rounded-xl border border-zinc-100 bg-zinc-50/80 p-3">
            <p className="mb-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400">
              Détail des frais
            </p>
            <ul className="space-y-1.5 text-sm">
              {result.feeLines.map((line, i) => (
                <li key={`${line.label}-${i}`} className="flex justify-between gap-2">
                  <span className="text-zinc-600">
                    {line.label}
                    {line.periodLabel ? <span className="text-zinc-400"> · {line.periodLabel}</span> : null}
                  </span>
                  <span className="font-medium tabular-nums text-zinc-800">
                    {formatMoney(Number(line.amount), line.currency as 'USD' | 'CDF')}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <dl className="grid gap-3 px-6 pb-4 text-sm sm:grid-cols-2">
          <Row icon={User} label="Élève" value={result.studentName} />
          <Row icon={User} label="Parent / tuteur" value={result.parentName || '—'} />
          {result.studentMatricule ? (
            <Row icon={Hash} label="Matricule" value={result.studentMatricule} mono />
          ) : null}
          {result.className ? <Row icon={Building2} label="Classe" value={result.className} /> : null}
          <Row icon={Hash} label="N° reçu" value={result.receiptNumber} mono />
          <Row icon={CreditCard} label="Motif" value={result.motiveSummary} />
          <Row icon={CreditCard} label="Solde restant" value={balance} />
          <Row icon={CreditCard} label="Mode" value={formatReceiptMethod(result.method)} />
          <Row icon={Calendar} label="Confirmé le" value={formatReceiptDate(result.confirmedAt)} />
          <Row icon={User} label="Encaissé par" value={result.orchestratedBy} />
          {result.schoolAddress ? <Row icon={MapPin} label="Adresse" value={result.schoolAddress} /> : null}
          {result.schoolPhone ? <Row icon={Phone} label="Téléphone" value={result.schoolPhone} /> : null}
          {result.schoolEmail ? <Row icon={Mail} label="Email" value={result.schoolEmail} /> : null}
        </dl>

        <div className="flex flex-wrap items-center justify-center gap-2 px-6 pb-4">
          <DownloadPdfButton href={pdfHref} filename={`${result.receiptNumber}.pdf`} accent={accent} />
          <ShareReceiptButton payload={sharePayload} accent={accent} />
        </div>

        <div className="px-6 pb-4">
          <CopyableCode code={result.publicVerifyCode} />
        </div>

        <div className="mx-6 mb-6 flex items-center gap-2 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2.5 text-xs text-zinc-600">
          {result.hmacValid ? (
            <ShieldCheck size={16} className="shrink-0 text-emerald-600" />
          ) : (
            <ShieldAlert size={16} className="shrink-0 text-amber-600" />
          )}
          <span>
            {result.hmacValid ? 'Reçu authentique' : 'Reçu à contrôler'} · vérifié le{' '}
            {formatReceiptDate(result.verifiedAt)}
          </span>
        </div>
        </div>
      </article>

      <aside className="rounded-2xl bg-[#12202a] px-5 py-5 text-white shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-300/90">
          PresenceFintech · Écoles
        </p>
        <p className="mt-2 text-base font-semibold leading-snug">{marketing.ctaTitle}</p>
        <p className="mt-2 text-sm leading-relaxed text-slate-300">{marketing.ctaText}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {b2bHref ? (
            <a
              href={b2bHref}
              rel="noopener noreferrer"
              className="inline-flex min-h-10 items-center justify-center rounded-xl bg-[#25d366] px-4 text-sm font-semibold text-[#06210f]"
            >
              {marketing.ctaWhatsAppLabel || 'Contactez-nous sur WhatsApp'}
            </a>
          ) : null}
          <a
            href={marketing.websiteUrl}
            rel="noopener noreferrer"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-white/20 px-4 text-sm font-semibold text-white"
          >
            Découvrir {marketing.brand}
          </a>
        </div>
      </aside>

      <p className="text-center text-[11px] text-zinc-400">
        {result.poweredBy || 'Propulsé par PresenceFintech'}
      </p>
    </div>
  )
}

function receiptAssetSrc(result: ReceiptVerifySuccess, proofQuery: string, kind: 'pdf' | 'logo') {
  if (!proofQuery) return null
  if (kind === 'logo') {
    const stored = result.schoolLogoUrl?.trim()
    if (!stored) return null
    if (/^https?:\/\//i.test(stored) || stored.startsWith('data:')) return stored
  }
  return `/api/v1/receipts/${encodeURIComponent(result.receiptNumber)}/${kind}?${proofQuery}`
}

function DownloadPdfButton({
  href,
  filename,
  accent,
}: {
  href: string | null
  filename: string
  accent: string
}) {
  const [busy, setBusy] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  if (!href) return null

  const handleClick = async () => {
    setBusy(true)
    setHint(null)
    try {
      const res = await fetch(href, { headers: { Accept: 'application/pdf' } })
      if (res.status === 202) {
        window.print()
        setHint('PDF officiel en préparation — impression du reçu affichée.')
        return
      }
      if (!res.ok) {
        window.print()
        setHint('Téléchargement indisponible — utilisez Imprimer → Enregistrer en PDF.')
        return
      }
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      window.print()
      setHint('Connexion interrompue — impression du reçu affichée.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white disabled:opacity-70"
        style={{ background: accent }}
      >
        <Download size={16} />
        {busy ? 'Préparation…' : 'Télécharger en PDF'}
      </button>
      {hint ? <p className="mt-2 text-xs text-zinc-500">{hint}</p> : null}
    </div>
  )
}

function ShareReceiptButton({
  payload,
  accent,
}: {
  payload: { title: string; text: string; url: string }
  accent: string
}) {
  const [busy, setBusy] = useState(false)

  const handleClick = async () => {
    setBusy(true)
    try {
      await shareReceiptPayload(payload)
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border-2 bg-white px-5 text-sm font-semibold disabled:opacity-70"
      style={{ borderColor: accent, color: accent }}
    >
      <Share2 size={16} />
      {busy ? 'Partage…' : 'Partager ce reçu'}
    </button>
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
      <p className="mb-1 text-xs text-zinc-400">Code de vérification (ticket)</p>
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
  icon: ElementType
  label: string
  value: string
  mono?: boolean
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-zinc-400" />
      <div className="min-w-0 flex-1">
        <dt className="text-xs text-zinc-400">{label}</dt>
        <dd className={`break-words font-medium text-zinc-800 ${mono ? 'font-mono text-xs' : ''}`}>
          {value}
        </dd>
      </div>
    </div>
  )
}
