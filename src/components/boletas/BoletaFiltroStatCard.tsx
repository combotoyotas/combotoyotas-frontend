'use client'

type Accent = 'emerald' | 'green' | 'blue' | 'orange'

const ACCENT: Record<
  Accent,
  { inactive: string; active: string; activeRing: string; countActive: string; countInactive: string }
> = {
  emerald: {
    inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-300 hover:bg-emerald-50/60',
    active: 'border-emerald-500 bg-emerald-600 text-white shadow-md shadow-emerald-600/25',
    activeRing: 'ring-2 ring-emerald-400/50 ring-offset-1',
    countActive: 'text-white',
    countInactive: 'text-slate-900',
  },
  green: {
    inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-green-300 hover:bg-green-50/60',
    active: 'border-green-600 bg-green-600 text-white shadow-md shadow-green-600/25',
    activeRing: 'ring-2 ring-green-400/50 ring-offset-1',
    countActive: 'text-white',
    countInactive: 'text-slate-900',
  },
  blue: {
    inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-blue-300 hover:bg-blue-50/60',
    active: 'border-blue-600 bg-blue-600 text-white shadow-md shadow-blue-600/25',
    activeRing: 'ring-2 ring-blue-400/50 ring-offset-1',
    countActive: 'text-white',
    countInactive: 'text-slate-900',
  },
  orange: {
    inactive: 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-orange-50/60',
    active: 'border-orange-500 bg-orange-500 text-white shadow-md shadow-orange-500/25',
    activeRing: 'ring-2 ring-orange-400/50 ring-offset-1',
    countActive: 'text-white',
    countInactive: 'text-slate-900',
  },
}

type Props = {
  label: string
  count: number
  active: boolean
  onClick: () => void
  accent: Accent
}

/** Botón de filtro por estado (misma altura en la grilla, no tarjeta). */
export default function BoletaFiltroStatCard({ label, count, active, onClick, accent }: Props) {
  const a = ACCENT[accent]

  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`w-full min-h-[4.5rem] sm:min-h-[5rem] rounded-xl border-2 flex flex-col items-center justify-center gap-1 px-2 py-3 transition-all active:scale-[0.98] touch-manipulation ${
        active ? `${a.active} ${a.activeRing}` : a.inactive
      }`}
    >
      <span className={`text-[10px] sm:text-xs font-bold uppercase tracking-wider ${active ? 'text-white/90' : 'text-slate-500'}`}>
        {label}
      </span>
      <span
        className={`text-xl sm:text-2xl font-black tabular-nums leading-none ${active ? a.countActive : a.countInactive}`}
      >
        {count.toLocaleString('es-CO')}
      </span>
    </button>
  )
}