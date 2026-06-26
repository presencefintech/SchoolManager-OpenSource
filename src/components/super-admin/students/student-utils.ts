export function fmtCurrency(n: number, currency = 'USD') {
  return new Intl.NumberFormat('fr-CD', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n)
}

export function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function statusBadgeClass(status: string) {
  const map: Record<string, string> = {
    ACTIVE: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    INACTIVE: 'bg-zinc-100 text-zinc-500 ring-zinc-200',
    SUSPENDED: 'bg-red-50 text-red-600 ring-red-200',
    GRADUATED: 'bg-indigo-50 text-indigo-700 ring-indigo-200',
  }
  return map[status] ?? 'bg-zinc-100 text-zinc-500 ring-zinc-200'
}
