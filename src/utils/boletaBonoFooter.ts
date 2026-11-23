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

/** Normaliza abonos de API (fecha / created_at) para el pie del bono. */
export function mapAbonosApiParaBono(
  raw?: Array<{
    monto: number
    fecha?: string
    created_at?: string
    estado?: string | null
  }> | null
): AbonoBonoLine[] {
  if (!raw?.length) return []
  return raw
    .map((a) => ({
      monto: Number(a.monto) || 0,
      fecha: String(a.fecha ?? a.created_at ?? new Date().toISOString()),
      estado: a.estado ?? 'CONFIRMADO',
    }))
    .filter((a) => a.monto > 0)
}

/** Si no hay líneas de abono, usa totalAbonado para mostrar al menos el abono actual. */
export function coalesceAbonosParaBono(opts: {
  abonos?: AbonoBonoLine[] | null
  totalAbonado?: number | null
  fechaFallback?: string
}): AbonoBonoLine[] | null {
  const activos = getAbonosActivosOrdenados(opts.abonos)
  if (activos.length) return activos
  const total = Number(opts.totalAbonado ?? 0)
  if (total > 0) {
    return [
      {
        monto: total,
        fecha: opts.fechaFallback || new Date().toISOString(),
        estado: 'CONFIRMADO',
      },
    ]
  }
  return null
}

/** Flags compartidos entre BoletaTicket y descarga masiva (HTML). */
export function computeBonoTicketFlags(opts: {
  estado: string
  tieneCliente: boolean
  deudaNum: number | null
}) {
  const estadoNorm = (opts.estado ?? '').toString().trim().toUpperCase()
  const esReservada = estadoNorm === 'RESERVADA'
  const esCancelada = estadoNorm === 'ANULADA' || estadoNorm === 'CANCELADA'
  const estadoPagadoWords = new Set(['CON_PAGO', 'PAGADA', 'PAGADO', 'VENDIDA'])
  const deudaNum = opts.deudaNum
  const tieneCliente = opts.tieneCliente

  const esAbonada =
    estadoNorm === 'ABONADA' ||
    (tieneCliente &&
      typeof deudaNum === 'number' &&
      deudaNum > 0 &&
      !estadoPagadoWords.has(estadoNorm))

  const esPagada =
    tieneCliente &&
    (estadoPagadoWords.has(estadoNorm) ||
      (typeof deudaNum === 'number' &&
        deudaNum <= 0 &&
        !esReservada &&
        estadoNorm !== 'ABONADA' &&
        !esCancelada))

  const bonoCancelado =
    tieneCliente &&
    (estadoPagadoWords.has(estadoNorm) ||
      (typeof deudaNum === 'number' &&
        deudaNum <= 0 &&
        !esReservada &&
        estadoNorm !== 'ABONADA' &&
        !esCancelada))

  return { estadoNorm, esReservada, esCancelada, esPagada, esAbonada, bonoCancelado }
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