'use client'

import { useState } from 'react'
import { Copy, Check, MessageCircle, ExternalLink } from 'lucide-react'
import { cn } from '@/lib/utils'

type Props = {
  link: string | null | undefined
  error?: string | null
  className?: string
  /** Contexte court sous le titre */
  hint?: string
}

/**
 * Bandeau d’assistance WhatsApp après invitation staff (mode sans SMS payant).
 */
export function WhatsAppInviteAssist({
  link,
  error,
  className,
  hint = 'Message OTP prérempli — appuyez sur Envoyer dans WhatsApp.',
}: Props) {
  const [copied, setCopied] = useState(false)

  if (!link && !error) return null

  if (!link) {
    return (
      <div
        className={cn(
          'rounded-xl border border-amber-200 bg-amber-50/80 px-3 py-3 text-xs text-amber-900',
          className,
        )}
      >
        Lien WhatsApp indisponible{error ? ` : ${error}` : ''}. Transmettez le code OTP présent
        dans l’email d’invitation.
      </div>
    )
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link!)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      /* ignore */
    }
  }

  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50/70 px-3 py-3',
        className,
      )}
    >
      <MessageCircle size={16} className="text-emerald-700 shrink-0" />
      <div className="flex-1 min-w-[12rem]">
        <p className="text-xs font-semibold text-emerald-950">Envoyer l’OTP via WhatsApp</p>
        <p className="text-[11px] text-emerald-800/90 mt-0.5">{hint}</p>
      </div>
      <a
        href={link}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white hover:bg-emerald-800"
      >
        <ExternalLink size={13} />
        Ouvrir WhatsApp
      </a>
      <button
        type="button"
        onClick={() => void copyLink()}
        className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-white px-2.5 py-2 text-xs text-emerald-800 hover:bg-emerald-50"
      >
        {copied ? <Check size={12} className="text-emerald-600" /> : <Copy size={12} />}
        {copied ? 'Copié' : 'Copier le lien'}
      </button>
    </div>
  )
}
