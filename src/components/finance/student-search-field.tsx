'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { useFinanceClasses, useFinanceStudentSearch } from '@/lib/hooks/use-finance'
import type { FinanceStudentResult } from '@/types/finance'
import { cn } from '@/lib/utils'

type ClassRow = {
  id: number
  name: string
  sectionId?: number
  optionId?: number
  section?: { id: number; name: string }
  option?: { id: number; name: string }
}

interface FinanceStudentSearchFieldProps {
  studentId: number
  onSelect: (id: number, student?: FinanceStudentResult) => void
  label?: string
  required?: boolean
  className?: string
}

const selectCls =
  'w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400/40'

export function FinanceStudentSearchField({
  studentId,
  onSelect,
  label = 'Élève',
  required,
  className,
}: FinanceStudentSearchFieldProps) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<FinanceStudentResult | null>(null)
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [optionId, setOptionId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data: classesRaw } = useFinanceClasses()
  const classes: ClassRow[] = Array.isArray(classesRaw)
    ? (classesRaw as ClassRow[])
    : ((classesRaw as { data?: ClassRow[] })?.data ?? [])

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      const id = c.sectionId ?? c.section?.id
      const name = c.section?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (sectionId !== '' && (c.sectionId ?? c.section?.id) !== sectionId) continue
      const id = c.optionId ?? c.option?.id
      const name = c.option?.name
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId])

  const filteredClasses = useMemo(() => {
    return classes
      .filter((c) => {
        if (sectionId !== '' && (c.sectionId ?? c.section?.id) !== sectionId) return false
        if (optionId !== '' && (c.optionId ?? c.option?.id) !== optionId) return false
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId, optionId])

  const filters = {
    sectionId: sectionId === '' ? undefined : sectionId,
    optionId: optionId === '' ? undefined : optionId,
    classId: classId === '' ? undefined : classId,
  }
  const hasFilter = filters.sectionId != null || filters.optionId != null || filters.classId != null

  const { data: results = [], isFetching } = useFinanceStudentSearch(debounced, filters)

  function pick(s: FinanceStudentResult) {
    setSelected(s)
    onSelect(s.id, s)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setSelected(null)
    onSelect(0)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key !== 'Enter') return
    e.preventDefault()
    if (results.length > 0) {
      pick(results[0])
    }
  }

  function onSectionChange(value: string) {
    const next = value ? Number(value) : ''
    setSectionId(next)
    setOptionId('')
    setClassId('')
  }

  function onOptionChange(value: string) {
    const next = value ? Number(value) : ''
    setOptionId(next)
    setClassId('')
  }

  const showResults = debounced.length >= 2 || hasFilter

  return (
    <div className={cn('space-y-1.5', className)}>
      <label className="block text-xs font-medium text-zinc-500">
        {label}
        {required && <span className="text-red-500"> *</span>}
      </label>
      {selected && studentId > 0 ? (
        <div className="flex items-center justify-between gap-2 rounded-xl border border-emerald-200 bg-emerald-50/80 px-3 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-emerald-900">
              {selected.name}
              {selected.matricule ? ` · ${selected.matricule}` : ''}
            </p>
            {selected.className && (
              <p className="text-xs text-emerald-700/70">{selected.className}</p>
            )}
            {selected.isCrossSite && selected.schoolName ? (
              <p className="text-[10px] font-medium text-amber-800 mt-0.5">
                Inscrit · {selected.schoolName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clear}
            className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Section
              </label>
              <select
                value={sectionId === '' ? '' : String(sectionId)}
                onChange={(e) => onSectionChange(e.target.value)}
                className={selectCls}
              >
                <option value="">Toutes</option>
                {sections.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Option
              </label>
              <select
                value={optionId === '' ? '' : String(optionId)}
                onChange={(e) => onOptionChange(e.target.value)}
                className={selectCls}
              >
                <option value="">Toutes</option>
                {options.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                Classe
              </label>
              <select
                value={classId === '' ? '' : String(classId)}
                onChange={(e) => setClassId(e.target.value ? Number(e.target.value) : '')}
                className={selectCls}
              >
                <option value="">Toutes</option>
                {filteredClasses.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              placeholder="Matricule, nom, postnom ou réf. paiement (Entrée = 1er résultat)"
              className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
            />
          </div>
          <p className="text-[10px] text-zinc-400">
            Filtrez par section / option / classe, ou collez une référence Orange Money / M-Pesa.
          </p>
          {showResults && (
            <div className="max-h-52 overflow-y-auto rounded-xl border border-zinc-200 bg-white shadow-sm divide-y divide-zinc-100">
              {isFetching ? (
                <p className="px-3 py-2.5 text-xs text-zinc-400">Recherche…</p>
              ) : results.length ? (
                results.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pick(s)}
                    className={cn(
                      'w-full px-3 py-2.5 text-left text-sm transition-colors hover:bg-emerald-50/60',
                      i === 0 && 'bg-emerald-50/40',
                    )}
                  >
                    <span className="font-medium text-zinc-900">{s.name}</span>
                    {s.matricule && (
                      <span className="ml-1.5 text-zinc-400">({s.matricule})</span>
                    )}
                    {s.className && (
                      <span className="mt-0.5 block text-xs text-zinc-400">{s.className}</span>
                    )}
                    {s.isCrossSite && s.schoolName ? (
                      <span className="mt-0.5 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                        {s.schoolName}
                      </span>
                    ) : null}
                    {i === 0 ? (
                      <span className="mt-0.5 block text-[10px] font-medium text-emerald-700">
                        Entrée pour ouvrir
                      </span>
                    ) : null}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2.5 text-xs text-zinc-400">Aucun élève trouvé</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
