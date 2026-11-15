export interface Rifa {
  id: string
  nombre: string
  slug: string | null
  descripcion: string
  estado: 'BORRADOR' | 'ACTIVA' | 'PAUSADA' | 'TERMINADA'
  precio_boleta: string
  fecha_inicio: string | null
  fecha_fin: string | null
  fecha_sorteo: string | null
  premio_principal: string | null
  premio: string // Alias para premio_principal para compatibilidad
  total_boletas: number
  boletas_vendidas: number
  boletas_disponibles: number
  imagen_url: string | null
  terminos_condiciones: string | null
  creado_por: string
  creador_nombre?: string
  created_at: string
  updated_at: string
  doble_oportunidad?: boolean
  numeros_por_boleta?: number
}

export interface RifaCreateRequest {
  titulo: string
  descripcion: string
  precio_boleta: number
  total_boletas: number
  fecha_sorteo: string
  estado?: 'BORRADOR' | 'ACTIVA' | 'PAUSADA' | 'TERMINADA'
  doble_oportunidad?: boolean
}

export interface RifaUpdateRequest {
  titulo?: string
  descripcion?: string
  precio_boleta?: number
  fecha_sorteo?: string
  estado?: 'BORRADOR' | 'ACTIVA' | 'PAUSADA' | 'TERMINADA'
  imagen_url?: string | null
}

export interface RifaListResponse {
  success: boolean
  message: string
  data: Rifa[]
}

export interface RifaResponse {
  success: boolean
  message: string
  data: Rifa
}

export interface RifaStats {
  id: string
  titulo: string
  total_boletas: number
  boletas_vendidas: number
  recaudado: string
  boletas_disponibles: number
}

export interface RifaStatsResponse {
  success: boolean
  message: string
  data: RifaStats
}

export interface RifaCreateResponse {
  success: boolean
  message: string
  data: Rifa
}

export interface RifaDeleteResponse {
  success: boolean
  message: string
  data: {
    id: string
    nombre: string
  }
}

export interface ApiError {
  error: string
  message: string
  details?: Array<{
    field: string
    message: string
  }>
}

export interface ValidationError {
  error: string
  message: string
  details: Array<{
    field: string
    message: string
  }>
}

export interface UnauthorizedError {
  error: string
  message: string
}

export interface ForbiddenError {
  error: string
  message: string
}
