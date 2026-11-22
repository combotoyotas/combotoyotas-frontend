export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'VENDEDOR'

export interface AppModule {
  id: string
  label: string
  href: string
  /** Rutas que activan este módulo en el menú (prefijos). */
  matchPrefixes: string[]
  roles: UserRole[] | 'ALL'
}

export const APP_MODULES: AppModule[] = [
  {
    id: 'ventas',
    label: 'Ventas',
    href: '/ventas',
    matchPrefixes: ['/ventas'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'ventas-publicas',
    label: 'Ventas Públicas',
    href: '/ventas-publicas',
    matchPrefixes: ['/ventas-publicas'],
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'boletas-reservadas',
    label: 'Boletas Reservadas',
    href: '/boletas-reservadas',
    matchPrefixes: ['/boletas-reservadas'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'recordatorios',
    label: 'Recordatorios',
    href: '/recordatorios',
    matchPrefixes: ['/recordatorios'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'seguimiento-clientes',
    label: 'Seguimiento Clientes',
    href: '/seguimiento-clientes',
    matchPrefixes: ['/seguimiento-clientes'],
    roles: ['SUPER_ADMIN', 'ADMIN'],
  },
  {
    id: 'clientes-pasados',
    label: 'Clientes Pasados',
    href: '/clientes-pasados',
    matchPrefixes: ['/clientes-pasados'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'superadmin-ventas',
    label: 'Edición de Ventas',
    href: '/superadmin-ventas',
    matchPrefixes: ['/superadmin-ventas'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'preasignaciones',
    label: 'Boletas Preasignadas',
    href: '/preasignaciones',
    matchPrefixes: ['/preasignaciones'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'intercambios',
    label: 'Intercambios',
    href: '/intercambios',
    matchPrefixes: ['/intercambios'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'historial',
    label: 'Historial',
    href: '/historial',
    matchPrefixes: ['/historial'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'vendedores',
    label: 'Vendedores',
    href: '/vendedores',
    matchPrefixes: ['/vendedores'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'inventario-vendedores',
    label: 'Inventario vendedores',
    href: '/inventario-vendedores',
    matchPrefixes: ['/inventario-vendedores'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'paginas-web',
    label: 'Páginas web',
    href: '/paginas-web',
    matchPrefixes: ['/paginas-web'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'mi-pagina-web',
    label: 'Página web',
    href: '/mi-pagina-web',
    matchPrefixes: ['/mi-pagina-web', '/mi-pagina-web/ajustes'],
    roles: ['VENDEDOR'],
  },
  {
    id: 'trueques',
    label: 'Trueques',
    href: '/trueques',
    matchPrefixes: ['/trueques'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'clientes',
    label: 'Clientes',
    href: '/clientes',
    matchPrefixes: ['/clientes'],
    roles: 'ALL',
  },
  {
    id: 'rifas',
    label: 'Rifas',
    href: '/rifas',
    matchPrefixes: ['/rifas'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'ganadores',
    label: 'Ganadores',
    href: '/ganadores',
    matchPrefixes: ['/ganadores'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'boletas',
    label: 'Ver Boletas',
    href: '/boletas/ver',
    matchPrefixes: ['/boletas'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'analytics',
    label: 'Reportes',
    href: '/analytics',
    matchPrefixes: ['/analytics'],
    roles: ['SUPER_ADMIN'],
  },
  {
    id: 'mis-reportes',
    label: 'Mis Reportes',
    href: '/mis-reportes',
    matchPrefixes: ['/mis-reportes'],
    roles: ['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'],
  },
  {
    id: 'ajustes',
    label: 'Ajustes',
    href: '/ajustes',
    matchPrefixes: ['/ajustes'],
    roles: ['SUPER_ADMIN', 'VENDEDOR'],
  },
]

export function normalizeRole(rol?: string | null): UserRole | null {
  const upper = rol?.toUpperCase()
  if (upper === 'SUPER_ADMIN' || upper === 'ADMIN' || upper === 'VENDEDOR') {
    return upper
  }
  return null
}

export function canAccessModule(role: UserRole | null, module: AppModule): boolean {
  if (!role) return false
  if (module.roles === 'ALL') return true
  return module.roles.includes(role)
}

export type SessionUser = {
  rol?: string | null
  pagina_web_habilitada?: boolean
}

/** Acceso operativo al módulo (habilitado por super admin). */
export function isVendedorPaginaWebActiva(user?: SessionUser | null): boolean {
  return Boolean(user?.pagina_web_habilitada)
}

export function getVisibleModules(
  role: UserRole | null,
  _user?: SessionUser | null
): AppModule[] {
  return APP_MODULES.filter((module) => canAccessModule(role, module))
}

export function isModuleActive(pathname: string, module: AppModule): boolean {
  return module.matchPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  )
}

export function getActiveModule(
  pathname: string,
  role: UserRole | null,
  user?: SessionUser | null
): AppModule | null {
  const visible = getVisibleModules(role, user)
  return visible.find((module) => isModuleActive(pathname, module)) ?? null
}

export function homeRouteForRole(_rol?: string | null): string {
  return '/dashboard'
}

/** Rutas donde el menú lateral no debe mostrarse. */
export function shouldShowSidebar(pathname: string): boolean {
  if (pathname === '/dashboard' || pathname === '/login' || pathname === '/') {
    return false
  }
  if (pathname.startsWith('/verificar') || pathname.startsWith('/mis-boletas')) {
    return false
  }
  return true
}

export function shouldShowTabBar(pathname: string): boolean {
  if (pathname === '/login' || pathname === '/') return false
  if (pathname.startsWith('/verificar') || pathname.startsWith('/mis-boletas')) return false
  return true
}
