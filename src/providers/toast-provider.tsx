'use client'

import { createContext, useCallback, useContext, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react'
import { cn } from '@/lib/utils'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toast: (opts: { type?: ToastType; title: string; message?: string }) => void
  success: (title: string, message?: string) => void
  error: (title: string, message?: string) => void
  info: (title: string, message?: string) => void
  warning: (title: string, message?: string) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const icons = { success: CheckCircle2, error: AlertCircle, info: Info, warning: AlertTriangle }
const styles = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  error: 'border-red-200 bg-red-50 text-red-900',
  info: 'border-blue-200 bg-blue-50 text-blue-900',
  warning: 'border-amber-200 bg-amber-50 text-amber-900',
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([])

  const dismiss = useCallback((id: string) => {
    setItems((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const push = useCallback((opts: { type?: ToastType; title: string; message?: string }) => {
    const id = `${Date.now()}-${Math.random()}`
    setItems((prev) => [...prev.slice(-4), { id, type: opts.type ?? 'info', title: opts.title, message: opts.message }])
    setTimeout(() => dismiss(id), 4500)
  }, [dismiss])

  const value: ToastContextValue = {
    toast: push,
    success: (title, message) => push({ type: 'success', title, message }),
    error: (title, message) => push({ type: 'error', title, message }),
    info: (title, message) => push({ type: 'info', title, message }),
    warning: (title, message) => push({ type: 'warning', title, message }),
  }

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm pointer-events-none">
        <AnimatePresence>
          {items.map((t) => {
            const Icon = icons[t.type]
            return (
              <motion.div
                key={t.id}
                initial={{ opacity: 0, y: 12, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 20 }}
                className={cn('pointer-events-auto rounded-xl border shadow-lg px-4 py-3 pr-9 relative', styles[t.type])}
              >
                <div className="flex gap-2">
                  <Icon size={16} className="flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold">{t.title}</p>
                    {t.message && <p className="text-xs opacity-80 mt-0.5">{t.message}</p>}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => dismiss(t.id)}
                  className="absolute top-2 right-2 p-1 rounded-md opacity-60 hover:opacity-100"
                >
                  <X size={12} />
                </button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}
