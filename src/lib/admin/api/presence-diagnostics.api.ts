import axios from 'axios'
import { apiClient, getApiErrorMessage } from '@/lib/api/client'

export type DiagnosticCheck = {
  key: 'health' | 'health-auth' | 'health-context'
  label: string
  hint: string
  ok: boolean
  httpStatus: number | null
  latencyMs: number
  message: string | null
  details: Record<string, unknown> | null
}

const CHECKS: { key: DiagnosticCheck['key']; label: string; hint: string }[] = [
  { key: 'health', label: 'Module présences', hint: 'Le service de pointage répond' },
  { key: 'health-auth', label: 'Authentification', hint: 'Votre session est reconnue par le module présences' },
  { key: 'health-context', label: 'Contexte école', hint: "L'école active est bien résolue pour vos requêtes" },
]

function asRecord(v: unknown): Record<string, unknown> | null {
  return typeof v === 'object' && v !== null && !Array.isArray(v) ? (v as Record<string, unknown>) : null
}

async function runCheck(def: (typeof CHECKS)[number]): Promise<DiagnosticCheck> {
  const started = performance.now()
  try {
    const r = await apiClient.get(`/admin/presences/${def.key}`, { timeout: 15_000 })
    const body = asRecord(r.data)
    const data = asRecord(body?.data) ?? (body && !('success' in body) ? body : null)
    return {
      ...def,
      ok: body?.success !== false,
      httpStatus: r.status,
      latencyMs: Math.round(performance.now() - started),
      message: typeof body?.message === 'string' ? body.message : null,
      details: data,
    }
  } catch (err) {
    return {
      ...def,
      ok: false,
      httpStatus: axios.isAxiosError(err) ? err.response?.status ?? null : null,
      latencyMs: Math.round(performance.now() - started),
      message: getApiErrorMessage(err),
      details: null,
    }
  }
}

/** Lance les 3 sondes en parallèle — ne rejette jamais (chaque échec est un résultat). */
export const presenceDiagnosticsApi = {
  runAll: () => Promise.all(CHECKS.map(runCheck)),
}
