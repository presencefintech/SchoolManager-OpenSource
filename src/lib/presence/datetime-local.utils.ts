/** Convertit une date ISO en valeur `datetime-local` pour les inputs HTML. */
export function toDatetimeLocalValue(iso: string): string {
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** Date du jour au format `YYYY-MM-DD` pour filtre feuilles. */
export function todayDateInputValue(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Paramètre API `sessionDate` — jour calendaire UTC (YYYY-MM-DD). */
export function toSessionDateApiParam(dateInput: string): string {
  return dateInput.slice(0, 10)
}
