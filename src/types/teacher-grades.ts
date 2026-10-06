export type SchoolTerm = 'FIRST_TERM' | 'SECOND_TERM' | 'THIRD_TERM'
export type EvaluationType = 'INTERRO' | 'TP' | 'DEVOIR' | 'EXAMEN'
export type EvaluationStatus = 'DRAFT' | 'PUBLISHED' | 'LOCKED'
export type AcademicTermStatus = 'DRAFT' | 'SUBMITTED' | 'LOCKED'

export interface TeacherGradeClass {
  id: number
  name: string
  studentCount: number
}

export interface TeacherGradeSubject {
  id: number
  name: string
}

export interface TeacherGradeContext {
  stats: {
    totalClasses: number
    totalStudents: number
    todaySlots: number
  }
  classes: TeacherGradeClass[]
  subjects: TeacherGradeSubject[]
  serverTime: string
}

export interface GradebookCell {
  evaluationId: number
  gradeId: number | null
  score: number | null
  isAbsent: boolean
  comment: string | null
  maxScore: number
}

export interface GradebookEvaluationColumn {
  id: number
  title: string
  type: EvaluationType
  maxScore: number
  coefficient: number
  evaluatedAt: string
  status: EvaluationStatus
}

export interface GradebookStudentRow {
  studentId: number
  matricule: string | null
  fullName: string
  cells: Record<string, GradebookCell>
  tj: { obtained: number; max: number; onScale: number | null }
  examen: { obtained: number; max: number; onScale: number | null }
  provisionalAverage: number | null
}

export interface GradebookGrid {
  classId: number
  className: string
  subjectId: number
  subjectName: string
  term: SchoolTerm
  academicYear: string
  termStatus: AcademicTermStatus
  writable: boolean
  scale: number
  weights: { tj: number; examen: number }
  evaluations: GradebookEvaluationColumn[]
  students: GradebookStudentRow[]
  classStats: {
    average: number | null
    min: number | null
    max: number | null
    gradedCount: number
    studentCount: number
  }
}

export const TERM_LABELS: Record<SchoolTerm, string> = {
  FIRST_TERM: '1er trimestre',
  SECOND_TERM: '2e trimestre',
  THIRD_TERM: '3e trimestre',
}

export const EVAL_TYPE_LABELS: Record<EvaluationType, string> = {
  INTERRO: 'Interro',
  TP: 'TP',
  DEVOIR: 'Devoir',
  EXAMEN: 'Examen',
}
