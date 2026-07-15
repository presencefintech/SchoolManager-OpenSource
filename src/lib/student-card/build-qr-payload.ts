/**
 * Payload QR pour carte élève / électeur scolaire.
 * Format compact JSON — scannable à ~14 mm (niveau H).
 */
export type StudentCardQrPayload = {
  v: 1
  studentId: number
  matricule?: string
}

export function buildStudentCardQrPayload(
  studentId: number,
  matricule?: string | null,
): StudentCardQrPayload {
  const payload: StudentCardQrPayload = { v: 1, studentId }
  const trimmed = matricule?.trim()
  if (trimmed) payload.matricule = trimmed
  return payload
}

/** Chaîne JSON à encoder dans le QR (présence / guichet). */
export function serializeStudentCardQrPayload(
  studentId: number,
  matricule?: string | null,
): string {
  return JSON.stringify(buildStudentCardQrPayload(studentId, matricule))
}

export function parseStudentCardQrPayload(raw: string): StudentCardQrPayload | null {
  try {
    const data = JSON.parse(raw) as Partial<StudentCardQrPayload>
    if (typeof data?.studentId !== 'number' || !Number.isFinite(data.studentId)) return null
    return {
      v: 1,
      studentId: data.studentId,
      matricule: typeof data.matricule === 'string' ? data.matricule : undefined,
    }
  } catch {
    return null
  }
}
