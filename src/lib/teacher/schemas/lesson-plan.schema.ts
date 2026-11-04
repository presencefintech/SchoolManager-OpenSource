import { z } from 'zod'

export const LESSON_PLAN_WEEK_MIN = 1
export const LESSON_PLAN_WEEK_MAX = 15

const text = (max: number) => z.string().trim().min(1, 'Champ requis').max(max)

/** Une étape pédagogique (modèle T : contenu d'un côté, méthode/procédé de l'autre). */
const stepItemSchema = (max: number) =>
  z.object({
    content: text(max),
    method: z.string().trim().max(1000).optional(),
  })

const draftStepItemSchema = (max: number) =>
  z.object({
    content: z.string().trim().max(max).optional(),
    method: z.string().trim().max(1000).optional(),
  })

const duration = () => z.number().int().positive().max(240).optional()

/**
 * Rubriques de la partie pédagogique, groupées en 3 blocs comme sur la fiche
 * officielle RDC : activités initiales, principales, de contrôle. La durée est
 * saisie par bloc (comme sur le canevas papier), la méthode/procédé par étape.
 */
export const lessonStepsSchema = z.object({
  initialDuration: duration(),
  revision: stepItemSchema(4000),
  motivation: stepItemSchema(4000),
  development: stepItemSchema(8000),
  mainDuration: duration(),
  analysis: stepItemSchema(8000),
  synthesis: stepItemSchema(4000),
  controlDuration: duration(),
  application: stepItemSchema(4000),
  integration: stepItemSchema(4000),
  selfEvaluation: stepItemSchema(2000),
})

export const draftStepsSchema = z.object({
  initialDuration: duration(),
  revision: draftStepItemSchema(4000).optional(),
  motivation: draftStepItemSchema(4000).optional(),
  development: draftStepItemSchema(8000).optional(),
  mainDuration: duration(),
  analysis: draftStepItemSchema(8000).optional(),
  synthesis: draftStepItemSchema(4000).optional(),
  controlDuration: duration(),
  application: draftStepItemSchema(4000).optional(),
  integration: draftStepItemSchema(4000).optional(),
  selfEvaluation: draftStepItemSchema(2000).optional(),
})

export const createLessonPlanSchema = z.object({
  classId: z.number().int().positive('Classe requise'),
  subject: text(120),
  subBranch: z.string().trim().max(160).optional(),
  term: z.enum(['FIRST_TERM', 'SECOND_TERM', 'THIRD_TERM']),
  weekNumber: z
    .number()
    .int()
    .min(LESSON_PLAN_WEEK_MIN, `Semaine min. ${LESSON_PLAN_WEEK_MIN}`)
    .max(LESSON_PLAN_WEEK_MAX, `Semaine max. ${LESSON_PLAN_WEEK_MAX}`),
  title: text(180),
  objectives: z.string().trim().max(8000).optional(),
  materials: z.string().trim().max(4000).optional(),
  bibliographicReferences: z.string().trim().max(2000).optional(),
  steps: draftStepsSchema.optional(),
})

export const updateLessonPlanSchema = z.object({
  title: text(180).optional(),
  subject: text(120).optional(),
  subBranch: z.string().trim().max(160).optional(),
  objectives: z.string().trim().max(8000).optional(),
  materials: z.string().trim().max(4000).optional(),
  bibliographicReferences: z.string().trim().max(2000).optional(),
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

export type LessonStepKey =
  | 'revision'
  | 'motivation'
  | 'development'
  | 'analysis'
  | 'synthesis'
  | 'application'
  | 'integration'
  | 'selfEvaluation'

export const STEP_FIELD_LABELS: Record<LessonStepKey, string> = {
  revision: 'Révision (prérequis)',
  motivation: 'Motivation',
  development: 'Annonce du sujet',
  analysis: 'Analyse',
  synthesis: 'Synthèse',
  application: 'Application',
  integration: 'Intégration',
  selfEvaluation: 'Auto-évaluation / autocritique',
}

/** Regroupement des étapes en 3 blocs, comme sur la fiche de préparation papier RDC. */
export const LESSON_PLAN_PHASES: Array<{
  key: 'initial' | 'main' | 'control'
  label: string
  durationKey: 'initialDuration' | 'mainDuration' | 'controlDuration'
  steps: LessonStepKey[]
}> = [
  {
    key: 'initial',
    label: 'I. Activités initiales',
    durationKey: 'initialDuration',
    steps: ['revision', 'motivation', 'development'],
  },
  {
    key: 'main',
    label: 'II. Activités principales',
    durationKey: 'mainDuration',
    steps: ['analysis', 'synthesis'],
  },
  {
    key: 'control',
    label: 'III. Activités de contrôle',
    durationKey: 'controlDuration',
    steps: ['application', 'integration', 'selfEvaluation'],
  },
]

export type CreateLessonPlanInput = z.infer<typeof createLessonPlanSchema>
export type UpdateLessonPlanInput = z.infer<typeof updateLessonPlanSchema>
export type ReviewLessonPlanInput = z.infer<typeof reviewLessonPlanSchema>
