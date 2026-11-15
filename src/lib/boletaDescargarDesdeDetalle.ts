import { nombreArchivoBoleta, guardarBoletaEnDispositivo } from '@/utils/ventasBoletaEntrega'

export function boletaDetailTicketElementId(boletaId: string): string {
  return `boleta-detail-ticket-${boletaId}`
}

export async function descargarBoletaDetalleComoFoto(
  boletaId: string,
  numero: number,
  identificacion?: string
): Promise<boolean> {
  return guardarBoletaEnDispositivo(
    boletaDetailTicketElementId(boletaId),
    nombreArchivoBoleta(numero, identificacion)
  )
}