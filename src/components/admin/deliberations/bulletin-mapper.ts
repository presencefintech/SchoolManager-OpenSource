import type { DeliberationBulletinRow } from '@/lib/admin/api/deliberations.api'
import type { StudentBulletinProps } from '@/types/official-bulletin'

function asText(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : ''
}

/** Mappe le payload délibération → props OfficialBulletinView (zéro placeholder inventé). */
export function toStudentBulletinProps(
  row: DeliberationBulletinRow,
  opts?: { schoolName?: string },
): StudentBulletinProps {
  const schoolName =
    asText(opts?.schoolName) ||
    asText(row.school?.name) ||
    ''

  const cycleName = asText(row.classInfo?.cycleName)

  return {
    meta: {
      schoolId: row.meta.schoolId,
      classId: row.meta.classId,
      studentId: row.meta.studentId,
      academicYear: row.meta.academicYear,
      term: row.meta.term ?? null,
      scale: row.meta.scale ?? 0,
      generatedAt: row.meta.generatedAt ?? '',
    },
    student: {
      id: row.student.id ?? row.meta.studentId,
      fullName: row.student.fullName,
      matricule: row.student.matricule ?? '',
      sex: row.student.sex ?? null,
      birthPlace: row.student.birthPlace ?? null,
      birthDate: row.student.birthDate ?? null,
    },
    school: {
      name: (row.school?.name ?? schoolName) || null,
      city: row.school?.city ?? null,
      province: row.school?.province ?? null,
      commune: row.school?.commune ?? null,
      code: row.school?.code ?? null,
    },
    classInfo: {
      id: row.classInfo?.id ?? row.meta.classId,
      name: row.classInfo?.name ?? '',
      sectionId: row.classInfo?.sectionId,
      sectionName: row.classInfo?.sectionName ?? '',
      optionId: row.classInfo?.optionId,
      optionName: row.classInfo?.optionName ?? '',
      level: row.classInfo?.level ?? null,
      cycleName: cycleName || null,
    },
    schoolName: schoolName || undefined,
    identity: {
      province: row.school?.province ?? null,
      city: row.school?.city ?? null,
      commune: row.school?.commune ?? null,
      schoolCode: row.school?.code ?? null,
      permanentNumber: row.student.matricule ?? null,
      nationalId: null,
      sex: row.student.sex ?? null,
      birthPlace: row.student.birthPlace ?? null,
      birthDate: row.student.birthDate ?? null,
      classYearLabel: row.classInfo?.name ?? null,
      cycleName: cycleName || null,
    },
    domains: row.domains ?? [],
    totals: {
      obtained: row.totals.obtained ?? null,
      max: row.totals.max ?? 0,
      percentage: row.totals.percentage,
      subjectCount: row.totals.subjectCount,
      gradedSubjectCount: row.totals.gradedSubjectCount,
    },
    rank: {
      position: row.rank.position,
      classSize: row.rank.classSize ?? 0,
      gradedCount: row.rank.gradedCount ?? undefined,
    },
    deliberation: {
      decision: row.deliberation.decision,
      decisionLabel: row.deliberation.decisionLabel,
      suggestedDecision: row.deliberation.suggestedDecision,
      suggestedDecisionLabel: row.deliberation.suggestedDecisionLabel,
      conductNote: row.deliberation.conductNote,
      applicationNote: row.deliberation.applicationNote,
      validatedAt: row.deliberation.validatedAt,
      securityHash: row.deliberation.securityHash,
      verifyToken: row.deliberation.verifyToken,
      placeLabel: row.deliberation.placeLabel,
    },
  }
}
