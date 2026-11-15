import { ajustesApi } from '@/lib/ajustesApi'
import { clienteApi } from '@/lib/clienteApi'
import { aplicarPlantillaWhatsapp } from '@/utils/plantillaWhatsappBoleta'
import { normalizarTelefono } from '@/utils/telefono'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import { nombreProyecto } from '@/utils/whatsappMensajes'
import type { RifaConBoletas } from '@/types/cliente'

let plantillaCache: string | null = null
let plantillaCacheAt = 0
const CACHE_MS = 60_000

export function invalidatePlantillaClienteWhatsappCache() {
  plantillaCache = null
  plantillaCacheAt = 0
}

async function getPlantillaCliente(): Promise<string> {
  const now = Date.now()
  if (plantillaCache && now - plantillaCacheAt < CACHE_MS) {
    return plantillaCache
  }
  const data = await ajustesApi.getWhatsappPlantillaCliente()
  plantillaCache = data.plantilla
  plantillaCacheAt = now
  return data.plantilla
}

const fmtCop = (value: number) =>
  new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value)

/** WhatsApp con plantilla de Ajustes (módulo Clientes / recordatorios por cliente). */
export async function generarWhatsappClienteRecordatorio(input: {
  clienteId: string
  nombre?: string
  telefono: string
  deuda_total?: number
}): Promise<string | null> {
  const tel = normalizarTelefono(input.telefono)
  if (!tel || tel.length < 7) return null

  const plantilla = await getPlantillaCliente()
  const nombreCompleto = (input.nombre || 'Cliente').trim()
  const nombre = nombreCompleto.split(/\s+/)[0] || 'amigo/a'

  let pachas: string[] = []
  let proyecto = nombreProyecto('proyecto')
  let deuda = input.deuda_total ?? 0

  try {
    const response = await clienteApi.getClienteDetalle(input.clienteId)
    const { rifas, rifa_actual, resumen } = response.data
    if (rifa_actual?.nombre) proyecto = nombreProyecto(rifa_actual.nombre)
    else if (rifas[0]?.rifa_nombre) proyecto = nombreProyecto(rifas[0].rifa_nombre)
    if (resumen?.total_deuda != null) deuda = resumen.total_deuda

    const rifasActivas = rifas.filter((r: RifaConBoletas) => r.rifa_estado === 'ACTIVA')
    rifasActivas.forEach((rifa: RifaConBoletas) => {
      rifa.boletas
        .filter((b) => b.estado === 'RESERVADA' || b.estado === 'ABONADA')
        .forEach((b) => {
          pachas.push(formatBoletaNumeros(b.numeros, b.numero))
        })
    })
  } catch {
    /* datos del listado */
  }

  let pachas_linea = ''
  if (pachas.length === 1) {
    pachas_linea = `Tu boleta es ${pachas[0]}, recuerda cancelarla en su totalidad para participar en el sorteo. 🙌`
  } else if (pachas.length > 1) {
    pachas_linea = `Tus boletas son ${pachas.join(' y ')}, recuerda cancelarlas en su totalidad para participar en el sorteo. 🙌`
  } else {
    pachas_linea = 'Recuerda cancelar tus boletas en su totalidad para participar en el sorteo. 🙌'
  }

  const msg = aplicarPlantillaWhatsapp(plantilla, {
    nombre,
    nombre_completo: nombreCompleto,
    proyecto,
    pachas: pachas.join(' y '),
    pachas_linea,
    deuda: fmtCop(deuda),
  } as Record<string, string>)

  return `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`
}