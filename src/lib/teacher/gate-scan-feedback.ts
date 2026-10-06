import type { TeacherGateScanResult } from '@/lib/teacher/api/attendance.api'

/** Vert succès · Orange avertissement · Rouge alerte finance stricte. */
export type GateFeedbackTone = 'success' | 'warning' | 'alert'

export function resolveGateFeedbackTone(
  scan: Pick<
    TeacherGateScanResult,
    'alreadyPresent' | 'financeStatus' | 'financeDisplayed'
  > | null,
  options?: { error?: boolean },
): GateFeedbackTone {
  if (options?.error) return 'alert'
  if (!scan) return 'success'
  if (scan.financeDisplayed && scan.financeStatus === 'CRITICAL') return 'alert'
  if (
    scan.alreadyPresent ||
    (scan.financeDisplayed && scan.financeStatus === 'WARNING')
  ) {
    return 'warning'
  }
  return 'success'
}

export const GATE_TONE_CLASSES: Record<
  GateFeedbackTone,
  { flash: string; card: string; ring: string; label: string }
> = {
  success: {
    flash: 'bg-emerald-500/35',
    card: 'border-emerald-300 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40',
    ring: 'ring-emerald-400',
    label: 'text-emerald-800 dark:text-emerald-200',
  },
  warning: {
    flash: 'bg-amber-500/35',
    card: 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40',
    ring: 'ring-amber-400',
    label: 'text-amber-900 dark:text-amber-200',
  },
  alert: {
    flash: 'bg-rose-500/40',
    card: 'border-rose-400 bg-rose-50 dark:border-rose-800 dark:bg-rose-950/50',
    ring: 'ring-rose-500',
    label: 'text-rose-900 dark:text-rose-200',
  },
}

let audioCtx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctx) return null
  if (!audioCtx) audioCtx = new Ctx()
  return audioCtx
}

function beep(ctx: AudioContext, freq: number, start: number, duration: number, gain = 0.08) {
  const osc = ctx.createOscillator()
  const g = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.value = freq
  g.gain.value = gain
  osc.connect(g)
  g.connect(ctx.destination)
  osc.start(ctx.currentTime + start)
  g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + start + duration)
  osc.stop(ctx.currentTime + start + duration + 0.02)
}

/** Bip court succès · double bip alerte. */
export function playGateFeedbackTone(tone: GateFeedbackTone): void {
  const ctx = getCtx()
  if (!ctx) return
  void ctx.resume().catch(() => undefined)

  if (tone === 'success') {
    beep(ctx, 880, 0, 0.09)
    return
  }
  if (tone === 'warning') {
    beep(ctx, 660, 0, 0.08)
    beep(ctx, 520, 0.12, 0.1)
    return
  }
  // alert — double bip plus grave
  beep(ctx, 420, 0, 0.11, 0.1)
  beep(ctx, 360, 0.16, 0.14, 0.1)
}
