import { formatMoney } from '@/lib/finance/currency'

export type ClassCollectionRankRow = {
  classId: number
  className: string
  level?: string | null
  studentCount: number
  expectedUsd: number
  paidUsd: number
  collectionRatePct: number
}

export type ClassRankTone = 'high' | 'mid' | 'low' | 'empty'

export type ClassRankView = {
  classId: number
  rank: number
  name: string
  rateLabel: string
  paidLabel: string
  expectedLabel: string
  barPct: number
  tone: ClassRankTone
  studentLabel: string
}

function formatRate(rate: number): string {
  const rounded = Math.round((Number.isFinite(rate) ? rate : 0) * 10) / 10
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : rounded.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
  return `${text} %`
}

function toneFor(rate: number, studentCount: number, expectedUsd: number): ClassRankTone {
  if (studentCount <= 0 || expectedUsd <= 0) return 'empty'
  if (rate >= 70) return 'high'
  if (rate >= 40) return 'mid'
  return 'low'
}

export function presentClassRanking(rows: ClassCollectionRankRow[] | null | undefined): ClassRankView[] {
  return (Array.isArray(rows) ? rows : []).map((row, index) => {
    const rate = Number(row.collectionRatePct) || 0
    const students = Math.max(0, Number(row.studentCount) || 0)
    const expected = Number(row.expectedUsd) || 0
    const paid = Number(row.paidUsd) || 0
    return {
      classId: row.classId,
      rank: index + 1,
      name: row.className?.trim() || 'Classe',
      rateLabel: formatRate(rate),
      paidLabel: formatMoney(paid),
      expectedLabel: formatMoney(expected),
      barPct: Math.min(100, Math.max(0, rate)),
      tone: toneFor(rate, students, expected),
      studentLabel: students === 0 ? 'Aucun élève' : `${students} élève${students > 1 ? 's' : ''}`,
    }
  })
}
