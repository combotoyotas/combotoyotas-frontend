/** Campos devueltos por GET /api/boletas/rifa/:id/buscar?numero= */
export type BoletaBusquedaExterna = {
  numero: number
  numeros?: number[]
  estado: string
  bloqueada?: boolean
  cliente_nombre?: string | null
  inventario_info?: { id: string; nombre: string } | null
  detalle_busqueda?: {
    motivos: { clave: string; texto: string }[]
  }
}

export function ubicacionBoletaBusqueda(data: BoletaBusquedaExterna): string {
  return data.inventario_info?.nombre?.trim() || 'Oficina'
}

/** Disponible vs con cliente (sin datos del cliente). */
export function situacionBoletaBusqueda(
  data: BoletaBusquedaExterna
): 'Disponible' | 'Con cliente asignado' {
  const motivos = data.detalle_busqueda?.motivos ?? []
  const tieneClienteMotivo = motivos.some((m) => m.clave === 'CLIENTE')
  if (tieneClienteMotivo || Boolean(data.cliente_nombre?.trim())) {
    return 'Con cliente asignado'
  }
  const e = String(data.estado || '').toUpperCase()
  if (['PAGADA', 'CON_PAGO', 'VENDIDA', 'ABONADA'].includes(e)) {
    return 'Con cliente asignado'
  }
  if (e === 'RESERVADA' && data.bloqueada) {
    return 'Disponible'
  }
  return 'Disponible'
}

export function etiquetaEstadoBoletaBusqueda(data: BoletaBusquedaExterna): string {
  const situacion = situacionBoletaBusqueda(data)
  if (situacion === 'Con cliente asignado') return 'Con cliente asignado'
  const e = String(data.estado || '').toUpperCase()
  if (data.bloqueada && e === 'RESERVADA') return 'Disponible (bloqueo temporal)'
  return 'Disponible'
}