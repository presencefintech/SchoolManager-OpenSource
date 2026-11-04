export function buildReceiptShareTitle(schoolName: string, receiptNumber: string): string {
  return `Reçu ${receiptNumber} — ${schoolName}`
}

export function buildReceiptShareText(ctx: {
  schoolName: string
  studentName: string
  receiptNumber: string
  amountLabel: string
  verifyUrl: string
}): string {
  return [
    `Reçu officiel — ${ctx.schoolName}`,
    `Paiement certifié pour ${ctx.studentName}`,
    `Réf. ${ctx.receiptNumber} · ${ctx.amountLabel}`,
    '',
    "Vérifier l'authenticité :",
    ctx.verifyUrl,
    '',
    'Sécurisé par PresenceFintech',
  ].join('\n')
}

export function whatsAppShareHref(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export async function shareReceiptPayload(payload: {
  title: string
  text: string
  url: string
}): Promise<'native' | 'whatsapp' | 'aborted'> {
  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title: payload.title,
        text: payload.text,
        url: payload.url,
      })
      return 'native'
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        return 'aborted'
      }
    }
  }
  window.open(whatsAppShareHref(payload.text), '_blank', 'noopener,noreferrer')
  return 'whatsapp'
}
