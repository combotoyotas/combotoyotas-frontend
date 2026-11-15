/** Panel izquierdo (QR, estado, número) */
export const BOLETA_LEFT_WIDTH = 210

/** Panel derecho (arte del proyecto) */
export const BOLETA_RIGHT_WIDTH = 590

/** Ancho total del ticket */
export const BOLETA_WIDTH = BOLETA_LEFT_WIDTH + BOLETA_RIGHT_WIDTH

/**
 * Altura por defecto según arte oficial (2504×1417 px en storage).
 * 590 × (1417/2504) ≈ 334
 */
export const BOLETA_DEFAULT_HEIGHT = Math.round(
  BOLETA_RIGHT_WIDTH * (1417 / 2504)
)

/** Calcula la altura del ticket para que el arte llene el panel sin márgenes. */
export function boletaHeightForImage(naturalWidth: number, naturalHeight: number): number {
  if (!naturalWidth || !naturalHeight) return BOLETA_DEFAULT_HEIGHT
  return Math.round(BOLETA_RIGHT_WIDTH * (naturalHeight / naturalWidth))
}

/**
 * Bono + número sobre el arte (referencia 2504×1417 Combo Toyotas).
 * Dos rectángulos blancos separados: número (pequeño) | hueco | bono (ancho).
 */
export const BOLETA_ARTE_BONO = {
  /** Margen al borde derecho del arte */
  right: '0.92%',
  bottom: '1.72%',
  /** Altura del recuadro “BONO DE CANCELACION” (% del alto del arte) */
  height: '15%',
  /** Altura del recuadro del número (más bajo que el bono) */
  numeroHeight: '8.65%',
  /** Separación entre cajas (% del ancho del arte) */
  gap: '0.9%',
  /** Caja del número (cuadro estrecho a la izquierda) */
  numeroWidth: '6.75%',
  /** Caja del bono (mucho más ancha que la del número) */
  bonoWidth: '35.2%',
} as const

/** Altura en px del bloque bono+número según alto del ticket */
export function bonoFooterHeightPx(ticketHeight: number): number {
  const pct = parseFloat(BOLETA_ARTE_BONO.height) / 100
  return Math.round(ticketHeight * pct)
}

export function bonoNumeroHeightPx(ticketHeight: number): number {
  const pct = parseFloat(BOLETA_ARTE_BONO.numeroHeight) / 100
  return Math.round(ticketHeight * pct)
}
