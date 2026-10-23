import {
  EMPTY_FEE_FORM,
  feeCreationSchema,
  previewFeeLines,
  quarterlyInstallments,
  toCreateFeePayload,
  type FeeCreationFormValues,
} from '@/lib/finance/fee-creation-form'

const ctx = { academicYearId: 3, currency: 'USD' as const }
const form = (patch: Partial<FeeCreationFormValues>): FeeCreationFormValues => ({ ...EMPTY_FEE_FORM, name: 'Minerval', ...patch })

describe('fee-creation-form — requête POST /finance/fees', () => {
  it('paiement unique, toute l’école', () => {
    expect(toCreateFeePayload(form({ amount: '50', dueDate: '2026-09-15' }), ctx)).toEqual({
      academicYearId: 3,
      name: 'Minerval',
      scheduleType: 'ONE_TIME',
      currency: 'USD',
      amount: 50,
      dueDate: '2026-09-15',
      appliesToAll: true,
      generateObligations: true,
    })
  })

  it('tranches : le montant est porté par chaque tranche, jamais au niveau du frais', () => {
    const installments = quarterlyInstallments(2026).map((i, n) => ({ ...i, amount: ['120', '100', '80'][n] }))
    const payload = toCreateFeePayload(form({ scheduleType: 'INSTALLMENT', amount: '999', installments }), ctx)
    expect(payload.amount).toBeUndefined()
    expect(payload.installments).toEqual([
      { label: 'T1', amount: 120, dueDate: '2026-10-15' },
      { label: 'T2', amount: 100, dueDate: '2027-01-15' },
      { label: 'T3', amount: 80, dueDate: '2027-04-15' },
    ])
  })

  it('mensuel : montant par mois et jour d’échéance', () => {
    const payload = toCreateFeePayload(form({ scheduleType: 'MONTHLY', amount: '25,5', dueDayOfMonth: '5' }), ctx)
    expect(payload).toMatchObject({ scheduleType: 'MONTHLY', amount: 25.5, dueDayOfMonth: 5 })
    expect(payload.dueDate).toBeUndefined()
  })

  it('un seul périmètre : les classes choisies', () => {
    const payload = toCreateFeePayload(form({ amount: '40', scope: 'CLASSES', scopeIds: [12, 13] }), ctx)
    expect(payload).toMatchObject({ classIds: [12, 13] })
    expect(payload.appliesToAll).toBeUndefined()
    expect(payload.optionIds).toBeUndefined()
  })

  it('toute l’école restreinte à des catégories : jamais appliesToAll avec studentCategories', () => {
    const payload = toCreateFeePayload(form({ amount: '50', studentCategories: ['STAFF_CHILD'] }), ctx)
    expect(payload.appliesToAll).toBeUndefined()
    expect(payload.studentCategories).toEqual(['STAFF_CHILD'])
  })
})

describe('fee-creation-form — validation (mêmes règles que le backend)', () => {
  const errorsOf = (v: FeeCreationFormValues) => {
    const r = feeCreationSchema.safeParse(v)
    return r.success ? [] : r.error.issues.map((i) => i.path.join('.'))
  }

  it('accepte un frais complet', () => {
    expect(errorsOf(form({ amount: '50' }))).toEqual([])
  })

  it('refuse montant manquant, nul ou à 3 décimales', () => {
    for (const amount of ['', '0', '-5', '10.555']) {
      expect(errorsOf(form({ amount }))).toContain('amount')
    }
  })

  it('tranches : entre 2 et 12, chacune complète', () => {
    expect(errorsOf(form({ scheduleType: 'INSTALLMENT', installments: [{ label: 'T1', amount: '10', dueDate: '2026-10-15' }] })))
      .toContain('installments')
    expect(errorsOf(form({ scheduleType: 'INSTALLMENT', installments: quarterlyInstallments(2026) })))
      .toEqual(expect.arrayContaining(['installments.0.amount', 'installments.1.amount', 'installments.2.amount']))
  })

  it('mensuel : jour entre 1 et 28', () => {
    for (const dueDayOfMonth of ['0', '29', 'x']) {
      expect(errorsOf(form({ scheduleType: 'MONTHLY', amount: '25', dueDayOfMonth }))).toContain('dueDayOfMonth')
    }
  })

  it('périmètre partiel : au moins un élément choisi', () => {
    expect(errorsOf(form({ amount: '40', scope: 'SECTIONS', scopeIds: [] }))).toContain('scopeIds')
  })
})

describe('previewFeeLines — mêmes libellés que le serveur', () => {
  it('une ligne par tranche, « Nom — T1 »', () => {
    const lines = previewFeeLines(form({ scheduleType: 'INSTALLMENT', installments: quarterlyInstallments(2026) }))
    expect(lines.map((l) => l.name)).toEqual(['Minerval — T1', 'Minerval — T2', 'Minerval — T3'])
  })
})
