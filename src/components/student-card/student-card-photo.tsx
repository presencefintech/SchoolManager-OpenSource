'use client'

import { useEffect, useId, useState } from 'react'
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
 * Photo d'identité — conteneur taille fixe (anti-CLS) :
 * 1. URL dynamique (API / Cloudinary)
 * 2. Badge SVG initiales si absent / erreur réseau
 */
export function StudentCardPhoto({
  photoUrl,
  firstName,
  lastName,
  className,
  schoolInitial,
}: StudentCardPhotoProps & { schoolInitial?: string | null }) {
  const [imgError, setImgError] = useState(false)
  const [imgLoaded, setImgLoaded] = useState(false)
  const trimmed = photoUrl?.trim() || ''
  const showImage = Boolean(trimmed) && !imgError
  const initials = initialsFromName(firstName, lastName)
  const hue = avatarHue(firstName, lastName)
  const brand = (schoolInitial?.trim()[0] ?? 'P').toUpperCase()
  const gradId = `ph-${useId().replace(/:/g, '')}`

  // Reset error when URL changes (nouvelle photo uploadée)
  useEffect(() => {
    setImgError(false)
    setImgLoaded(false)
  }, [trimmed])

  return (
    <div
      className={cn(
        'relative h-full w-full overflow-hidden',
        'ring-1 ring-inset ring-black/10',
        'bg-zinc-100',
        className,
      )}
      style={{ aspectRatio: '1 / 1', contain: 'layout paint' }}
      aria-hidden
    >
      {/* SVG toujours monté dessous → swap sans layout shift */}
      <svg
        viewBox="0 0 100 100"
        className={cn(
          'absolute inset-0 h-full w-full transition-opacity duration-200',
          showImage && imgLoaded ? 'opacity-0' : 'opacity-100',
        )}
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={`hsl(${hue} 42% 88%)`} />
            <stop offset="100%" stopColor={`hsl(${hue} 48% 68%)`} />
          </linearGradient>
        </defs>
        <rect width="100" height="100" fill={`url(#${gradId})`} />
        <circle cx="82" cy="18" r="14" fill="rgba(255,255,255,0.22)" />
        <text
          x="50"
          y="54"
          textAnchor="middle"
          fontSize="28"
          fontWeight="700"
          fontFamily="system-ui, sans-serif"
          fill="#fff"
          style={{ letterSpacing: '0.06em' }}
        >
          {initials}
        </text>
        <text
          x="50"
          y="88"
          textAnchor="middle"
          fontSize="9"
          fontWeight="600"
          fontFamily="system-ui, sans-serif"
          fill="rgba(255,255,255,0.75)"
        >
          {brand}
        </text>
      </svg>

      {showImage ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={trimmed}
          alt=""
          onLoad={() => setImgLoaded(true)}
          onError={() => {
            setImgError(true)
            setImgLoaded(false)
          }}
          className={cn(
            'absolute inset-0 h-full w-full object-cover object-center',
            'transition-opacity duration-200',
            imgLoaded ? 'opacity-100' : 'opacity-0',
          )}
          width={80}
          height={80}
          draggable={false}
          decoding="async"
        />
      ) : null}
    </div>
  )
}
