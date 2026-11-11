'use client'

import type { ComponentType } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  LayoutDashboard,
  ShoppingCart,
  Globe,
  Ticket,
  Bell,
  Users,
  Pencil,
  FileText,
  History,
  UserCog,
  Gift,
  Trophy,
  BarChart3,
  LineChart,
  X,
  LogOut,
  Package,
  PhoneCall,
  Settings2,
  ArrowLeftRight,
} from 'lucide-react'
import {
  AppModule,
  UserRole,
  getVisibleModules,
  isModuleActive,
  normalizeRole,
} from '@/config/modules'
import { TokenManager } from '@/utils/auth'

const MODULE_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  ventas: ShoppingCart,
  'ventas-publicas': Globe,
  'boletas-reservadas': Ticket,
  recordatorios: Bell,
  'seguimiento-clientes': Users,
  'clientes-pasados': PhoneCall,
  'superadmin-ventas': Pencil,
  preasignaciones: FileText,
  historial: History,
  vendedores: UserCog,
  'inventario-vendedores': Package,
  trueques: ArrowLeftRight,
  clientes: Users,
  rifas: Gift,
  ganadores: Trophy,
  boletas: Ticket,
  analytics: BarChart3,
  'mis-reportes': LineChart,
  ajustes: Settings2,
}

interface AppSidebarProps {
  user: { nombre: string; rol: string; email?: string } | null
  mobileOpen: boolean
  onMobileClose: () => void
  /** Si es true, el menú solo aparece como overlay (p. ej. en Inicio). */
  overlayOnly?: boolean
}

function NavItem({
  module,
  pathname,
  onNavigate,
}: {
  module: AppModule
  pathname: string
  onNavigate?: () => void
}) {
  const active = isModuleActive(pathname, module)
  const Icon = MODULE_ICONS[module.id] ?? FileText

  return (
    <Link
      href={module.href}
      onClick={onNavigate}
      className={`group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 min-h-[44px] ${
        active
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/25'
          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
      }`}
      aria-current={active ? 'page' : undefined}
    >
      <Icon
        className={`h-4 w-4 shrink-0 ${active ? 'text-white' : 'text-slate-400 group-hover:text-slate-600'}`}
      />
      <span className="truncate">{module.label}</span>
      {active && (
        <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white/90" aria-hidden />
      )}
    </Link>
  )
}

function SidebarContent({
  user,
  pathname,
  onNavigate,
  onLogout,
}: {
  user: AppSidebarProps['user']
  pathname: string
  onNavigate?: () => void
  onLogout: () => void
}) {
  const role = normalizeRole(user?.rol)
  const modules = getVisibleModules(role)

  const roleLabel: Record<UserRole, string> = {
    SUPER_ADMIN: 'Super Administrador',
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor',
  }

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-slate-200/80 px-4 py-4">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-xl p-1 transition-colors hover:bg-slate-50"
        >
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-indigo-700 shadow-lg shadow-indigo-600/20">
            <Ticket className="h-5 w-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">Rifa Super Toyota</p>
            <p className="text-[11px] text-slate-400">Panel de Administración</p>
          </div>
        </Link>
      </div>

      <div className="px-3 py-3">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors min-h-[44px] ${
            pathname === '/dashboard'
              ? 'bg-slate-900 text-white'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <LayoutDashboard className="h-4 w-4 shrink-0" />
          Inicio
        </Link>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto overscroll-contain px-3 pb-4" aria-label="Módulos del sistema">
        <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
          Módulos
        </p>
        {modules.map((module) => (
          <NavItem
            key={module.id}
            module={module}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </nav>

      {user && (
        <div className="border-t border-slate-200/80 p-4">
          <div className="mb-3 flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-500 to-indigo-600 text-xs font-semibold text-white">
              {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-slate-800">{user.nombre}</p>
              <p className="truncate text-[11px] text-slate-400">
                {role ? roleLabel[role] : user.rol}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onLogout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600 min-h-[44px]"
          >
            <LogOut className="h-4 w-4" />
            Cerrar sesión
          </button>
        </div>
      )}
    </div>
  )
}

export default function AppSidebar({ user, mobileOpen, onMobileClose, overlayOnly = false }: AppSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = () => {
    TokenManager.clearAuthData()
    router.push('/login')
  }

  return (
    <>
      {mobileOpen && (
        <div
          className={`fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm transition-opacity ${
            overlayOnly ? '' : 'lg:hidden'
          }`}
          onClick={onMobileClose}
          aria-hidden={false}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-slate-200/80 bg-white shadow-xl transition-transform duration-300 ease-in-out ${
          overlayOnly ? 'lg:hidden' : 'lg:translate-x-0 lg:static lg:z-auto lg:shadow-none'
        } ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}`}
        style={{ paddingTop: 'var(--sat)' }}
        aria-label="Menú lateral"
      >
        <div className="flex items-center justify-between border-b border-slate-200/80 px-4 py-3 lg:hidden">
          <span className="text-sm font-semibold text-slate-800">Menú</span>
          <button
            type="button"
            onClick={onMobileClose}
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-800 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Cerrar menú"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <SidebarContent
          user={user}
          pathname={pathname}
          onNavigate={onMobileClose}
          onLogout={handleLogout}
        />
      </aside>
    </>
  )
}
