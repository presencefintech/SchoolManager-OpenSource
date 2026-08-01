/** Télécharge un blob comme fichier. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Ouvre le dialogue d’impression système pour un PDF (iframe caché).
 * Fallback : nouvel onglet si l’iframe ne peut pas imprimer.
 */
export async function printPdfBlob(blob: Blob): Promise<'printed' | 'opened'> {
  const url = URL.createObjectURL(blob)

  const cleanup = () => {
    try {
      URL.revokeObjectURL(url)
    } catch {
      /* ignore */
    }
  }

  return new Promise((resolve, reject) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Impression reçu')
    iframe.style.cssText =
      'position:fixed;right:0;bottom:0;width:0;height:0;border:0;opacity:0;pointer-events:none;'
    iframe.src = url

    let settled = false
    const finish = (mode: 'printed' | 'opened') => {
      if (settled) return
      settled = true
      resolve(mode)
      window.setTimeout(() => {
        try {
          iframe.remove()
        } catch {
          /* ignore */
        }
        cleanup()
      }, 120_000)
    }

    iframe.onload = () => {
      window.setTimeout(() => {
        try {
          const win = iframe.contentWindow
          if (!win) throw new Error('Fenêtre impression indisponible')
          win.focus()
          win.print()
          finish('printed')
        } catch {
          // Certains navigateurs bloquent print() dans iframe PDF → nouvel onglet
          const popup = window.open(url, '_blank', 'noopener,noreferrer')
          if (!popup) {
            settled = true
            iframe.remove()
            cleanup()
            reject(
              new Error(
                'Impression bloquée — autorisez les popups, ou utilisez Télécharger.',
              ),
            )
            return
          }
          window.setTimeout(() => {
            try {
              popup.focus()
              popup.print()
            } catch {
              /* l’utilisateur peut imprimer depuis l’onglet PDF */
            }
            finish('opened')
          }, 600)
        }
      }, 400)
    }

    iframe.onerror = () => {
      if (settled) return
      settled = true
      iframe.remove()
      cleanup()
      reject(new Error('Impossible de charger le PDF pour impression.'))
    }

    document.body.appendChild(iframe)
  })
}

/** URL publique proxifiée pour un fichier `/uploads/...` renvoyé par l’API. */
export function resolveBackendUploadHref(url: string | null | undefined): string | null {
  if (!url?.trim()) return null
  if (/^https?:\/\//i.test(url) || url.startsWith('blob:') || url.startsWith('data:')) {
    return url
  }
  if (url.startsWith('/uploads/')) return `/api${url}`
  if (url.startsWith('/api/')) return url
  return url
}
