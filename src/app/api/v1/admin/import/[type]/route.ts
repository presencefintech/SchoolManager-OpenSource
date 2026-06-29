import { NextRequest, NextResponse } from 'next/server'

const BACKEND = process.env.API_URL ?? 'http://localhost:4000'

/**
 * Route dédiée pour les uploads multipart — le proxy générique casse le boundary
 * quand il streame req.body directement. Ici on lit le FormData avec l'API Web
 * native et on le re-soumet au backend avec fetch (qui gère le boundary tout seul).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ type: string }> | { type: string } },
) {
  const resolvedParams = params instanceof Promise ? await params : params
  const { type } = resolvedParams

  // Lire le FormData côté Next.js
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ success: false, message: 'FormData invalide' }, { status: 400 })
  }

  // Reconstruire un FormData propre (force axios/undici à recalculer le boundary)
  const outgoing = new FormData()
  formData.forEach((value, key) => outgoing.append(key, value))

  // Forwarder seulement les headers d'auth (pas Content-Type — fetch le génère)
  const forwardHeaders: Record<string, string> = {}
  const auth = req.headers.get('authorization')
  if (auth) forwardHeaders['authorization'] = auth
  const schoolId = req.headers.get('x-school-id')
  if (schoolId) forwardHeaders['x-school-id'] = schoolId
  const lang = req.headers.get('accept-language')
  if (lang) forwardHeaders['accept-language'] = lang
  const corr = req.headers.get('x-correlation-id')
  if (corr) forwardHeaders['x-correlation-id'] = corr

  const reqUrl = new URL(req.url)
  const upstream = await fetch(`${BACKEND}/api/v1/admin/import/${type}${reqUrl.search}`, {
    method: 'POST',
    headers: forwardHeaders,
    body: outgoing,
  })

  const json = await upstream.json().catch(() => ({ success: false, message: 'Réponse invalide du serveur' }))
  return NextResponse.json(json, { status: upstream.status })
}
