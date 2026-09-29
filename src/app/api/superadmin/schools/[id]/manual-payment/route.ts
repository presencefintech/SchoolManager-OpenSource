import { NextRequest } from 'next/server'
import { proxySchoolSupport } from '../_proxy'

type Ctx = { params: Promise<{ id: string }> }

/** POST /api/superadmin/schools/[id]/manual-payment */
export async function POST(req: NextRequest, ctx: Ctx) {
  const body = await req.json().catch(() => null)
  return proxySchoolSupport(req, ctx, {
    method: 'POST',
    suffix: '/manual-payment',
    body: body ?? {},
  })
}
