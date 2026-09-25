/**
 * Normalisation des réponses « Billing SaaS » côté école (/admin/billing/*).
 * L'OpenAPI ne garantit pas toujours l'enveloppe { success, data } : on accepte les deux.
 */

export type PlanTier = 'STARTER' | 'PRO' | 'ENTERPRISE'

export const PLAN_ORDER: PlanTier[] = ['STARTER', 'PRO', 'ENTERPRISE']

export type SchoolPlanInfo = {
  school: { id: number; name: string } | null
  plan: {
    code: PlanTier
    name: string
    maxAssignmentsPerMonth: number | null
    suggestedUpgrade: PlanTier | null
  } | null
  subscription: {
    status: string | null
    currentPeriodEnd: string | null
    trialEndsAt: string | null
  } | null
}

export type PlanCatalogEntry = {
  code: PlanTier
  name: string
  maxAssignmentsPerMonth: number | null
  maxHomeworkNotifsPerDay: number | null
  unlimited: boolean
  priceUsdMonthly: number | null
}

export type AssignmentUsage = {
  period: string | null
  planCode: PlanTier | null
  planName: string | null
  assignmentsCreated: number
  assignmentsLimit: number | null
  assignmentsRemaining: number | null
  utilizationPct: number
  upsellSuggested: boolean
  upsellRequired: boolean
  suggestedPlan: PlanTier | null
  publishedOrClosedActive: number
  submissionsThisMonth: number
}

export type AssignmentStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED'

export type SchoolAssignment = {
  id: number | string
  title: string
  status: AssignmentStatus | string
  className: string | null
  teacherName: string | null
  subject: string | null
  dueAt: string | null
  createdAt: string | null
  submissionsCount: number | null
}

export type AssignmentPage = {
  items: SchoolAssignment[]
  total: number
  page: number
  totalPages: number
}

type Rec = Record<string, unknown>

function isRec(v: unknown): v is Rec {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

/** Retire l'enveloppe { success, data } si présente. */
export function unwrapEnvelope(raw: unknown): unknown {
  if (isRec(raw) && 'data' in raw && ('success' in raw || 'statusCode' in raw)) return raw.data
  return raw
}

function str(v: unknown): string | null {
  return typeof v === 'string' && v.trim() ? v : null
}

function num(v: unknown): number | null {
  if (typeof v === 'number' && Number.isFinite(v)) return v
  if (typeof v === 'string' && v.trim() && Number.isFinite(Number(v))) return Number(v)
  return null
}

function tier(v: unknown): PlanTier | null {
  return typeof v === 'string' && (PLAN_ORDER as string[]).includes(v) ? (v as PlanTier) : null
}

export function parseSchoolPlan(raw: unknown): SchoolPlanInfo {
  const d = unwrapEnvelope(raw)
  if (!isRec(d)) return { school: null, plan: null, subscription: null }

  const school = isRec(d.school) && num(d.school.id) != null
    ? { id: num(d.school.id) as number, name: str(d.school.name) ?? '' }
    : null

  // `plan` (spec école) ou `resolved` (forme superadmin) selon la version backend
  const p = isRec(d.plan) ? d.plan : isRec(d.resolved) ? d.resolved : null
  const code = p ? tier(p.code) ?? tier(p.planCode) : null
  const plan = p && code
    ? {
        code,
        name: str(p.name) ?? str(p.planName) ?? code,
        maxAssignmentsPerMonth: num(p.maxAssignmentsPerMonth),
        suggestedUpgrade: tier(p.suggestedUpgrade),
      }
    : null

  const s = isRec(d.subscription) ? d.subscription : null
  const subscription = s
    ? {
        status: str(s.status),
        currentPeriodEnd: str(s.currentPeriodEnd),
        trialEndsAt: str(s.trialEndsAt),
      }
    : null

  return { school, plan, subscription }
}

export function parsePlanCatalog(raw: unknown): PlanCatalogEntry[] {
  const d = unwrapEnvelope(raw)
  const list = Array.isArray(d) ? d : isRec(d) && Array.isArray(d.plans) ? d.plans : []
  const out: PlanCatalogEntry[] = []
  for (const item of list) {
    if (!isRec(item)) continue
    const code = tier(item.code)
    if (!code) continue
    const max = num(item.maxAssignmentsPerMonth)
    out.push({
      code,
      name: str(item.name) ?? code,
      maxAssignmentsPerMonth: max,
      maxHomeworkNotifsPerDay: num(item.maxHomeworkNotifsPerDay),
      unlimited: item.unlimited === true || max == null,
      priceUsdMonthly: num(item.priceUsdMonthly),
    })
  }
  return out.sort((a, b) => PLAN_ORDER.indexOf(a.code) - PLAN_ORDER.indexOf(b.code))
}

export function parseAssignmentUsage(raw: unknown): AssignmentUsage | null {
  const d = unwrapEnvelope(raw)
  if (!isRec(d)) return null
  const created = num(d.assignmentsCreated) ?? 0
  const limit = num(d.assignmentsLimit)
  const pct = num(d.utilizationPct) ?? (limit ? Math.round((created / limit) * 100) : 0)
  return {
    period: str(d.period),
    planCode: tier(d.planCode),
    planName: str(d.planName),
    assignmentsCreated: created,
    assignmentsLimit: limit,
    assignmentsRemaining: num(d.assignmentsRemaining) ?? (limit != null ? Math.max(limit - created, 0) : null),
    utilizationPct: Math.max(0, Math.min(pct, 100)),
    upsellSuggested: d.upsellSuggested === true,
    upsellRequired: d.upsellRequired === true,
    suggestedPlan: tier(d.suggestedPlan),
    publishedOrClosedActive: num(d.publishedOrClosedActive) ?? 0,
    submissionsThisMonth: num(d.submissionsThisMonth) ?? 0,
  }
}

function personName(v: unknown): string | null {
  if (!isRec(v)) return str(v)
  const full = [str(v.firstName), str(v.lastName)].filter(Boolean).join(' ')
  return full || str(v.name) || str(v.fullName)
}

function parseAssignment(item: unknown): SchoolAssignment | null {
  if (!isRec(item)) return null
  const id = num(item.id) ?? str(item.id)
  if (id == null) return null
  const cls = isRec(item.class) ? item.class : isRec(item.classe) ? item.classe : null
  const count = isRec(item._count) ? num(item._count.submissions) : null
  return {
    id,
    title: str(item.title) ?? str(item.name) ?? 'Sans titre',
    status: str(item.status) ?? 'DRAFT',
    className: (cls ? str(cls.name) : null) ?? str(item.className),
    teacherName: personName(item.teacher) ?? personName(item.createdBy) ?? str(item.teacherName),
    subject: (isRec(item.subject) ? str(item.subject.name) : str(item.subject)) ?? str(item.subjectName),
    dueAt: str(item.dueAt) ?? str(item.dueDate) ?? str(item.deadline),
    createdAt: str(item.createdAt),
    submissionsCount: num(item.submissionsCount) ?? count,
  }
}

export function parseAssignmentPage(raw: unknown, page: number, limit: number): AssignmentPage {
  // Formes acceptées : [..] · { data: [..], pagination } · { items, total } · { assignments, meta }
  let d: unknown = raw
  let meta: Rec = {}
  if (isRec(d) && 'success' in d) {
    if (isRec(d.pagination)) meta = d.pagination
    if (isRec(d.meta)) meta = d.meta
    d = d.data
  }
  let list: unknown[] = []
  if (Array.isArray(d)) list = d
  else if (isRec(d)) {
    const candidate = d.items ?? d.assignments ?? d.data ?? d.rows
    if (Array.isArray(candidate)) list = candidate
    if (isRec(d.pagination)) meta = d.pagination
    else if (isRec(d.meta)) meta = d.meta
    else meta = { ...meta, ...d }
  }
  const items = list.map(parseAssignment).filter((a): a is SchoolAssignment => a != null)
  const total = num(meta.total) ?? num(meta.totalItems) ?? num(meta.count) ?? items.length
  const totalPages = num(meta.totalPages) ?? num(meta.pages) ?? Math.max(1, Math.ceil(total / limit))
  return { items, total, page: num(meta.page) ?? page, totalPages }
}

/** Numéro commercial PresenceFintech (identique au CTA des reçus). */
const SALES_WHATSAPP = '243973987886'

export function upgradeWhatsAppUrl(opts: {
  schoolName?: string | null
  schoolId?: number | null
  currentPlan?: string | null
  targetPlan: string
}): string {
  const school = opts.schoolName || (opts.schoolId ? `école #${opts.schoolId}` : 'mon établissement')
  const text =
    `Bonjour, je souhaite passer ${school} au plan ${opts.targetPlan}` +
    (opts.currentPlan ? ` (plan actuel : ${opts.currentPlan})` : '') +
    '. Merci de me recontacter.'
  return `https://wa.me/${SALES_WHATSAPP}?text=${encodeURIComponent(text)}`
}
