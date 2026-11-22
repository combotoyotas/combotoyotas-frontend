import { API_BASE_URL } from '@/config/api'
import { TokenManager } from '@/utils/auth'

const BASE = `${API_BASE_URL}/api/intercambios`

export type IntercambioEstado = 'PENDIENTE' | 'ACEPTADA' | 'RECHAZADA' | 'CANCELADA'

export interface ConsultaNumeroIntercambio {
  numero: number
  numero_fmt: string
  ok: boolean
  mensaje?: string
  contraparte_tipo?: 'OFICINA' | 'VENDEDOR'
  contraparte_vendedor_id?: string | null
  contraparte_nombre?: string
  ubicacion?: string
  puede_solicitar?: boolean
  intercambio_posible?: boolean
}

export interface IntercambioCuota {
  aceptados: number
  limite: number | null
  sin_limite?: boolean
  cuota_desde: string
  parte: 'vendedor' | 'oficina'
  puede_solicitar: boolean
}

export interface IntercambioContexto {
  rifa: { id: string; nombre: string; estado: string }
  numeros_disponibles: number[]
  total_disponibles: number
  cuota_intercambios?: IntercambioCuota | null
}

export type IntercambioDireccion = 'ENVIADA' | 'RECIBIDA'

export interface IntercambioSolicitud {
  id: string
  rifa_id: string
  rifa_nombre?: string
  solicitante_id: string
  solicitante_nombre?: string
  solicitante_es_oficina?: boolean
  contraparte_tipo: 'OFICINA' | 'VENDEDOR'
  contraparte_vendedor_id: string | null
  contraparte_vendedor_nombre?: string
  direccion?: IntercambioDireccion
  numero_solicitado: number
  numero_ofrecido: number
  estado: IntercambioEstado
  notas?: string | null
  resultado?: {
    resumen?: {
      quedo_en_solicitante: number
      quedo_en_contraparte: number
      numero_solicitado_fmt: string
      numero_ofrecido_fmt: string
      contraparte_nombre?: string
    }
  }
  created_at: string
  updated_at?: string | null
  responded_at?: string | null
  responded_by_nombre?: string | null
}

export interface IntercambioListado {
  por_aprobar: IntercambioSolicitud[]
  historial: IntercambioSolicitud[]
  /** @deprecated */
  mis_solicitudes?: IntercambioSolicitud[]
}

class IntercambiosApi {
  private headers = () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private handle = async <T,>(res: Response): Promise<T> => {
    const data = await res.json()
    if (!res.ok) {
      const msg = String(data?.message || '').toLowerCase()
      if (
        res.status === 401 ||
        (res.status === 403 &&
          (msg.includes('inactive') ||
            msg.includes('token') ||
            msg.includes('session') ||
            data?.error === 'Forbidden'))
      ) {
        TokenManager.handleAuthError()
      }
      throw new Error(data.message || `Error ${res.status}`)
    }
    return data.data as T
  }

  getContexto = () =>
    fetch(`${BASE}/contexto`, { headers: this.headers() }).then((res) =>
      this.handle<IntercambioContexto>(res)
    )

  consultarNumero = (rifaId: string, numero: number) =>
    fetch(`${BASE}/rifa/${rifaId}/numero/${numero}`, {
      headers: this.headers(),
    }).then((res) => this.handle<ConsultaNumeroIntercambio>(res))

  listar = () =>
    fetch(`${BASE}`, { headers: this.headers() }).then((res) =>
      this.handle<IntercambioListado>(res)
    )

  crear = (body: {
    rifa_id: string
    numero_solicitado: number
    numero_ofrecido: number
    notas?: string
  }) =>
    fetch(`${BASE}`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(body),
    }).then((res) => this.handle<IntercambioSolicitud>(res))

  cancelar = (id: string) =>
    fetch(`${BASE}/${id}/cancelar`, {
      method: 'POST',
      headers: this.headers(),
    }).then((res) => this.handle<IntercambioSolicitud>(res))

  rechazar = (id: string) =>
    fetch(`${BASE}/${id}/rechazar`, {
      method: 'POST',
      headers: this.headers(),
    }).then((res) => this.handle<IntercambioSolicitud>(res))

  aceptar = (id: string) =>
    fetch(`${BASE}/${id}/aceptar`, {
      method: 'POST',
      headers: this.headers(),
    }).then((res) =>
      this.handle<{ solicitud: IntercambioSolicitud; resultado: IntercambioSolicitud['resultado'] }>(
        res
      )
    )
}

export const intercambiosApi = new IntercambiosApi()