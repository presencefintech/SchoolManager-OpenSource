'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { cn } from '@/lib/utils'
import type { StudentCardProps } from '@/types/student-card'
import { CARD_PREVIEW_HEIGHT_PX, CARD_PREVIEW_WIDTH_PX } from '@/lib/student-card/card-dimensions'
import { prepareStudentCardAssets, type StudentCardAssets } from '@/lib/student-card/resolve-assets'
import { StudentCardPreview } from './student-card/student-card-preview'

export interface StudentCardReadyState {
  canDownload: boolean
  qrScannable: boolean
  reason?: string
  assets: StudentCardAssets | null
}

export interface StudentCardComponentProps extends StudentCardProps {
  onReady?: (state: StudentCardReadyState) => void
  /** Callback avec l'élément `.student-card` pour export / impression WYSIWYG */
  onCardElement?: (element: HTMLDivElement | null) => void
}

/**
 * Aperçu carte élève CR80 — dimensions px fixes, export PDF et impression WYSIWYG.
 */
export function StudentCard({ data, preview = false, className, onReady, onCardElement }: StudentCardComponentProps) {
  const [assets, setAssets] = useState<StudentCardAssets | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const setCardRef = useCallback(
    (node: HTMLDivElement | null) => {
      onCardElement?.(node)
    },
    [onCardElement],
  )

  const dataKey = useMemo(
    () =>
      JSON.stringify({
        id: data.studentId,
        matricule: data.matricule,
        photo: data.photoUrl,
        qr: data.qrPayload,
        school: data.schoolName,
        schoolCity: data.schoolCity,
        schoolLogoUrl: data.schoolLogoUrl,
        firstName: data.firstName,
        lastName: data.lastName,
        prenom: data.prenom,
        postnom: data.postnom,
        nationality: data.nationality,
        placeOfBirth: data.placeOfBirth,
        dateOfBirth: data.dateOfBirth,
        className: data.className,
        academicYear: data.academicYear,
        gender: data.gender,
        financialStatus: data.financialStatus,
      }),
    [data],
  )

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(null)
    setAssets(null)

    prepareStudentCardAssets(data)
      .then((resolved) => {
        if (cancelled) return
        setAssets(resolved)
        if (!resolved.qrScannable) {
          setError(resolved.qrValidationReason ?? 'QR code non scannable')
        }
        onReady?.({
          canDownload: resolved.qrScannable,
          qrScannable: resolved.qrScannable,
          reason: resolved.qrValidationReason,
          assets: resolved,
        })
      })
      .catch(() => {
        if (cancelled) return
        setError('Impossible de préparer la carte')
        onReady?.({ canDownload: false, qrScannable: false, reason: 'Erreur de préparation', assets: null })
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [dataKey])

  return (
    <div
      className={cn(
        'student-card-print-root inline-flex flex-col items-center',
        preview && 'rounded-lg ring-1 ring-zinc-200/90 shadow-lg bg-zinc-50 p-3',
        className,
      )}
    >
      {loading && (
        <div
          className="animate-pulse bg-zinc-100 rounded"
          style={{ width: CARD_PREVIEW_WIDTH_PX, height: CARD_PREVIEW_HEIGHT_PX }}
        />
      )}

      {!loading && error && (
        <p className="text-xs text-red-600 text-center max-w-xs mb-2">{error}</p>
      )}

      {!loading && assets && (
        <StudentCardPreview ref={setCardRef} data={data} assets={assets} />
      )}

      {!loading && assets?.qrScannable && (
        <p className="text-[10px] text-emerald-600 font-medium mt-2 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          QR validé — prêt pour export
        </p>
      )}
    </div>
  )
}

export {
  mapEnrollmentToStudentCard,
  mapDashboardToStudentCard,
  buildStudentCardData,
} from '@/lib/student-card/utils'
export { validateQrPayload } from '@/lib/student-card/validate-qr'
