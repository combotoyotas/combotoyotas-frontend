import type { Boleta } from '@/types/boleta'
import { sanitizeBoletaSearchDigits, searchMatchesNumeros } from '@/utils/formatBoletaNumeros'

export type BoletaSearchMode = 'boleta' | 'nombre' | 'cedula' | 'telefono'

/** Quita acentos y mayúsculas; colapsa espacios. */
export function normalizeForSearch(value: string): string {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function compactAlnum(value: string): string {
  return normalizeForSearch(value).replace(/[^a-z0-9]/g, '')
}

/** Búsqueda tolerante: sin acentos, sin puntuación, fragmentos de palabra. */
export function matchNombreFlexible(nombreRaw: string, queryRaw: string): boolean {
  const query = normalizeForSearch(queryRaw)
  if (!query) return true
  const nombre = normalizeForSearch(nombreRaw)
  if (!nombre) return false

  const qCompact = compactAlnum(queryRaw)
  const nCompact = compactAlnum(nombreRaw)
  if (qCompact.length >= 3 && nCompact.includes(qCompact)) return true

  if (nombre.includes(query)) return true

  const qTokens = query.split(/\s+/).filter((t) => t.length >= 2)
  if (qTokens.length === 0) {
    return query.length >= 2 && nombre.includes(query)
  }

  const words = nombre.split(/\s+/).filter(Boolean)
  return qTokens.every((token) => {
    if (nombre.includes(token)) return true
    return words.some(
      (w) => w.startsWith(token) || w.includes(token) || (token.length >= 3 && w.startsWith(token.slice(0, 3)))
    )
  })
}

export function boletaMatchesSearchMode(
  boleta: Boleta,
  rawTerm: string,
  mode: BoletaSearchMode
): boolean {
  const term = String(rawTerm || '').trim()
  if (!term) return true

  const digits = term.replace(/\D/g, '')
  const identificacion = String(boleta.cliente_info?.identificacion || '').replace(/\D/g, '')
  const telefono = String(boleta.cliente_info?.telefono || '').replace(/\D/g, '')

  switch (mode) {
    case 'boleta':
      return searchMatchesNumeros(
        boleta.numeros,
        sanitizeBoletaSearchDigits(term),
        boleta.numero
      )
    case 'nombre':
      return matchNombreFlexible(boleta.cliente_info?.nombre || '', term)
    case 'cedula':
      if (!digits) return false
      return identificacion.includes(digits) || (digits.length >= 4 && identificacion.endsWith(digits))
    case 'telefono':
      if (digits.length < 3) return false
      return telefono.includes(digits)
    default:
      return true
  }
}

/** Ordenar mejores coincidencias de nombre primero. */
export function scoreBoletaNombreMatch(boleta: Boleta, query: string): number {
  const nombre = normalizeForSearch(boleta.cliente_info?.nombre || '')
  const term = normalizeForSearch(query)
  const id = String(boleta.cliente_info?.identificacion || '').replace(/\D/g, '')
  const digits = query.replace(/\D/g, '')

  if (!term) return 3
  if (nombre === term) return 0
  if (nombre.startsWith(term)) return 1
  if (term && nombre.includes(term)) return 2
  if (digits.length > 4 && id === digits) return 0
  if (digits.length > 0 && id.includes(digits)) return 1
  return 3
}

export const BOLETA_SEARCH_TABS: { id: BoletaSearchMode; label: string; placeholder: string; inputMode: string }[] = [
  { id: 'boleta', label: 'Boleta', placeholder: 'Número del par (ej. 2738)', inputMode: 'numeric' },
  { id: 'nombre', label: 'Nombre', placeholder: 'Nombre del cliente', inputMode: 'text' },
  { id: 'cedula', label: 'Cédula', placeholder: 'Documento de identidad', inputMode: 'numeric' },
  { id: 'telefono', label: 'Teléfono', placeholder: 'Celular o fijo', inputMode: 'tel' },
]