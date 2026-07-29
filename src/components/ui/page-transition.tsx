'use client'

/**
 * Instant navigation shell — no exit-wait animation.
 * Previous AnimatePresence mode="wait" added ~220ms lag on every click.
 */
export function PageTransition({ children }: { children: React.ReactNode }) {
  return <div className="min-h-0">{children}</div>
}
