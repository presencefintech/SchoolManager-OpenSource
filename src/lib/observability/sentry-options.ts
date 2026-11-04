/** Options Sentry partagées (client / server / edge) — DSN optionnel = no-op. */

export type SentryRuntime = 'client' | 'server' | 'edge'

export function resolveSentryDsn(runtime: SentryRuntime): string | undefined {
  if (runtime === 'client') {
    return process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() || undefined
  }
  return (
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    undefined
  )
}

export function buildSentryInitOptions(runtime: SentryRuntime) {
  const dsn = resolveSentryDsn(runtime)
  const environment =
    (runtime === 'client'
      ? process.env.NEXT_PUBLIC_SENTRY_ENVIRONMENT
      : process.env.SENTRY_ENVIRONMENT) ||
    process.env.NODE_ENV ||
    'development'

  const tracesEnv =
    runtime === 'client'
      ? process.env.NEXT_PUBLIC_SENTRY_TRACES_SAMPLE_RATE
      : process.env.SENTRY_TRACES_SAMPLE_RATE

  const tracesSampleRate =
    runtime === 'edge' ? 0 : Number.parseFloat(tracesEnv || '0.05') || 0.05

  return {
    dsn,
    enabled: Boolean(dsn),
    environment,
    tracesSampleRate,
    sendDefaultPii: false as const,
  }
}
