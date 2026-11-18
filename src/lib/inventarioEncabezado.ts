/** Textos del encabezado del PDF de inventario (inventarioVendedorPdf.js). */

export const MARCA_RIFAS = 'RIFAS COMBOTOYOTAS'
export const PREFIJO_PREMIO_MAYOR = 'PREMIO MAYOR '
export const PREFIJO_PREMIO_ANTICIPADO = 'PREMIO ANTICIPADO '

export function cuerpoPremioMayor(rifaNombre: string): string {
  const n = String(rifaNombre || '').trim()
  if (/LAND CRUISER ESTACAS/i.test(n)) {
    return '26 DE DICIEMBRE : LAND CRUISER ESTACAS DIESEL + LAND CRUISER PRADO DIESEL+5 MILLONES EN EFECTIVO +YAMAHA MT 15 OKM+ PATINETA ELECTRICA Y TODO PARA LA RUMBA NAVIDEÑA VALORADA EN $5 MILLONES'
  }
  return `26 DE DICIEMBRE : ${n || '—'}`
}

export function cuerpoPremioAnticipado(): string {
  return '12 DE DICIEMBRE $20 MILLONES'
}

export function lineaVendedor(nombreVendedor: string | null | undefined): string {
  const nombre = String(nombreVendedor || '—').toUpperCase()
  return `VENDEDOR: ${nombre}`
}