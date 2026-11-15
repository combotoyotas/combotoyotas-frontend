'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

type Props = {
  open: boolean
  children: ReactNode
  zIndex?: number
  onBackdropClick?: () => void
}

/**
 * Modal centrado en el viewport (portal en body).
 * Evita que position:fixed quede anclado al scroll del carrito en móvil.
 */
export default function VentasCenteredOverlay({
  open,
  children,
  zIndex = 70,
  onBackdropClick,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open])

  if (!open || !mounted || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-3 sm:p-4 bg-black/55"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackdropClick?.()
      }}
    >
      {children}
    </div>,
    document.body
  )
}