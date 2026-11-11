const ROL_LABEL: Record<string, string> = {
  VENDEDOR: 'Vendedor',
  ADMIN: 'Administrador',
  SUPER_ADMIN: 'Super admin',
}

export function formatAbonoRegistradoPor(
  nombre?: string | null,
  gateway?: string | null
): string {
  if (nombre?.trim()) return nombre.trim()
  if (gateway?.toUpperCase() === 'WOMPI') return 'Cliente (pago en línea)'
  return 'No registrado'
}

/** Nombre + rol legible para historial de abonos */
export function formatRegistradoConRol(
  nombre?: string | null,
  rol?: string | null,
  gateway?: string | null
): string {
  const base = formatAbonoRegistradoPor(nombre, gateway)
  const r = String(rol || '').toUpperCase()
  const label = ROL_LABEL[r]
  if (label && base !== 'Cliente (pago en línea)' && base !== 'No registrado') {
    return `${base} · ${label}`
  }
  return base
}
