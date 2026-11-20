import { SESSION_USER_UPDATED } from '@/config/api'
import { paginasWebApi } from '@/lib/paginasWebApi'
import { TokenManager } from '@/utils/auth'

export type SessionUser = {
  id?: string
  email?: string
  nombre?: string
  rol?: string
  pagina_web_habilitada?: boolean
  pagina_web_slug?: string | null
}

/** Actualiza localStorage con el estado real de la página web (tras habilitar en super admin). */
export async function syncVendedorPaginaSession(): Promise<SessionUser | null> {
  const token = TokenManager.getToken()
  const user = TokenManager.getUser() as SessionUser | null
  if (!token || !user) return null
  if (String(user.rol).toUpperCase() !== 'VENDEDOR') return user
  try {
    const res = await paginasWebApi.miPagina()
    if (!res.success) return user
    const merged: SessionUser = {
      ...user,
      pagina_web_habilitada: Boolean(res.data?.habilitada),
      pagina_web_slug: res.data?.slug ?? null,
    }
    TokenManager.saveAuthData(token, merged)
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(SESSION_USER_UPDATED))
    }
    return merged
  } catch {
    return user
  }
}