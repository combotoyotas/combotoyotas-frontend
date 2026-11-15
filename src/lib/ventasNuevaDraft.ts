import type { BoletaEnCarrito, Cliente } from '@/types/ventas'

const STORAGE_KEY = 'ventas-nueva-draft-v1'

export type VentasPaso =
  | 'seleccionar-rifa'
  | 'seleccionar-boletas'
  | 'datos-cliente'
  | 'resumen'

export interface VentasNuevaDraft {
  pasoActual: VentasPaso
  rifaId: string | null
  boletasSeleccionadas: BoletaEnCarrito[]
  cliente: Cliente
  mostrarReservas: boolean
  savedAt: number
}

export function loadVentasNuevaDraft(): VentasNuevaDraft | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as VentasNuevaDraft
    if (!parsed?.pasoActual) return null
    return parsed
  } catch {
    return null
  }
}

export function saveVentasNuevaDraft(draft: Omit<VentasNuevaDraft, 'savedAt'>) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...draft, savedAt: Date.now() } satisfies VentasNuevaDraft)
    )
  } catch {
    /* ignore quota */
  }
}

export function clearVentasNuevaDraft() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

const PREFILL_IDS_KEY = 'ventas-prefill-boleta-ids-v1'
/** Legacy: ya no se usa en sessionStorage (provocaba boletas al recargar). */
const AUTO_PREFILL_CACHE_KEY = 'ventas-auto-prefill-cache-v1'

/** Solo sobrevive al doble montaje de React Strict Mode, no a F5. */
const memoryAutoPrefill = new Map<
  string,
  { rifaId: string; boletas: BoletaEnCarrito[] }
>()

export function isBrowserFullReload(): boolean {
  if (typeof window === 'undefined') return false
  const nav = performance.getEntriesByType('navigation')[0] as
    | PerformanceNavigationTiming
    | undefined
  return nav?.type === 'reload'
}

export function filterBoletasCarritoVigentes(
  boletas: BoletaEnCarrito[]
): BoletaEnCarrito[] {
  const now = Date.now()
  return boletas.filter((b) => {
    if (!b.bloqueo_hasta) return true
    const hasta = new Date(b.bloqueo_hasta).getTime()
    return !Number.isNaN(hasta) && hasta > now
  })
}

export function saveVentasPrefillBoletaIds(rifaId: string, boletaIds: string[]) {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.setItem(
      PREFILL_IDS_KEY,
      JSON.stringify({ rifaId, boletaIds, savedAt: Date.now() })
    )
  } catch {
    /* ignore */
  }
}

/** Lee y elimina el prefill de IDs (un solo uso al entrar a nueva venta). */
/** Evita doble bloqueo al entrar con ?auto=1 (solo en la misma carga, no tras F5). */
export function loadVentasAutoPrefillCache(signature: string): {
  rifaId: string
  boletas: BoletaEnCarrito[]
} | null {
  const hit = memoryAutoPrefill.get(signature)
  return hit ?? null
}

export function saveVentasAutoPrefillCache(
  signature: string,
  rifaId: string,
  boletas: BoletaEnCarrito[]
) {
  memoryAutoPrefill.set(signature, { rifaId, boletas })
}

export function clearVentasAutoPrefillCache() {
  memoryAutoPrefill.clear()
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.removeItem(AUTO_PREFILL_CACHE_KEY)
    } catch {
      /* ignore */
    }
  }
}

export function consumeVentasPrefillBoletaIds(): {
  rifaId: string
  boletaIds: string[]
} | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = sessionStorage.getItem(PREFILL_IDS_KEY)
    if (!raw) return null
    sessionStorage.removeItem(PREFILL_IDS_KEY)
    const parsed = JSON.parse(raw) as { rifaId?: string; boletaIds?: string[] }
    if (!parsed?.rifaId || !Array.isArray(parsed.boletaIds) || parsed.boletaIds.length === 0) {
      return null
    }
    return { rifaId: parsed.rifaId, boletaIds: parsed.boletaIds }
  } catch {
    return null
  }
}