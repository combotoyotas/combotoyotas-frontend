import { abrirWhatsappRecordatorioBoleta } from '@/lib/boletaWhatsappAcciones'
import type { Rifa } from '@/types/rifa'
import { WHATSAPP_MENSAJE_ACTIVO, WHATSAPP_VENTAS_ACTIVO } from '@/config/features'
import { downloadBoletaImage } from '@/utils/downloadBoletaImage'
import { generarWhatsAppLinkConMensaje } from '@/utils/telefono'
import { mensajeCompartirBoletaAlCliente } from '@/utils/whatsappMensajes'

export function nombreArchivoBoleta(numero: number, identificacion?: string): string {
  const cc = (identificacion || 'SIN_CC').replace(/\s+/g, '_')
  return `boleta_${numero.toString().padStart(4, '0')}_CC_${cc}.png`
}

/** Guarda la imagen en galería / archivos del dispositivo (sin hoja de compartir). */
export async function guardarBoletaEnDispositivo(
  elementId: string,
  fileName: string
): Promise<boolean> {
  return downloadBoletaImage({
    elementId,
    fileName,
    delivery: 'save',
  })
}

/** Comparte imagen (atajo WhatsApp) o abre chat con plantilla/mensaje si no hay share nativo. */
export async function compartirBoletaWhatsappConImagen(opts: {
  elementId: string
  fileName: string
  telefono?: string
  clienteNombre?: string
  rifaNombre?: string
  numeros?: number[]
  numero: number
  estadoLabel: string
  estadoRaw?: string
  boletaId?: string
}): Promise<boolean> {
  const shared = await downloadBoletaImage({
    elementId: opts.elementId,
    fileName: opts.fileName,
    delivery: 'share',
  })
  if (shared) return true

  const waActivo = WHATSAPP_VENTAS_ACTIVO || WHATSAPP_MENSAJE_ACTIVO
  if (!waActivo || !opts.telefono?.trim()) return false

  const telefono = opts.telefono?.trim()
  const estado = String(opts.estadoRaw || opts.estadoLabel).toUpperCase()
  if (estado === 'RESERVADA' || estado === 'ABONADA') {
    if (!telefono) return false
    const r = await abrirWhatsappRecordatorioBoleta(
      {
        id: opts.boletaId || opts.elementId,
        numero: opts.numero,
        numeros: opts.numeros,
        estado,
        cliente_info: {
          nombre: opts.clienteNombre?.trim() || 'Cliente',
          telefono,
        },
      },
      opts.rifaNombre ? ({ nombre: opts.rifaNombre } as Rifa) : null
    )
    if (r.ok) return true
  }

  const url = generarWhatsAppLinkConMensaje(
    opts.telefono,
    mensajeCompartirBoletaAlCliente({
      nombreCliente: opts.clienteNombre,
      rifaNombre: opts.rifaNombre,
      numeros: opts.numeros,
      numero: opts.numero,
      estadoLabel: opts.estadoLabel,
    })
  )
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}