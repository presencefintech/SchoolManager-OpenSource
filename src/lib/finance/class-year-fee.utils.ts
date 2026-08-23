import type { ClassYearFeeClass, ClassYearFeeDashboard } from '@/types/finance'

export function formatBillingWindow(start: string, end: string): string {
  const label = (ym: string) => {
    const [y, m] = ym.split('-').map(Number)
    if (!y || !m) return ym
    const name = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('fr-FR', {
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    })
    return name.replace('.', '')
  }
  return `${label(start)} → ${label(end)}`
}

export function feeLineForClass(cls: ClassYearFeeClass, categoryId: number) {
  return cls.fees.find((f) => f.categoryId === categoryId) ?? null
}

export function rateTone(pct: number): string {
  if (pct >= 80) return 'text-emerald-700 bg-emerald-50 ring-emerald-100'
  if (pct >= 40) return 'text-amber-700 bg-amber-50 ring-amber-100'
  return 'text-rose-700 bg-rose-50 ring-rose-100'
}

export function buildClassYearFeeCsv(data: ClassYearFeeDashboard): string {
  const cols = data.feeColumns
  const header = [
    'Classe',
    'Niveau',
    'Élèves',
    'Débiteurs',
    ...cols.flatMap((c) => [`${c.categoryName} dû`, `${c.categoryName} payé`, `${c.categoryName} reste`]),
    'Total dû',
    'Total payé',
    'Reste',
    'Recouvrement %',
  ]
  const rows = data.classes.map((cls) => [
    cls.className,
    cls.level ?? '',
    String(cls.studentCount),
    String(cls.debtorCount),
    ...cols.flatMap((col) => {
      const line = feeLineForClass(cls, col.categoryId)
      return [
        String(line?.expected ?? 0),
        String(line?.paid ?? 0),
        String(line?.remaining ?? 0),
      ]
    }),
    String(cls.totals.expected),
    String(cls.totals.paid),
    String(cls.totals.remaining),
    String(cls.totals.collectionRatePct),
  ])
  return [header, ...rows]
    .map((cells) => cells.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(';'))
    .join('\n')
}

export function downloadCsv(filename: string, csv: string) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

