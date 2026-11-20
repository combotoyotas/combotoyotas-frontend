import { BACKEND_API_ROOT } from '@/config/api'
import { TokenManager } from '@/utils/auth'

function authHeaders(): HeadersInit {
  const token = TokenManager.getToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function parseAuthJson(res: Response) {
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
  }
  return data
}

export type VendedorPaginaRow = {
  id: string
  nombre: string
  email?: string
  activo: boolean
  pagina_web_habilitada: boolean
  pagina_web_slug: string | null
  url: string | null
  reservas_pagina?: number
}

export type PaginaContactoItem = {
  id: string
  nombre: string
  valor: string
  activo?: boolean
  orden?: number
}

export const paginasWebApi = {
  async listVendedores() {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/admin/vendedores`, {
      headers: authHeaders(),
    })
    return parseAuthJson(res)
  },

  async configurar(vendedorId: string, habilitada: boolean, slug: string) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/admin/vendedores/${vendedorId}`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ habilitada, slug }),
    })
    return parseAuthJson(res)
  },

  async miPagina() {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi`, { headers: authHeaders() })
    return parseAuthJson(res)
  },

  async misReservas() {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/reservas`, { headers: authHeaders() })
    return parseAuthJson(res)
  },

  async getContactoPagina() {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto`, { headers: authHeaders() })
    return parseAuthJson(res)
  },

  async saveMedioPagina(body: {
    id?: string
    nombre: string
    valor: string
    activo?: boolean
  }) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto/medios-pago`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    return parseAuthJson(res)
  },

  async saveLineaWhatsApp(body: {
    id?: string
    nombre: string
    valor: string
    activo?: boolean
  }) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto/lineas-whatsapp`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(body),
    })
    return parseAuthJson(res)
  },

  async deleteMedioPagina(id: string) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto/medios-pago/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return parseAuthJson(res)
  },

  async deleteLineaWhatsApp(id: string) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto/lineas-whatsapp/${id}`, {
      method: 'DELETE',
      headers: authHeaders(),
    })
    return parseAuthJson(res)
  },

  async savePlantillaContacto(plantilla: string) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/contacto/plantilla`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ plantilla }),
    })
    return parseAuthJson(res)
  },

  async marcarReservaContactada(ventaId: string) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/reservas/${ventaId}/contactar`, {
      method: 'POST',
      headers: authHeaders(),
    })
    return parseAuthJson(res)
  },

  async setVentaActiva(activa: boolean) {
    const res = await fetch(`${BACKEND_API_ROOT}/paginas-web/mi/venta-activa`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ activa }),
    })
    return parseAuthJson(res)
  },
}