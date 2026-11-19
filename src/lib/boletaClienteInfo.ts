/** Ciudad / municipio del cliente para el ticket (campo `direccion` en BD). */

export type ClienteTicketSource = {
  nombre?: string | null
  identificacion?: string | null
  direccion?: string | null
  cliente_direccion?: string | null
  ciudad?: string | null
  municipio?: string | null
} | null | undefined

export function pickCiudadMunicipioCliente(...sources: Array<string | null | undefined>): string {
  for (const s of sources) {
    const t = String(s ?? '').trim()
    if (t) return t
  }
  return ''
}

export function buildClienteInfoForTicket(
  ...sources: ClienteTicketSource[]
): { nombre: string; identificacion?: string; direccion?: string | null } | null {
  let nombre = ''
  let identificacion: string | undefined
  const direccionParts: Array<string | null | undefined> = []

  for (const src of sources) {
    if (!src) continue
    if (!nombre && src.nombre) nombre = String(src.nombre).trim()
    if (!identificacion && src.identificacion) {
      identificacion = String(src.identificacion).trim()
    }
    direccionParts.push(
      src.direccion,
      src.cliente_direccion,
      src.ciudad,
      src.municipio
    )
  }

  const direccion = pickCiudadMunicipioCliente(...direccionParts)

  if (!nombre && !identificacion && !direccion) return null

  return {
    nombre: nombre || '—',
    identificacion,
    direccion: direccion || null,
  }
}