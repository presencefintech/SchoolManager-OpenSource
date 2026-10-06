export function currentAcademicYear(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = now.getMonth() + 1
  return month >= 9 ? `${year}-${year + 1}` : `${year - 1}-${year}`
}

export function formatAuditScore(
  score: number | null,
  isAbsent: boolean | null | undefined,
): string {
  if (isAbsent) return 'Absent'
  if (score == null) return '—'
  return Number.isInteger(score) ? String(score) : score.toFixed(2)
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
