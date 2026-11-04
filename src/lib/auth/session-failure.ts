const AUTH_SESSION_CODES = new Set([
  'AUTH_REQUIRED',
  'UNAUTHORIZED',
  'SESSION_EXPIRED',
  'TOKEN_EXPIRED',
])

/** 401/403 qui signifient vraiment « session morte » — pas un 401 métier (école, etc.). */
export function isAuthSessionFailure(data: unknown, status?: number): boolean {
  if (status != null && status !== 401) return false
  if (!data || typeof data !== 'object') {
    // 401 sans corps : on tente un refresh, mais ce n’est pas forcément une session morte
    return status === 401
  }
  const record = data as Record<string, unknown>
  const code = typeof record.code === 'string' ? record.code : undefined
  if (code) return AUTH_SESSION_CODES.has(code)
  const message = typeof record.message === 'string' ? record.message : ''
  return /session expir/i.test(message)
}
