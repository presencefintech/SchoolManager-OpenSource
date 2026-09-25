import {
  parseAssignmentPage,
  parseAssignmentUsage,
  parsePlanCatalog,
  parseSchoolPlan,
  upgradeWhatsAppUrl,
} from '@/lib/admin/billing.utils'

describe('parseSchoolPlan', () => {
  it('lit la forme documentée (sans enveloppe)', () => {
    const r = parseSchoolPlan({
      school: { id: 4, name: 'Les Petits Génies' },
      plan: { code: 'STARTER', name: 'Starter', maxAssignmentsPerMonth: 50, suggestedUpgrade: 'PRO' },
      subscription: null,
    })
    expect(r.school).toEqual({ id: 4, name: 'Les Petits Génies' })
    expect(r.plan?.code).toBe('STARTER')
    expect(r.plan?.suggestedUpgrade).toBe('PRO')
    expect(r.subscription).toBeNull()
  })

  it('accepte l’enveloppe { success, data } et la forme « resolved »', () => {
    const r = parseSchoolPlan({
      success: true,
      data: {
        school: { id: 1, name: 'A' },
        resolved: { planCode: 'PRO', planName: 'Pro', maxAssignmentsPerMonth: 200 },
        subscription: { status: 'ACTIVE', currentPeriodEnd: '2026-12-31T00:00:00.000Z' },
      },
    })
    expect(r.plan).toMatchObject({ code: 'PRO', name: 'Pro', maxAssignmentsPerMonth: 200 })
    expect(r.subscription?.status).toBe('ACTIVE')
  })

  it('ne plante pas sur une réponse vide', () => {
    expect(parseSchoolPlan(null)).toEqual({ school: null, plan: null, subscription: null })
  })
})

describe('parsePlanCatalog', () => {
  it('trie les paliers et détecte l’illimité', () => {
    const r = parsePlanCatalog({
      success: true,
      data: [
        { code: 'ENTERPRISE', name: 'Enterprise', maxAssignmentsPerMonth: null, unlimited: true },
        { code: 'STARTER', name: 'Starter', maxAssignmentsPerMonth: 50 },
        { code: 'INCONNU', name: 'x' },
      ],
    })
    expect(r.map((p) => p.code)).toEqual(['STARTER', 'ENTERPRISE'])
    expect(r[1].unlimited).toBe(true)
    expect(r[0].unlimited).toBe(false)
  })
})

describe('parseAssignmentUsage', () => {
  it('borne le pourcentage et calcule le restant si absent', () => {
    const r = parseAssignmentUsage({ data: { assignmentsCreated: 60, assignmentsLimit: 50, utilizationPct: 120 }, success: true })
    expect(r?.utilizationPct).toBe(100)
    expect(r?.assignmentsRemaining).toBe(0)
  })
})

describe('parseAssignmentPage', () => {
  it('lit { success, data: [], pagination }', () => {
    const r = parseAssignmentPage(
      {
        success: true,
        data: [
          {
            id: 7,
            title: 'Exercices fractions',
            status: 'PUBLISHED',
            class: { name: '6e A' },
            teacher: { firstName: 'Jean', lastName: 'Mbala' },
            dueDate: '2026-10-01',
            _count: { submissions: 12 },
          },
        ],
        pagination: { total: 31, page: 2, totalPages: 2 },
      },
      2,
      25,
    )
    expect(r.items[0]).toMatchObject({
      id: 7,
      className: '6e A',
      teacherName: 'Jean Mbala',
      dueAt: '2026-10-01',
      submissionsCount: 12,
    })
    expect(r.total).toBe(31)
    expect(r.totalPages).toBe(2)
  })

  it('lit { data: { items, total } }', () => {
    const r = parseAssignmentPage({ success: true, data: { items: [{ id: 1, title: 'x' }], total: 60 } }, 1, 25)
    expect(r.items).toHaveLength(1)
    expect(r.totalPages).toBe(3)
  })
})

describe('upgradeWhatsAppUrl', () => {
  it('pré-remplit le message', () => {
    const url = upgradeWhatsAppUrl({ schoolName: 'Lycée X', currentPlan: 'Starter', targetPlan: 'Pro' })
    expect(url.startsWith('https://wa.me/')).toBe(true)
    expect(decodeURIComponent(url)).toContain('Lycée X au plan Pro (plan actuel : Starter)')
  })
})
