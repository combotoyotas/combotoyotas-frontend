/** Líneas telefónicas (1–7) y pista para origen de venta/reserva */
export const LINEAS_ORIGEN_VENTA = ['1', '2', '3', '4', '5', '6', '7'] as const
export type LineaOrigenVenta = typeof LINEAS_ORIGEN_VENTA[number] | 'PISTA'

export function formatLineaOrigen(linea: string | null | undefined): string {
  if (!linea) return '—'
  if (linea.toUpperCase() === 'PISTA') return 'Pista (físico)'
  return `Línea ${linea}`
}

export function formatLineasOrigen(lineas: string | null | undefined): string {
  if (!lineas) return '—'
  return lineas
    .split(',')
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => formatLineaOrigen(l))
    .join(', ')
}

export function formatNumerosBoletas(numeros: number[] | null | undefined): string {
  if (!numeros?.length) return '—'
  return numeros.map((n) => `#${String(n).padStart(4, '0')}`).join(', ')
}
