import { NextRequest } from 'next/server'
import { proxySchoolSupport } from '../_proxy'

type Ctx = { params: Promise<{ id: string }> | { id: string } }

/** GET /api/superadmin/schools/[id]/manual-payments */
export async function GET(req: NextRequest, ctx: Ctx) {
  const take = req.nextUrl.searchParams.get('take')
  const suffix = `/manual-payments${take ? `?take=${encodeURIComponent(take)}` : ''}`
  return proxySchoolSupport(req, ctx, { method: 'GET', suffix })
}
