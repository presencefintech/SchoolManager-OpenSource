'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import type { StudentCardPhotoProps } from '@/types/student-card'

function initialsFromName(firstName: string, lastName: string): string {
  const a = firstName.trim()[0] ?? ''
  const b = lastName.trim()[0] ?? ''
  return (a + b).toUpperCase() || '?'
}

/** Teinte déterministe à partir du nom (cohérence visuelle sans photo) */
function avatarHue(firstName: string, lastName: string): number {
  const seed = `${firstName}${lastName}`.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)
  return seed % 360
}

/**
 * Photo d'identité avec repli gracieux :
 * 1. URL dynamique (API / Cloudinary)
 * 2. Avatar initiales sur fond dégradé si absent ou erreur de chargement
 */
export function StudentCardPhoto({ photoUrl, firstName, lastName, className }: StudentCardPhotoProps) {
  const [imgError, setImgError] = useState(false)
  const showImage = Boolean(photoUrl?.trim()) && !imgError
  const initials = initialsFromName(firstName, lastName)
  const hue = avatarHue(firstName, lastName)

  if (showImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={photoUrl!}
        alt=""
        onError={() => setImgError(true)}
        className={cn(
          'h-full w-full object-cover object-center',
          'ring-1 ring-inset ring-black/10',
          className,
        )}
        draggable={false}
      />
    )
  }

  return (
    <div
      className={cn(
        'h-full w-full flex items-center justify-center',
        'ring-1 ring-inset ring-black/10',
        className,
      )}
      style={{
        background: `linear-gradient(145deg, hsl(${hue} 45% 88%) 0%, hsl(${hue} 55% 72%) 100%)`,
      }}
      aria-hidden
    >
      <span className="text-[11px] font-bold tracking-wider text-white drop-shadow-sm select-none">
        {initials}
      </span>
    </div>
  )
}
