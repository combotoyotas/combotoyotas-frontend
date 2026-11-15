/** Datos mínimos de abono para el pie «BONO DE CANCELACION». */
export type AbonoBonoLine = {
  id?: string
  monto: number
  fecha: string
  estado?: string | null
}

export const BOLETA_BONO_MAX_ABONOS = 4

export type BonoFooterDetalle =
  | { kind: 'cancelado' }
  | { kind: 'abonos'; lineas: { monto: number; fechaLabel: string }[]; totalActivos: number }
  | { kind: 'empty' }

export function formatFechaBono(fecha: string): string {
  try {
    const dt = new Date(fecha)
    if (isNaN(dt.getTime())) return fecha
    return dt.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' })
  } catch {
    return fecha
  }
}

export function formatMontoBono(monto: number): string {
  return `$${Number(monto).toLocaleString('es-CO')}`
}

export function getAbonosActivosOrdenados(abonos?: AbonoBonoLine[] | null): AbonoBonoLine[] {
  if (!abonos?.length) return []
  const activos = abonos.filter((a) => (a.estado ?? '').toString().trim().toUpperCase() !== 'ANULADO')
  return [...activos].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
}

/** Hasta 4 abonos en el bono (los más recientes si hay más en historial). */
export function abonosParaBonoFooter(abonos?: AbonoBonoLine[] | null): AbonoBonoLine[] {
  const all = getAbonosActivosOrdenados(abonos)
  if (all.length <= BOLETA_BONO_MAX_ABONOS) return all
  return all.slice(-BOLETA_BONO_MAX_ABONOS)
}

/** Tamaño de fuente por línea según cantidad (1–4) y alto del recuadro. */
export function bonoAbonoLineFontPx(bandBonoPx: number, lineCount: number): number {
  const n = Math.min(Math.max(lineCount, 1), BOLETA_BONO_MAX_ABONOS)
  const contentH = bandBonoPx * 0.56
  const gap = n > 1 ? 1.5 * (n - 1) : 0
  const lineBoxH = (contentH - gap) / n

  const bandScale: Record<number, number> = {
    1: 0.3,
    2: 0.24,
    3: 0.19,
    4: 0.15,
  }
  const fromBand = bandBonoPx * (bandScale[n] ?? 0.15)
  const fromHeight = lineBoxH * 0.82
  return Math.max(6, Math.round(Math.min(fromBand, fromHeight)))
}

export function bonoAbonoLinesGapPx(lineCount: number): number {
  const n = Math.min(Math.max(lineCount, 1), BOLETA_BONO_MAX_ABONOS)
  if (n <= 1) return 0
  if (n === 2) return 2
  if (n === 3) return 1.5
  return 1
}

export function resolveBonoFooterDetalle(opts: {
  bonoCancelado: boolean
  esAbonada: boolean
  abonos?: AbonoBonoLine[] | null
}): BonoFooterDetalle {
  if (opts.bonoCancelado) return { kind: 'cancelado' }
  if (!opts.esAbonada) return { kind: 'empty' }
  const activos = getAbonosActivosOrdenados(opts.abonos)
  const visibles = abonosParaBonoFooter(opts.abonos)
  const lineas = visibles.map((a) => ({
    monto: Number(a.monto),
    fechaLabel: formatFechaBono(a.fecha),
  }))
  if (lineas.length === 0) return { kind: 'empty' }
  return { kind: 'abonos', lineas, totalActivos: activos.length }
}