"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

// body直下に描画し、ページ遷移時のtransformやスクロールの影響を避ける。
export default function FixedOverlay({ children, className = "" }) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])
  if (!mounted) return null
  return createPortal(
    <div className={className} role="dialog" aria-modal="true">{children}</div>,
    document.body
  )
}
