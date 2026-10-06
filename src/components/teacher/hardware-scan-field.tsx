'use client'

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  type KeyboardEvent,
} from 'react'
import { ScanBarcode } from 'lucide-react'
import { cn } from '@/lib/utils'

export type HardwareScanFieldHandle = {
  focus: () => void
  clear: () => void
}

type HardwareScanFieldProps = {
  onScan: (payload: string) => void | Promise<void>
  enabled?: boolean
  busy?: boolean
  discrete?: boolean
  autofocus?: boolean
  hintText?: string
  helperText?: string
  className?: string
}

/**
 * Champ HID (douchette / RFID / clavier wedge).
 * Enter = fin de scan → callback + vidage + re-focus.
 */
export const HardwareScanField = forwardRef<HardwareScanFieldHandle, HardwareScanFieldProps>(
  function HardwareScanField(
    {
      onScan,
      enabled = true,
      busy = false,
      discrete = false,
      autofocus = true,
      hintText = 'Scannez un badge ou un code-barres…',
      helperText =
        'Mode douchette : le focus reste ici. La validation part automatiquement à Entrée.',
      className,
    },
    ref,
  ) {
    const inputRef = useRef<HTMLInputElement>(null)

    const focusInput = useCallback(() => {
      if (!enabled) return
      const el = inputRef.current
      if (!el) return
      el.focus({ preventScroll: true })
    }, [enabled])

    useImperativeHandle(
      ref,
      () => ({
        focus: focusInput,
        clear: () => {
          if (inputRef.current) inputRef.current.value = ''
        },
      }),
      [focusInput],
    )

    useEffect(() => {
      if (autofocus && enabled) {
        const id = window.setTimeout(focusInput, 40)
        return () => window.clearTimeout(id)
      }
    }, [autofocus, enabled, focusInput])

    useEffect(() => {
      if (!enabled) return
      const onVisibility = () => {
        if (document.visibilityState === 'visible') focusInput()
      }
      window.addEventListener('focus', focusInput)
      document.addEventListener('visibilitychange', onVisibility)
      return () => {
        window.removeEventListener('focus', focusInput)
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }, [enabled, focusInput])

    const flush = useCallback(async () => {
      if (!enabled) return
      const el = inputRef.current
      if (!el) return
      const payload = el.value.trim()
      el.value = ''
      focusInput()
      if (!payload) return

      try {
        await onScan(payload)
      } finally {
        focusInput()
      }
    }, [enabled, focusInput, onScan])

    const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault()
        void flush()
      }
    }

    if (discrete) {
      return (
        <input
          ref={inputRef}
          type="text"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          disabled={!enabled}
          aria-label="Lecteur matériel"
          className="pointer-events-auto fixed left-0 top-0 h-px w-px opacity-[0.01]"
          onKeyDown={onKeyDown}
          onBlur={() => {
            if (enabled) window.setTimeout(focusInput, 30)
          }}
        />
      )
    }

    return (
      <div className={cn('space-y-1.5', className)}>
        <label className="flex items-center gap-2 text-sm font-medium text-slate-700 dark:text-slate-200">
          <ScanBarcode className="h-4 w-4 text-teal-600" />
          Lecteur matériel
        </label>
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            disabled={!enabled}
            placeholder={hintText}
            className={cn(
              'w-full rounded-xl border border-slate-200 bg-white px-3 py-3 pr-12 text-base outline-none ring-teal-500/30 focus:ring-2 dark:border-slate-700 dark:bg-slate-950',
              busy && 'opacity-90',
            )}
            onKeyDown={onKeyDown}
            onBlur={() => {
              if (enabled) window.setTimeout(focusInput, 30)
            }}
          />
          {busy ? (
            <span className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border-2 border-teal-600 border-t-transparent" />
          ) : (
            <button
              type="button"
              onClick={() => void flush()}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg px-2 py-1 text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Valider (Entrée)"
            >
              ↵
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500">{helperText}</p>
      </div>
    )
  },
)
