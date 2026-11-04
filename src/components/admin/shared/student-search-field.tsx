'use client'

import { useEffect, useMemo, useState } from 'react'
import { useClasses, useStudents } from '@/lib/hooks/use-admin'
import type { StudentListItem } from '@/types/admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { cn } from '@/lib/utils'

interface Props {
  studentId: number
  onSelect: (id: number) => void
  label?: string
  required?: boolean
}

const selectCls =
  'w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-700 focus:outline-none focus:ring-2 focus:ring-emerald-400'

export function StudentSearchField({ studentId, onSelect, label = 'Élève', required }: Props) {
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [selected, setSelected] = useState<StudentListItem | null>(null)
  const [sectionId, setSectionId] = useState<number | ''>('')
  const [optionId, setOptionId] = useState<number | ''>('')
  const [classId, setClassId] = useState<number | ''>('')

  const { data: classes = [] } = useClasses({ isActive: true })

  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 350)
    return () => clearTimeout(t)
  }, [query])

  const sections = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (c.sectionId && c.sectionName) map.set(c.sectionId, c.sectionName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes])

  const options = useMemo(() => {
    const map = new Map<number, string>()
    for (const c of classes) {
      if (sectionId !== '' && c.sectionId !== sectionId) continue
      if (c.optionId && c.optionName) map.set(c.optionId, c.optionName)
    }
    return Array.from(map.entries())
      .map(([id, name]) => ({ id, name }))
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId])

  const filteredClasses = useMemo(() => {
    return classes
      .filter((c) => {
        if (sectionId !== '' && c.sectionId !== sectionId) return false
        if (optionId !== '' && c.optionId !== optionId) return false
        return true
      })
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name, 'fr'))
  }, [classes, sectionId, optionId])

  const allowedClassIds = useMemo(() => {
    if (classId !== '') return new Set([classId])
    if (sectionId === '' && optionId === '') return null
    return new Set(filteredClasses.map((c) => c.id))
  }, [classId, sectionId, optionId, filteredClasses])

  const hasStructureFilter = sectionId !== '' || optionId !== '' || classId !== ''
  const shouldSearch = debounced.length >= 2 || (hasStructureFilter && classId !== '')

  const { data, isFetching } = useStudents(
    shouldSearch
      ? {
          search: debounced.length >= 2 ? debounced : undefined,
          classId: classId !== '' ? classId : undefined,
          limit: 25,
        }
      : undefined,
    { enabled: shouldSearch },
  )

  const results = useMemo(() => {
    const rows = data?.data ?? []
    if (!allowedClassIds) return rows
    return rows.filter((s) => {
      const cid = (s as StudentListItem & { classId?: number }).classId
      if (cid != null) return allowedClassIds.has(cid)
      if (!s.className) return false
      return filteredClasses.some((c) => c.name === s.className)
    })
  }, [data?.data, allowedClassIds, filteredClasses])

  const display = selected ?? (studentId > 0 ? results.find((s) => s.id === studentId) : null)

  function pick(student: StudentListItem) {
    setSelected(student)
    onSelect(student.id)
    setQuery('')
    setDebounced('')
  }

  function clear() {
    setSelected(null)
    onSelect(0)
  }

  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-medium text-zinc-500">
        {label}
        {required && ' *'}
      </label>
      {display && studentId > 0 ? (
        <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg border border-emerald-200 bg-emerald-50/80">
          <div className="min-w-0">
            <p className="text-sm text-emerald-900 truncate">
              {formatStudentFullName(display)}
              {display.matricule ? ` · ${display.matricule}` : ''}
            </p>
            {display.className && (
              <p className="text-xs text-emerald-700/70">{display.className}</p>
            )}
          </div>
          <button
            type="button"
            onClick={clear}
            className="text-xs text-emerald-700 hover:underline flex-shrink-0"
          >
            Changer
          </button>
        </div>
      ) : (
        <>
          {(sections.length > 0 || filteredClasses.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div>
                <label className="mb-1 block text-[10px] font-semibold uppercase tracking-wide text-zinc-400">
                  Section
                </label>
                <select
                  value={sectionId === '' ? '' : String(sectionId)}
                  onChange={(e) => {
                    setSectionId(e.target.value ? Number(e.target.value) : '')
                    setOptionId('')
                    setClassId('')
                  }}
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
                  onChange={(e) => {
                    setOptionId(e.target.value ? Number(e.target.value) : '')
                    setClassId('')
                  }}
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
          )}
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom, prénom ou matricule (min. 2 car.)"
            className="w-full px-3 py-2 rounded-lg border border-zinc-200 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400"
          />
          {shouldSearch && (
            <div className="max-h-40 overflow-y-auto rounded-lg border border-zinc-200 bg-white divide-y divide-zinc-100 shadow-sm">
              {isFetching ? (
                <p className="px-3 py-2 text-xs text-zinc-400">Recherche…</p>
              ) : results.length ? (
                results.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pick(s)}
                    className={cn('w-full text-left px-3 py-2 text-sm hover:bg-zinc-50')}
                  >
                    <span className="font-medium text-zinc-900">{formatStudentFullName(s)}</span>
                    {s.matricule && <span className="text-zinc-400 ml-1">({s.matricule})</span>}
                    {s.className && <span className="block text-xs text-zinc-400">{s.className}</span>}
                  </button>
                ))
              ) : (
                <p className="px-3 py-2 text-xs text-zinc-400">Aucun élève trouvé</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  )
}
