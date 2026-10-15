'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera, FlipHorizontal2, RefreshCw, SwitchCamera, X, Check, ShieldAlert } from 'lucide-react'
import { cn } from '@/lib/utils'

const TARGET_SIZE = 400
/** Qualité JPEG — ~40–120 Ko typique pour 400×400 (safe upload multipart). */
const JPEG_QUALITY = 0.82
/** Plafond client avant envoi (backend Cloudinary / multer). */
const MAX_BLOB_BYTES = 450 * 1024

type Props = {
  open: boolean
  onClose: () => void
  /** Called with a JPEG File (400×400) after confirm. */
  onCapture: (file: File) => void
  title?: string
}

type Facing = 'user' | 'environment'

function stopStream(stream: MediaStream | null) {
  stream?.getTracks().forEach((t) => t.stop())
}

function mapGetUserMediaError(err: unknown): { message: string; permissionDenied: boolean } {
  const name =
    err && typeof err === 'object' && 'name' in err
      ? String((err as { name?: string }).name)
      : ''
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return {
      permissionDenied: true,
      message:
        'Accès caméra refusé. Autorisez la caméra dans les paramètres du navigateur (icône cadenas / caméra dans la barre d’adresse), puis cliquez « Réessayer ».',
    }
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return {
      permissionDenied: false,
      message: 'Aucune caméra détectée. Branchez une webcam USB ou utilisez un appareil avec caméra.',
    }
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return {
      permissionDenied: false,
      message: 'Caméra déjà utilisée par une autre application. Fermez Zoom/Teams puis réessayez.',
    }
  }
  if (name === 'OverconstrainedError') {
    return {
      permissionDenied: false,
      message: 'Cette caméra ne supporte pas les contraintes demandées. Essayez « Basculer ».',
    }
  }
  if (typeof window !== 'undefined' && !window.isSecureContext) {
    return {
      permissionDenied: false,
      message: 'La webcam nécessite HTTPS (ou localhost). Ouvrez l’app en contexte sécurisé.',
    }
  }
  return {
    permissionDenied: false,
    message: 'Caméra inaccessible. Autorisez l’accès navigateur ou branchez une webcam USB.',
  }
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/jpeg', quality)
  })
}

/**
 * Capture webcam WebRTC — aperçu live, bascule caméra, crop carré 400×400 JPEG léger.
 */
export function StudentPhotoCapture({
  open,
  onClose,
  onCapture,
  title = 'Photo élève',
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [facing, setFacing] = useState<Facing>('user')
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null)
  const [busy, setBusy] = useState(false)
  const [captureHint, setCaptureHint] = useState<string | null>(null)

  const startCamera = useCallback(async (opts?: { facing?: Facing; deviceId?: string | null }) => {
    setError(null)
    setPermissionDenied(false)
    setCaptureHint(null)
    setBusy(true)
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Ce navigateur ne supporte pas la capture webcam.')
        return
      }

      stopStream(streamRef.current)
      streamRef.current = null

      const constraints: MediaStreamConstraints = {
        audio: false,
        video: opts?.deviceId
          ? { deviceId: { exact: opts.deviceId }, width: { ideal: 1280 }, height: { ideal: 960 } }
          : {
              facingMode: opts?.facing ?? facing,
              width: { ideal: 1280 },
              height: { ideal: 960 },
            },
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play().catch(() => undefined)
      }

      const list = await navigator.mediaDevices.enumerateDevices()
      setDevices(list.filter((d) => d.kind === 'videoinput'))
    } catch (err) {
      const mapped = mapGetUserMediaError(err)
      setPermissionDenied(mapped.permissionDenied)
      setError(mapped.message)
    } finally {
      setBusy(false)
    }
  }, [facing])

  useEffect(() => {
    if (!open) {
      stopStream(streamRef.current)
      streamRef.current = null
      setPreviewUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })
      setPreviewBlob(null)
      setError(null)
      setPermissionDenied(false)
      return
    }
    void startCamera({ facing, deviceId })
    return () => {
      stopStream(streamRef.current)
      streamRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- remount on open only
  }, [open])

  useEffect(() => {
    return () => {
      stopStream(streamRef.current)
    }
  }, [])

  const drawSquareCrop = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return false

    const vw = video.videoWidth || 0
    const vh = video.videoHeight || 0
    if (vw < 16 || vh < 16) {
      setCaptureHint('Flux vidéo pas encore prêt — patientez une seconde.')
      return false
    }

    const side = Math.min(vw, vh)
    const sx = (vw - side) / 2
    const sy = (vh - side) / 2

    canvas.width = TARGET_SIZE
    canvas.height = TARGET_SIZE
    const ctx = canvas.getContext('2d')
    if (!ctx) return false

    // Miroir horizontal si caméra frontale (aligné avec l’aperçu CSS)
    if (facing === 'user') {
      ctx.translate(TARGET_SIZE, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, sx, sy, side, side, 0, 0, TARGET_SIZE, TARGET_SIZE)
    ctx.setTransform(1, 0, 0, 1, 0, 0)
    return true
  }, [facing])

  const takeSnapshot = useCallback(async () => {
    setCaptureHint(null)
    if (!drawSquareCrop()) return
    const canvas = canvasRef.current
    if (!canvas) return

    let quality = JPEG_QUALITY
    let blob = await canvasToJpegBlob(canvas, quality)
    if (!blob) {
      setCaptureHint('Échec capture — réessayez.')
      return
    }
    // Réduit si overflow (rare sur 400×400)
    while (blob.size > MAX_BLOB_BYTES && quality > 0.5) {
      quality -= 0.1
      blob = (await canvasToJpegBlob(canvas, quality)) ?? blob
    }
    if (blob.size > MAX_BLOB_BYTES) {
      setCaptureHint('Photo trop lourde après compression. Reprenez avec moins de lumière.')
      return
    }

    const url = URL.createObjectURL(blob)
    setPreviewBlob(blob)
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return url
    })
  }, [drawSquareCrop])

  const confirm = useCallback(() => {
    if (!previewBlob) return
    if (previewBlob.size > MAX_BLOB_BYTES) {
      setCaptureHint('Fichier trop volumineux pour l’upload.')
      return
    }
    const file = new File([previewBlob], `student-photo-${Date.now()}.jpg`, {
      type: 'image/jpeg',
    })
    onCapture(file)
    onClose()
  }, [previewBlob, onCapture, onClose])

  const retake = useCallback(() => {
    setPreviewUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setPreviewBlob(null)
    setCaptureHint(null)
  }, [])

  const switchFacing = useCallback(() => {
    const next: Facing = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    setDeviceId(null)
    void startCamera({ facing: next, deviceId: null })
  }, [facing, startCamera])

  const selectDevice = useCallback(
    (id: string) => {
      setDeviceId(id)
      void startCamera({ deviceId: id })
    },
    [startCamera],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4">
      <div
        role="dialog"
        aria-modal
        aria-label={title}
        className="w-full max-w-lg rounded-2xl bg-white shadow-xl border border-zinc-200 overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-100">
          <div className="flex items-center gap-2">
            <Camera size={16} className="text-emerald-600" />
            <h2 className="text-sm font-semibold text-zinc-900">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:bg-zinc-100 hover:text-zinc-600"
            aria-label="Fermer"
          >
            <X size={16} />
          </button>
        </div>

        <div className="p-4 space-y-3">
          <div
            className="relative aspect-square w-full max-w-[400px] mx-auto overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-200"
            style={{ minHeight: 200 }}
          >
            {previewUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={previewUrl}
                alt="Aperçu 400×400"
                className="absolute inset-0 h-full w-full object-cover"
                width={TARGET_SIZE}
                height={TARGET_SIZE}
              />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={cn(
                  'absolute inset-0 h-full w-full object-cover',
                  facing === 'user' && 'scale-x-[-1]',
                )}
              />
            )}
            {busy && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-xs">
                Ouverture caméra…
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" width={TARGET_SIZE} height={TARGET_SIZE} />

          {error && (
            <div
              className={cn(
                'rounded-lg px-3 py-2.5 text-xs space-y-2',
                permissionDenied ? 'bg-amber-50 text-amber-900 border border-amber-200' : 'bg-red-50 text-red-700',
              )}
            >
              <p className="flex items-start gap-2">
                {permissionDenied ? <ShieldAlert size={14} className="shrink-0 mt-0.5" /> : null}
                <span>{error}</span>
              </p>
              <button
                type="button"
                onClick={() => void startCamera({ facing, deviceId })}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-current/20 text-[11px] font-medium hover:bg-white/50"
              >
                <RefreshCw size={11} />
                Réessayer
              </button>
            </div>
          )}

          {captureHint && (
            <p className="text-xs text-amber-800 bg-amber-50 rounded-lg px-3 py-2">{captureHint}</p>
          )}

          {devices.length > 1 && !previewUrl && !error && (
            <label className="block text-xs text-zinc-600">
              Caméra
              <select
                className="mt-1 w-full rounded-lg border border-zinc-200 px-2 py-1.5 text-sm"
                value={deviceId ?? ''}
                onChange={(e) => selectDevice(e.target.value)}
              >
                <option value="">Auto ({facing === 'user' ? 'avant' : 'arrière'})</option>
                {devices.map((d, i) => (
                  <option key={d.deviceId} value={d.deviceId}>
                    {d.label || `Caméra ${i + 1}`}
                  </option>
                ))}
              </select>
            </label>
          )}

          <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
            {!previewUrl ? (
              <>
                <button
                  type="button"
                  onClick={switchFacing}
                  disabled={!!error && permissionDenied}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50 disabled:opacity-40"
                >
                  <SwitchCamera size={14} />
                  Basculer
                </button>
                <button
                  type="button"
                  onClick={() => void startCamera({ facing, deviceId })}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  <RefreshCw size={14} />
                  Relancer
                </button>
                <button
                  type="button"
                  disabled={!!error || busy}
                  onClick={() => void takeSnapshot()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700 disabled:opacity-50"
                >
                  <FlipHorizontal2 size={14} />
                  Capturer
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={retake}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-zinc-200 text-xs text-zinc-600 hover:bg-zinc-50"
                >
                  <RefreshCw size={14} />
                  Reprendre
                </button>
                <button
                  type="button"
                  onClick={confirm}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 text-xs font-medium text-white hover:bg-emerald-700"
                >
                  <Check size={14} />
                  Utiliser cette photo
                </button>
              </>
            )}
          </div>
          <p className="text-[10px] text-zinc-400 text-center">
            Cadre carré auto · JPEG {TARGET_SIZE}×{TARGET_SIZE}px · max {Math.round(MAX_BLOB_BYTES / 1024)} Ko
          </p>
        </div>
      </div>
    </div>
  )
}
