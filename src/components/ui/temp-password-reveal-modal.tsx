'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Check, Copy, KeyRound, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface TempPasswordRevealModalProps {
  open: boolean
  userName: string
  tempPassword: string
  onClose: () => void
}

export function TempPasswordRevealModal({
  open,
  userName,
  tempPassword,
  onClose,
}: TempPasswordRevealModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(tempPassword)
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    } catch {
      /* ignore */
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
            role="dialog"
            aria-modal="true"
          >
            <div className="border-b border-zinc-100 px-5 py-4 bg-gradient-to-br from-zinc-50 to-white">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center flex-shrink-0 shadow-sm shadow-zinc-900/20">
                  <KeyRound size={16} className="text-white" />
                </div>
                <div>
                  <h3 className="text-base font-semibold text-zinc-900">
                    Mot de passe temporaire
                  </h3>
                  <p className="text-xs text-zinc-500 mt-0.5">{userName}</p>
                </div>
              </div>
            </div>

            <div className="px-5 py-4 space-y-3">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 flex items-center justify-between gap-3">
                <code className="text-lg font-bold font-mono text-zinc-900 tracking-[0.12em] break-all">
                  {tempPassword}
                </code>
                <button
                  type="button"
                  onClick={() => void handleCopy()}
                  className={cn(
                    'flex-shrink-0 inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-semibold transition-colors',
                    copied
                      ? 'text-emerald-700 bg-emerald-50'
                      : 'text-zinc-500 hover:text-zinc-800 hover:bg-zinc-100',
                  )}
                >
                  {copied ? <Check size={14} /> : <Copy size={14} />}
                  {copied ? 'Copié' : 'Copier'}
                </button>
              </div>

              <div className="flex items-start gap-2 text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2.5">
                <AlertTriangle size={14} className="flex-shrink-0 mt-0.5" />
                <p>
                  Affiché une seule fois. Transmettez-le maintenant — sessions révoquées, changement
                  de mot de passe exigé à la prochaine connexion.
                </p>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 px-0.5">
                <ShieldCheck size={12} className="text-emerald-600" />
                Action journalisée · support Superadmin
              </div>
            </div>

            <div className="border-t border-zinc-100 bg-zinc-50/60 px-5 py-4">
              <button
                type="button"
                onClick={onClose}
                className="w-full py-2.5 rounded-xl bg-zinc-900 text-white text-sm font-semibold hover:bg-zinc-800 transition-colors"
              >
                J&apos;ai transmis le mot de passe
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
