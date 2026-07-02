'use client'

import { RefundDetailBlock } from '@/components/finance/refund-page-ui'

type ClassDetail = {
  name?: string
  section?: { name?: string }
  option?: { name?: string }
} | null | undefined

type StudentProfile = {
  class?: { name?: string }
  classId?: number
} | null | undefined

export function RefundSchoolContext({
  profile,
  classDetail,
  classNameFallback,
}: {
  profile?: StudentProfile
  classDetail?: ClassDetail
  classNameFallback?: string | null
}) {
  const className =
    profile?.class?.name
    ?? classNameFallback
    ?? classDetail?.name
    ?? '—'
  const sectionName = classDetail?.section?.name ?? '—'
  const optionName = classDetail?.option?.name ?? '—'

  return (
    <RefundDetailBlock title="Contexte scolaire" tone="sky">
      <p className="text-slate-600">Classe: {className}</p>
      <p className="text-slate-600">Section: {sectionName}</p>
      <p className="text-slate-600">Option: {optionName}</p>
    </RefundDetailBlock>
  )
}
