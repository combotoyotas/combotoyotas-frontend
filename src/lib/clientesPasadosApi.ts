import { API_BASE_URL } from '@/config/api'

const BASE = `${API_BASE_URL}/api/clientes-pasados`

export type EstadoContacto = 'SIN_CONTACTAR' | 'CONTACTADO' | 'NO_CONTESTO'

export type TipoBoleta = 'pagadas' | 'abonadas' | 'reservadas'

/** Filtro de estado de contacto de la UI. */
export type FiltroEstado = 'todos' | 'sin_contactar' | 'contactado' | 'no_contesto'

export type FiltroOrden = 'mas_boletas' | 'recientes' | 'nombre' | 'ultimo_contacto'

export interface ProyectoParticipacion {
  rifa_id: string
  rifa_nombre: string
  pagadas: number
  abonadas: number
  reservadas: number
}

export type EstadoBoletaPasada = 'PAGADA' | 'ABONADA' | 'RESERVADA'

export interface BoletaPasadaNumero {
  numero: number
  estado: EstadoBoletaPasada
}

export interface ProyectoBoletasDetalle extends ProyectoParticipacion {
  boletas: BoletaPasadaNumero[]
}

export interface ClientePasado {
  cliente_id: string
  nombre: string
  telefono: string | null
  identificacion: string | null
  email: string | null
  pagadas: number
  abonadas: number
  reservadas: number
  total: number
  proyectos: ProyectoParticipacion[]
  /** Líneas de venta registradas en sus compras de proyectos terminados. */
  lineas_venta: string[]
  ultima_linea_venta: string | null
  /** Última línea con la que se le contactó antes (recordatorios), si existe. */
  linea_contacto_previo: number | null
  estado_contacto: EstadoContacto
  ultimo_contacto_linea: number | null
  ultimo_contacto_observacion: string | null
  ultimo_contacto_en: string | null
  ultimo_contacto_por: string | null
  total_contactos: number
  /** Cuántos registros de este módulo comparten el mismo teléfono. */
  registros_mismo_telefono: number
}

export interface Paginacion {
  page: number
  limit: number
  total: number
  totalPages: number
}

export interface ListarFiltros {
  page?: number
  limit?: number
  q?: string
  tipos?: TipoBoleta[]
  min?: number | null
  max?: number | null
  estado?: FiltroEstado
  linea?: string
  rifa_id?: string
  orden?: FiltroOrden
}

export interface ResumenClientesPasados {
  total: number
  con_pagadas: number
  con_abonadas: number
  con_reservadas: number
  sin_contactar: number
  contactados: number
  no_contesto: number
  proyectos_pasados: { id: string; nombre: string; clientes: number }[]
  proyectos_actuales: { id: string; nombre: string }[]
  /** Clientes contactados que ya compraron en el proyecto actual. */
  recuperados: number
}

export interface ContactoHistorial {
  id: string
  estado: EstadoContacto
  linea_contacto: number | null
  observacion: string | null
  created_at: string
  registrado_por_nombre: string | null
}

export interface RegistrarContactoBody {
  estado: EstadoContacto
  linea_contacto?: number | null
  observacion?: string
}

class ClientesPasadosApi {
  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 45000): Promise<Response> {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      return await fetch(input, { ...init, signal: controller.signal })
    } catch (err) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        throw new Error('El servidor tardó demasiado en responder. Intenta de nuevo.')
      }
      throw err
    } finally {
      clearTimeout(timer)
    }
  }

  private async handle<T>(response: Response): Promise<T> {
    let data: {
      error?: string
      message?: string
      details?: { field: string; message: string }[]
    } | null = null
    try {
      data = await response.json()
    } catch {
      /* respuesta sin JSON */
    }
    if (!response.ok) {
      if (data?.error === 'Validation Error' && data.details) {
        throw new Error(data.details.map((d) => `${d.field}: ${d.message}`).join(', '))
      }
      throw new Error(data?.message || `Error ${response.status}`)
    }
    return data as T
  }

  async listar(filtros: ListarFiltros = {}): Promise<{ data: ClientePasado[]; pagination: Paginacion }> {
    const params = new URLSearchParams()
    if (filtros.page) params.set('page', String(filtros.page))
    if (filtros.limit) params.set('limit', String(filtros.limit))
    if (filtros.q?.trim()) params.set('q', filtros.q.trim())
    if (filtros.tipos?.length) params.set('tipos', filtros.tipos.join(','))
    if (filtros.min != null) params.set('min', String(filtros.min))
    if (filtros.max != null) params.set('max', String(filtros.max))
    if (filtros.estado && filtros.estado !== 'todos') params.set('estado', filtros.estado)
    if (filtros.linea) params.set('linea', filtros.linea)
    if (filtros.rifa_id) params.set('rifa_id', filtros.rifa_id)
    if (filtros.orden) params.set('orden', filtros.orden)

    const res = await this.fetchWithTimeout(`${BASE}?${params.toString()}`, { headers: this.getAuthHeaders() })
    return this.handle(res)
  }

  async resumen(): Promise<ResumenClientesPasados> {
    const res = await this.fetchWithTimeout(`${BASE}/resumen`, { headers: this.getAuthHeaders() })
    const json = await this.handle<{ data: ResumenClientesPasados }>(res)
    return json.data
  }

  async registrarContacto(clienteId: string, body: RegistrarContactoBody): Promise<void> {
    const res = await this.fetchWithTimeout(`${BASE}/${clienteId}/contacto`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    })
    await this.handle(res)
  }

  async historial(clienteId: string): Promise<ContactoHistorial[]> {
    const res = await this.fetchWithTimeout(`${BASE}/${clienteId}/historial`, { headers: this.getAuthHeaders() })
    const json = await this.handle<{ data: ContactoHistorial[] }>(res)
    return json.data
  }

  async boletas(clienteId: string): Promise<{ proyectos: ProyectoBoletasDetalle[] }> {
    const res = await this.fetchWithTimeout(`${BASE}/${clienteId}/boletas`, { headers: this.getAuthHeaders() })
    const json = await this.handle<{ data: { proyectos: ProyectoBoletasDetalle[] } }>(res)
    return json.data
  }
}

export const clientesPasadosApi = new ClientesPasadosApi()
