import { getModuleLastPath } from '@/lib/moduleLastPath'
import { loadVentasNuevaDraft } from '@/lib/ventasNuevaDraft'
import {
  clearAdminModulePathsInSession,
  isAdminRole,
  readUserRolFromStorage,
} from '@/lib/moduleSessionCache'

/** Ruta a la que debe ir el usuario al entrar al módulo Ventas. */
export function resolveVentasEntryHref(): string {
  const rol = readUserRolFromStorage()
  if (isAdminRole(rol)) {
    clearAdminModulePathsInSession()
    return '/ventas'
  }

  const last = getModuleLastPath('ventas', '/ventas')
  if (last !== '/ventas' && last.startsWith('/ventas/')) {
    return last
  }

  const draft = loadVentasNuevaDraft()
  if (
    draft &&
    (draft.boletasSeleccionadas.length > 0 ||
      draft.rifaId ||
      draft.pasoActual !== 'seleccionar-rifa')
  ) {
    return '/ventas/nueva-venta'
  }

  return '/ventas'
}