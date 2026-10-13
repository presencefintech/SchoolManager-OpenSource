'use client'

import { useRef, useState } from 'react'
import { useParams } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Camera, Paperclip } from 'lucide-react'
import { getApiErrorMessage } from '@/lib/api/client'
import { parentApi } from '@/lib/parent/api'
import { parentKeys, useSelectedStudent } from '@/lib/parent/hooks'
import { Card, ErrorState, ListSkeleton, PageHeader, Pill, Spinner } from '@/components/parent/ui'

export default function AssignmentDetailPage() {
  const { assignmentId } = useParams<{ assignmentId: string }>()
  const { studentId } = useSelectedStudent()
  const queryClient = useQueryClient()
  const key = ['parent', 'assignment', studentId, assignmentId] as const
  const assignment = useQuery({
    queryKey: key,
    queryFn: () => parentApi.assignment(studentId as number, assignmentId),
    enabled: studentId != null,
  })
  const [file, setFile] = useState<File | null>(null)
  const [comment, setComment] = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  const submit = useMutation({
    mutationFn: async () => {
      if (!file || studentId == null) throw new Error('Ajoutez une photo ou un fichier du devoir.')
      const uploaded = await parentApi.uploadAssignmentAttachment(studentId, assignmentId, file)
      const attachmentUrl = uploaded.attachmentUrl ?? uploaded.url
      if (!attachmentUrl) throw new Error("Envoi du fichier échoué.")
      return parentApi.submitAssignment(studentId, {
        assignmentId: Number(assignmentId),
        attachmentUrl,
        attachmentKind: uploaded.attachmentKind ?? (file.type === 'application/pdf' ? 'PDF' : 'PHOTO'),
        parentComment: comment.trim() || undefined,
      })
    },
    onSuccess: () => {
      setFile(null)
      setComment('')
      void queryClient.invalidateQueries({ queryKey: key })
      void queryClient.invalidateQueries({ queryKey: parentKeys.assignments(studentId ?? 0) })
    },
  })

  if (assignment.isLoading || studentId == null) return <ListSkeleton rows={2} />
  if (assignment.isError || !assignment.data) return <ErrorState onRetry={() => void assignment.refetch()} />
  const a = assignment.data
  const sub = a.submission
  const closed = a.status === 'CLOSED'

  return (
    <>
      <PageHeader
        title={a.title ?? 'Devoir'}
        subtitle={[a.subject, a.teacherName].filter(Boolean).join(' · ')}
      />
      <Card className="space-y-3">
        {a.dueDate && (
          <p className="text-sm text-zinc-500">Pour le {new Date(a.dueDate).toLocaleDateString('fr-FR', { dateStyle: 'long' })}</p>
        )}
        {a.description && <p className="whitespace-pre-wrap text-sm">{a.description}</p>}
        {a.attachmentUrl && (
          <a
            href={a.attachmentUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-teal-700 underline underline-offset-2"
          >
            <Paperclip className="h-4 w-4" /> Pièce jointe de l&apos;enseignant
          </a>
        )}
      </Card>

      {sub && (
        <Card className="mt-4 space-y-2">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold">Rendu</h2>
            {sub.grade != null ? (
              <Pill tone="green">
                {sub.grade}/{sub.maxGrade}
              </Pill>
            ) : (
              <Pill tone="amber">En attente de correction</Pill>
            )}
          </div>
          {sub.teacherComment && <p className="text-sm">Commentaire : {sub.teacherComment}</p>}
          {sub.attachmentUrl && (
            <a href={sub.attachmentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-teal-700 underline">
              Voir le fichier envoyé
            </a>
          )}
        </Card>
      )}

      {!sub && !closed && (
        <Card className="mt-4 space-y-3">
          <h2 className="font-semibold">Rendre le devoir</h2>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,application/pdf"
            capture="environment"
            className="hidden"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-3 text-sm"
          >
            <Camera className="h-4 w-4" /> {file ? file.name : 'Photographier ou choisir un fichier'}
          </button>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
            placeholder="Commentaire (facultatif)"
            className="w-full rounded-xl border border-line bg-canvas px-3 py-2"
          />
          {submit.isError && (
            <p role="alert" className="text-sm text-red-600">
              {getApiErrorMessage(submit.error)}
            </p>
          )}
          <button
            type="button"
            disabled={!file || submit.isPending}
            onClick={() => submit.mutate()}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 font-medium text-white disabled:opacity-50"
          >
            {submit.isPending && <Spinner />} Envoyer
          </button>
        </Card>
      )}
    </>
  )
}
