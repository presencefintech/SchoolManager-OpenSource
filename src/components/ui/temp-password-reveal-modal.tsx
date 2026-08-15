'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Copy, KeyRound } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TempPasswordRevealModalProps {
  open: boolean
  userName: string
  tempPassword: string
  onClose: () => void
}

export function TempPasswordRevealModal({ open, userName, tempPassword, onClose }: TempPasswordRevealModalProps) {
  const [copied, setCopied] = useState(false)

  if (!open) return null

  const handleCopy = () => {
    navigator.clipboard.writeText(tempPassword)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6" role="dialog" aria-modal="true">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center flex-shrink-0">
            <KeyRound size={16} className="text-emerald-600" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-zinc-900">Mot de passe régénéré</h3>
            <p className="text-xs text-zinc-400">{userName}</p>
          </div>
        </div>

        <div className="mt-4 bg-zinc-50 rounded-xl border border-zinc-200 px-4 py-3 flex items-center justify-between gap-3">
          <code className="text-lg font-bold font-mono text-zinc-900 tracking-wide break-all">{tempPassword}</code>
          <button
            type="button"
            onClick={handleCopy}
            className={cn(
              'flex-shrink-0 p-2 rounded-lg transition-colors',
              copied ? 'text-emerald-600 bg-emerald-50' : 'text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100',
            )}
            title="Copier"
          >
            {copied ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </div>

        <div className="mt-3 flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2.5">
          <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
          <p>Ce mot de passe ne sera plus affiché. Transmettez-le maintenant à l&apos;utilisateur — ses sessions actives ont été déconnectées.</p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-full mt-5 py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-medium hover:bg-zinc-700 transition-colors"
        >
          Fermer
        </button>
      </div>
    </div>
  )
}
