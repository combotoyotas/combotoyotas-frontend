'use client'

import type { ReactNode } from 'react'

type Accent = 'emerald' | 'green' | 'blue' | 'orange'

const ACCENT: Record<
  Accent,
  { bar: string; iconBg: string; iconText: string; ring: string; activeBg: string; activeBorder: string }
> = {
  emerald: {
    bar: 'border-l-emerald-400',
    iconBg: 'bg-emerald-50',
    iconText: 'text-emerald-600',
    ring: 'ring-emerald-400',
    activeBg: 'bg-emerald-50',
    activeBorder: 'border-emerald-300',
  },
  green: {
    bar: 'border-l-green-600',
    iconBg: 'bg-green-50',
    iconText: 'text-green-700',
    ring: 'ring-green-500',
    activeBg: 'bg-green-50',
    activeBorder: 'border-green-300',
  },
  blue: {
    bar: 'border-l-blue-500',
    iconBg: 'bg-blue-50',
    iconText: 'text-blue-600',
    ring: 'ring-blue-500',
    activeBg: 'bg-blue-50',
    activeBorder: 'border-blue-300',
  },
  orange: {
    bar: 'border-l-orange-400',
    iconBg: 'bg-orange-50',
    iconText: 'text-orange-500',
    ring: 'ring-orange-400',
    activeBg: 'bg-orange-50',
    activeBorder: 'border-orange-300',
  },
}

type Props = {
  label: string
  count: number
  active: boolean
  onClick: () => void
  accent: Accent
  icon: ReactNode
}

export default function BoletaFiltroStatCard({ label, count, active, onClick, accent, icon }: Props) {
  const a = ACCENT[accent]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`bg-white rounded-xl shadow-sm border border-l-4 ${a.bar} text-left w-full min-w-0 transition-all active:scale-[0.99] p-2.5 sm:p-4 ${
        active
          ? `ring-2 ${a.ring} ${a.activeBg} ${a.activeBorder}`
          : 'border-slate-200 hover:shadow-md hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div
          className={`shrink-0 rounded-lg p-1.5 sm:p-2.5 ${a.iconBg} ${a.iconText} [&_svg]:w-5 [&_svg]:h-5 sm:[&_svg]:w-6 sm:[&_svg]:h-6`}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1 overflow-hidden">
          <p
            className="text-[11px] sm:text-sm font-semibold text-slate-800 leading-tight truncate"
            title={label}
          >
            {label}
          </p>
          <p className="text-base sm:text-xl lg:text-2xl font-bold text-slate-900 tabular-nums leading-none mt-1 truncate">
            {count.toLocaleString('es-CO')}
          </p>
        </div>
      </div>
    </button>
  )
}
