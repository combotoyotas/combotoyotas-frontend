export type AdminUser = {
  id: string
  email: string
  nombre: string
  rol: string
}

export type AdminNavItem = {
  href: string
  label: string
  description: string
  roles: Array<'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR'>
}

export const ROLE_LABELS: Record<string, string> = {
  SUPER_ADMIN: 'Super Administrador',
  ADMIN: 'Administrador',
  VENDEDOR: 'Vendedor',
}

export const ADMIN_NAV_ITEMS: AdminNavItem[] = [
  {
    href: '/analytics',
    label: 'Reportes',
    description: 'Dashboard global del proyecto',
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/mis-reportes',
    label: 'Mis reportes',
    description: 'Rendimiento de tus ventas',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    href: '/ventas',
    label: 'Ventas',
    description: 'Nueva venta y abonos',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    href: '/ajustes',
    label: 'Ajustes',
    description: 'Medios de pago y líneas de venta',
    roles: ['SUPER_ADMIN', 'VENDEDOR'],
  },
  {
    href: '/ventas-publicas',
    label: 'Ventas públicas',
    description: 'Confirmar pagos online',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/boletas-reservadas',
    label: 'Boletas reservadas',
    description: 'Administrar reservas',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/boletas/ver',
    label: 'Ver boletas',
    description: 'Estado de números',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    href: '/clientes',
    label: 'Clientes',
    description: 'Directorio de clientes',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    href: '/recordatorios',
    label: 'Recordatorios',
    description: 'Pagos pendientes por WhatsApp',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    href: '/ganadores',
    label: 'Ganadores',
    description: 'Asignar boletas ganadoras',
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/clientes-pasados',
    label: 'Clientes pasados',
    description: 'Reactivar clientes de proyectos anteriores',
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  // Ocultos del menú (rutas siguen existiendo):
  // /seguimiento-clientes, /preasignaciones
  {
    href: '/rifas',
    label: 'Proyectos',
    description: 'Crear y configurar proyectos',
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/vendedores',
    label: 'Equipo',
    description: 'Admins, vendedores y altas',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/inventario-vendedores',
    label: 'Inventario vendedores',
    description: 'Boletas asignadas a cada vendedor',
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    href: '/trueques',
    label: 'Trueques',
    description: 'Intercambiar o enviar boletas entre oficina y vendedores',
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/historial',
    label: 'Historial',
    description: 'Movimientos del sistema',
    roles: ['SUPER_ADMIN'],
  },
  {
    href: '/superadmin-ventas',
    label: 'Ventas (superadmin)',
    description: 'Vista avanzada de ventas',
    roles: ['SUPER_ADMIN'],
  },
]

export function homeRouteForRole(_rol?: string | null): string {
  return '/dashboard'
}

export function navItemsForRole(rol?: string | null): AdminNavItem[] {
  const role = (rol || '')
    .toUpperCase()
    .trim()
    .replace(/\s+/g, '_') as AdminNavItem['roles'][number]
  return ADMIN_NAV_ITEMS.filter((item) => item.roles.includes(role))
}

export function isPublicAdminPath(pathname: string): boolean {
  if (!pathname) return true
  if (pathname === '/') return true
  if (pathname.startsWith('/login')) return true
  if (pathname.startsWith('/verificar')) return true
  if (pathname.startsWith('/mis-boletas')) return true
  return false
}
