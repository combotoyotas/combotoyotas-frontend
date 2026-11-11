import { API_BASE_URL } from '@/config/api'
import { 
  Boleta, 
  BoletaListResponse,
  BoletaGenerateRequest,
  BoletaGenerateResponse,
  BoletaDetailResponse,
  ApiError 
} from '@/types/boleta'

class BoletaApiService {
  private getAuthHeaders() {
    const token = localStorage.getItem('token')
    return {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` })
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    const data = await response.json()
    
    if (!response.ok) {
      if (data.error === 'Validation Error' && data.details) {
        const validationErrors = data.details.map((detail: any) => 
          `${detail.field}: ${detail.message}`
        ).join(', ')
        throw new Error(validationErrors)
      }
      throw new Error(data.message || `HTTP error! status: ${response.status}`)
    }
    
    return data
  }

  async getBoletasByRifa(rifaId: string): Promise<BoletaListResponse> {
    const response = await fetch(`${API_BASE_URL}/api/boletas/rifa/${rifaId}/full-status`, {
      headers: this.getAuthHeaders()
    })
    return this.handleResponse<BoletaListResponse>(response)
  }

  async getBoletasCuadricula(
    rifaId: string,
    options?: { vendedorId?: string }
  ): Promise<{
    success: boolean
    data: {
      rifa: { id: string; nombre: string; estado: string; total_boletas: number } | null
      alcance: 'pool_libre' | 'inventario_vendedor' | 'todas'
      boletas: Array<{
        id: string
        numero: number
        numero_principal: number
        estado: string
        tipo_estado: string
        comprable?: boolean
      }>
    }
  }> {
    const qs =
      options?.vendedorId != null && options.vendedorId !== ''
        ? `?vendedor_id=${encodeURIComponent(options.vendedorId)}`
        : ''
    const response = await fetch(`${API_BASE_URL}/api/boletas/rifa/${rifaId}/cuadricula${qs}`, {
      headers: this.getAuthHeaders(),
    })
    return this.handleResponse(response)
  }

  async getBoletaById(boletaId: string): Promise<BoletaDetailResponse> {
    const response = await fetch(`${API_BASE_URL}/api/boletas/${boletaId}`, {
      headers: this.getAuthHeaders()
    })
    return this.handleResponse<BoletaDetailResponse>(response)
  }

  async generarBoletas(rifaId: string, request: BoletaGenerateRequest): Promise<BoletaGenerateResponse> {
    console.log('Generating boletas with data:', {
      rifaId,
      request,
      requestBody: JSON.stringify(request)
    })
    
    const response = await fetch(`${API_BASE_URL}/api/rifas/${rifaId}/generate-boletas`, {
      method: 'POST',
      headers: this.getAuthHeaders(),
      body: JSON.stringify(request)
    })
    return this.handleResponse<BoletaGenerateResponse>(response)
  }

  async updateBoletaNota(boletaId: string, nota: string | null): Promise<{ success: boolean; data: { id: string; numero: number; nota: string | null } }> {
    const response = await fetch(`${API_BASE_URL}/api/boletas/${boletaId}/nota`, {
      method: 'PATCH',
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ nota })
    })
    return this.handleResponse(response)
  }
  async getNumerosEstado(rifaId: string): Promise<{
    success: boolean
    data: {
      rifa_id: string
      doble_oportunidad: boolean
      numeros_por_boleta: number
      total_boletas: number
      numeros: Array<{
        numero: number
        boleta_id: string
        orden: number
        estado: string
        par: number[]
      }>
    }
  }> {
    const response = await fetch(`${API_BASE_URL}/api/boletas/rifa/${rifaId}/numeros-estado`, {
      headers: this.getAuthHeaders()
    })
    return this.handleResponse(response)
  }
}

export const boletaApi = new BoletaApiService()
