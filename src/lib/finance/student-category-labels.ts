import type { FeeDiscountPolicy, StudentCategory } from '@/types/finance'

/** Libellés RDC — jamais d’enums bruts à l’écran. */
export const STUDENT_CATEGORY_LABELS: Record<StudentCategory, string> = {
  STANDARD: 'Ancien / Standard',
  NEW_STUDENT: 'Nouveau',
  STAFF_CHILD: 'Enfant de personnel / Enseignant',
  SCHOLARSHIP: 'Boursier',
  SIBLING_DISCOUNT: 'Fratrie',
}

/** Suggestions courantes pour `customCategoryLabel` / politiques dynamiques. */
export const CUSTOM_CATEGORY_LABEL_SUGGESTIONS = [
  'Famille Nombreuse',
  'Famille Nombreuse - 3e enfant',
  'Orphelin',
  'Cas Social',
  'Réfugié',
] as const

export const STUDENT_CATEGORY_OPTIONS: Array<{
  value: StudentCategory
  label: string
}> = (
  Object.entries(STUDENT_CATEGORY_LABELS) as Array<[StudentCategory, string]>
).map(([value, label]) => ({ value, label }))

export function normalizeCustomCategoryLabel(
  raw: string | null | undefined,
): string | null {
  if (raw == null) return null
  const s = String(raw).normalize('NFKC').trim().replace(/\s+/g, ' ')
  if (!s) return null
  return s.slice(0, 120)
}

export function labelStudentCategory(
  category: StudentCategory | string | null | undefined,
  customLabel?: string | null,
): string {
  const custom = normalizeCustomCategoryLabel(customLabel)
  if (custom) return custom
  if (!category) return STUDENT_CATEGORY_LABELS.STANDARD
  return (
    STUDENT_CATEGORY_LABELS[category as StudentCategory] ??
    String(category)
  )
}

export function formatDiscountPolicyHint(
  policy: Pick<FeeDiscountPolicy, 'discountType' | 'value'> | null | undefined,
): string | null {
  if (!policy) return null
  const value = Number(policy.value)
  if (!Number.isFinite(value) || value <= 0) return null
  if (policy.discountType === 'PERCENTAGE') return `Remise ${value}%`
  return `Remise ${value}`
}

/** Badge guichet : « Catégorie : Enfant du personnel - Remise 50% » */
export function formatStudentCategoryBadge(
  category: StudentCategory | string | null | undefined,
  policy?: Pick<FeeDiscountPolicy, 'discountType' | 'value'> | null,
  customLabel?: string | null,
): string {
  const label = labelStudentCategory(category, customLabel)
  const hint = formatDiscountPolicyHint(policy)
  if (hint) return `Catégorie : ${label} - ${hint}`
  return `Catégorie : ${label}`
}

/** Matching client (aligné moteur V2) : libellé dynamique prioritaire. */
export function policyMatchesStudentPreview(
  policy: Pick<FeeDiscountPolicy, 'appliesToCategory' | 'appliesToCustomLabel'>,
  category: StudentCategory,
  customLabel?: string | null,
): boolean {
  const policyLabel = normalizeCustomCategoryLabel(policy.appliesToCustomLabel)
  const studentLabel = normalizeCustomCategoryLabel(customLabel)
  if (policyLabel) {
    return (
      studentLabel != null &&
      policyLabel.toLocaleLowerCase('fr-CD') === studentLabel.toLocaleLowerCase('fr-CD')
    )
  }
  return policy.appliesToCategory === category
}

export function toMoneyNumber(value: number | string | null | undefined): number {
  if (value == null || value === '') return 0
  const n = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(n) ? n : 0
}
