'use client'

import Link from 'next/link'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, BarChart3 } from 'lucide-react'
import { apiErrorMessage } from '@/lib/teacher/api/mobile.api'
import { teacherQuizzesApi } from '@/lib/teacher/api/school-work.api'
import { Card, EmptyState, ErrorState, ListSkeleton, PageHeader, StatTile } from '@/components/teacher/ui'

export default function TeacherQuizStatsPage() {
  const params = useParams<{ quizId: string }>()
  const id = Number(params.quizId)
  const q = useQuery({ queryKey: ['teacher', 'quizzes', 'stats', id], queryFn: () => teacherQuizzesApi.statistics(id) })
  const s = q.data

  return (
    <div className="space-y-6">
      <Link href={`/teacher/quizzes/${id}`} className="inline-flex items-center gap-1 text-sm text-slate-500 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Retour au QCM
      </Link>
      {q.isLoading ? (
        <ListSkeleton rows={4} />
      ) : q.isError || !s ? (
        <ErrorState message={apiErrorMessage(q.error, 'Statistiques indisponibles.')} onRetry={() => q.refetch()} />
      ) : (
        <>
          <PageHeader icon={<BarChart3 className="h-6 w-6 text-teal-600" />} title={s.quizTitle || 'Statistiques'} subtitle="Résultats de la classe" />
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <StatTile label="Participation" value={`${s.submissionCount} / ${s.enrolledCount}`} />
            <StatTile label="Taux de participation" value={`${s.participationRate} %`} />
            <StatTile label="Moyenne" value={`${s.averagePercentage} %`} tone={s.averagePercentage >= 50 ? 'good' : 'warn'} />
            <StatTile label="Taux de réussite" value={`${s.passRate} %`} tone={s.passRate >= 50 ? 'good' : 'bad'} />
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-slate-500">Par question</h2>
            {s.perQuestion.length === 0 ? (
              <EmptyState>Aucune réponse enregistrée pour l’instant.</EmptyState>
            ) : (
              s.perQuestion
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((p, i) => {
                  const totalAnswers = Object.values(p.optionDistribution).reduce((a, b) => a + b, 0)
                  return (
                    <Card key={p.questionId || i} className="space-y-3">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="font-medium">
                          {i + 1}. {p.text}
                        </p>
                        <span className="text-sm text-slate-500">
                          {p.successRate} % de réussite ({p.correctCount} bonnes · {p.wrongCount} fausses)
                        </span>
                      </div>
                      <div className="space-y-1.5">
                        {Object.entries(p.optionDistribution)
                          .sort(([a], [b]) => a.localeCompare(b))
                          .map(([letter, count]) => {
                            const width = totalAnswers > 0 ? Math.round((count / totalAnswers) * 100) : 0
                            return (
                              <div key={letter} className="flex items-center gap-2 text-sm">
                                <span className="w-5 font-mono text-slate-500">{letter}</span>
                                <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className="h-full rounded-full bg-teal-500" style={{ width: `${width}%` }} />
                                </div>
                                <span className="w-16 text-right tabular-nums text-slate-500">
                                  {count} ({width} %)
                                </span>
                              </div>
                            )
                          })}
                      </div>
                    </Card>
                  )
                })
            )}
          </section>
        </>
      )}
    </div>
  )
}
