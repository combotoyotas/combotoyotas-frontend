import { getModuleLastPath } from '@/lib/moduleLastPath'

const MODULE_VENTAS = 'ventas'
const MODULE_BOLETAS = 'boletas'

export function isAdminRole(rol: string | null | undefined): boolean {
  const r = String(rol || '').toUpperCase()
  return r === 'ADMIN' || r === 'SUPER_ADMIN'
}

export function readUserRolFromStorage(): string | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem('user')
    if (!raw) return null
    return JSON.parse(raw)?.rol ?? null
  } catch {
    return null
  }
}

/** Vendedores: recordar última subruta; admins: ventas/boletas siempre entran al inicio del módulo. */
export function shouldPersistModulePath(
  moduleId: string,
  rol: string | null | undefined
): boolean {
  if (!isAdminRole(rol)) return true
  return moduleId !== MODULE_VENTAS && moduleId !== MODULE_BOLETAS
}

export function resolveModuleNavHref(
  moduleId: string,
  defaultHref: string,
  rol: string | null | undefined
): string {
  if (isAdminRole(rol)) {
    if (moduleId === MODULE_VENTAS) return '/ventas'
    if (moduleId === MODULE_BOLETAS) return '/boletas/ver'
  }
  return getModuleLastPath(moduleId, defaultHref)
}

export function clearAdminModulePathsInSession() {
  if (typeof window === 'undefined') return
  try {
    sessionStorage.removeItem(`module-last:${MODULE_VENTAS}`)
    sessionStorage.removeItem(`module-last:${MODULE_BOLETAS}`)
  } catch {
    /* ignore */
  }
}