import { z } from 'zod'

export const gradeEntrySchema = z
  .object({
    studentId: z.number().int().positive(),
    score: z.number().finite().nullable().optional(),
    isAbsent: z.boolean().optional(),
    comment: z.string().trim().max(500).nullable().optional(),
  })
  .superRefine((entry, ctx) => {
    if (entry.isAbsent) return
    if (entry.score == null) return
    if (entry.score < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'La note ne peut pas être négative.',
        path: ['score'],
      })
    }
  })

export function gradeEntryAgainstMax(maxScore: number) {
  return gradeEntrySchema.superRefine((entry, ctx) => {
    if (entry.isAbsent || entry.score == null) return
    if (entry.score > maxScore) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Maximum autorisé : ${maxScore}`,
        path: ['score'],
      })
    }
  })
}

export const upsertGradesSchema = z.object({
  grades: z.array(gradeEntrySchema).min(1).max(200),
  reason: z.string().trim().max(500).nullable().optional(),
})

export type GradeEntryInput = z.infer<typeof gradeEntrySchema>
