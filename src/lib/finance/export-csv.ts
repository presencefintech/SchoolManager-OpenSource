export function exportRowsToCsv(
  rows: Record<string, string | number | null | undefined>[],
  filename: string,
) {
  if (rows.length === 0) return

  const headers = Object.keys(rows[0])
  const escape = (v: string | number | null | undefined) => {
    const s = String(v ?? '')
    return /[";,\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [
    headers.join(';'),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(';')),
  ]

  const blob = new Blob([`\uFEFF${lines.join('\r\n')}\r\n`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
