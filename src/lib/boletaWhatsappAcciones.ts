import { ajustesApi } from '@/lib/ajustesApi'
import type { Boleta } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'
import type { BoletaDetail } from '@/types/boleta'
import { generarWhatsAppLinkConMensaje } from '@/utils/telefono'
import {
  aplicarPlantillaWhatsapp,
  buildPlantillaVarsFromBoleta,
  type TipoPlantillaBoleta,
} from '@/utils/plantillaWhatsappBoleta'

let plantillasCache: { reservada: string; abonada: string } | null = null
let plantillasCacheAt = 0
const CACHE_MS = 60_000

async function getPlantillas() {
  const now = Date.now()
  if (plantillasCache && now - plantillasCacheAt < CACHE_MS) {
    return plantillasCache
  }
  plantillasCache = await ajustesApi.getWhatsappPlantillasBoleta()
  plantillasCacheAt = now
  return plantillasCache
}

export function invalidatePlantillasWhatsappCache() {
  plantillasCache = null
  plantillasCacheAt = 0
}

export function tipoRecordatorioBoleta(boleta: { estado?: string; cliente_info?: unknown }): TipoPlantillaBoleta | null {
  const raw = String(boleta.estado || '').toUpperCase()
  if (raw === 'ABONADA' && boleta.cliente_info) return 'ABONADA'
  if (raw === 'RESERVADA' && boleta.cliente_info) return 'RESERVADA'
  return null
}

export function boletaEstaDisponibleParaVender(boleta: { estado?: string }): boolean {
  return String(boleta.estado || '').toUpperCase() === 'DISPONIBLE'
}

export async function abrirWhatsappRecordatorioBoleta(
  boleta: Boleta | BoletaDetail,
  rifaInfo?: Rifa | null
): Promise<{ ok: boolean; error?: string }> {
  const tel = boleta.cliente_info?.telefono
  if (!tel) {
    return { ok: false, error: 'La boleta no tiene cliente con teléfono' }
  }

  const tipo = tipoRecordatorioBoleta(boleta)
  if (!tipo) {
    return { ok: false, error: 'Solo aplica a boletas reservadas o abonadas con cliente' }
  }

  const plantillas = await getPlantillas()
  const plantilla = tipo === 'RESERVADA' ? plantillas.reservada : plantillas.abonada

  const fin = (boleta as BoletaDetail).boleta_financiero
  const vars = buildPlantillaVarsFromBoleta({
    clienteNombre: boleta.cliente_info?.nombre,
    rifaNombre: rifaInfo?.nombre || (boleta as BoletaDetail).rifa_nombre,
    numeros: boleta.numeros,
    numero: boleta.numero,
    saldoPendiente: fin?.saldo_pendiente ?? (boleta as BoletaDetail).venta_info?.saldo_pendiente,
    totalPagado: fin?.total_pagado,
    precioBoleta: fin?.precio_boleta,
  })

  const mensaje = aplicarPlantillaWhatsapp(plantilla, vars)
  const url = generarWhatsAppLinkConMensaje(tel, mensaje)
  if (!url) return { ok: false, error: 'Teléfono inválido' }

  window.open(url, '_blank', 'noopener,noreferrer')
  return { ok: true }
}

export function urlVenderBoleta(rifaId: string, boletaId: string): string {
  const params = new URLSearchParams({
    rifa_id: rifaId,
    boleta_id: boletaId,
    auto: '1',
  })
  return `/ventas/nueva-venta?${params.toString()}`
}
