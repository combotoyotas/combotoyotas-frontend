'use client'

import { formatOfflineSavedAt } from '@/lib/boletasOfflineStore'

type Props = {
  savedAt: number | null
  onRetry?: () => void
  retrying?: boolean
}

export default function OfflineBoletasBanner({ savedAt, onRetry, retrying }: Props) {
  const cuando = savedAt != null ? formatOfflineSavedAt(savedAt) : 'desconocida'

  return (
    <div
      className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-950 shadow-sm"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div className="flex items-start gap-2">
          <svg
            className="w-5 h-5 shrink-0 text-amber-700 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M18.364 5.636a9 9 0 010 12.728m0 0l-2.829-2.829m2.829 2.829L21 21M15.536 8.464a5 5 0 010 7.072m0 0l-2.829-2.829m-4.243 2.829a5 5 0 010-7.072m0 0L3 3m12.728 2.636L3 21"
            />
          </svg>
          <div>
            <p className="font-semibold">Modo sin conexión — solo consulta</p>
            <p className="text-xs sm:text-sm text-amber-900/90 mt-0.5">
              Inventario guardado el {cuando}. Puede no coincidir con el servidor hasta que vuelva
              internet.
            </p>
          </div>
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={retrying || (typeof navigator !== 'undefined' && !navigator.onLine)}
            className="shrink-0 min-h-[40px] px-4 rounded-lg bg-amber-800 text-white text-sm font-semibold hover:bg-amber-900 disabled:opacity-50"
          >
            {retrying ? 'Actualizando…' : 'Reintentar'}
          </button>
        )}
      </div>
    </div>
  )
}