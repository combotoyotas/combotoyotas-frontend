import { API_BASE_URL } from '@/config/api'

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token =
    typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const res = await fetch(`${API_BASE_URL}/api/ajustes${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data?.message || `Error ${res.status}`)
  }
  return data.data as T
}

export type MedioPagoItem = {
  id: string
  nombre: string
  descripcion?: string | null
  activo?: boolean
  orden?: number
  origen?: 'vendedor' | 'global'
}

export type LineaVentaItem = {
  id: string
  nombre: string
  descripcion?: string | null
  activo?: boolean
  orden?: number
  origen?: 'vendedor' | 'global'
}

export const ajustesApi = {
  mediosParaVentas: () => request<MedioPagoItem[]>('/ventas/medios-pago'),
  lineasParaVentas: () => request<LineaVentaItem[]>('/ventas/lineas-venta'),
  getMisAjustes: () =>
    request<{ medios_pago: MedioPagoItem[]; lineas_venta: LineaVentaItem[] }>('/mios'),
  saveMedioVendedor: (body: Partial<MedioPagoItem> & { nombre: string }) =>
    request<MedioPagoItem>('/mios/medios-pago', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  saveLineaVendedor: (body: Partial<LineaVentaItem> & { nombre: string }) =>
    request<LineaVentaItem>('/mios/lineas-venta', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteMedioVendedor: (id: string) =>
    request<{ id: string }>(`/mios/medios-pago/${id}`, { method: 'DELETE' }),
  deleteLineaVendedor: (id: string) =>
    request<{ id: string }>(`/mios/lineas-venta/${id}`, { method: 'DELETE' }),
  getGlobalMedios: () => request<MedioPagoItem[]>('/global/medios-pago'),
  saveGlobalMedio: (body: Partial<MedioPagoItem> & { nombre: string }) =>
    request<MedioPagoItem>('/global/medios-pago', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteGlobalMedio: (id: string) =>
    request<{ id: string }>(`/global/medios-pago/${id}`, { method: 'DELETE' }),
  getGlobalLineas: () => request<LineaVentaItem[]>('/global/lineas-venta'),
  saveGlobalLinea: (body: Partial<LineaVentaItem> & { nombre: string }) =>
    request<LineaVentaItem>('/global/lineas-venta', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteGlobalLinea: (id: string) =>
    request<{ id: string }>(`/global/lineas-venta/${id}`, { method: 'DELETE' }),
  getComisionVendedores: () =>
    request<{
      comision_vendedores_pagada_pct: number
      comision_vendedores_abono_pct: number
      comision_vendedores_pct?: number
    }>('/global/comision-vendedores'),
  getWhatsappPlantillasBoleta: () =>
    request<{ reservada: string; abonada: string }>('/whatsapp-plantillas-boleta'),
  getGlobalWhatsappPlantillasBoleta: () =>
    request<{ reservada: string; abonada: string }>('/global/whatsapp-plantillas-boleta'),
  saveGlobalWhatsappPlantillasBoleta: (body: { reservada?: string; abonada?: string }) =>
    request<{ reservada: string; abonada: string }>('/global/whatsapp-plantillas-boleta', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  saveVendedorWhatsappPlantillasBoleta: (body: { reservada?: string; abonada?: string }) =>
    request<{ reservada: string; abonada: string }>('/mios/whatsapp-plantillas-boleta', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  saveComisionVendedores: (body: {
    comision_vendedores_pct?: number
    comision_vendedores_pagada_pct?: number
    comision_vendedores_abono_pct?: number
  }) =>
    request<{
      comision_vendedores_pagada_pct: number
      comision_vendedores_abono_pct: number
    }>('/global/comision-vendedores', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
}
