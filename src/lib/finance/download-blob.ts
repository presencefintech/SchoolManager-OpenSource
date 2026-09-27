/** Télécharge un blob comme fichier. */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function pdfBase64ToBlob(base64: string): Blob {
  const clean = base64.replace(/\s/g, '')
  const binary = atob(clean)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i)
  return new Blob([bytes], { type: 'application/pdf' })
}

/**
 * Ouvre le dialogue d’impression. L’iframe a une vraie taille hors écran :
 * un cadre 0×0 ne charge pas le PDF dans Chrome, et l’impression ne part jamais.
 * Si le dialogue ne s’ouvre pas, le fichier est téléchargé.
 */
export async function printPdfBlob(blob: Blob): Promise<'printed' | 'opened' | 'downloaded'> {
  const url = URL.createObjectURL(blob)
  const filename = 'ticket-caisse.pdf'

  const saveFile = () => {
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
  }

  return new Promise((resolve) => {
    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Impression reçu')
    iframe.style.cssText =
      'position:fixed;left:-2400px;top:0;width:800px;height:1100px;border:0;background:#fff;'
    iframe.src = url

    let settled = false
    const finish = (mode: 'printed' | 'opened' | 'downloaded') => {
      if (settled) return
      settled = true
      window.clearTimeout(timer)
      resolve(mode)
      window.setTimeout(() => {
        try {
          iframe.remove()
        } catch {
          /* ignore */
        }
        try {
          URL.revokeObjectURL(url)
        } catch {
          /* ignore */
        }
      }, 120_000)
    }

    const tryPrint = () => {
      if (settled) return
      try {
        const win = iframe.contentWindow
        if (!win) throw new Error('Fenêtre impression indisponible')
        win.focus()
        win.print()
        finish('printed')
      } catch {
        const popup = window.open(url, '_blank', 'noopener,noreferrer')
        if (popup) {
          window.setTimeout(() => {
            try {
              popup.focus()
              popup.print()
            } catch {
              /* l’utilisateur imprime depuis l’onglet */
            }
            finish('opened')
          }, 400)
          return
        }
        saveFile()
        finish('downloaded')
      }
    }

    const timer = window.setTimeout(() => {
      tryPrint()
      if (!settled) {
        saveFile()
        finish('downloaded')
      }
    }, 1500)

    iframe.onload = () => {
      window.setTimeout(tryPrint, 300)
    }

    iframe.onerror = () => {
      saveFile()
      finish('downloaded')
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
