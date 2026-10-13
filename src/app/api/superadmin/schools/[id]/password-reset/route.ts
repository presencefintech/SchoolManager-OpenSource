import { NextRequest } from 'next/server'
import { proxySchoolSupport } from '../_proxy'

type Ctx = { params: Promise<{ id: string }> }

/** PATCH /api/superadmin/schools/[id]/password-reset */
export async function PATCH(req: NextRequest, ctx: Ctx) {
  const body = await req.json().catch(() => ({}))
  return proxySchoolSupport(req, ctx, {
    method: 'PATCH',
    suffix: '/password-reset',
    body: body && typeof body === 'object' ? body : {},
  })
}
