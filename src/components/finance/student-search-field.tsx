'use client'

import { useEffect, useId, useMemo, useState } from 'react'
import { Search, X } from 'lucide-react'
import { useFinanceClasses, useFinanceStudentSearch } from '@/lib/hooks/use-finance'
import type { FinanceStudentResult } from '@/types/finance'
import { useSchoolMoney } from '@/lib/finance/use-school-money'
import { cn } from '@/lib/utils'

type ClassRow = {
  id: number
  name: string
  sectionId?: number
  optionId?: number
  sectionName?: string | null
  optionName?: string | null
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

function pedagogyLine(s: FinanceStudentResult): string | null {
  const parts = [s.sectionName, s.optionName, s.className].filter(Boolean)
  return parts.length ? parts.join(' · ') : s.className
}

function classSectionId(c: ClassRow): number | undefined {
  return c.sectionId ?? c.section?.id
}

function classSectionName(c: ClassRow): string | undefined {
  return c.section?.name ?? c.sectionName ?? undefined
}

function classOptionId(c: ClassRow): number | undefined {
  return c.optionId ?? c.option?.id
}

function classOptionName(c: ClassRow): string | undefined {
  return c.option?.name ?? c.optionName ?? undefined
}

export function FinanceStudentSearchField({
  studentId,
  onSelect,
  label = 'Élève',
  required,
  className,
}: FinanceStudentSearchFieldProps) {
  const { format: formatMoney } = useSchoolMoney()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<FinanceStudentResult | null>(null)
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [optionId, setOptionId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')
  const [debtorsOnly, setDebtorsOnly] = useState(false)
  const [highlight, setHighlight] = useState(0)

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const { data: classesRaw } = useFinanceClasses()
  const classes: ClassRow[] = useMemo(
    () =>
      Array.isArray(classesRaw)
        ? (classesRaw as ClassRow[])
        : ((classesRaw as unknown as { data?: ClassRow[] })?.data ?? []),
    [classesRaw],
  )

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      const id = classSectionId(c)
      const name = classSectionName(c)
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (sectionId !== '' && classSectionId(c) !== sectionId) continue
      const id = classOptionId(c)
      const name = classOptionName(c)
      if (id && name) map.set(id, name)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId])

  const filteredClasses = useMemo(() => {
    return classes
      .filter((c) => {
        if (sectionId !== '' && classSectionId(c) !== sectionId) return false
        if (optionId !== '' && classOptionId(c) !== optionId) return false
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId, optionId])

  const hasStructuralFilter = sectionId !== '' || optionId !== '' || classId !== ''
  const filters = {
    sectionId: sectionId === '' ? undefined : sectionId,
    optionId: optionId === '' ? undefined : optionId,
    classId: classId === '' ? undefined : classId,
    debtorsOnly: debtorsOnly || undefined,
    sort: (hasStructuralFilter || debtorsOnly) && debounced.length < 2
      ? ('balance' as const)
      : ('name' as const),
  }
  const hasFilter = hasStructuralFilter || debtorsOnly

  const { data: results = [], isFetching } = useFinanceStudentSearch(debounced, filters)

  useEffect(() => {
    setHighlight(0)
  }, [debounced, sectionId, optionId, classId, debtorsOnly, results.length])

  const filterChips = useMemo(() => {
    const chips: { key: string; label: string; clear: () => void }[] = []
    if (sectionId !== '') {
      const s = sections.find((x) => x.id === sectionId)
      chips.push({
        key: 'section',
        label: `Section: ${s?.name ?? sectionId}`,
        clear: () => {
          setSectionId('')
          setOptionId('')
          setClassId('')
        },
      })
    }
    if (optionId !== '') {
      const o = options.find((x) => x.id === optionId)
      chips.push({
        key: 'option',
        label: `Option: ${o?.name ?? optionId}`,
        clear: () => {
          setOptionId('')
          setClassId('')
        },
      })
    }
    if (classId !== '') {
      const c = filteredClasses.find((x) => x.id === classId) ?? classes.find((x) => x.id === classId)
      chips.push({
        key: 'class',
        label: `Classe: ${c?.name ?? classId}`,
        clear: () => setClassId(''),
      })
    }
    if (debtorsOnly) {
      chips.push({
        key: 'debtors',
        label: 'Débiteurs seulement',
        clear: () => setDebtorsOnly(false),
      })
    }
    if (debounced.length >= 2) {
      chips.push({
        key: 'q',
        label: `« ${debounced} »`,
        clear: () => {
          setQuery('')
          setDebounced('')
        },
      })
    }
    return chips
  }, [sectionId, optionId, classId, debtorsOnly, debounced, sections, options, filteredClasses, classes])

  function pick(s: FinanceStudentResult) {
    setSelected(s)
    onSelect(s.id, s)
    setQuery('')
    setDebounced('')
  }

  function clearSelection() {
    setSelected(null)
    onSelect(0)
  }

  function clearAllFilters() {
    setSectionId('')
    setOptionId('')
    setClassId('')
    setDebtorsOnly(false)
    setQuery('')
    setDebounced('')
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!showResults || !results.length) {
      if (e.key === 'Enter') e.preventDefault()
      return
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setHighlight((h) => Math.min(h + 1, results.length - 1))
      return
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setHighlight((h) => Math.max(h - 1, 0))
      return
    }
    if (e.key === 'Enter') {
      e.preventDefault()
      const target = results[highlight] ?? results[0]
      if (target) pick(target)
    }
  }

  function onSectionChange(value: string) {
    setSectionId(value ? Number(value) : '')
    setOptionId('')
    setClassId('')
  }

  function onOptionChange(value: string) {
    setOptionId(value ? Number(value) : '')
    setClassId('')
  }

  const showResults = debounced.length >= 2 || hasFilter
  const resultsId = useId()

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
            {pedagogyLine(selected) ? (
              <p className="text-xs text-emerald-700/70">{pedagogyLine(selected)}</p>
            ) : null}
            {selected.feesBalance != null ? (
              <p
                className={cn(
                  'text-[11px] font-medium tabular-nums mt-0.5',
                  selected.feesBalance > 0 ? 'text-amber-800' : 'text-emerald-800',
                )}
              >
                Solde {formatMoney(selected.feesBalance)}
              </p>
            ) : null}
            {selected.isCrossSite && selected.schoolName ? (
              <p className="text-[10px] font-medium text-amber-800 mt-0.5">
                Inscrit · {selected.schoolName}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={clearSelection}
            className="shrink-0 text-xs font-medium text-emerald-700 hover:underline"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-semibold text-emerald-900">
                Structure scolaire — Section · Option · Classe
              </p>
              <span className="rounded-md bg-emerald-600 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
                Recherche v2
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                  Section {sections.length ? `(${sections.length})` : ''}
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
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                  Option {options.length ? `(${options.length})` : ''}
                </label>
                <select
                  value={optionId === '' ? '' : String(optionId)}
                  onChange={(e) => onOptionChange(e.target.value)}
                  className={selectCls}
                  disabled={sections.length > 0 && sectionId === '' && options.length === 0}
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
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-emerald-800/70">
                  Classe {filteredClasses.length ? `(${filteredClasses.length})` : ''}
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
            {classes.length === 0 ? (
              <p className="text-[11px] text-amber-800">
                Aucune classe chargée — vérifiez l’API /finance/classes ou le contexte école.
              </p>
            ) : sections.length === 0 ? (
              <p className="text-[11px] text-amber-800">
                {classes.length} classe(s) chargée(s) mais sans section liée — les filtres de classe restent utilisables.
              </p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <button
                type="button"
                onClick={() => setDebtorsOnly((v) => !v)}
                className={cn(
                  'rounded-lg px-2.5 py-1.5 text-[11px] font-semibold border transition-colors',
                  debtorsOnly
                    ? 'border-amber-400 bg-amber-100 text-amber-900'
                    : 'border-zinc-200 bg-white text-zinc-600 hover:bg-zinc-50',
                )}
              >
                Débiteurs seulement
              </button>
              {(hasStructuralFilter || debtorsOnly) && debounced.length < 2 ? (
                <span className="text-[10px] text-emerald-800/80">Tri : solde décroissant</span>
              ) : null}
            </div>
          </div>

          <div className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
            <input
              type="search"
              role="combobox"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              autoFocus
              placeholder="Matricule, nom, classe, section ou réf. paiement"
              className="w-full rounded-xl border border-zinc-200 py-2.5 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400/40"
              aria-autocomplete="list"
              aria-expanded={showResults}
              aria-controls={resultsId}
            />
          </div>

          {filterChips.length > 0 ? (
            <div className="flex flex-wrap items-center gap-1.5">
              {filterChips.map((chip) => (
                <button
                  key={chip.key}
                  type="button"
                  onClick={chip.clear}
                  className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-800 hover:bg-emerald-100"
                >
                  {chip.label}
                  <X size={10} />
                </button>
              ))}
              {filterChips.length > 1 ? (
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-[11px] font-medium text-zinc-500 hover:text-zinc-800 underline underline-offset-2"
                >
                  Tout effacer
                </button>
              ) : null}
            </div>
          ) : (
            <p className="text-[10px] text-zinc-400">
              Filtrez par structure, ou cherchez par nom / matricule / classe / réf. Mobile Money. ↑↓ Entrée.
            </p>
          )}

          {showResults && (
            <div id={resultsId} className="rounded-xl border border-zinc-200 bg-white shadow-sm overflow-hidden">
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-zinc-100 bg-zinc-50/80">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  {isFetching
                    ? 'Recherche…'
                    : `${results.length} résultat${results.length > 1 ? 's' : ''}${
                        debtorsOnly ? ' · débiteurs' : ''
                      }`}
                </p>
                {results.length > 0 ? (
                  <p className="text-[10px] text-zinc-400">↑↓ puis Entrée</p>
                ) : null}
              </div>
              <div className="max-h-56 overflow-y-auto divide-y divide-zinc-100">
                {isFetching && results.length === 0 ? (
                  <p className="px-3 py-2.5 text-xs text-zinc-400">Chargement…</p>
                ) : results.length ? (
                  results.map((s, i) => {
                    const balance = Number(s.feesBalance ?? 0)
                    const line = pedagogyLine(s)
                    return (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => pick(s)}
                        onMouseEnter={() => setHighlight(i)}
                        className={cn(
                          'w-full px-3 py-2.5 text-left text-sm transition-colors',
                          i === highlight ? 'bg-emerald-50' : 'hover:bg-emerald-50/60',
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate">
                              <span className="font-medium text-zinc-900">{s.name}</span>
                              {s.matricule ? (
                                <span className="ml-1.5 text-zinc-400">({s.matricule})</span>
                              ) : null}
                            </p>
                            {line ? (
                              <p className="mt-0.5 text-xs text-zinc-500 truncate">{line}</p>
                            ) : null}
                            {s.isCrossSite && s.schoolName ? (
                              <span className="mt-1 inline-block rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-900">
                                {s.schoolName}
                              </span>
                            ) : null}
                          </div>
                          <div className="shrink-0 text-right">
                            <p
                              className={cn(
                                'text-xs font-semibold tabular-nums',
                                balance > 0 ? 'text-amber-700' : 'text-emerald-700',
                              )}
                            >
                              {formatMoney(balance)}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {balance > 0 ? 'à recouvrer' : 'à jour'}
                            </p>
                          </div>
                        </div>
                      </button>
                    )
                  })
                ) : (
                  <p className="px-3 py-2.5 text-xs text-zinc-400">Aucun élève trouvé pour ces critères</p>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
