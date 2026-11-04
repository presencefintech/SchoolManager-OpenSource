import { NextRequest } from 'next/server'
import { proxySchoolSupport } from '../_proxy'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/superadmin/schools/[id]/support-actions */
export async function GET(req: NextRequest, ctx: Ctx) {
  const take = req.nextUrl.searchParams.get('take')
  const qs = take ? `?take=${encodeURIComponent(take)}` : ''
  return proxySchoolSupport(req, ctx, {
    method: 'GET',
    suffix: `/support-actions${qs}`,
  })
}

