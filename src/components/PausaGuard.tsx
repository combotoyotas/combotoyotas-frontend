'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { API_BASE_URL } from '@/config/api'

const POLL_MS = 8000

/**
 * Guard global: cuando no hay proyecto ACTIVA (solo PAUSADA), bloquea
 * por completo la interfaz para los roles ADMIN y VENDEDOR. El SUPER_ADMIN nunca
 * se bloquea (debe poder reactivar el proyecto). Consulta el estado periódicamente,
 * por lo que al reactivar el proyecto el bloqueo desaparece automáticamente.
 */
export default function PausaGuard({ children }: { children: React.ReactNode }) {
  const [pausado, setPausado] = useState(false)
  const [rol, setRol] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const check = useCallback(async () => {
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
      const userRaw = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      if (!token || !userRaw) {
        setPausado(false)
        setRol(null)
        return
      }

      let r = ''
      try {
        r = String(JSON.parse(userRaw)?.rol || '').toUpperCase()
      } catch {
        setPausado(false)
        setRol(null)
        return
      }
      setRol(r)

      // El SUPER_ADMIN nunca se bloquea; ni siquiera consultamos.
      if (r === 'SUPER_ADMIN') {
        setPausado(false)
        return
      }

      const res = await fetch(`${API_BASE_URL}/api/sistema/estado`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) return
      const data = await res.json()
      setPausado(Boolean(data?.pausado))
    } catch {
      // Silencioso: no romper la UI por un fallo de red
    }
  }, [])

  useEffect(() => {
    check()
    timerRef.current = setInterval(check, POLL_MS)
    const onFocus = () => check()
    window.addEventListener('focus', onFocus)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      window.removeEventListener('focus', onFocus)
    }
  }, [check])

  const bloquear = pausado && (rol === 'ADMIN' || rol === 'VENDEDOR')

  if (!bloquear) return <>{children}</>

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-gradient-to-br from-slate-900 via-slate-950 to-indigo-950 p-6">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-16 -right-16 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="absolute -bottom-16 -left-16 w-72 h-72 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative max-w-md w-full text-center">
        <div className="mx-auto mb-6 w-24 h-24 rounded-full bg-amber-500/15 border-2 border-amber-400/40 flex items-center justify-center">
          <span className="text-5xl">⏸️</span>
        </div>

        <h1 className="text-3xl font-black text-white mb-3">Sistema en pausa</h1>

        <p className="text-slate-300 text-base leading-relaxed mb-6">
          El sistema se encuentra temporalmente en pausa. En este momento no es
          posible realizar ninguna acción.
        </p>

        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 mb-6">
          <p className="text-slate-400 text-sm">
            Por favor espera a que un administrador reactive el sistema. Esta
            pantalla se actualizará automáticamente.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 text-amber-300/80 text-sm">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          Esperando reactivación…
        </div>
      </div>
    </div>
  )
}
