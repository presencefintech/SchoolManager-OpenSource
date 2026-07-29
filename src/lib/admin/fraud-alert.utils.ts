import type { FraudAlert } from '@/types/admin'
import { formatStudentFullName } from '@/lib/utils/student-name.util'
import { normalizeFraudScorePercent } from '@/lib/business-labels'

export { normalizeFraudScorePercent }

export function parseFraudReasons(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
  }
  if (typeof raw === 'string' && raw.trim()) {
    return raw.split(/[,|]/).map((part) => part.trim()).filter(Boolean)
  }
  return []
}

function fraudSeverityFromScore(score: number): FraudAlert['severity'] {
  if (score >= 70) return 'HIGH'
  if (score >= 40) return 'MEDIUM'
  return 'LOW'
}

/** Mappe un `PresenceSecurityEvent` API vers le contrat UI dashboard / fraude. */
export function mapPresenceSecurityEventToFraudAlert(row: Record<string, unknown>): FraudAlert {
  const score = normalizeFraudScorePercent(row.fraudScore)
  const reasons = parseFraudReasons(row.fraudReasons)
  const presence = row.presence as Record<string, unknown> | undefined
  const student = presence?.student as Record<string, unknown> | undefined
  const studentName = student
    ? formatStudentFullName({
        firstName: typeof student.firstName === 'string' ? student.firstName : undefined,
        lastName: typeof student.lastName === 'string' ? student.lastName : undefined,
        prenom: typeof student.prenom === 'string' ? student.prenom : undefined,
        postnom: typeof student.postnom === 'string' ? student.postnom : undefined,
      }) || undefined
    : undefined
  const className = (presence?.class as Record<string, unknown> | undefined)?.name

  const description =
    reasons.length > 0
      ? reasons.join(' · ')
      : className
        ? `Anomalie présence — ${className}`
        : `Score fraude ${score}%`

  return {
    id: Number(row.id),
    type: 'PRÉSENCE',
    description,
    studentId: typeof presence?.studentId === 'number' ? presence.studentId : undefined,
    studentName,
    severity: fraudSeverityFromScore(score),
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : new Date().toISOString(),
    resolved: row.isSuspectedFraud === false,
  }
}
