'use client'

import { useParams } from 'next/navigation'
import { StudentFinanceDashboard } from '@/components/finance/student-dashboard/StudentFinanceDashboard'

export default function StudentFinancePage() {
  const params = useParams()
  const rawId = params?.studentId
  const studentId = Number(Array.isArray(rawId) ? rawId[0] : rawId)

  if (!Number.isFinite(studentId) || studentId <= 0) {
    return (
      <div className="rounded-xl border border-amber-200/60 bg-amber-50/50 px-6 py-8 text-center">
        <p className="text-sm font-medium text-amber-900">Identifiant élève invalide</p>
        <p className="mt-1 text-xs text-amber-700">
          Utilisez une URL du type /finances/eleves/123
        </p>
      </div>
    )
  }

  return <StudentFinanceDashboard studentId={studentId} />
}
