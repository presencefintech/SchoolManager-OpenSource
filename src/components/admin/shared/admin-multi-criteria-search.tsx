'use client'

import { useState } from 'react'
import { Search, SlidersHorizontal, X, RotateCcw } from 'lucide-react'
import { cn } from '@/lib/utils'

export type MultiCriteriaField =
  | {
      id: string
      type: 'text'
      label: string
      placeholder?: string
      className?: string
    }
  | {
      id: string
      type: 'select'
      label: string
      placeholder?: string
      options: ReadonlyArray<{ value: string; label: string }>
      className?: string
    }
  | {
      id: string
      type: 'date'
      label: string
      className?: string
    }

type Chip = { id: string; label: string }

type Props<T extends Record<string, unknown>> = {
  title?: string
  /** Clé du champ texte principal (ex. `search`). */
  primaryKey?: keyof T & string
  primaryPlaceholder?: string
  fields: MultiCriteriaField[]
  values: T
  onChange: (id: keyof T & string, value: unknown) => void
  onApply: () => void
  onReset: () => void
  activeChips?: Chip[]
  onRemoveChip?: (id: string) => void
  resultCount?: number
  resultLabel?: string
  loading?: boolean
  className?: string
}

const inputCls =
  'w-full px-3 py-2 rounded-lg border border-zinc-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400'

export function AdminMultiCriteriaSearch<T extends Record<string, unknown>>({
  title = 'Recherche multicritères',
  primaryKey = 'search' as keyof T & string,
  primaryPlaceholder = 'Nom, matricule, référence…',
  fields,
  values,
  onChange,
  onApply,
  onReset,
  activeChips = [],
  onRemoveChip,
  resultCount,
  resultLabel = 'résultat',
  loading,
  className,
}: Props<T>) {
  const [expanded, setExpanded] = useState(false)
  const advancedFields = fields.filter((f) => f.id !== primaryKey)
  const activeCount = activeChips.length

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault()
      onApply()
    }
  }

  return (
    <div
      className={cn(
        'bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden',
        className,
      )}
    >
      <div className="px-4 py-3.5 border-b border-zinc-100 bg-gradient-to-r from-zinc-50/80 to-white flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 ring-1 ring-emerald-100">
            <Search size={15} />
          </div>
          <div>
            <p className="text-sm font-semibold text-zinc-800">{title}</p>
            <p className="text-[11px] text-zinc-400 hidden sm:block">Affinez par critères combinés</p>
          </div>
        </div>
        {typeof resultCount === 'number' && (
          <p className="text-xs text-zinc-500 tabular-nums">
            {loading ? '…' : (
              <>
                <span className="font-semibold text-zinc-700">{resultCount}</span>{' '}
                {resultLabel}
                {resultCount !== 1 ? 's' : ''}
              </>
            )}
          </p>
        )}
      </div>

      <div className="p-4 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
            <input
              type="search"
              value={String(values[primaryKey] ?? '')}
              onChange={(e) => onChange(primaryKey, e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={primaryPlaceholder}
              className="w-full pl-10 pr-4 py-2.5 bg-zinc-50 border border-zinc-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/30 focus:border-emerald-400 focus:bg-white"
            />
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            {advancedFields.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className={cn(
                  'inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-lg text-sm font-medium border transition-colors',
                  expanded || activeCount > 0
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                    : 'bg-white text-zinc-600 border-zinc-200 hover:bg-zinc-50',
                )}
              >
                <SlidersHorizontal size={14} />
                Filtres
                {activeCount > 0 && (
                  <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-emerald-600 px-1.5 text-[10px] font-bold text-white">
                    {activeCount}
                  </span>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={onApply}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-sm font-semibold text-white hover:bg-emerald-700 transition-colors"
            >
              Rechercher
            </button>
            {(activeCount > 0 || String(values[primaryKey] ?? '')) && (
              <button
                type="button"
                onClick={onReset}
                title="Réinitialiser"
                className="inline-flex items-center justify-center h-10 w-10 rounded-lg border border-zinc-200 text-zinc-500 hover:bg-zinc-50 hover:text-zinc-700"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
        </div>

        {expanded && advancedFields.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 pb-1 border-t border-zinc-100">
            {advancedFields.map((field) => (
              <div key={field.id} className={field.className}>
                <label className="block text-[11px] font-semibold uppercase tracking-wider text-zinc-400 mb-1.5">
                  {field.label}
                </label>
                {field.type === 'select' ? (
                  <select
                    value={String(values[field.id] ?? '')}
                    onChange={(e) => onChange(field.id, e.target.value || undefined)}
                    className={inputCls}
                  >
                    <option value="">{field.placeholder ?? 'Tous'}</option>
                    {field.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                ) : field.type === 'date' ? (
                  <input
                    type="date"
                    value={String(values[field.id] ?? '')}
                    onChange={(e) => onChange(field.id, e.target.value || undefined)}
                    className={inputCls}
                  />
                ) : (
                  <input
                    type="text"
                    value={String(values[field.id] ?? '')}
                    onChange={(e) => onChange(field.id, e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder={field.placeholder}
                    className={inputCls}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        {activeChips.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5 pt-1">
            <span className="text-[11px] font-medium text-zinc-400 mr-1">Actifs :</span>
            {activeChips.map((chip) => (
              <button
                key={chip.id}
                type="button"
                onClick={() => onRemoveChip?.(chip.id)}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 text-xs font-medium ring-1 ring-emerald-100 hover:bg-emerald-100 transition-colors"
              >
                {chip.label}
                <X size={11} className="opacity-70" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
