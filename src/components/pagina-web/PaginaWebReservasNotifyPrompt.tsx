'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { Bell, X } from 'lucide-react'
import { paginasWebApi } from '@/lib/paginasWebApi'
import { SESSION_USER_UPDATED } from '@/config/api'
import type { SessionUser } from '@/lib/syncVendedorPaginaSession'

const POLL_MS = 30_000
const NOTIFY_SOUND =
  'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgiKashWA4LlF5k6+riWI7OVN4j62vjGtDP0ttgaqwkXBIRGh6nq2XeVFPXHCRpaKEXk1TaIOdq5V7WVRba4uesJmDY1xbbYadqZqGaGFfboKXpJSJa2NjaH+PlZCLcGhmZHN9iIqJeXJqZWdyfH2BgHl1bmtrb3N0dHZ1c3FvcHFxcnNzcnJycXBwcHBxcXFxcXFxcA=='

export type ReservaPaginaSinRevisar = {
  id: string
  cliente_nombre: string
  rifa_nombre: string
  cantidad_boletas: number
  monto_total: number
  created_at: string
}

function leerUsuarioHabilitado(): boolean {
  if (typeof window === 'undefined') return false
  try {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (!token || !raw) return false
    const user = JSON.parse(raw) as SessionUser
    if (String(user?.rol || '').toUpperCase() !== 'VENDEDOR') return false
    return Boolean(user.pagina_web_habilitada)
  } catch {
    return false
  }
}

function formatoMoneda(valor: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(valor)
}

function timeAgo(dateStr: string) {
  const now = new Date()
  const date = new Date(dateStr)
  const diffMin = Math.floor((now.getTime() - date.getTime()) / 60000)
  if (diffMin < 1) return 'Ahora mismo'
  if (diffMin < 60) return `Hace ${diffMin} min`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `Hace ${diffHr}h`
  return `Hace ${Math.floor(diffHr / 24)}d`
}

/**
 * Aviso global para vendedores con página web: reservas online en su enlace (SIN_REVISAR).
 * Solo consulta /paginas-web/mi/reservas/sin-revisar (filtrado por JWT del vendedor).
 */
export default function PaginaWebReservasNotifyPrompt() {
  const router = useRouter()
  const pathname = usePathname() || ''
  const [habilitado, setHabilitado] = useState(false)
  const [pendientes, setPendientes] = useState<ReservaPaginaSinRevisar[]>([])
  const [count, setCount] = useState(0)
  const [showPulse, setShowPulse] = useState(false)
  const [minimizado, setMinimizado] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const prevCountRef = useRef<number | null>(null)

  const syncHabilitado = useCallback(() => {
    setHabilitado(leerUsuarioHabilitado())
  }, [])

  useEffect(() => {
    syncHabilitado()
    const onUser = () => syncHabilitado()
    window.addEventListener(SESSION_USER_UPDATED, onUser)
    window.addEventListener('storage', onUser)
    return () => {
      window.removeEventListener(SESSION_USER_UPDATED, onUser)
      window.removeEventListener('storage', onUser)
    }
  }, [syncHabilitado, pathname])

  const fetchPendientes = useCallback(async () => {
    if (!habilitado) return
    if (document.visibilityState !== 'visible') return
    if (pathname === '/login' || pathname.startsWith('/login')) return

    try {
      const response = await paginasWebApi.misReservasSinRevisar()
      if (!response.success || !Array.isArray(response.data)) return

      const data = response.data as ReservaPaginaSinRevisar[]
      const newCount = data.length

      if (prevCountRef.current !== null && newCount > prevCountRef.current) {
        setShowPulse(true)
        try {
          const audio = new Audio(NOTIFY_SOUND)
          audio.volume = 0.3
          audio.play().catch(() => {})
        } catch {
          /* ignore */
        }
        window.setTimeout(() => setShowPulse(false), 3000)
      }
      prevCountRef.current = newCount
      setCount(newCount)
      setPendientes(data)
      if (newCount === 0) setMinimizado(false)
    } catch {
      /* sin sesión o red */
    }
  }, [habilitado, pathname])

  useEffect(() => {
    if (!habilitado) return
    void fetchPendientes()
    const id = window.setInterval(() => void fetchPendientes(), POLL_MS)
    const onVis = () => {
      if (document.visibilityState === 'visible') void fetchPendientes()
    }
    document.addEventListener('visibilitychange', onVis)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [habilitado, fetchPendientes])

  const enMiPagina = pathname === '/mi-pagina-web' || pathname.startsWith('/mi-pagina-web/')
  if (!habilitado || count === 0 || enMiPagina) return null

  const irReservas = () => {
    setMinimizado(false)
    router.push('/mi-pagina-web')
  }

  if (minimizado) {
    return (
      <div className="fixed bottom-4 right-4 z-[194] pointer-events-none sm:bottom-6 sm:right-6">
        <button
          type="button"
          onClick={() => setMinimizado(false)}
          className={`pointer-events-auto relative flex h-14 w-14 items-center justify-center rounded-full bg-orange-500 text-white shadow-lg hover:bg-orange-600 ${
            showPulse ? 'animate-bounce' : ''
          }`}
          aria-label={`${count} reservas en tu página web por revisar`}
        >
          <Bell className="h-6 w-6" aria-hidden />
          <span className="absolute -top-1 -right-1 flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold">
            {count}
          </span>
        </button>
      </div>
    )
  }

  return (
    <div
      className="fixed inset-x-0 top-0 z-[194] flex justify-center p-2 pointer-events-none sm:p-3 pt-[max(0.5rem,var(--sat))]"
      role="status"
      aria-live="assertive"
    >
      <div
        className={`pointer-events-auto w-full max-w-lg overflow-hidden rounded-xl border-2 text-sm shadow-lg transition-all duration-500 ${
          showPulse
            ? 'border-orange-400 bg-gradient-to-r from-orange-50 to-amber-50 animate-pulse'
            : 'border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50'
        }`}
      >
        <div
          className="flex cursor-pointer items-center justify-between gap-2 p-3 sm:p-4"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex min-w-0 items-center gap-2">
            <ReservasBadge count={count} pulse={showPulse} />
            <div className="min-w-0">
              <p className="font-semibold text-orange-900">
                {count === 1
                  ? '🔔 Nueva reserva en tu página web'
                  : `🔔 ${count} reservas en tu página web por revisar`}
              </p>
              <p className="text-xs text-orange-700">
                {showPulse && '¡Nueva reserva recibida! • '}
                Solo ventas de tu enlace • actualización cada 30s
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                irReservas()
              }}
              className="rounded-lg bg-orange-500 px-3 py-2 text-xs font-semibold text-white hover:bg-orange-600 sm:text-sm"
            >
              Ver →
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setMinimizado(true)
              }}
              className="flex min-h-11 min-w-11 items-center justify-center rounded-lg opacity-70 hover:bg-black/5 hover:opacity-100"
              aria-label="Minimizar aviso"
            >
              <X className="h-5 w-5 text-orange-800" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-orange-200 px-3 pb-3 sm:px-4 sm:pb-4">
            <ul className="mt-2 max-h-48 space-y-2 overflow-y-auto">
              {pendientes.slice(0, 5).map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={irReservas}
                    className="flex w-full items-center justify-between rounded-lg border border-orange-100 bg-white p-2 text-left hover:border-orange-300"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{r.cliente_nombre}</p>
                      <p className="truncate text-xs text-slate-500">
                        {r.rifa_nombre} • {r.cantidad_boletas} boleta{r.cantidad_boletas !== 1 ? 's' : ''}
                      </p>
                    </div>
                    <div className="shrink-0 pl-2 text-right">
                      <p className="text-sm font-semibold text-slate-900">{formatoMoneda(r.monto_total)}</p>
                      <p className="text-xs text-orange-600">{timeAgo(r.created_at)}</p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
            {count > 5 && (
              <p className="pt-2 text-center text-xs font-medium text-orange-600">+ {count - 5} más…</p>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function ReservasBadge({ count, pulse }: { count: number; pulse: boolean }) {
  return (
    <div className="relative shrink-0">
      <div
        className={`flex h-10 w-10 items-center justify-center rounded-xl text-white ${
          pulse ? 'bg-orange-500' : 'bg-orange-400'
        }`}
      >
        <Bell className="h-5 w-5" aria-hidden />
      </div>
      <span
        className={`absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ${
          pulse ? 'animate-bounce' : ''
        }`}
      >
        {count}
      </span>
    </div>
  )
}