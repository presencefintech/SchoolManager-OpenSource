'use client'

import {
  defaultReasonCodeForStatus,
  formatReasonOptionLabel,
  groupPresenceReasonCatalog,
  listPresenceReasonsForStatus,
  reasonRequiresNote,
  type PresenceReasonCode,
  type PresenceStatusValue,
} from '@/lib/presence/presence-reason-codes'
import { usePresenceReasonCodes } from '@/lib/hooks/use-admin'

type Props = {
  status: PresenceStatusValue
  reasonCode?: PresenceReasonCode | ''
  note?: string
  disabled?: boolean
  selectClassName?: string
  onReasonCodeChange: (code: PresenceReasonCode | '') => void
  onNoteChange: (note: string | undefined) => void
}

export function PresenceReasonFields({
  status,
  reasonCode,
  note,
  disabled,
  selectClassName,
  onReasonCodeChange,
  onNoteChange,
}: Props) {
  const { data: catalog } = usePresenceReasonCodes()
  const reasons = listPresenceReasonsForStatus(status, catalog)
  const grouped = groupPresenceReasonCatalog(reasons)
  const showReason = status !== 'PRESENT'
  const resolvedCode = reasonCode || defaultReasonCodeForStatus(status)
  const showNote = showReason && reasonRequiresNote(resolvedCode || undefined, catalog)

  if (!showReason) {
    return (
      <p className="text-xs text-zinc-500">
        Aucun motif requis — l&apos;élève est comptabilisé comme{' '}
        <span className="font-medium text-zinc-700">présent</span>.
      </p>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1.5 block text-xs font-medium text-zinc-600">
          Motif d&apos;absence ou de retard <span className="text-red-500">*</span>
        </label>
        <p className="mb-2 text-[11px] text-zinc-400">
          Référentiel DfE / CEDS — regroupé par catégorie officielle.
        </p>
        <select
          value={resolvedCode}
          onChange={(e) => onReasonCodeChange(e.target.value as PresenceReasonCode)}
          disabled={disabled}
          className={selectClassName}
        >
          {grouped.map(({ group, labelFr, items }) => (
            <optgroup key={group} label={labelFr}>
              {items.map((entry) => (
                <option key={entry.code} value={entry.code}>
                  {formatReasonOptionLabel(entry)}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </div>
      {showNote && (
        <div>
          <label className="mb-1.5 block text-xs font-medium text-zinc-600">
            Précision <span className="text-red-500">*</span>
          </label>
          <textarea
            value={note ?? ''}
            onChange={(e) => onNoteChange(e.target.value.slice(0, 500) || undefined)}
            disabled={disabled}
            rows={2}
            className={selectClassName}
            placeholder="Ex. certificat médical, convocation, circonstance…"
          />
        </div>
      )}
    </div>
  )
}
