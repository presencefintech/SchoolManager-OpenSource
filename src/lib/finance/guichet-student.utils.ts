/** Profil élève finance — champs utiles au guichet RDC. */
import { formatStudentFullName } from '@/lib/utils/student-name.util'

export type GuichetStudentIdentity = {
  firstName: string
  lastName: string
  prenom?: string
  postnom?: string
  fullName: string
  matricule: string
  className: string
  photoUrl?: string
  parentPhone?: string
  parentName?: string
  remainingDebt?: number
  totalPaid?: number
  totalDue?: number
  hasPostnom: boolean
}

export function parseGuichetStudentIdentity(
  profile: unknown,
  studentId?: number,
): GuichetStudentIdentity {
  if (!profile || typeof profile !== 'object') {
    return {
      firstName: '',
      lastName: '',
      fullName: studentId ? `Élève #${studentId}` : 'Élève',
      matricule: '',
      className: '',
      hasPostnom: false,
    }
  }

  const p = profile as Record<string, unknown>
  const student = (p.student && typeof p.student === 'object'
    ? (p.student as Record<string, unknown>)
    : p) as Record<string, unknown>
  const stats =
    p.stats && typeof p.stats === 'object'
      ? (p.stats as Record<string, unknown>)
      : p

  const firstName = String(student.firstName ?? '').trim()
  const lastName = String(student.lastName ?? '').trim()
  const prenom = String(student.prenom ?? '').trim() || undefined
  const postnom = String(student.postnom ?? '').trim() || undefined

  const fullName =
    formatStudentFullName({
      firstName,
      lastName,
      prenom,
      postnom,
    }) ||
    String(student.name ?? student.fullName ?? student.rdcFullName ?? '') ||
    (studentId ? `Élève #${studentId}` : 'Élève')

  const classObj = student.class as { name?: string } | undefined
  const className = String(
    student.className ?? classObj?.name ?? p.className ?? '',
  ).trim()

  const photoUrl = String(
    student.photoUrl ?? student.avatar ?? p.photoUrl ?? '',
  ).trim() || undefined

  const parentsLink = Array.isArray(p.parentsLink)
    ? p.parentsLink
    : Array.isArray(student.parentsLink)
      ? student.parentsLink
      : []
  const firstParent = parentsLink[0] as
    | { parent?: { phone?: string; firstName?: string; lastName?: string; name?: string } }
    | undefined
  const parent = firstParent?.parent
  const parentPhone =
    String(parent?.phone ?? student.parentPhone ?? p.parentPhone ?? '').trim() ||
    undefined
  const parentName =
    [parent?.firstName, parent?.lastName].filter(Boolean).join(' ').trim() ||
    String(parent?.name ?? '').trim() ||
    undefined

  const remainingDebt = Number(
    stats.remainingDebt ?? stats.feesBalance ?? student.feesBalance ?? p.remainingDebt,
  )
  const totalPaid = Number(stats.feesPaid ?? stats.totalPaid ?? p.feesPaid)
  const totalDue = Number(stats.totalFees ?? stats.totalDue ?? p.totalFees)

  return {
    firstName: prenom || firstName,
    lastName,
    prenom,
    postnom,
    fullName,
    matricule: String(student.matricule ?? p.matricule ?? '').trim(),
    className,
    photoUrl,
    parentPhone,
    parentName,
    remainingDebt: Number.isFinite(remainingDebt) ? remainingDebt : undefined,
    totalPaid: Number.isFinite(totalPaid) ? totalPaid : undefined,
    totalDue: Number.isFinite(totalDue) ? totalDue : undefined,
    hasPostnom: Boolean(postnom),
  }
}
