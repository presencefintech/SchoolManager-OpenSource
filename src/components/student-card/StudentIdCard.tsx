'use client'

import { useCallback, useRef } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { Printer, User } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatStudentIdentityView } from '@/lib/utils/student-name.util'
import { serializeStudentCardQrPayload } from '@/lib/student-card/build-qr-payload'
import { CARD_WIDTH_MM, CARD_HEIGHT_MM } from '@/lib/student-card/card-dimensions'
import { printStudentCardInPlace } from '@/lib/student-card/print-in-place'

export type StudentIdCardProps = {
  studentId: number
  firstName: string
  lastName: string
  /** Prénom administratif RDC (prioritaire sur firstName à l’affichage) */
  prenom?: string | null
  postnom?: string | null
  matricule?: string | null
  /** Libellé classe (ex. 6ème A) */
  classLabel?: string | null
  photoUrl?: string | null
  schoolName?: string | null
  schoolLogoUrl?: string | null
  academicYear?: string | null
  /** Affiche le bouton d’impression (défaut: true) */
  showPrintButton?: boolean
  className?: string
}

/**
 * Carte d’identité élève — format CR80 (85.6 × 54 mm), style carte premium.
 * QR live via qrcode.react ; impression via @media print (globals.css).
 */
export function StudentIdCard({
  studentId,
  firstName,
  lastName,
  prenom,
  postnom,
  matricule,
  classLabel,
  photoUrl,
  schoolName,
  schoolLogoUrl,
  academicYear,
  showPrintButton = true,
  className,
}: StudentIdCardProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const identity = formatStudentIdentityView({ firstName, lastName, prenom, postnom })
  const idLabel = matricule?.trim() || `ID-${String(studentId).padStart(6, '0')}`
  const qrValue = serializeStudentCardQrPayload(studentId, matricule)
  const school = schoolName?.trim() || 'Établissement scolaire'
  const schoolInitial = school.charAt(0).toUpperCase()
  const yearLabel = academicYear?.trim() || null

  const handlePrint = useCallback(() => {
    const card = rootRef.current?.querySelector('.student-card') as HTMLElement | null
    if (!card) return
    printStudentCardInPlace(card)
  }, [])

  return (
    <div className={cn('student-card-print-root flex flex-col items-start gap-3', className)}>
      <div
        ref={rootRef}
        className="student-card relative overflow-hidden rounded-[14px] shadow-[0_12px_40px_-12px_rgba(15,23,42,0.45)] ring-1 ring-black/10"
        style={{
          width: `min(100%, ${CARD_WIDTH_MM * 4.2}px)`,
          aspectRatio: `${CARD_WIDTH_MM} / ${CARD_HEIGHT_MM}`,
          maxWidth: `${CARD_WIDTH_MM * 4.2}px`,
          fontFamily: 'Arial, Helvetica, sans-serif',
          WebkitPrintColorAdjust: 'exact',
          printColorAdjust: 'exact',
        }}
      >
        {/* Fond principal */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(145deg, #0b3d3a 0%, #0f5c56 38%, #147a6f 72%, #0c4a45 100%)',
          }}
        />

        {/* Texture + lumière */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage: [
              'radial-gradient(ellipse 80% 60% at 0% 0%, rgba(255,255,255,0.18), transparent 55%)',
              'radial-gradient(ellipse 50% 40% at 100% 100%, rgba(251,191,36,0.12), transparent 50%)',
              'repeating-linear-gradient(-18deg, transparent 0 10px, rgba(255,255,255,0.015) 10px 11px)',
            ].join(', '),
          }}
        />

        {/* Bande holographique discrète */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-0 right-0 top-[18%] h-[9%]"
          style={{
            background:
              'linear-gradient(90deg, transparent, rgba(255,255,255,0.08), rgba(251,191,36,0.22), rgba(255,255,255,0.1), transparent)',
            opacity: 0.85,
          }}
        />

        {/* Contenu */}
        <div className="relative z-[1] flex h-full flex-col text-white">
          {/* En-tête école */}
          <header className="flex items-center gap-[2.5%] border-b border-white/10 bg-black/15 px-[4%] py-[2.8%]">
            <div className="flex h-[clamp(28px,7.5vw,36px)] w-[clamp(28px,7.5vw,36px)] shrink-0 items-center justify-center overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-white/40">
              {schoolLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={schoolLogoUrl} alt="" className="h-[78%] w-[78%] object-contain" />
              ) : (
                <span className="text-[clamp(12px,3vw,15px)] font-bold text-teal-800">
                  {schoolInitial}
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[clamp(11px,2.8vw,14px)] font-bold leading-tight tracking-tight">
                {school}
              </p>
              <p className="mt-0.5 text-[clamp(7px,1.8vw,9px)] font-semibold uppercase tracking-[0.16em] text-amber-200/90">
                Carte d&apos;identité élève
              </p>
            </div>
            {yearLabel ? (
              <div className="shrink-0 rounded-md border border-amber-200/30 bg-amber-400/15 px-2 py-1 text-center">
                <p className="text-[clamp(6px,1.5vw,8px)] font-medium uppercase tracking-wider text-amber-100/80">
                  Validité
                </p>
                <p className="text-[clamp(8px,2vw,10px)] font-bold tabular-nums text-amber-50">
                  {yearLabel}
                </p>
              </div>
            ) : null}
          </header>

          {/* Corps */}
          <div className="flex min-h-0 flex-1 gap-[3%] px-[4%] py-[3%]">
            {/* Photo + chip */}
            <div className="flex w-[24%] shrink-0 flex-col gap-[6%]">
              <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-teal-950/50 shadow-[inset_0_0_0_2px_rgba(251,191,36,0.45)]">
                {photoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={photoUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-gradient-to-b from-teal-800/40 to-teal-950/60 text-teal-100/60">
                    <User className="h-[36%] w-[36%]" strokeWidth={1.4} />
                    <span className="text-[clamp(6px,1.4vw,8px)] font-medium uppercase tracking-wide">
                      Photo
                    </span>
                  </div>
                )}
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-x-0 bottom-0 h-[28%] bg-gradient-to-t from-black/35 to-transparent"
                />
              </div>

              {/* Puce style carte bancaire */}
              <div
                aria-hidden
                className="mx-auto h-[clamp(14px,3.8vw,18px)] w-[clamp(20px,5.5vw,26px)] rounded-[3px] shadow-sm"
                style={{
                  background:
                    'linear-gradient(135deg, #fcd34d 0%, #f59e0b 45%, #b45309 100%)',
                  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.45), 0 1px 2px rgba(0,0,0,0.25)',
                }}
              >
                <div
                  className="h-full w-full opacity-40"
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, transparent 20%, rgba(0,0,0,0.25) 20% 22%, transparent 22% 48%, rgba(0,0,0,0.2) 48% 50%, transparent 50% 78%, rgba(0,0,0,0.25) 78% 80%, transparent 80%)',
                  }}
                />
              </div>
            </div>

            {/* Identité */}
            <div className="flex min-w-0 flex-1 flex-col justify-between py-[1%]">
              <div className="space-y-[6%]">
                <IdentityBlock label="Prénom" value={identity.prenom || '—'} size="lg" />
                <IdentityBlock label="Nom" value={identity.nom || '—'} size="md" />
                {identity.postnom ? (
                  <IdentityBlock label="Post-nom" value={identity.postnom} size="md" />
                ) : null}
              </div>

              <div className="mt-auto grid grid-cols-2 gap-x-[6%] gap-y-[8%] border-t border-white/15 pt-[8%]">
                <IdentityBlock label="N° élève" value={idLabel} mono />
                <IdentityBlock
                  label="Classe"
                  value={classLabel?.trim() || '—'}
                />
              </div>
            </div>

            {/* QR */}
            <div className="student-card-qr-box flex w-[26%] shrink-0 flex-col items-center justify-between">
              <div className="w-full rounded-lg bg-white p-[8%] shadow-[0_4px_14px_rgba(0,0,0,0.2)] ring-1 ring-amber-200/40">
                <QRCodeSVG
                  value={qrValue}
                  size={112}
                  level="H"
                  marginSize={1}
                  bgColor="#ffffff"
                  fgColor="#0f172a"
                  className="student-card-qr-image h-auto w-full"
                />
              </div>
              <div className="mt-[8%] text-center">
                <p className="text-[clamp(7px,1.7vw,9px)] font-bold uppercase tracking-[0.12em] text-amber-100/95">
                  Présence
                </p>
                <p className="mt-0.5 text-[clamp(6px,1.4vw,8px)] text-white/65">
                  Scanner le QR
                </p>
              </div>
            </div>
          </div>

          {/* Pied */}
          <footer className="flex items-center justify-between gap-2 border-t border-white/10 bg-black/20 px-[4%] py-[1.8%]">
            <p className="truncate text-[clamp(6px,1.5vw,8px)] text-white/55">
              Document officiel · propriété de l&apos;établissement
            </p>
            <p className="shrink-0 text-[clamp(6px,1.5vw,8px)] font-semibold tracking-wide text-teal-100/80">
              Presence · RDC
            </p>
          </footer>
        </div>
      </div>

      {showPrintButton ? (
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3.5 py-2 text-xs font-medium text-zinc-700 shadow-sm transition hover:border-teal-200 hover:bg-teal-50/60 hover:text-teal-900 print:hidden"
        >
          <Printer size={14} />
          Imprimer la carte
        </button>
      ) : null}
    </div>
  )
}

function IdentityBlock({
  label,
  value,
  size = 'sm',
  mono,
}: {
  label: string
  value: string
  size?: 'sm' | 'md' | 'lg'
  mono?: boolean
}) {
  return (
    <div className="min-w-0">
      <p className="text-[clamp(6px,1.55vw,8px)] font-semibold uppercase tracking-[0.14em] text-teal-100/70">
        {label}
      </p>
      <p
        className={cn(
          'truncate leading-snug text-white',
          size === 'lg' && 'text-[clamp(13px,3.2vw,17px)] font-bold',
          size === 'md' && 'text-[clamp(11px,2.7vw,14px)] font-bold',
          size === 'sm' && 'text-[clamp(9px,2.2vw,12px)] font-semibold',
          mono && 'font-mono tracking-wide',
        )}
        title={value}
      >
        {value}
      </p>
    </div>
  )
}
