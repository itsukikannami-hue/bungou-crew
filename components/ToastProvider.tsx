'use client'

import {
  createContext, useCallback, useContext, useEffect, useMemo, useRef, useState,
  type ReactNode,
} from 'react'

type ToastKind = 'success' | 'error' | 'info'
type Toast = { id: number; message: string; kind: ToastKind }
type ToastApi = {
  showToast: (message: string, kind?: ToastKind) => void
  success: (message: string) => void
  error: (message: string) => void
  info: (message: string) => void
}

const ToastContext = createContext<ToastApi | null>(null)
const MAX_VISIBLE = 4

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>())

  const dismiss = useCallback((id: number) => {
    const timer = timers.current.get(id)
    if (timer !== undefined) clearTimeout(timer)
    timers.current.delete(id)
    setToasts(current => current.filter(toast => toast.id !== id))
  }, [])

  const showToast = useCallback((message: string, kind: ToastKind = 'info') => {
    const text = message.trim()
    if (!text) return

    const id = ++nextId.current
    setToasts(current => {
      const next = [...current, { id, message: text, kind }]
      const removed = next.slice(0, Math.max(0, next.length - MAX_VISIBLE))
      for (const toast of removed) {
        const timer = timers.current.get(toast.id)
        if (timer !== undefined) clearTimeout(timer)
        timers.current.delete(toast.id)
      }
      return next.slice(-MAX_VISIBLE)
    })

    timers.current.set(
      id,
      setTimeout(() => dismiss(id), kind === 'error' ? 6500 : 4000),
    )
  }, [dismiss])

  useEffect(() => {
    const activeTimers = timers.current
    return () => {
      activeTimers.forEach(timer => clearTimeout(timer))
      activeTimers.clear()
    }
  }, [])

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast])
  const error = useCallback((message: string) => showToast(message, 'error'), [showToast])
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast])
  const api = useMemo(() => ({ showToast, success, error, info }), [showToast, success, error, info])

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        aria-label="通知"
        style={{
          position: 'fixed', top: 20, right: 16, zIndex: 9999,
          display: 'grid', gap: 10, width: 'min(360px, calc(100vw - 32px))',
          pointerEvents: 'none',
        }}
      >
        {toasts.map(toast => (
          <div
            key={toast.id}
            role={toast.kind === 'error' ? 'alert' : 'status'}
            style={{
              pointerEvents: 'auto', display: 'flex', alignItems: 'flex-start', gap: 12,
              padding: '13px 14px', borderRadius: 12, background: '#fff', color: '#1f2937',
              borderLeft: `4px solid ${toast.kind === 'success' ? '#16a34a' : toast.kind === 'error' ? '#dc2626' : '#2563eb'}`,
              boxShadow: '0 8px 24px rgba(0,0,0,.16)', overflowWrap: 'anywhere',
            }}
          >
            <span style={{ flex: 1, fontSize: 14, lineHeight: 1.6 }}>{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              aria-label="通知を閉じる"
              style={{ background: 'transparent', border: 0, color: '#6b7280', cursor: 'pointer', fontSize: 20, lineHeight: 1 }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast(): ToastApi {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast は ToastProvider の内側で使用してください')
  return context
}
