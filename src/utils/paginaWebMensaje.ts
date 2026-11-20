import type { PaginaContactoItem } from '@/lib/paginasWebApi'
import { normalizarTelefono } from '@/utils/telefono'

export const PLANTILLA_PAGINA_WEB_DEFAULT = `Hola {{nombre}} 👋

Gracias por reservar en mi página de *{{rifa}}*.

🎟️ Boletas: *{{boletas}}*
💵 Total: *{{total}}*
🪪 Cédula: {{cedula}}

💳 Medios de pago:
{{medios_pago}}

Cuando pagues, envíame el comprobante por este chat. ¡Gracias!`

export function formatoBoletasNumeros(numeros: number[]): string {
  if (!numeros?.length) return '—'
  const pad = Math.max(4, String(Math.max(...numeros)).length)
  return numeros.map((n) => `#${String(n).padStart(pad, '0')}`).join(', ')
}

function bloqueMedios(medios: PaginaContactoItem[]): string {
  const activos = (medios || []).filter((m) => m.activo !== false && m.valor?.trim())
  if (!activos.length) return '(Configura medios en Ajustes de tu página)'
  return activos.map((m) => `• ${m.nombre}: ${m.valor}`).join('\n')
}

export function aplicarPlantillaPagina(
  plantilla: string | null | undefined,
  ctx: {
    nombre: string
    cedula?: string
    rifa: string
    boletas: string
    total: string
    medios: PaginaContactoItem[]
  }
): string {
  const tpl = (plantilla || '').trim() || PLANTILLA_PAGINA_WEB_DEFAULT
  const medios = bloqueMedios(ctx.medios)
  return tpl
    .replace(/\{\{nombre\}\}/g, ctx.nombre || 'cliente')
    .replace(/\{\{cedula\}\}/g, ctx.cedula || '—')
    .replace(/\{\{rifa\}\}/g, ctx.rifa || 'rifa')
    .replace(/\{\{boletas\}\}/g, ctx.boletas)
    .replace(/\{\{total\}\}/g, ctx.total)
    .replace(/\{\{medios_pago\}\}/g, medios)
}

export function whatsAppClienteDesdeReserva(
  telefono: string | null | undefined,
  mensaje: string
): string | null {
  const num = normalizarTelefono(telefono || '')
  if (!num) return null
  return `https://wa.me/${num}?text=${encodeURIComponent(mensaje)}`
}

export function etiquetaEstadoReserva(estado: string): { label: string; className: string } {
  switch (estado) {
    case 'SIN_REVISAR':
      return { label: 'Nueva', className: 'bg-amber-100 text-amber-900' }
    case 'PENDIENTE':
      return { label: 'Revisada', className: 'bg-sky-100 text-sky-900' }
    case 'ABONADA':
      return { label: 'Abonada', className: 'bg-yellow-100 text-yellow-900' }
    case 'PAGADA':
      return { label: 'Pagada', className: 'bg-emerald-100 text-emerald-900' }
    default:
      return { label: estado, className: 'bg-slate-100 text-slate-700' }
  }
}