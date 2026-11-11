import { API_BASE_URL } from '@/config/api'
import type { InventarioBoleta } from '@/lib/inventarioApi'

const BASE = `${API_BASE_URL}/api/trueques`

export type TruequePartyTipo = 'OFICINA' | 'VENDEDOR'

export interface TruequeParty {
  tipo: TruequePartyTipo
  vendedor_id?: string | null
}

export interface TruequeVendedorOption {
  id: string
  nombre: string
  email: string
  asignadas_libres: number
}

export interface TruequeContexto {
  rifa: { id: string; nombre: string; estado: string }
  pool: { disponibles_libres: number; total: number }
  vendedores: TruequeVendedorOption[]
}

export interface TruequeInventarioResponse {
  party: { tipo: TruequePartyTipo; vendedor_id: string | null; nombre: string }
  total: number
  truncado?: boolean
  boletas: InventarioBoleta[]
}

export interface ValidarTruequeItem {
  numero: number
  ok: boolean
  mensaje: string
}

class TruequesApi {
  private headers() {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handle<T>(res: Response): Promise<T> {
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || `Error ${res.status}`)
    return data.data as T
  }

  async getContexto(rifaId: string) {
    const res = await fetch(`${BASE}/rifa/${rifaId}/contexto`, { headers: this.headers() })
    return this.handle<TruequeContexto>(res)
  }

  async getInventario(rifaId: string, party: TruequeParty) {
    const q = new URLSearchParams({ tipo: party.tipo })
    if (party.tipo === 'VENDEDOR' && party.vendedor_id) {
      q.set('vendedor_id', party.vendedor_id)
    }
    const res = await fetch(`${BASE}/rifa/${rifaId}/inventario?${q}`, { headers: this.headers() })
    return this.handle<TruequeInventarioResponse>(res)
  }

  async validar(rifaId: string, party: TruequeParty, numeros: number[]) {
    const res = await fetch(`${BASE}/rifa/${rifaId}/validar`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify({ party, numeros }),
    })
    return this.handle<{ items: ValidarTruequeItem[]; resumen: { total: number; validos: number; invalidos: number } }>(
      res
    )
  }

  async transferir(
    rifaId: string,
    payload: { origen: TruequeParty; destino: TruequeParty; numeros: number[]; notas?: string }
  ) {
    const res = await fetch(`${BASE}/rifa/${rifaId}/transferir`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error en transferencia')
    return data.data
  }

  async trueque(
    rifaId: string,
    payload: {
      party_a: TruequeParty
      party_b: TruequeParty
      numeros_a: number[]
      numeros_b: number[]
      notas?: string
    }
  ) {
    const res = await fetch(`${BASE}/rifa/${rifaId}/trueque`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error en trueque')
    return data.data
  }

  /** Trueque si hay carrito en ambas columnas; envío si solo hay carrito en una. */
  async ejecutar(
    rifaId: string,
    payload: {
      party_a: TruequeParty
      party_b: TruequeParty
      numeros_a: number[]
      numeros_b: number[]
      notas?: string
    }
  ) {
    const res = await fetch(`${BASE}/rifa/${rifaId}/ejecutar`, {
      method: 'POST',
      headers: this.headers(),
      body: JSON.stringify(payload),
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.message || 'Error en la operación')
    return data.data as { modo: 'TRUEQUE' | 'TRANSFERIR' }
  }
}

export const truequesApi = new TruequesApi()
