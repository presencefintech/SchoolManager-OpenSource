import { z } from 'zod'

export const LESSON_PLAN_WEEK_MIN = 1
export const LESSON_PLAN_WEEK_MAX = 15

const text = (max: number) => z.string().trim().min(1, 'Champ requis').max(max)

export const lessonStepsSchema = z.object({
  revision: text(4000),
  motivation: text(4000),
  development: text(8000),
  synthesis: text(4000),
  application: text(4000),
})

export const draftStepsSchema = z.object({
  revision: z.string().trim().max(4000).optional(),
  motivation: z.string().trim().max(4000).optional(),
  development: z.string().trim().max(8000).optional(),
  synthesis: z.string().trim().max(4000).optional(),
  application: z.string().trim().max(4000).optional(),
})

export const createLessonPlanSchema = z.object({
  classId: z.number().int().positive('Classe requise'),
  subject: text(120),
  term: z.enum(['FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM']),
  weekNumber: z
    .number()
    .int()
    .min(LESSON_PLAN_WEEK_MIN, `Semaine min. ${LESSON_PLAN_WEEK_MIN}`)
    .max(LESSON_PLAN_WEEK_MAX, `Semaine max. ${LESSON_PLAN_WEEK_MAX}`),
  title: text(180),
  objectives: z.string().trim().max(8000).optional(),
  materials: z.string().trim().max(4000).optional(),
  steps: draftStepsSchema.optional(),
})

export const updateLessonPlanSchema = z.object({
  title: text(180).optional(),
  subject: text(120).optional(),
  objectives: z.string().trim().max(8000).optional(),
  materials: z.string().trim().max(4000).optional(),
  steps: draftStepsSchema.optional(),
  term: z.enum(['FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM']).optional(),
  weekNumber: z
    .number()
    .int()
    .min(LESSON_PLAN_WEEK_MIN)
    .max(LESSON_PLAN_WEEK_MAX)
    .optional(),
})

export const reviewLessonPlanSchema = z
  .object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    feedback: z.string().trim().max(2000).optional(),
  })
  .refine(
    (body) => body.decision !== 'REJECTED' || (body.feedback?.length ?? 0) >= 8,
    {
      message: 'Un rejet exige un commentaire de correction (8 caractères minimum).',
      path: ['feedback'],
    },
  )

export const STEP_FIELD_LABELS: Record<
  'revision' | 'motivation' | 'development' | 'synthesis' | 'application',
  string
> = {
  revision: 'Révision',
  motivation: 'Motivation',
  development: 'Annonce du sujet',
  synthesis: 'Synthèse',
  application: 'Application',
}

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>
export type ReviewLessonPlanInput = z.infer<typeof reviewLessonPlanSchema>
