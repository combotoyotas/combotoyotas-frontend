'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Menu } from 'lucide-react'
import AppSidebar from '@/components/layout/AppSidebar'
import MobileTabBar from '@/components/layout/MobileTabBar'
import ModuleKeepAlive from '@/components/layout/ModuleKeepAlive'
import {
  getActiveModule,
  normalizeRole,
  shouldShowSidebar,
  shouldShowTabBar,
} from '@/config/modules'
import { SESSION_USER_UPDATED } from '@/config/api'
import { syncVendedorPaginaSession, type SessionUser } from '@/lib/syncVendedorPaginaSession'
import { TokenManager } from '@/utils/auth'

export default function ModuleShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || '/'
  const [user, setUser] = useState<SessionUser | null>(null)
  const [mobileOpen, setMobileOpen] = useState(false)

  const showSidebar = shouldShowSidebar(pathname)
  const showTabBar = shouldShowTabBar(pathname)

  useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false
    const loadUser = async () => {
      try {
        let parsed = TokenManager.getUser() as SessionUser | null
        if (!parsed) {
          if (!cancelled) setUser(null)
          return
        }
        if (String(parsed.rol).toUpperCase() === 'VENDEDOR') {
          const synced = await syncVendedorPaginaSession()
          if (synced) parsed = synced
          else parsed = (TokenManager.getUser() as SessionUser) || parsed
        }
        if (!cancelled) setUser(parsed)
      } catch {
        if (!cancelled) setUser(null)
      }
    }
    void loadUser()
    const onFocus = () => void loadUser()
    const onSessionUser = () => void loadUser()
    window.addEventListener('focus', onFocus)
    window.addEventListener(SESSION_USER_UPDATED, onSessionUser)
    return () => {
      cancelled = true
      window.removeEventListener('focus', onFocus)
      window.removeEventListener(SESSION_USER_UPDATED, onSessionUser)
    }
  }, [pathname])

  const role = normalizeRole(user?.rol)
  const activeModule = getActiveModule(pathname, role, user)
  const cuadriculaFullscreen = pathname.startsWith('/boletas/cuadricula')

  if (!showSidebar && !showTabBar) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {(showSidebar || showTabBar) && (
        <AppSidebar
          user={user}
          mobileOpen={mobileOpen}
          onMobileClose={() => setMobileOpen(false)}
          overlayOnly={!showSidebar}
        />
      )}

      <div className="flex min-w-0 flex-1 flex-col min-h-0">
        <header
          className={`sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-slate-200/80 bg-white/90 px-4 backdrop-blur-md lg:hidden ${
            pathname === '/dashboard' ? 'hidden' : ''
          }`}
          style={{ paddingTop: 'var(--sat)', height: 'calc(3.5rem + var(--sat))' }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Abrir menú de módulos"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-slate-900">
              {pathname === '/dashboard' ? 'Inicio' : activeModule?.label ?? 'Combo Toyotas'}
            </p>
            <p className="truncate text-[11px] text-slate-400">Combotoyotas</p>
          </div>
        </header>

        <div
          className={`flex-1 min-w-0 min-h-0 app-page ${showTabBar && !cuadriculaFullscreen ? 'has-tabbar' : ''} ${
            cuadriculaFullscreen ? 'max-lg:!p-0 max-lg:!pb-0 overflow-hidden flex flex-col' : ''
          }`}
        >
          <ModuleKeepAlive>{children}</ModuleKeepAlive>
        </div>
      </div>

      {showTabBar && (
        <MobileTabBar role={role} onOpenMenu={() => setMobileOpen(true)} />
      )}
    </div>
  )
}
