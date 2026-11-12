import { API_BASE_URL } from '@/config/api'

const BASE = `${API_BASE_URL}/api/preasignaciones`

export interface Preasignacion {
  id: string
  cliente_id: string | null
  numero_boleta: number
  notas: string | null
  creado_por: string | null
  creado_por_nombre: string | null
  creado_por_rol: string | null
  ultima_aplicacion_rifa_id: string | null
  ultima_aplicacion_rifa_nombre: string | null
  ultima_aplicacion_venta_id: string | null
  ultima_aplicacion_en: string | null
  created_at: string
  updated_at: string
  cliente_nombre: string | null
  cliente_telefono: string | null
  cliente_identificacion: string | null
  cliente_email: string | null
}

export interface AplicarResultado {
  rifa_id: string
  rifa_nombre: string
  total_preasignaciones: number
  asignadas: {
    numero_boleta: number
    cliente_nombre: string
    venta_id: string | null
    en_inventario_vendedor?: boolean
    reservada?: boolean
  }[]
  omitidas: { numero_boleta: number; cliente_nombre: string; motivo: string }[]
}

export interface CuotasPreasignacion {
  aplica: boolean
  configurado?: boolean
  max_inventario?: number | null
  max_por_serie?: number
  max_total?: number
  fraccion_por_serie?: number
  total?: number
  por_serie?: Record<number, number>
  cupo_por_serie?: Record<number, number>
}

export interface ResumenPreasignSuper {
  vendedores: Array<{
    creado_por: string
    nombre: string
    rol: string
    max_inventario: number | null
    total_preasignadas: number
    por_serie: Record<number, number>
  }>
  admins: Array<{
    creado_por: string
    nombre: string
    rol: string
    max_inventario: number | null
    total_preasignadas: number
    por_serie: Record<number, number>
  }>
  total_registros: number
}

class PreasignacionesApi {
  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async fetchWithTimeout(input: string, init: RequestInit = {}, timeoutMs = 60000): Promise<Response> {
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
    const data = await response.json()
    if (!response.ok) {
      if (data.error === 'Validation Error' && data.details) {
        const msg = data.details.map((d: any) => `${d.field}: ${d.message}`).join(', ')
        throw new Error(msg)
      }
      throw new Error(data.message || `Error ${response.status}`)
    }
    return data.data as T
  }

  async listar(q?: string): Promise<Preasignacion[]> {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
    const res = await this.fetchWithTimeout(`${BASE}${qs}`, { headers: this.getAuthHeaders() })
    return this.handle<Preasignacion[]>(res)
  }

  async cuotas(): Promise<CuotasPreasignacion> {
    const res = await this.fetchWithTimeout(`${BASE}/cuotas`, { headers: this.getAuthHeaders() })
    return this.handle<CuotasPreasignacion>(res)
  }

  async resumenSuper(q?: string): Promise<ResumenPreasignSuper> {
    const qs = q && q.trim() ? `?q=${encodeURIComponent(q.trim())}` : ''
    const res = await this.fetchWithTimeout(`${BASE}/resumen-super${qs}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handle<ResumenPreasignSuper>(res)
  }

  async crear(body: {
    cliente_id?: string | null
    numero_boleta: number
    notas?: string
  }): Promise<Preasignacion> {
    const res = await this.fetchWithTimeout(BASE, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    })
    return this.handle<Preasignacion>(res)
  }

  async actualizar(
    id: string,
    body: { cliente_id?: string; numero_boleta?: number; notas?: string }
  ): Promise<Preasignacion> {
    const res = await this.fetchWithTimeout(`${BASE}/${id}`, {
      method: 'PUT',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(body),
    })
    return this.handle<Preasignacion>(res)
  }

  async eliminar(id: string): Promise<{ id: string; numero_boleta: number }> {
    const res = await this.fetchWithTimeout(`${BASE}/${id}`, {
      method: 'DELETE',
      headers: this.getAuthHeaders(),
    })
    return this.handle(res)
  }

  async aplicarARifa(rifaId: string): Promise<AplicarResultado> {
    const res = await this.fetchWithTimeout(`${BASE}/aplicar`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ rifa_id: rifaId }),
    }, 120000)
    return this.handle<AplicarResultado>(res)
  }
}

export const preasignacionesApi = new PreasignacionesApi()
