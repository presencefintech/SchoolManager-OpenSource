'use client'

import { Badge } from '@/components/teacher/ui'
import { SUBMISSION_STATUS_LABEL, WORK_STATUS_LABEL } from '@/lib/teacher/api/school-work.api'

export function WorkStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const tone = s === 'PUBLISHED' ? 'green' : s === 'DRAFT' ? 'amber' : 'slate'
  return <Badge tone={tone}>{WORK_STATUS_LABEL[s] ?? status}</Badge>
}

export function SubmissionStatusBadge({ status }: { status: string }) {
  const s = status.toUpperCase()
  const tone = s === 'GRADED' ? 'green' : s === 'SUBMITTED' ? 'sky' : s === 'EXCUSED' ? 'indigo' : 'slate'
  return <Badge tone={tone}>{SUBMISSION_STATUS_LABEL[s] ?? status}</Badge>
}
