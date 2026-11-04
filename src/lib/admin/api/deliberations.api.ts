import { apiClient } from '@/lib/api/client'
import { triggerBlobDownload } from '@/lib/download-blob'
import type { SchoolTerm } from '@/types/teacher-grades'
import type { BulletinPermissions } from '@/types/official-bulletin'
import type { DomainGroup } from '@/types/official-bulletin'

function unwrap<T>(payload: unknown): T {
  const body = payload as { data?: T }
  return (body?.data ?? payload) as T
}

export type DeliberationDecision = 'PASSE' | 'REPECHAGE' | 'DOUBLE' | 'EN_ATTENTE'

export type GradeAnomalyFlag = {
  studentId: number
  percentage: number
  zScore: number
  isAnomalous: boolean
  message: string | null
  mean: number
  stdDev: number
}

export type GradeAnomalyReport = {
  mean: number | null
  stdDev: number | null
  threshold: number
  sampleSize: number
  flaggedCount: number
  anomalies: GradeAnomalyFlag[]
}

export type DeliberationBulletinRow = {
  meta: {
    studentId: number
    schoolId: number
    classId: number
    academicYear: string
    term?: SchoolTerm | string | null
    generatedAt?: string
    scale?: number
  }
  student: {
    id?: number
    matricule?: string | null
    fullName: string
    sex?: string | null
    birthPlace?: string | null
    birthDate?: string | null
  }
  school?: {
    name?: string | null
    city?: string | null
    province?: string | null
    commune?: string | null
    code?: string | null
  }
  classInfo?: {
    id: number
    name: string
    sectionId?: number
    sectionName?: string
    optionId?: number
    optionName?: string
    level?: string | null
    cycleName?: string | null
  }
  domains?: DomainGroup[]
  totals: {
    percentage: number | null
    obtained?: number | null
    max?: number
    gradedSubjectCount?: number
    subjectCount?: number
  }
  rank: {
    position: number | null
    classSize?: number | null
    gradedCount?: number | null
  }
  deliberation: {
    decision: DeliberationDecision
    decisionLabel: string
    suggestedDecision: DeliberationDecision
    suggestedDecisionLabel: string
    thresholds?: {
      passThreshold: number
      repechageMin: number
    }
    conductNote?: number | null
    applicationNote?: number | null
    validatedAt: string | null
    validatedByUserId: number | null
    securityHash: string
    verifyToken: string
    deliberationId: number | null
    placeLabel?: string | null
    anomaly?: {
      isAnomalous: boolean
      zScore: number
      message: string | null
      placeLabel: string | null
    } | null
  }
}

export type DeliberateBatchSyncResult = {
  mode: 'sync'
  processed: number
  created: number
  updated: number
  unchanged: number
  skippedNoGrades: number
  anomalyReport: GradeAnomalyReport
  securityHashes: Array<{
    studentId: number
    deliberationId: number | null
    securityHash: string
    verifyToken: string
    rank: number | null
    placeLabel: string | null
    isAnomalous: boolean
  }>
  bulletins: DeliberationBulletinRow[]
}

export type DeliberateBatchAsyncResult = {
  mode: 'async'
  jobId: string | null
  queued: boolean
  progressPath: string | null
}

export type DeliberateBatchResult = DeliberateBatchSyncResult | DeliberateBatchAsyncResult

export type BulkJobProgress = {
  jobId: string
  jobName: string
  schoolId: number
  status: 'queued' | 'active' | 'progress' | 'completed' | 'failed'
  total: number
  processed: number
  succeeded: number
  failed: number
  percent: number
  message?: string
  errors?: Array<{ entityId: string; message: string }>
  updatedAt: string
  startedAt?: string
  finishedAt?: string
  result?: {
    filename?: string
    count?: number
    downloadPath?: string
  }
}

export type ZipExportAsyncResult = {
  mode: 'async'
  jobId: string
  queued: boolean
  progressPath: string | null
  downloadPath: string | null
}

export type ZipExportSyncResult = {
  mode: 'sync'
  filename: string
  count: number
}

export type ZipExportResult = ZipExportAsyncResult | ZipExportSyncResult

export type DeliberateBatchBody = {
  schoolId: number
  classId: number
  academicYear: string
  term: SchoolTerm
  validate?: boolean
  async?: boolean
}

export type BulletinCapabilities = BulletinPermissions & {
  schoolId: number
}

export const adminDeliberationsApi = {
  deliberateBatch: (body: DeliberateBatchBody) =>
    apiClient
      .post('/admin/deliberations/batch', body)
      .then((r) => unwrap<DeliberateBatchResult>(r.data)),

  validateBatch: (body: Omit<DeliberateBatchBody, 'validate'>) =>
    apiClient
      .post('/admin/deliberations/batch/validate', body)
      .then((r) => unwrap<DeliberateBatchResult>(r.data)),

  jobProgress: (jobId: string) =>
    apiClient
      .get(`/admin/deliberations/jobs/${encodeURIComponent(jobId)}/progress`)
      .then((r) => unwrap<BulkJobProgress>(r.data)),

  capabilities: (schoolId?: number) =>
    apiClient
      .get('/admin/deliberations/capabilities', {
        params: schoolId ? { schoolId } : undefined,
      })
      .then((r) => unwrap<BulletinCapabilities>(r.data)),

  /**
   * Lance l’export ZIP classe.
   * - 202 JSON → job BullMQ async (progress + download)
   * - 200 ZIP → sync (fallback Redis off)
   */
  exportClassZip: async (
    body: Omit<DeliberateBatchBody, 'validate'> & { async?: boolean },
  ): Promise<ZipExportResult> => {
    const res = await apiClient.post('/admin/deliberations/export/zip', {
      ...body,
      async: body.async !== false,
    }, {
      responseType: 'blob',
      timeout: 180_000,
      validateStatus: (status) => status === 200 || status === 202 || status >= 400,
    })

    const blob = res.data as Blob
    const isJson =
      blob.type.includes('application/json') ||
      res.status === 202 ||
      (res.headers['content-type'] as string | undefined)?.includes('json')

    if (isJson) {
      const text = await blob.text()
      let parsed: {
        message?: string
        data?: ZipExportAsyncResult & { mode?: string }
      }
      try {
        parsed = JSON.parse(text) as typeof parsed
      } catch {
        throw new Error('Réponse export ZIP invalide')
      }
      if (res.status >= 400) {
        throw new Error(parsed.message ?? 'Export ZIP refusé')
      }
      const data = (parsed.data ?? parsed) as ZipExportAsyncResult
      if (data.mode === 'async' && data.jobId) {
        return {
          mode: 'async',
          jobId: data.jobId,
          queued: data.queued ?? true,
          progressPath: data.progressPath ?? null,
          downloadPath: data.downloadPath ?? null,
        }
      }
      throw new Error(parsed.message ?? 'Export ZIP non disponible')
    }

    if (res.status >= 400) {
      throw new Error('Export ZIP refusé')
    }

    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^";]+)"?/i)
    const filename =
      match?.[1] ?? `bulletins_${body.academicYear}_${body.term}.zip`
    triggerBlobDownload(blob, filename)
    return {
      mode: 'sync',
      filename,
      count: Number(res.headers['x-bulletin-count'] ?? 0),
    }
  },

  /** Télécharge l’artefact ZIP d’un job terminé. */
  downloadZipArtifact: async (jobId: string) => {
    const res = await apiClient.get(
      `/admin/deliberations/jobs/${encodeURIComponent(jobId)}/download`,
      { responseType: 'blob', timeout: 120_000 },
    )
    const blob = res.data as Blob
    if (blob.type.includes('application/json')) {
      const text = await blob.text()
      let message = 'Téléchargement ZIP impossible'
      try {
        const parsed = JSON.parse(text) as { message?: string }
        if (parsed.message) message = parsed.message
      } catch {
        /* ignore */
      }
      throw new Error(message)
    }
    const disposition = res.headers['content-disposition'] as string | undefined
    const match = disposition?.match(/filename="?([^";]+)"?/i)
    const filename = match?.[1] ?? `bulletins_${jobId}.zip`
    triggerBlobDownload(blob, filename)
    return {
      filename,
      count: Number(res.headers['x-bulletin-count'] ?? 0),
    }
  },
}
