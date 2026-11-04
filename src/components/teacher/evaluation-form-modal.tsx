'use client'

import { useEffect, useState } from 'react'
import { BookPlus } from 'lucide-react'
import { AdminModal } from '@/components/admin/presences/AdminModal'
import type { EvaluationType, SchoolTerm } from '@/types/teacher-grades'
import { EVAL_TYPE_LABELS, TERM_LABELS } from '@/types/teacher-grades'

export type EvaluationFormValues = {
  title: string
  type: EvaluationType
  maxScore: number
  coefficient: number
  term: SchoolTerm
  academicYear: string
  evaluatedAt: string
  publish: boolean
}

type Props = {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Partial<EvaluationFormValues> & { id?: number }
  defaults: {
    term: SchoolTerm
    academicYear: string
  }
  busy?: boolean
  error?: string | null
  onClose: () => void
  onSubmit: (values: EvaluationFormValues) => void
}

const TYPES = Object.keys(EVAL_TYPE_LABELS) as EvaluationType[]
const TERMS = Object.keys(TERM_LABELS) as SchoolTerm[]

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10)
}

export function EvaluationFormModal({
  open,
  mode,
  initial,
  defaults,
  busy,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState<EvaluationType>('INTERRO')
  const [maxScore, setMaxScore] = useState('20')
  const [coefficient, setCoefficient] = useState('1')
  const [term, setTerm] = useState<SchoolTerm>(defaults.term)
  const [academicYear, setAcademicYear] = useState(defaults.academicYear)
  const [evaluatedAt, setEvaluatedAt] = useState(todayIsoDate())
  const [publish, setPublish] = useState(true)

  useEffect(() => {
    if (!open) return
    setTitle(initial?.title ?? '')
    setType(initial?.type ?? 'INTERRO')
    setMaxScore(String(initial?.maxScore ?? 20))
    setCoefficient(String(initial?.coefficient ?? 1))
    setTerm(initial?.term ?? defaults.term)
    setAcademicYear(initial?.academicYear ?? defaults.academicYear)
    setEvaluatedAt(
      initial?.evaluatedAt
        ? initial.evaluatedAt.slice(0, 10)
        : todayIsoDate(),
    )
    setPublish(initial?.publish ?? true)
  }, [open, initial, defaults.term, defaults.academicYear])

  if (!open) return null

  return (
    <AdminModal
      title={mode === 'create' ? 'Nouvelle évaluation' : 'Modifier l’évaluation'}
      subtitle="Barème libre (maxScore) — pas de « sur 20 » imposé."
      icon={BookPlus}
      iconClassName="text-teal-600"
      onClose={onClose}
      closeDisabled={busy}
      size="md"
      footer={
        <div className="flex justify-end gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={onClose}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm dark:border-slate-600"
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={busy || title.trim().length < 2}
            onClick={() =>
              onSubmit({
                title: title.trim(),
                type,
                maxScore: Number(maxScore),
                coefficient: Number(coefficient),
                term,
                academicYear: academicYear.trim(),
                evaluatedAt: new Date(`${evaluatedAt}T08:00:00.000Z`).toISOString(),
                publish,
              })
            }
            className="rounded-lg bg-teal-600 px-3 py-2 text-sm font-semibold text-white disabled:opacity-40"
          >
            {busy ? 'Enregistrement…' : mode === 'create' ? 'Créer' : 'Enregistrer'}
          </button>
        </div>
      }
    >
      <div className="space-y-3 p-6">
        {error && (
          <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {error}
          </p>
        )}
        <label className="block text-sm">
          <span className="mb-1 block text-xs text-slate-500">Titre</span>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Interro fractions"
            autoFocus
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Type</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
              value={type}
              onChange={(e) => setType(e.target.value as EvaluationType)}
            >
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {EVAL_TYPE_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Barème (maxScore)</span>
            <input
              type="number"
              min={0.5}
              step="0.5"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 tabular-nums dark:border-slate-600 dark:bg-slate-950"
              value={maxScore}
              onChange={(e) => setMaxScore(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Coefficient</span>
            <input
              type="number"
              min={0.5}
              step="0.5"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 tabular-nums dark:border-slate-600 dark:bg-slate-950"
              value={coefficient}
              onChange={(e) => setCoefficient(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Date</span>
            <input
              type="date"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              value={evaluatedAt}
              onChange={(e) => setEvaluatedAt(e.target.value)}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Période</span>
            <select
              className="w-full rounded-lg border border-slate-200 px-2 py-2 dark:border-slate-600 dark:bg-slate-950"
              value={term}
              onChange={(e) => setTerm(e.target.value as SchoolTerm)}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {TERM_LABELS[t]}
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm">
            <span className="mb-1 block text-xs text-slate-500">Année scolaire</span>
            <input
              className="w-full rounded-lg border border-slate-200 px-3 py-2 dark:border-slate-600 dark:bg-slate-950"
              value={academicYear}
              onChange={(e) => setAcademicYear(e.target.value)}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={publish}
            onChange={(e) => setPublish(e.target.checked)}
          />
          Publier immédiatement (visible parents)
        </label>
      </div>
    </AdminModal>
  )
}
