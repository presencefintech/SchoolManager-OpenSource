'use client'

import { useCallback, useMemo, useState } from 'react'

function isEmpty(v: unknown): boolean {
  return v === undefined || v === null || v === '' || v === false
}

function filtersEqual<T extends Record<string, unknown>>(a: T, b: T, keys: (keyof T)[]): boolean {
  return keys.every((k) => a[k] === b[k] || (isEmpty(a[k]) && isEmpty(b[k])))
}

/** État brouillon / appliqué pour barres de recherche multicritères. */
export function useMultiCriteriaSearch<T extends Record<string, unknown>>(defaults: T) {
  const keys = useMemo(() => Object.keys(defaults) as (keyof T)[], [defaults])
  const [draft, setDraft] = useState<T>(defaults)
  const [applied, setApplied] = useState<T>(defaults)

  const setField = useCallback((key: keyof T, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }, [])

  const apply = useCallback(() => {
    setApplied(draft)
  }, [draft])

  const applyValues = useCallback((values: T) => {
    setDraft(values)
    setApplied(values)
  }, [])

  const reset = useCallback(() => {
    setDraft(defaults)
    setApplied(defaults)
  }, [defaults])

  const removeFilter = useCallback(
    (key: keyof T) => {
      const next = { ...applied, [key]: defaults[key] }
      setDraft(next)
      setApplied(next)
    },
    [applied, defaults],
  )

  const activeCount = useMemo(
    () => keys.filter((k) => !isEmpty(applied[k]) && applied[k] !== defaults[k]).length,
    [applied, defaults, keys],
  )

  const isDirty = useMemo(() => !filtersEqual(draft, applied, keys), [draft, applied, keys])

  return {
    draft,
    applied,
    setDraft,
    setField,
    apply,
    applyValues,
    reset,
    removeFilter,
    activeCount,
    isDirty,
  }
}
