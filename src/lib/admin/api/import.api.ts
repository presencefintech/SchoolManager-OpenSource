import axios from 'axios'
import { apiClient } from '@/lib/api/client'
import { parseContentDispositionFilename, readBlobErrorMessage } from '@/lib/download-blob'

export type ImportType = 'students' | 'parents' | 'structure' | 'fees'

export type ImportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'PARTIAL' | 'FAILED'

export interface ImportJobResult {
  jobId: string
  type: ImportType
  status: ImportJobStatus
  progress: number
  totalRows: number
  imported: number
  failed: number
  /** Lignes volontairement ignorées (doublons) — import élèves. */
  skipped?: number
  /** Lignes importées avec au moins un avertissement — import élèves. */
  warnings?: number
  /** Rapport du lot : erreurs, avertissements et lignes ignorées (champ severity pour les élèves). */
  errors: ImportReportEntry[]
  fileName: string
}

export interface ImportReportEntry {
  row: number
  field: string
  message: string
  code?: string
  severity?: 'error' | 'warning' | 'skipped'
}

// ── Pré-validation élèves (voyants) ─────────────────────────────────

export type StudentRowLevel = 'green' | 'orange' | 'red'
export type StudentDecision = 'skip' | 'fill' | 'update' | 'create'

export interface StudentRowIssue {
  field: string
  message: string
  code: 'REQUIRED' | 'INVALID' | 'NOT_FOUND' | 'CONFLICT' | 'MISSING' | 'CHECK' | 'REMARK'
}

export interface StudentFieldChange {
  field: string
  label: string
  existing: string | null
  incoming: string | null
  kind: 'new' | 'different' | 'same'
}

export interface StudentDuplicateMatch {
  source: 'database' | 'file'
  studentId: number | null
  fileRow: number | null
  matricule: string | null
  fullName: string
  className: string | null
  score: number
  reason: 'SAME_MATRICULE' | 'EXACT_NAME' | 'SIMILAR_NAME' | 'SAME_PHONE_AND_BIRTH'
  strict: boolean
  changes: StudentFieldChange[]
}

export interface StudentRowAnalysis {
  row: number
  level: StudentRowLevel
  errors: StudentRowIssue[]
  warnings: StudentRowIssue[]
  student: {
    lastName: string
    postnom: string | null
    firstName: string | null
    gender: string | null
    dateOfBirth: string | null
    placeOfBirth: string | null
    phone: string | null
    className: string
  }
  match: StudentDuplicateMatch | null
  allowedDecisions: StudentDecision[]
  defaultDecision: StudentDecision
}

export interface StudentImportAnalysis {
  type: 'students'
  fileName: string
  fileHash: string
  columns: string[]
  rows: StudentRowAnalysis[]
  summary: {
    total: number
    green: number
    greenWithWarnings: number
    orange: number
    red: number
    importable: number
  }
}

// ── Classeur complet (pack multi-onglets) ───────────────────────────

/** GET /admin/import/types — catalogue des types et ordre d'import recommandé. */
export interface ImportCatalog {
  order: string[]
  types: Array<{
    slug: string
    label: string
    description: string
    recommendedOrder: number
    columns: Array<{ header: string; required: boolean; example?: string }>
  }>
}

/** POST /admin/import/pack — un job par onglet reconnu, dans l'ordre recommandé. */
export interface ImportPackResult {
  jobs: Array<{ jobId: string; type: string; totalRows: number; fileName: string }>
  skipped: string[]
  fileName: string
}

export const importApi = {
  getCatalog: (): Promise<ImportCatalog> =>
    apiClient.get('/admin/import/types').then((r) => r.data.data),

  /** GET /admin/import/templates — classeur Excel multi-onglets (Structure, Frais, Élèves…). */
  downloadPackTemplate: async (): Promise<{ blob: Blob; filename: string }> => {
    try {
      const res = await apiClient.get('/admin/import/templates', { responseType: 'blob' })
      const ct = String(res.headers['content-type'] ?? '')
      if (ct.includes('application/json') || ct.includes('text/plain')) {
        throw new Error(await readBlobErrorMessage(res.data as Blob))
      }
      const filename = parseContentDispositionFilename(
        res.headers['content-disposition'] as string | undefined,
        'modele-import-complet.xlsx',
      )
      return { blob: res.data as Blob, filename }
    } catch (error) {
      // responseType blob : le JSON d'erreur arrive sous forme de Blob
      if (axios.isAxiosError(error) && error.response?.data instanceof Blob) {
        throw new Error(await readBlobErrorMessage(error.response.data))
      }
      throw error
    }
  },

  uploadPack: async (file: File, schoolId?: number): Promise<ImportPackResult> => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await apiClient.post('/admin/import/pack', fd, {
      params: schoolId ? { schoolId } : undefined,
      timeout: 180_000,
    })
    return r.data.data
  },

  upload: async (
    type: ImportType,
    file: File,
    schoolId?: number,
    studentOptions?: { decisions: Record<number, StudentDecision>; fileHash: string },
  ): Promise<{ jobId: string; type: ImportType; totalRows: number; fileName: string }> => {
    const fd = new FormData()
    fd.append('file', file)
    if (studentOptions) {
      fd.append('fileHash', studentOptions.fileHash)
      fd.append('decisions', JSON.stringify(studentOptions.decisions))
    }
    const r = await apiClient.post(`/admin/import/${type}`, fd, {
      params: schoolId ? { schoolId } : undefined,
      timeout: 120_000,
    })
    return r.data.data
  },

  downloadTemplate: async (type: ImportType): Promise<{ blob: Blob; filename: string }> => {
    const res = await apiClient.get(`/admin/import/templates/${type}`, { responseType: 'blob' })
    const ct = String(res.headers['content-type'] ?? '')
    if (ct.includes('application/json') || ct.includes('text/plain')) {
      throw new Error(await readBlobErrorMessage(res.data as Blob))
    }
    const filename = parseContentDispositionFilename(
      res.headers['content-disposition'] as string | undefined,
      `modele-${type}.xlsx`,
    )
    return { blob: res.data as Blob, filename }
  },

  analyzeStudents: async (file: File, schoolId?: number): Promise<StudentImportAnalysis> => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await apiClient.post('/admin/import/analyze/students', fd, {
      params: schoolId ? { schoolId } : undefined,
      timeout: 180_000,
    })
    return r.data.data
  },

  getStatus: (jobId: string): Promise<ImportJobResult> =>
    apiClient.get(`/admin/import/${jobId}`).then((r) => r.data.data),

  preview: async (
    type: ImportType,
    file: File,
    schoolId?: number,
  ): Promise<{
    valid: number
    errors: { row: number; field?: string; message: string; code?: string }[]
    skippedExamples?: number
    totalRows?: number
  }> => {
    const fd = new FormData()
    fd.append('file', file)
    const r = await apiClient.post(`/admin/import/preview/${type}`, fd, {
      params: schoolId ? { schoolId } : undefined,
      timeout: 120_000,
    })
    return r.data.data
  },
}
