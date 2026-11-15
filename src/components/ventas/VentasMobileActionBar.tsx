'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type VentasMobileAction = {
  id: string
  label: ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral'
}

const variantClass: Record<NonNullable<VentasMobileAction['variant']>, string> = {
  primary: 'bg-blue-600 hover:bg-blue-700 border-blue-500/40 shadow-blue-900/30 text-white',
  success: 'bg-green-600 hover:bg-green-700 border-green-500/40 shadow-green-900/30 text-white',
  warning: 'bg-yellow-600 hover:bg-yellow-700 border-yellow-500/40 shadow-yellow-900/20 text-white',
  danger: 'bg-red-600 hover:bg-red-700 border-red-500/40 shadow-red-900/30 text-white',
  neutral: 'bg-slate-700 hover:bg-slate-800 border-slate-600/40 shadow-slate-900/30 text-white',
}

type Props = {
  visible: boolean
  actions: VentasMobileAction[]
  /** Etiqueta de región para lectores de pantalla */
  ariaLabel?: string
  /** Una columna (acciones apiladas) */
  layout?: 'auto' | 'stack'
  /** Botones más compactos (un solo CTA) */
  compact?: boolean
}

export default function VentasMobileActionBar({
  visible,
  actions,
  ariaLabel = 'Acciones de venta',
  layout = 'auto',
  compact = false,
}: Props) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted || !visible || !actions.length || typeof document === 'undefined') {
    return null
  }

  return createPortal(
    <div
      className="lg:hidden fixed inset-x-0 z-[45] px-3 safe-pad-x pointer-events-none"
      style={{
        bottom: 'calc(var(--tabbar-h) + var(--sab) + 0.5rem)',
      }}
      role="region"
      aria-label={ariaLabel}
    >
      <div
        className={`pointer-events-auto max-w-7xl mx-auto grid gap-2 ${
          layout === 'stack' || actions.length === 1
            ? 'grid-cols-1'
            : 'grid-cols-2'
        }`}
      >
        {actions.map((action) => {
          const variant = action.variant ?? 'primary'
          return (
            <button
              key={action.id}
              type="button"
              onClick={action.onClick}
              disabled={action.disabled}
              className={`${compact ? 'min-h-[46px] py-2.5 text-sm shadow-lg' : 'min-h-[52px] py-3 text-sm sm:text-base shadow-xl'} px-3 rounded-xl font-semibold transition-all active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed border flex items-center justify-center text-center gap-1.5 ${variantClass[variant]}`}
            >
              {action.label}
            </button>
          )
        })}
      </div>
    </div>,
    document.body
  )
}