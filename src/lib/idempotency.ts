/** Clé d'idempotence client (UUID) — anti-doublon sur retry réseau. */
export function newIdempotencyKey(prefix = 'idemp'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`
}

export function idempotencyHeaders(key?: string): Record<string, string> | undefined {
  const trimmed = key?.trim()
  if (!trimmed || trimmed.length < 8) return undefined
  return {
    'Idempotency-Key': trimmed,
    'X-Idempotency-Key': trimmed,
  }
}
