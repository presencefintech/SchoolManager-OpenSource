import { asList, num, numOrNull, rec, str, teacherGet, teacherPost, type Rec } from '@/lib/teacher/api/mobile.api'

/** Devoirs et QCM enseignant — `/api/v1/mobile/teacher/{assignments,quizzes}`. */

export type WorkStatus = 'DRAFT' | 'PUBLISHED' | 'CLOSED' | 'ARCHIVED' | string

export type Paged<T> = { items: T[]; total: number; page: number; limit: number }

function paged<T>(raw: unknown, map: (r: Rec) => T): Paged<T> {
  const r = rec(raw)
  const items = asList(r.items ?? r.data ?? raw).map(map)
  return { items, total: num(r.total, items.length), page: num(r.page, 1), limit: num(r.limit, 25) }
}

// ───────────────────────────────── Devoirs ─────────────────────────────────

export type AssignmentSummary = {
  id: number
  title: string
  subject: string
  description: string | null
  dueDate: string | null
  status: WorkStatus
  submissionCount: number
  classId: number | null
  className: string | null
}

export type AssignmentStats = { pending: number; submitted: number; graded: number; excused: number; total: number }

export type AssignmentDetail = AssignmentSummary & { stats: AssignmentStats }

export type Submission = {
  id: number
  status: string
  studentId: number
  studentName: string
  matricule: string
  grade: number | null
  maxGrade: number | null
  teacherComment: string | null
  parentComment: string | null
  submittedAt: string | null
  gradedAt: string | null
  paperValidated: boolean
}

function parseAssignment(r: Rec): AssignmentSummary {
  const cls = rec(r.class)
  const count = rec(r._count)
  return {
    id: num(r.id),
    title: str(r.title),
    subject: str(r.subject),
    description: str(r.description) || null,
    dueDate: str(r.dueDate) || null,
    status: str(r.status, 'DRAFT').toUpperCase(),
    submissionCount: num(count.submissions ?? r.submissionCount),
    classId: numOrNull(cls.id ?? r.classId),
    className: str(cls.name ?? r.className) || null,
  }
}

function parseStats(raw: unknown): AssignmentStats {
  const r = rec(raw)
  return {
    pending: num(r.pending),
    submitted: num(r.submitted),
    graded: num(r.graded),
    excused: num(r.excused),
    total: num(r.total),
  }
}

function parseSubmission(r: Rec): Submission {
  const s = rec(r.student)
  const first = str(s.firstName ?? s.prenom)
  const last = str(s.lastName ?? s.postnom)
  return {
    id: num(r.id),
    status: str(r.status, 'PENDING').toUpperCase(),
    studentId: num(s.id ?? r.studentId),
    studentName: `${first} ${last}`.trim() || 'Élève',
    matricule: str(s.matricule),
    grade: numOrNull(r.grade),
    maxGrade: numOrNull(r.maxGrade),
    teacherComment: str(r.teacherComment) || null,
    parentComment: str(r.parentComment) || null,
    submittedAt: str(r.submittedAt) || null,
    gradedAt: str(r.gradedAt) || null,
    paperValidated: r.paperValidated === true,
  }
}

export type CreateAssignmentBody = {
  classId: number
  title: string
  subject: string
  description?: string
  dueDate?: string
  publish: boolean
}

export type GradeBody = {
  assignmentId: number
  studentId: number
  grade: number
  maxGrade: number
  teacherComment?: string
  paperValidated: boolean
}

export const teacherAssignmentsApi = {
  usage: async (): Promise<Rec> => rec(await teacherGet('/assignments/usage')),

  list: async (params: { classId?: number; status?: string; page?: number; limit?: number } = {}) =>
    paged(await teacherGet('/assignments', { page: 1, limit: 50, ...params }), parseAssignment),

  get: async (id: number): Promise<AssignmentDetail> => {
    const r = rec(await teacherGet(`/assignments/${id}`))
    return { ...parseAssignment(r), stats: parseStats(r.stats) }
  },

  /** Le serveur plafonne `limit` à 50 : on pagine jusqu'à avoir tous les élèves de la classe. */
  submissions: async (id: number) => {
    const PAGE = 50
    const items: Submission[] = []
    let first: Rec = {}
    for (let page = 1; page <= 20; page++) {
      const r = rec(await teacherGet(`/assignments/${id}/submissions`, { page, limit: PAGE }))
      if (page === 1) first = r
      const batch = asList(r.items ?? r.data).map(parseSubmission)
      items.push(...batch)
      if (batch.length < PAGE || items.length >= num(r.total, items.length)) break
    }
    return {
      assignmentId: num(first.assignmentId, id),
      items,
      total: num(first.total, items.length),
      stats: parseStats(first.stats),
    }
  },

  create: async (body: CreateAssignmentBody): Promise<AssignmentDetail> => {
    const r = rec(await teacherPost('/assignments', body))
    return { ...parseAssignment(r), stats: parseStats(r.stats) }
  },

  publish: (id: number) => teacherPost(`/assignments/${id}/publish`),
  close: (id: number) => teacherPost(`/assignments/${id}/close`),
  archive: (id: number) => teacherPost(`/assignments/${id}/archive`),
  grade: (body: GradeBody) => teacherPost('/assignments/grade', body),
}

// ─────────────────────────────────── QCM ───────────────────────────────────

export type QuizSummary = {
  id: number
  title: string
  description: string | null
  status: WorkStatus
  dueDate: string | null
  publishedAt: string | null
  questionCount: number
  submissionCount: number
  classId: number | null
  className: string | null
}

export type QuizQuestion = {
  id: number
  text: string
  options: Record<string, string>
  correctOption: string
  sortOrder: number
}

export type QuizDetail = QuizSummary & { questions: QuizQuestion[] }

export type QuizQuestionStats = {
  questionId: number
  text: string
  sortOrder: number
  correctCount: number
  wrongCount: number
  successRate: number
  failureRate: number
  optionDistribution: Record<string, number>
}

export type QuizStatistics = {
  quizTitle: string
  quizStatus: string
  submissionCount: number
  enrolledCount: number
  participationRate: number
  averageScore: number
  averagePercentage: number
  passRate: number
  perQuestion: QuizQuestionStats[]
}

export type QuizQuestionInput = {
  text: string
  options: Record<string, string>
  correctOption: string
}

export type CreateQuizBody = {
  classId: number
  title: string
  description?: string
  dueDate?: string
  publish: boolean
  questions: QuizQuestionInput[]
}

function parseQuiz(r: Rec): QuizSummary {
  const cls = rec(r.class)
  const count = rec(r._count)
  return {
    id: num(r.id),
    title: str(r.title),
    description: str(r.description) || null,
    status: str(r.status, 'DRAFT').toUpperCase(),
    dueDate: str(r.dueDate) || null,
    publishedAt: str(r.publishedAt) || null,
    questionCount: num(count.questions ?? r.questionCount),
    submissionCount: num(count.submissions ?? r.submissionCount),
    classId: numOrNull(cls.id ?? r.classId),
    className: str(cls.name ?? r.className) || null,
  }
}

function parseQuestion(r: Rec): QuizQuestion {
  const optionsRaw = rec(r.options)
  const options: Record<string, string> = {}
  for (const [k, v] of Object.entries(optionsRaw)) options[k] = str(v)
  return {
    id: num(r.id),
    text: str(r.text),
    options,
    correctOption: str(r.correctOption, 'A'),
    sortOrder: num(r.sortOrder),
  }
}

function parseQuizDetail(raw: unknown): QuizDetail {
  const r = rec(raw)
  return { ...parseQuiz(r), questions: asList(r.questions).map(parseQuestion) }
}

export const teacherQuizzesApi = {
  list: async (params: { classId?: number; status?: string; page?: number; limit?: number } = {}) =>
    paged(await teacherGet('/quizzes', { page: 1, limit: 50, ...params }), parseQuiz),

  get: async (id: number): Promise<QuizDetail> => parseQuizDetail(await teacherGet(`/quizzes/${id}`)),

  statistics: async (id: number): Promise<QuizStatistics> => {
    const r = rec(await teacherGet(`/quizzes/${id}/statistics`))
    const quiz = rec(r.quiz)
    return {
      quizTitle: str(quiz.title),
      quizStatus: str(quiz.status),
      submissionCount: num(r.submissionCount),
      enrolledCount: num(r.enrolledCount),
      participationRate: num(r.participationRate),
      averageScore: num(r.averageScore),
      averagePercentage: num(r.averagePercentage),
      passRate: num(r.passRate),
      perQuestion: asList(r.perQuestion).map((q) => {
        const dist: Record<string, number> = {}
        for (const [k, v] of Object.entries(rec(q.optionDistribution))) dist[k] = num(v)
        return {
          questionId: num(q.questionId),
          text: str(q.text),
          sortOrder: num(q.sortOrder),
          correctCount: num(q.correctCount),
          wrongCount: num(q.wrongCount),
          successRate: num(q.successRate),
          failureRate: num(q.failureRate),
          optionDistribution: dist,
        }
      }),
    }
  },

  create: async (body: CreateQuizBody): Promise<QuizDetail> => parseQuizDetail(await teacherPost('/quizzes', body)),
  publish: async (id: number): Promise<QuizDetail> => parseQuizDetail(await teacherPost(`/quizzes/${id}/publish`)),
}

export const WORK_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Brouillon',
  PUBLISHED: 'Publié',
  CLOSED: 'Clôturé',
  ARCHIVED: 'Archivé',
}

export const SUBMISSION_STATUS_LABEL: Record<string, string> = {
  PENDING: 'En attente',
  SUBMITTED: 'Rendu',
  GRADED: 'Noté',
  EXCUSED: 'Excusé',
}
