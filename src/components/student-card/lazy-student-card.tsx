'use client'

import dynamic from 'next/dynamic'
import { CARD_PREVIEW_HEIGHT_PX, CARD_PREVIEW_WIDTH_PX } from '@/lib/student-card/card-dimensions'

/** Carte élève + génération QR (librairie qrcode) chargées à la demande. */
export const LazyStudentCard = dynamic(
  () => import('@/components/StudentCard').then((m) => m.StudentCard),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-xl bg-zinc-100 animate-pulse"
        style={{ width: CARD_PREVIEW_WIDTH_PX, height: CARD_PREVIEW_HEIGHT_PX }}
      />
    ),
  },
)
