import type { IntercambioSolicitud } from '@/lib/intercambiosApi'

export const LEIDAS_KEY = 'intercambios_leidas_v1'

export function claveLeida(s: IntercambioSolicitud) {
  return `${s.id}:${s.estado}`
}

/** Alerta global: solicitud pendiente que te llegó para aprobar */
export function clavePendingEntrante(id: string) {
  return `pending_in:${id}`
}

export function cargarLeidas(): Set<string> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(LEIDAS_KEY)
    if (!raw) return new Set()
    const arr = JSON.parse(raw) as string[]
    return new Set(Array.isArray(arr) ? arr : [])
  } catch {
    return new Set()
  }
}

export function guardarLeidas(set: Set<string>) {
  try {
    localStorage.setItem(LEIDAS_KEY, JSON.stringify([...set]))
  } catch {
    /* ignore */
  }
}

export function marcarLeidaClave(clave: string) {
  const next = cargarLeidas()
  next.add(clave)
  guardarLeidas(next)
  return next
}