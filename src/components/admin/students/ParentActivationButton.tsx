'use client'

import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Copy, Loader2, MessageCircle, RefreshCw, UserPlus, X } from 'lucide-react'
import { useGenerateParentCode, useInvitationStatus } from '@/lib/hooks/use-admin'
import { getApiErrorMessage } from '@/lib/api/client'
import { useToast } from '@/providers/toast-provider'
import type { ParentInvitationCode } from '@/types/admin'

interface Props {
  studentId: number
  studentName: string
}

function isUsable(c: ParentInvitationCode): boolean {
  return !c.usedAt && (!c.expiresAt || new Date(c.expiresAt).getTime() > Date.now())
}

/**
 * Bouton « Activer parent » (liste élèves) : génère / affiche le code d'accès parent à usage unique
 * et prépare le message à envoyer au parent (lien d'activation + code).
 */
export function ParentActivationButton({ studentId, studentName }: Props) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-emerald-700"
        title={`Activer le compte parent de ${studentName}`}
      >
        <UserPlus size={13} />
        Activer parent
      </button>
      {open && <ParentActivationModal studentId={studentId} studentName={studentName} onClose={() => setOpen(false)} />}
    </>
  )
}

function ParentActivationModal({ studentId, studentName, onClose }: Props & { onClose: () => void }) {
  const toast = useToast()
  const { data, isLoading, refetch } = useInvitationStatus()
  const generate = useGenerateParentCode()
  const [copied, setCopied] = useState<'code' | 'message' | null>(null)

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const existing = (data?.parentCodes ?? []).find((c) => c.studentId === studentId && isUsable(c))
  const code = generate.data && isUsable(generate.data) ? generate.data : existing

  const link = typeof window !== 'undefined' ? `${window.location.origin}/activate-parent` : '/activate-parent'
  const message = code
    ? `Bonjour, voici l’accès à l’espace parent de ${studentName}.\n1. Ouvrez ${link}\n2. Saisissez votre numéro de téléphone puis le code de vérification reçu\n3. Entrez ce code école : ${code.code}`
    : ''

  async function copy(kind: 'code' | 'message', text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(kind)
      setTimeout(() => setCopied(null), 1800)
    } catch {
      toast.error('Copie impossible', 'Sélectionnez le texte manuellement.')
    }
  }

  function onGenerate() {
    generate.mutate(
      { studentId },
      {
        onSuccess: () => void refetch(),
        onError: (err) => toast.error('Code parent', getApiErrorMessage(err)),
      },
    )
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Activer le compte parent"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl border border-zinc-200 bg-white p-5 shadow-xl"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-zinc-900">Activer le compte parent</h2>
            <p className="text-sm text-zinc-500">{studentName}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-100">
            <X size={16} />
          </button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-8 text-zinc-400">
            <Loader2 className="animate-spin" size={20} />
          </div>
        ) : code ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-center">
              <p className="text-xs uppercase tracking-wide text-emerald-700">Code école (usage unique)</p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-widest text-emerald-900">{code.code}</p>
              {code.expiresAt && (
                <p className="mt-1 text-xs text-emerald-700">
                  Valable jusqu’au {new Date(code.expiresAt).toLocaleDateString('fr-FR', { dateStyle: 'long' })}
                </p>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => void copy('code', code.code)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                {copied === 'code' ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />} Copier le code
              </button>
              <button
                type="button"
                onClick={() => void copy('message', message)}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-2 text-sm font-medium hover:bg-zinc-50"
              >
                {copied === 'message' ? <Check size={14} className="text-emerald-600" /> : <MessageCircle size={14} />} Copier le message
              </button>
            </div>
            <p className="text-xs text-zinc-500">
              Le parent ouvre <span className="font-medium">{link}</span>, saisit le numéro donné à l’inscription, le code reçu par
              WhatsApp/SMS, puis ce code école.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generate.isPending}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-zinc-500 hover:text-zinc-800 disabled:opacity-50"
            >
              {generate.isPending ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />} Générer un nouveau code
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-zinc-600">
              Aucun code actif pour cet élève. Générez un code à usage unique à remettre au parent.
            </p>
            <button
              type="button"
              onClick={onGenerate}
              disabled={generate.isPending}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              {generate.isPending ? <Loader2 size={14} className="animate-spin" /> : <UserPlus size={14} />} Générer le code parent
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body,
  )
}
