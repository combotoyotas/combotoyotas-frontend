import { BACKEND_API_ROOT } from '@/config/api'
import { TokenManager } from '@/utils/auth'

export type InformesBoletasPseOficinaParams = {
  desde?: string
  hasta?: string
  detalle?: boolean
}

export type InformesBoletasPseOficinaRow = {
  boleta_id: string
  venta_id: string
  cliente: string
  cedula: string
  telefono: string | null
  email: string | null
  rifa: string
  numero_boleta: string
  numeros_boletas: string
  total_pagado_cop: number
  comprobante: string | null
  vendedor_oficina: string
  fecha_pago_completo: string
  fecha_dia: string
  fecha_venta: string
}

export type InformesBoletasPseOficinaResponse = {
  success: boolean
  data: {
    periodo: Record<string, string | number>
    totales: {
      boletas: number
      ventas: number
      clientes_unicos: number
      total_pagado_cop: number
    }
    por_dia: Array<{
      fecha: string
      boletas: number
      ventas: number
      clientes_unicos: number
      total_pagado_cop: number
    }>
    boletas?: InformesBoletasPseOficinaRow[]
  }
  message?: string
}

function authHeaders(): HeadersInit {
  const token = TokenManager.getToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export const informesBoletasPseOficinaApi = {
  async diarias(params?: InformesBoletasPseOficinaParams): Promise<InformesBoletasPseOficinaResponse> {
    const q = new URLSearchParams()
    if (params?.desde) q.set('desde', params.desde)
    if (params?.hasta) q.set('hasta', params.hasta)
    if (params?.detalle === false) q.set('detalle', '0')
    const qs = q.toString()
    const res = await fetch(
      `${BACKEND_API_ROOT}/informes/boletas-pse-oficina/diarias${qs ? `?${qs}` : ''}`,
      { headers: authHeaders() }
    )
    const data = (await res.json()) as InformesBoletasPseOficinaResponse
    if (!res.ok) {
      if (res.status === 401 || res.status === 403) TokenManager.handleAuthError()
      throw new Error(data.message || 'Error al cargar informe PSE oficina')
    }
    if (!data.success) throw new Error(data.message || 'Error al cargar informe PSE oficina')
    return data
  },
}