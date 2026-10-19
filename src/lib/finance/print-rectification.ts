/**
 * Ouvre (ou télécharge si popup bloquée) le reçu rectificatif PDF renvoyé en base64
 * par les corrections de lignes — guichet comme admin.
 */
export function printRectification(pdfBase64?: string | null, filename?: string | null): void {
  if (!pdfBase64) return
  const bytes = Uint8Array.from(atob(pdfBase64), (char) => char.charCodeAt(0))
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  const popup = window.open(url)
  if (!popup) {
    const link = document.createElement('a')
    link.href = url
    link.download = filename || 'recu-rectificatif.pdf'
    link.click()
  }
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}
