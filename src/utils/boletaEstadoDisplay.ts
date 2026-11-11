/** Etiquetas y colores de estado de boleta (lista y detalle). */
export function boletaEstadoDisplay(estadoRaw: string | null | undefined): {
  label: string
  badgeClass: string
} {
  const estado = String(estadoRaw || '')
    .trim()
    .toUpperCase()

  if (estado === 'RESERVADA') {
    return { label: 'Reservada', badgeClass: 'bg-blue-100 text-blue-800' }
  }
  if (estado === 'ABONADA') {
    return { label: 'Abonada', badgeClass: 'bg-orange-100 text-orange-800' }
  }
  if (estado === 'PAGADA' || estado === 'CON_PAGO') {
    return { label: estado === 'PAGADA' ? 'Pagada' : 'Con pago', badgeClass: 'bg-green-100 text-green-800' }
  }
  if (estado === 'DISPONIBLE') {
    return { label: 'Disponible', badgeClass: 'bg-emerald-100 text-emerald-800' }
  }
  if (estado === 'TRANSFERIDA') {
    return { label: 'Transferida', badgeClass: 'bg-purple-100 text-purple-800' }
  }
  if (estado === 'ANULADA' || estado === 'CANCELADA') {
    return { label: 'Anulada', badgeClass: 'bg-red-100 text-red-800' }
  }
  return { label: estado || '—', badgeClass: 'bg-slate-100 text-slate-800' }
}
