import { NextRequest } from 'next/server'
import { proxySchoolSupport } from '../_proxy'

type Ctx = { params: Promise<{ id: string }> }

/** GET /api/superadmin/schools/[id]/support */
export async function GET(req: NextRequest, ctx: Ctx) {
  return proxySchoolSupport(req, ctx, {
    method: 'GET',
    suffix: '/support',
  })
}
