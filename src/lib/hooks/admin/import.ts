import { useQuery, useMutation } from '@tanstack/react-query'
import { importApi } from '@/lib/admin/api'
import type { ImportType, ImportJobResult, StudentDecision } from '@/lib/admin/api'

// ── Import ──────────────────────────────────────────────────────────

export function useImportUpload() {
  return useMutation({
    mutationFn: ({
      type,
      file,
      schoolId,
      studentOptions,
    }: {
      type: ImportType
      file: File
      schoolId?: number
      studentOptions?: { decisions: Record<number, StudentDecision>; fileHash: string }
    }) => importApi.upload(type, file, schoolId, studentOptions),
  })
}

export function useImportStatus(jobId: string | null) {
  return useQuery({
    queryKey: ['admin', 'import', jobId],
    queryFn: () => importApi.getStatus(jobId!),
    enabled: !!jobId,
    staleTime: 0,
    refetchInterval: (query) => {
      const status = (query.state.data as ImportJobResult | undefined)?.status
      if (!status || ['COMPLETED', 'PARTIAL', 'FAILED'].includes(status)) return false
      return 2000
    },
  })
}
