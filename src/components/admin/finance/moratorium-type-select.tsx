'use client'

import { labelMoratoriumType } from '@/lib/business-labels'
import type { MoratoriumType } from '@/types/admin'

export function MoratoriumTypeSelect({
  value,
  onChange,
  allowedTypes,
  defaultType,
  isLoading = false,
  className = 'w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400',
}: {
  value: MoratoriumType
  onChange: (type: MoratoriumType) => void
  allowedTypes: MoratoriumType[]
  defaultType: MoratoriumType
  isLoading?: boolean
  className?: string
}) {
  if (isLoading) {
    return <div className="h-10 rounded-lg bg-zinc-100 animate-pulse" />
  }

  const effective = allowedTypes.includes(value) ? value : defaultType

  return (
    <select
      value={effective}
      onChange={(e) => onChange(e.target.value as MoratoriumType)}
      className={className}
    >
      {allowedTypes.map((t) => (
        <option key={t} value={t}>{labelMoratoriumType(t)}</option>
      ))}
    </select>
  )
}
