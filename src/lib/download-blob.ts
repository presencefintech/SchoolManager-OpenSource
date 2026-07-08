export function triggerBlobDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/** Extrait le message d'errur JSON renvoyé par l'API quand responseType est blob. */
export async function readBlobErrorMessage(blob: Blob): Promise<string> {
  try {
    const text = await blob.text()
    const parsed = JSON.parse(text) as { message?: string; error?: string }
    return parsed.message ?? parsed.error ?? 'Export impossible'
  } catch {
    return 'Export impossible'
  }
}

export function isExportContentType(
  contentType: string | undefined,
  format: 'pdf' | 'csv',
): boolean {
  const ct = (contentType ?? '').toLowerCase()
  return format === 'pdf' ? ct.includes('application/pdf') : ct.includes('text/csv')
}

export function parseContentDispositionFilename(
  header: string | undefined,
  fallback: string,
): string {
  if (!header) return fallback
  const utf8 = header.match(/filename\*=UTF-8''([^;]+)/i)?.[1]
  if (utf8) return decodeURIComponent(utf8)
  const basic = header.match(/filename="?([^";\n]+)"?/i)?.[1]
  return basic?.trim() || fallback
}
