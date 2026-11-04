'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ConfirmDialogProps {
  open: boolean
  title: string
  description: string
  impact?: string[]
  confirmLabel?: string
  cancelLabel?: string
  variant?: 'default' | 'danger'
  loading?: boolean
  reasonLabel?: string
  reasonPlaceholder?: string
  reason?: string
  onReasonChange?: (value: string) => void
  confirmDisabled?: boolean
  onConfirm: () => void
  onCancel: () => void
}

export function ConfirmDialog({
  open,
  title,
  description,
  impact = [],
  confirmLabel = 'Confirmer',
  cancelLabel = 'Annuler',
  variant = 'default',
  loading,
  reasonLabel,
  reasonPlaceholder,
  reason,
  onReasonChange,
  confirmDisabled,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden"
        role="dialog"
        aria-modal="true"
      >
        <div className="p-4 sm:p-6 overflow-y-auto min-h-0 flex-1 space-y-3">
          <h3 className="text-base font-semibold text-zinc-900 break-words">{title}</h3>
          <p className="text-sm text-zinc-600 break-words">{description}</p>
          {impact.length > 0 && (
            <ul className="space-y-1 text-xs text-zinc-500 bg-zinc-50 rounded-lg p-3 border border-zinc-100">
              {impact.map((line) => (
                <li key={line} className="break-words">
                  · {line}
                </li>
              ))}
            </ul>
          )}
          {onReasonChange && (
            <div>
              <label className="block text-xs font-medium text-zinc-600 mb-1">
                {reasonLabel ?? 'Motif'}
              </label>
              <textarea
                value={reason ?? ''}
                onChange={(e) => onReasonChange(e.target.value)}
                rows={3}
                placeholder={reasonPlaceholder}
                className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 resize-none"
              />
            </div>
          )}
        </div>
        <div className="flex flex-col-reverse sm:flex-row gap-2 p-4 sm:p-6 pt-0 sm:pt-0 border-t border-zinc-100 shrink-0">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading || confirmDisabled}
            className={cn(
              'flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium text-white disabled:opacity-50',
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {loading && <Loader2 size={14} className="animate-spin" />}
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
