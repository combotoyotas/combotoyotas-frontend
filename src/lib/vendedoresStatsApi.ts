import { API_BASE_URL } from '@/config/api'

export interface VendedorStats {
  id: string
  nombre: string
  email: string
  rol: 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR' | string
  activo: boolean
  ultimo_login: string | null
  created_at: string
  total_ventas: number
  monto_total: number
  abonado_total: number
  saldo_pendiente: number
  clientes_unicos: number
  boletas_vendidas: number
  boletas_pagadas: number
  boletas_abonadas: number
  boletas_reservadas: number
  boletas_libres?: number
  abonos_registrados: number
  abonos_monto: number
  cuenta?: CuentaVendedor | null
  cuenta_global?: CuentaVendedor | null
}

export interface CuentaLineaDesglose {
  cantidad: number
  cobrado: number
  comision_vendedor: number
  debe_organizacion: number
  comision_porcentaje?: number
}

export interface CuentaPotencialLinea {
  cantidad: number
  valor_potencial: number
}

export interface CuentaDesgloseBoletas {
  pagadas: CuentaLineaDesglose
  abonadas: CuentaLineaDesglose
  reservadas: CuentaPotencialLinea
  libres: CuentaPotencialLinea
}

export interface CuentaVendedor {
  cobrado_clientes: number
  comision_vendedor: number
  /** Saldo pendiente de entrega (= por_cobrar) */
  debe_organizacion: number
  /** Parte org. sobre cobrado, sin descontar liquidaciones */
  parte_organizacion?: number
  entregado_liquidaciones: number
  entregado: number
  por_cobrar: number
  comision_porcentaje: number
  admin_porcentaje: number
  periodo?: boolean
  desglose?: CuentaDesgloseBoletas
}

export interface ResumenGlobal {
  total_ventas: number
  monto_total: number
  abonado_total: number
  saldo_pendiente: number
  clientes_unicos: number
  vendedores_activos: number
}

export interface VendedorDetalleResumen {
  total_ventas: number
  monto_total: number
  abonado_total: number
  saldo_pendiente: number
  clientes_unicos: number
  boletas_vendidas: number
  boletas_pagadas: number
  boletas_abonadas: number
  boletas_reservadas: number
  abonos_registrados: number
  abonos_monto: number
  boletas_libres?: number
  total_liquidado?: number
  ganancia_estimada?: number
  comision_porcentaje?: number
  comision_abono_porcentaje?: number
  cobrado_clientes?: number
  debe_organizacion?: number
  por_cobrar?: number
  por_cobrar_global?: number
  debe_organizacion_global?: number
  entregado_global?: number
  total_liquidado_periodo?: number
}

export interface BoletaLibreRow {
  id: string
  numero: number
  estado: string
  rifa_id: string
  rifa_nombre: string
}

export interface LiquidacionRow {
  id: string
  monto: number
  notas: string | null
  created_at: string
  registrado_por_nombre?: string
  rifa_nombre?: string | null
}

export interface VendedorClienteRow {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  total_ventas: number
  monto_total: number
  abonado_total: number
  saldo_pendiente: number
  ultima_venta: string | null
}

export interface VendedorVentaRow {
  id: string
  created_at: string
  monto_total: number
  abono_total: number
  saldo_pendiente: number
  estado_venta: string
  cliente_id: string
  cliente_nombre: string
  cliente_telefono: string | null
  rifa_id: string
  rifa_nombre: string
  total_boletas: number
}

export interface VendedorBoletaRow {
  id: string
  numero: number
  numero_principal: number
  numeros: number[]
  estado: string
  created_at: string
  updated_at: string
  venta_id: string
  venta_fecha: string
  estado_venta: string
  rifa_id: string
  rifa_nombre: string
  cliente_id: string | null
  cliente_nombre: string | null
  cliente_telefono: string | null
}

export interface VendedorDetalleResponse {
  success: boolean
  vendedor: {
    id: string
    nombre: string
    email: string
    rol: string
    telefono: string | null
    activo: boolean
    ultimo_login: string | null
    created_at: string
    comision_porcentaje?: number
    /** Solo SUPER_ADMIN: contraseña archivada al crear o al cambiar la clave */
    contrasena_acceso?: string | null
  }
  resumen: VendedorDetalleResumen
  clientes: VendedorClienteRow[]
  ventas: VendedorVentaRow[]
  boletas: VendedorBoletaRow[]
  boletas_libres?: BoletaLibreRow[]
  liquidaciones?: LiquidacionRow[]
  cuenta?: CuentaVendedor | null
  cuenta_global?: CuentaVendedor | null
}

export interface CrearUsuarioPayload {
  nombre: string
  password: string
  rol: 'ADMIN' | 'VENDEDOR'
  email?: string
  max_boletas_inventario?: number | null
}

export interface UsuarioCreado {
  id: string
  nombre: string
  email: string
  rol: string
  activo: boolean
  created_at: string
}

interface ListResponse {
  success: boolean
  data: VendedorStats[]
  resumen: ResumenGlobal
}

function getAuthHeaders() {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  const data = await res.json()
  if (!res.ok) throw new Error(data.message || `HTTP ${res.status}`)
  return data
}

function buildQuery(params: Record<string, string | undefined>) {
  const qs = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => {
    if (v) qs.append(k, v)
  })
  const s = qs.toString()
  return s ? `?${s}` : ''
}

export const vendedoresStatsApi = {
  async list(fechaInicio?: string, fechaFin?: string): Promise<ListResponse> {
    const qs = buildQuery({ fechaInicio, fechaFin })
    const res = await fetch(`${API_BASE_URL}/api/vendedores-stats${qs}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<ListResponse>(res)
  },

  async detalle(id: string, fechaInicio?: string, fechaFin?: string): Promise<VendedorDetalleResponse> {
    const qs = buildQuery({ fechaInicio, fechaFin })
    const res = await fetch(`${API_BASE_URL}/api/vendedores-stats/${id}${qs}`, {
      headers: getAuthHeaders(),
    })
    return handleResponse<VendedorDetalleResponse>(res)
  },

  async crearUsuario(
    payload: CrearUsuarioPayload
  ): Promise<{ success: boolean; data: UsuarioCreado; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/vendedores-stats/usuarios`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse(res)
  },

  async registrarLiquidacion(
    vendedorId: string,
    payload: { monto: number; rifa_id?: string; notas?: string }
  ): Promise<{ success: boolean; data: LiquidacionRow }> {
    const res = await fetch(`${API_BASE_URL}/api/vendedores-stats/${vendedorId}/liquidaciones`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse(res)
  },

  async actualizarUsuario(
    id: string,
    payload: {
      nombre?: string
      email?: string
      password?: string
      comision_porcentaje?: number
      max_boletas_inventario?: number | null
    }
  ): Promise<{ success: boolean; data: UsuarioCreado; message?: string }> {
    const res = await fetch(`${API_BASE_URL}/api/vendedores-stats/usuarios/${id}`, {
      method: 'PATCH',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    })
    return handleResponse(res)
  },
}
