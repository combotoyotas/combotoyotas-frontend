import { API_BASE_URL } from '@/config/api'

const BASE = `${API_BASE_URL}/api/inventario`

export interface InventarioVendedorResumen {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  max_boletas_inventario: number | null
  asignadas_total: number
  asignadas_libres: number
  asignadas_bloqueadas: number
  asignadas_con_venta: number
  reservadas: number
  abonadas: number
  pagadas: number
}

export interface InventarioSerie {
  serie: number
  libres: number
  desde: number
  hasta: number
}

export interface InventarioResumen {
  rifa: {
    id: string
    nombre: string
    estado: string
    total_boletas: number
    doble_oportunidad: boolean
    inventario_por_vendedor: boolean
  }
  pool: {
    total: number
    disponibles_libres: number
    bloqueadas: number
    reservadas: number
    abonadas: number
    pagadas: number
  }
  series_libres: InventarioSerie[]
  bloqueos_vigentes: number
  boletas_sin_vendedor: number
  vendedores: InventarioVendedorResumen[]
}

export interface InventarioBoleta {
  boleta_id: string
  numero: number
  numero_principal: number
  numeros: number[]
  estado: string
  bloqueo_hasta: string | null
  bloqueada: boolean
  serie: number | null
  origen: string
  asignado_en: string
  asignado_por_nombre: string | null
  cliente_nombre: string | null
}

export interface InventarioRango {
  desde: number
  hasta: number
  cantidad: number
}

export interface InventarioDetalle {
  vendedor: { id: string; nombre: string; email: string; rol: string; activo: boolean }
  total: number
  rangos: InventarioRango[]
  boletas: InventarioBoleta[]
}

export interface AsignacionSerieItem {
  serie: number
  cantidad: number
}

export interface AsignarPayload {
  vendedor_id: string
  serie?: number | null
  desde?: number | null
  hasta?: number | null
  cantidad?: number | null
  numeros?: number[]
  asignaciones_series?: AsignacionSerieItem[]
  notas?: string | null
}

export interface AsignarPachaResumen {
  boleta_id: string
  numeros: number[]
  par: string
}

export interface AsignacionSerieResumen {
  serie: number
  pedidas: number
  asignadas: number
}

export interface AsignarResultado {
  modo: string
  serie?: number | null
  vendedor: { id: string; nombre: string }
  pedidas: number
  asignadas: number
  omitidas: number
  boleta_ids: string[]
  pachas: AsignarPachaResumen[]
  por_serie?: AsignacionSerieResumen[]
}

export interface QuitarPayload {
  vendedor_id?: string | null
  numeros?: number[]
  serie?: number | null
  cantidad?: number | null
}

export interface QuitarResultado {
  modo: string
  liberadas: number
  boleta_ids: string[]
}

export interface VerificacionNumeroItem {
  numero_solicitado: number
  boleta_id: string | null
  codigo: string
  mensaje: string
  asignable?: boolean
  liberable?: boolean
  par?: string
  inventario_de?: string | null
  estado?: string | null
}

export interface VerificacionNumerosResult {
  context: 'ASIGNAR' | 'QUITAR'
  items: VerificacionNumeroItem[]
  resumen: {
    total: number
    asignables?: number
    liberables?: number
    bloqueados: number
  }
}

export type SolicitudBoletaResultado =
  | 'ASIGNADA'
  | 'OTRO_VENDEDOR'
  | 'CON_CLIENTE'
  | 'NO_DISPONIBLE'
  | 'NO_ENCONTRADA'
  | 'BLOQUEADA'
  | 'YA_TUYA'
  | 'INVENTARIO_INACTIVO'
  | 'NO_ASIGNABLE'

export interface SolicitudBoletaResponse {
  resultado: SolicitudBoletaResultado
  mensaje: string
  numero_solicitado?: number
  asignada?: boolean
  boleta?: {
    boleta_id: string
    numero: number
    numeros: number[]
    par: string
    estado: string
    bloqueo_vigente: boolean
    cliente_id: string | null
    cliente_nombre: string | null
    inventario_vendedor_id: string | null
    inventario_de: string | null
  }
  vendedor?: { id: string; nombre: string }
  rifa?: { id: string; nombre: string }
}

class InventarioApi {
  private getAuthHeaders() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async fetchWithTimeout(
    input: string,
    init: RequestInit = {},
    timeoutMs = 60000
  ): Promise<Response> {
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

  async getResumen(rifaId: string): Promise<InventarioResumen> {
    const res = await this.fetchWithTimeout(`${BASE}/rifa/${rifaId}/resumen`, {
      headers: this.getAuthHeaders(),
    })
    return this.handle<InventarioResumen>(res)
  }

  async getDetalleVendedor(rifaId: string, vendedorId: string): Promise<InventarioDetalle> {
    const res = await this.fetchWithTimeout(`${BASE}/rifa/${rifaId}/vendedor/${vendedorId}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handle<InventarioDetalle>(res)
  }

  async getMiInventario(rifaId: string): Promise<InventarioDetalle> {
    const res = await this.fetchWithTimeout(`${BASE}/rifa/${rifaId}/mi-inventario`, {
      headers: this.getAuthHeaders(),
    })
    return this.handle<InventarioDetalle>(res)
  }

  async solicitarBoleta(rifaId: string, numero: number): Promise<SolicitudBoletaResponse> {
    const res = await this.fetchWithTimeout(
      `${BASE}/rifa/${rifaId}/solicitar-boleta`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify({ numero }),
      },
      30000
    )
    return this.handle<SolicitudBoletaResponse>(res)
  }

  async verificarNumeros(
    rifaId: string,
    payload: {
      numeros: number[]
      context: 'ASIGNAR' | 'QUITAR'
      vendedor_id?: string | null
    }
  ): Promise<VerificacionNumerosResult> {
    const res = await this.fetchWithTimeout(
      `${BASE}/rifa/${rifaId}/verificar-numeros`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      45000
    )
    return this.handle<VerificacionNumerosResult>(res)
  }

  async asignar(rifaId: string, payload: AsignarPayload): Promise<AsignarResultado> {
    const res = await this.fetchWithTimeout(
      `${BASE}/rifa/${rifaId}/asignar`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      120000
    )
    return this.handle<AsignarResultado>(res)
  }

  async quitar(rifaId: string, payload: QuitarPayload): Promise<QuitarResultado> {
    const res = await this.fetchWithTimeout(
      `${BASE}/rifa/${rifaId}/quitar`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: JSON.stringify(payload),
      },
      120000
    )
    return this.handle<QuitarResultado>(res)
  }

  async mover(
    rifaId: string,
    payload: { origen_id: string; destino_id: string; numeros: number[] }
  ): Promise<{ liberadas: number; asignadas: number; destino: { id: string; nombre: string } }> {
    const res = await this.fetchWithTimeout(`${BASE}/rifa/${rifaId}/mover`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return this.handle(res)
  }

  async sembrar(rifaId: string): Promise<{ registradas: number }> {
    const res = await this.fetchWithTimeout(
      `${BASE}/rifa/${rifaId}/sembrar`,
      {
        method: 'POST',
        headers: this.getAuthHeaders(),
      },
      120000
    )
    return this.handle(res)
  }

  async setFlag(
    rifaId: string,
    activo: boolean,
    forzar = false
  ): Promise<{ id: string; nombre: string; inventario_por_vendedor: boolean }> {
    const res = await this.fetchWithTimeout(`${BASE}/rifa/${rifaId}/flag`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ activo, forzar }),
    })
    return this.handle(res)
  }

  async actualizarTopeVendedor(
    vendedorId: string,
    max_boletas_inventario: number | null
  ): Promise<{ id: string; nombre: string; max_boletas_inventario: number | null }> {
    const res = await this.fetchWithTimeout(`${BASE}/vendedor/${vendedorId}/tope`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ max_boletas_inventario }),
    })
    return this.handle(res)
  }
}

export const inventarioApi = new InventarioApi()
