'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'
import { Camera, CameraOff, FlipHorizontal2, Flashlight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

type CameraScanFieldProps = {
  /** Appelé avec le texte lu (QR / code-barres). Même contrat que `HardwareScanField`. */
  onScan: (payload: string) => void | Promise<void>
  /** Caméra active uniquement quand `true` (onglet affiché). */
  enabled?: boolean
  /** Délai minimal avant de reprendre un même code (ms). */
  repeatDelayMs?: number
  /** Pause après chaque lecture réussie (ms) pour laisser le retour visuel s'afficher. */
  cooldownMs?: number
  className?: string
}

type DetectedBarcode = { rawValue: string }
type BarcodeDetectorLike = { detect: (source: CanvasImageSource) => Promise<DetectedBarcode[]> }
type BarcodeDetectorCtor = new (opts?: { formats?: string[] }) => BarcodeDetectorLike & object
type TorchCapabilities = MediaTrackCapabilities & { torch?: boolean }
type TorchConstraints = MediaTrackConstraintSet & { torch?: boolean }

const FORMATS = ['qr_code', 'code_128', 'code_39', 'ean_13', 'ean_8', 'data_matrix']
const SCAN_INTERVAL_MS = 90
const MAX_DECODE_WIDTH = 720

type Status = 'idle' | 'starting' | 'live' | 'error'

function describeError(err: unknown): string {
  const name = (err as { name?: string })?.name
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return 'La caméra exige une connexion sécurisée (HTTPS).'
  }
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Accès à la caméra refusé. Autorisez-la dans les réglages du navigateur puis réessayez.'
  }
  if (name === 'NotFoundError' || name === 'OverconstrainedError') {
    return 'Aucune caméra disponible sur cet appareil.'
  }
  if (name === 'NotReadableError') {
    return 'La caméra est utilisée par une autre application.'
  }
  return 'Impossible de démarrer la caméra.'
}

/**
 * Scanner caméra (QR / code-barres) — alternative à la douchette.
 * `BarcodeDetector` natif quand il existe (Chrome, Android), sinon repli `jsQR` (Safari / iOS, QR uniquement).
 */
export function CameraScanField({
  onScan,
  enabled = true,
  repeatDelayMs = 3000,
  cooldownMs = 1200,
  className,
}: CameraScanFieldProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const detectorRef = useRef<BarcodeDetectorLike | null>(null)
  const onScanRef = useRef(onScan)
  const lastRef = useRef<{ value: string; at: number }>({ value: '', at: 0 })
  const pausedUntilRef = useRef(0)

  const [status, setStatus] = useState<Status>('idle')
  const [error, setError] = useState<string | null>(null)
  const [facing, setFacing] = useState<'environment' | 'user'>('environment')
  const [canSwitch, setCanSwitch] = useState(false)
  const [torchSupported, setTorchSupported] = useState(false)
  const [torchOn, setTorchOn] = useState(false)
  const [lastRead, setLastRead] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    onScanRef.current = onScan
  }, [onScan])

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    if (videoRef.current) videoRef.current.srcObject = null
    setTorchOn(false)
    setTorchSupported(false)
    setStatus('idle')
  }, [])

  // Démarrage / arrêt de la caméra
  useEffect(() => {
    if (!enabled) return
    let cancelled = false

    async function start() {
      setStatus('starting')
      setError(null)
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw Object.assign(new Error('unsupported'), { name: 'NotFoundError' })
        }
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: facing }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => undefined)
        }

        const track = stream.getVideoTracks()[0]
        const caps = (track?.getCapabilities?.() ?? {}) as TorchCapabilities
        setTorchSupported(Boolean(caps.torch))
        const devices = await navigator.mediaDevices.enumerateDevices().catch(() => [])
        setCanSwitch(devices.filter((d) => d.kind === 'videoinput').length > 1)

        const Detector = (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor }).BarcodeDetector
        detectorRef.current = Detector ? new Detector({ formats: FORMATS }) : null
        setStatus('live')
      } catch (err) {
        if (cancelled) return
        setError(describeError(err))
        setStatus('error')
      }
    }

    void start()
    return () => {
      cancelled = true
      stop()
    }
  }, [enabled, facing, attempt, stop])

  // Coupe la caméra quand l'onglet passe en arrière-plan
  useEffect(() => {
    if (!enabled) return
    const onHide = () => {
      if (document.visibilityState === 'hidden') stop()
    }
    document.addEventListener('visibilitychange', onHide)
    return () => document.removeEventListener('visibilitychange', onHide)
  }, [enabled, stop])

  // Boucle de lecture
  useEffect(() => {
    if (status !== 'live') return
    let timer: number | undefined
    let stopped = false
    let busy = false

    const handleValue = (raw: string) => {
      const value = raw.trim()
      if (!value) return
      const now = Date.now()
      if (now < pausedUntilRef.current) return
      if (value === lastRef.current.value && now - lastRef.current.at < repeatDelayMs) return
      lastRef.current = { value, at: now }
      pausedUntilRef.current = now + cooldownMs
      setLastRead(value)
      navigator.vibrate?.(60)
      void Promise.resolve(onScanRef.current(value)).catch(() => undefined)
    }

    const tick = async () => {
      if (stopped) return
      const video = videoRef.current
      if (!busy && video && video.readyState >= 2 && video.videoWidth > 0) {
        busy = true
        try {
          if (detectorRef.current) {
            const codes = await detectorRef.current.detect(video)
            if (codes[0]?.rawValue) handleValue(codes[0].rawValue)
          } else {
            const scale = Math.min(1, MAX_DECODE_WIDTH / video.videoWidth)
            const w = Math.round(video.videoWidth * scale)
            const h = Math.round(video.videoHeight * scale)
            const canvas = (canvasRef.current ??= document.createElement('canvas'))
            canvas.width = w
            canvas.height = h
            const ctx = canvas.getContext('2d', { willReadFrequently: true })
            if (ctx) {
              ctx.drawImage(video, 0, 0, w, h)
              const img = ctx.getImageData(0, 0, w, h)
              const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' })
              if (code?.data) handleValue(code.data)
            }
          }
        } catch {
          /* image illisible : on réessaie au prochain cycle */
        } finally {
          busy = false
        }
      }
      timer = window.setTimeout(() => void tick(), SCAN_INTERVAL_MS)
    }

    void tick()
    return () => {
      stopped = true
      if (timer) window.clearTimeout(timer)
    }
  }, [status, repeatDelayMs, cooldownMs])

  const toggleTorch = useCallback(async () => {
    const track = streamRef.current?.getVideoTracks()[0]
    if (!track) return
    const next = !torchOn
    try {
      await track.applyConstraints({ advanced: [{ torch: next } as TorchConstraints] })
      setTorchOn(next)
    } catch {
      setTorchSupported(false)
    }
  }, [torchOn])

  return (
    <div className={cn('space-y-3', className)}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-black">
        <video
          ref={videoRef}
          playsInline
          muted
          autoPlay
          aria-label="Aperçu de la caméra"
          className={cn('h-full w-full object-cover', facing === 'user' && '-scale-x-100')}
        />

        {status === 'live' && (
          <div aria-hidden className="pointer-events-none absolute inset-0 flex items-center justify-center">
            <div className="relative h-3/5 w-3/5 max-w-[320px] rounded-2xl border-2 border-white/80 shadow-[0_0_0_9999px_rgba(0,0,0,0.35)]">
              <span className="absolute inset-x-2 top-1/2 h-0.5 animate-pulse bg-teal-400/90" />
            </div>
          </div>
        )}

        {status === 'starting' && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-sm text-white">
            <Loader2 className="h-4 w-4 animate-spin" /> Démarrage de la caméra…
          </div>
        )}

        {(status === 'error' || status === 'idle') && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center text-white">
            <CameraOff className="h-8 w-8 opacity-80" />
            <p role={status === 'error' ? 'alert' : undefined} className="text-sm">
              {error ?? 'Caméra arrêtée.'}
            </p>
            {enabled && (
              <button
                type="button"
                onClick={() => setAttempt((n) => n + 1)}
                className="rounded-lg bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur hover:bg-white/25"
              >
                {status === 'error' ? 'Réessayer' : 'Relancer la caméra'}
              </button>
            )}
          </div>
        )}

        {status === 'live' && (
          <div className="absolute right-2 top-2 flex gap-2">
            {torchSupported && (
              <button
                type="button"
                onClick={() => void toggleTorch()}
                aria-label={torchOn ? 'Éteindre la lampe' : 'Allumer la lampe'}
                aria-pressed={torchOn}
                className={cn(
                  'rounded-full p-2 text-white backdrop-blur',
                  torchOn ? 'bg-amber-500/90' : 'bg-black/50',
                )}
              >
                <Flashlight className="h-4 w-4" />
              </button>
            )}
            {canSwitch && (
              <button
                type="button"
                onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
                aria-label="Changer de caméra"
                className="rounded-full bg-black/50 p-2 text-white backdrop-blur"
              >
                <FlipHorizontal2 className="h-4 w-4" />
              </button>
            )}
          </div>
        )}
      </div>

      <p className="flex items-center gap-2 text-xs text-slate-500" aria-live="polite">
        <Camera className="h-3.5 w-3.5 shrink-0" />
        {status === 'live'
          ? lastRead
            ? `Dernier code lu : ${lastRead.length > 28 ? `${lastRead.slice(0, 28)}…` : lastRead}`
            : 'Présentez le QR code de la carte dans le cadre.'
          : 'La caméra ne s’active que dans cet onglet.'}
      </p>
    </div>
  )
}
