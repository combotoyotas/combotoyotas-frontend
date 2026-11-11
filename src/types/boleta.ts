export interface ClienteInfo {
  id: string
  nombre: string
  email: string
  telefono: string
  identificacion: string
}

export interface VendedorInfo {
  id: string
  nombre: string
  email?: string
}

export interface InventarioInfo {
  id: string
  nombre: string
  serie?: number | null
}

export interface Boleta {
  id: string
  numero: number
  numeros?: number[]
  estado: string
  qr_url: string | null
  barcode: string | null
  cliente_info: ClienteInfo | null
  vendedor_info: VendedorInfo | null
  inventario_info?: InventarioInfo | null
  tiene_cliente: boolean
  tipo_estado: 'DISPONIBLE' | 'RESERVADA' | 'CON_PAGO' | 'TRANSFERIDA' | 'ANULADA'
  bloqueo_hasta?: string | null
  imagen_url?: string | null
  nota?: string | null
}

export interface AbonoHistorial {
  id: string
  monto: number
  moneda: string
  estado: string
  referencia: string | null
  metodo_pago: string
  gateway_pago?: string | null
  notas: string | null
  fecha: string
  registrado_por?: string | null
  registrado_por_nombre?: string | null
  registrado_por_rol?: string | null
  linea_venta_nombre?: string | null
}

export interface BoletaDetail {
  id: string
  rifa_id: string
  numero: number
  numeros?: number[]
  estado: string
  qr_url: string
  barcode: string
  cliente_id: string | null
  vendido_por: string | null
  venta_id: string | null
  reserva_token: string | null
  bloqueo_hasta: string | null
  created_at: string
  updated_at: string
  rifa_nombre: string
  vendedor_nombre: string | null
  imagen_url: string | null
  qr_base_url: string | null
  diseño_template: string | null
  nota?: string | null
  cliente_info?: ClienteInfo | null
  vendedor_info?: VendedorInfo | null
  venta_info?: {
    id: string
    fecha_venta: string
    total_pagado: number
    saldo_pendiente: number
    metodo_pago: string
    estado: string
  } | null
  abonos?: AbonoHistorial[]
  boleta_financiero?: {
    precio_boleta: number
    total_pagado: number
    saldo_pendiente: number
  } | null
}

export interface BoletaDetailResponse {
  success: boolean
  message: string
  data: BoletaDetail
}

export interface BoletaListResponse {
  success: boolean
  message: string
  data: Boleta[]
}

export interface BoletaGenerateRequest {
  qr_base_url: string
  imagen_url: string
  diseño_template: string
  modo_pareo?: 'aleatorio' | 'manual'
  pares?: [number, number][]
}

export interface BoletaGenerateResponse {
  success: boolean
  message: string
  data: {
    rifa_id: string
    total_boletas: number
    boletas_generadas: number
    estado: string
    qr_base_url: string
    imagen_url: string
    diseño_template: string
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

export interface BoletaGenerateError {
  success: false
  message: string
  error?: string
  retryAfter?: string
}
