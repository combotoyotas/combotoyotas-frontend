import type { BoletaEstadoInfo } from '@/components/boletas/BoletaOpcionesMenu'

/** Misma lógica que el badge de la lista de boletas (menú ⋮). */
export function getBoletaEstadoMenuInfo(boleta: {
  estado?: string
  cliente_info?: unknown
  venta_id?: string | null
}): BoletaEstadoInfo {
  const estadoRaw = boleta.estado?.toString().trim().toUpperCase() || ''

  if (estadoRaw === 'RESERVADA') {
    if (boleta.cliente_info) return { label: 'RESERVADA', classes: 'bg-blue-600 text-white' }
    return { label: 'BLOQUEADA', classes: 'bg-amber-200 text-black' }
  }
  if (estadoRaw === 'ABONADA') return { label: 'ABONADA', classes: 'bg-orange-400 text-black' }
  if (estadoRaw === 'PAGADA' || estadoRaw === 'CON_PAGO') return { label: 'PAGADA', classes: 'bg-green-700 text-white' }
  if (estadoRaw === 'ANULADA' || estadoRaw === 'CANCELADA') return { label: 'CANCELADA', classes: 'bg-red-600 text-white' }
  if (estadoRaw === 'DISPONIBLE' && boleta.venta_id) {
    return { label: 'EN VENTA', classes: 'bg-orange-400 text-black' }
  }
  if (estadoRaw === 'DISPONIBLE') return { label: 'DISPONIBLE', classes: 'bg-emerald-300 text-black' }
  if (estadoRaw === 'TRANSFERIDA') return { label: 'TRANSFERIDA', classes: 'bg-purple-100 text-purple-800' }

  return { label: estadoRaw || 'DESCONOCIDO', classes: 'bg-slate-100 text-slate-800' }
}

/** Bloqueo temporal en carrito/ventas: RESERVADA sin cliente asignado. */
export function boletaEstaBloqueadaSinCliente(boleta: {
  estado?: string
  cliente_info?: unknown
}): boolean {
  const estadoRaw = boleta.estado?.toString().trim().toUpperCase() || ''
  return estadoRaw === 'RESERVADA' && !boleta.cliente_info
}