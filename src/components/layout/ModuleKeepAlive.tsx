'use client'

import { useLayoutEffect, useRef, type ReactNode } from 'react'
import { usePathname } from 'next/navigation'
import {
  getActiveModule,
  normalizeRole,
  shouldShowSidebar,
  type UserRole,
} from '@/config/modules'
import { setModuleLastPath } from '@/lib/moduleLastPath'

function moduleCacheKey(pathname: string, role: UserRole | null): string | null {
  return getActiveModule(pathname, role)?.id ?? null
}

/**
 * Recuerda la última subruta por módulo (sessionStorage) y el scroll al cambiar de módulo.
 * No congela el árbol React (evita errores de runtime en Next.js App Router).
 */
export default function ModuleKeepAlive({ children }: { children: ReactNode }) {
  const pathname = usePathname() || '/'
  const role = normalizeRole(
    typeof window !== 'undefined'
      ? (() => {
          try {
            const raw = localStorage.getItem('user')
            return raw ? JSON.parse(raw).rol : null
          } catch {
            return null
          }
        })()
      : null
  )

  const scrollRef = useRef<Map<string, number>>(new Map())
  const prevPathRef = useRef<string | null>(null)

  const enabled = shouldShowSidebar(pathname)
  const activeKey = moduleCacheKey(pathname, role)

  useLayoutEffect(() => {
    if (!enabled || !activeKey) return

    const prev = prevPathRef.current
    if (prev && prev !== pathname) {
      const prevKey = moduleCacheKey(prev, role)
      if (prevKey) scrollRef.current.set(prevKey, window.scrollY)
    }
    prevPathRef.current = pathname

    const mod = getActiveModule(pathname, role)
    if (mod) setModuleLastPath(mod.id, pathname)

    const y = scrollRef.current.get(activeKey)
    if (y != null) {
      requestAnimationFrame(() => window.scrollTo(0, y))
    }
  }, [pathname, activeKey, enabled, role])

  return <div className="min-w-0">{children}</div>
}