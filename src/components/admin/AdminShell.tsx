'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  AdminUser,
  ROLE_LABELS,
  homeRouteForRole,
  navItemsForRole,
} from '@/config/adminNav'

type Props = {
  children: React.ReactNode
}

const RAIL = 68
const PANEL = 288

export default function AdminShell({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname() || '/'
  const [user, setUser] = useState<AdminUser | null>(null)
  const [ready, setReady] = useState(false)
  const [open, setOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const raw = localStorage.getItem('user')
    if (!token || !raw) {
      setReady(true)
      router.replace('/login')
      return
    }
    try {
      setUser(JSON.parse(raw))
    } catch {
      router.replace('/login')
    } finally {
      setReady(true)
    }
  }, [router])

  useEffect(() => {
    if (!isDesktop) setOpen(false)
  }, [pathname, isDesktop])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => {
      const desktop = mq.matches
      setIsDesktop(desktop)
      setOpen(desktop)
    }
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    if (isDesktop || !open) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  }, [open, isDesktop])

  const items = useMemo(() => navItemsForRole(user?.rol), [user?.rol])
  const reportsHref = homeRouteForRole(user?.rol)
  const roleKey = (user?.rol || '').toUpperCase()
  const roleLabel = ROLE_LABELS[roleKey] || user?.rol || ''
  const sideWidth = open ? PANEL : RAIL

  const handleLogout = () => {
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    router.push('/login')
  }

  const isActive = (href: string) =>
    pathname === href || (href !== '/' && pathname.startsWith(`${href}/`))

  if (!ready || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[var(--background)] px-4">
        <div className="border-[1.5px] border-black bg-[var(--surface-elevated)] px-5 py-3 text-sm font-semibold uppercase tracking-wide shadow-[4px_4px_0_#101010]">
          Cargando panel...
        </div>
      </div>
    )
  }

  return (
    <div className="admin-layout min-h-screen text-[var(--text-primary)] overflow-x-hidden">
      {/* Mobile top bar */}
      {!isDesktop && (
        <header className="admin-mobile-bar sticky top-0 z-[55] flex items-center gap-2 h-14 px-3 border-b-[1.5px] border-black bg-black text-[var(--primary)] safe-pad-x">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="w-10 h-10 shrink-0 border border-[var(--primary)] flex items-center justify-center hover:bg-[var(--primary)] hover:text-black"
            aria-label="Abrir menú"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <Link href={reportsHref} className="min-w-0 flex-1">
            <p
              className="text-sm font-[800] uppercase tracking-tight truncate"
              style={{ fontFamily: 'var(--font-display)' }}
            >
              Rifa Super Toyota
            </p>
            <p className="text-[10px] text-[var(--primary)]/80 uppercase tracking-[0.12em] truncate">
              {roleLabel}
            </p>
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="w-10 h-10 shrink-0 border border-[var(--primary)] flex items-center justify-center hover:bg-[var(--danger)] hover:text-white hover:border-[var(--danger)]"
            title="Cerrar sesión"
            aria-label="Cerrar sesión"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </header>
      )}

      {!isDesktop && open && (
        <button
          type="button"
          className="fixed inset-0 z-[60] bg-black/50 border-0 cursor-pointer"
          aria-label="Cerrar menú"
          onClick={() => setOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-[70] flex flex-col border-r-[1.5px] border-black bg-[var(--surface-elevated)] transition-[width,transform] duration-250 ease-out overflow-hidden ${
          !isDesktop && !open ? '-translate-x-full pointer-events-none' : 'translate-x-0'
        }`}
        style={{ width: isDesktop ? sideWidth : PANEL }}
        aria-hidden={!isDesktop && !open}
      >
        <div className="h-14 flex items-center gap-2 px-2 border-b-[1.5px] border-black shrink-0 bg-black text-[var(--primary)]">
          <Link
            href={reportsHref}
            className="w-10 h-10 shrink-0 bg-[var(--primary)] text-black flex items-center justify-center border border-black hover:brightness-95"
            title="Reportes"
            onClick={() => {
              if (!isDesktop) setOpen(false)
            }}
          >
            <span className="font-display font-[800] text-sm tracking-tight">RF</span>
          </Link>
          {(isDesktop ? open : true) && (
            <div className="min-w-0 flex-1">
              <p
                className="text-sm font-[800] uppercase tracking-tight truncate"
                style={{ fontFamily: 'var(--font-display)' }}
              >
                Rifa Super Toyota
              </p>
              <p className="text-[10px] text-[var(--primary)]/80 uppercase tracking-[0.14em] truncate">
                {roleLabel}
              </p>
            </div>
          )}
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="ml-auto w-9 h-9 shrink-0 border border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)] hover:text-black flex items-center justify-center"
            title={open ? 'Cerrar / contraer' : 'Expandir'}
            aria-expanded={open}
          >
            <svg
              className={`w-4 h-4 transition-transform ${isDesktop ? (open ? 'rotate-180' : '') : 'rotate-180'}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-1 bg-[var(--surface)] overscroll-contain">
          {isDesktop && !open && (
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="w-full h-10 border-[1.5px] border-black bg-[var(--primary)] text-black font-bold uppercase text-[10px] tracking-wider hover:brightness-95"
              title="Abrir módulos"
            >
              Menú
            </button>
          )}

          {(isDesktop ? open : true) && (
            <p className="px-2 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
              Módulos · {roleKey === 'VENDEDOR' ? 'Vendedor' : roleKey === 'ADMIN' ? 'Admin' : 'Super'}
            </p>
          )}

          {items.map((item) => {
            const active = isActive(item.href)
            const expanded = isDesktop ? open : true
            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                onClick={() => {
                  if (!isDesktop) setOpen(false)
                }}
                className={`group flex items-center gap-3 border-[1.5px] transition-colors min-h-[44px] ${
                  expanded ? 'px-3 py-2.5' : 'h-10 justify-center px-0'
                } ${
                  active
                    ? 'bg-[var(--primary)] border-black text-black shadow-[3px_3px_0_#101010]'
                    : 'bg-[var(--surface-elevated)] border-transparent hover:border-black text-[var(--text-secondary)]'
                }`}
              >
                <span
                  className={`w-2 h-2 shrink-0 border border-black ${
                    active ? 'bg-black' : 'bg-[var(--border-soft)]'
                  }`}
                />
                {expanded && (
                  <span className="min-w-0">
                    <span
                      className="block text-[13px] font-bold uppercase tracking-tight truncate"
                      style={{ fontFamily: 'var(--font-display)' }}
                    >
                      {item.label}
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)] truncate leading-snug normal-case font-normal">
                      {item.description}
                    </span>
                  </span>
                )}
              </Link>
            )
          })}

          {(isDesktop ? open : true) && items.length === 0 && (
            <p className="px-2 py-4 text-sm text-[var(--text-muted)]">Sin módulos para este rol.</p>
          )}
        </nav>

        <div className="border-t-[1.5px] border-black p-2 shrink-0 bg-[var(--surface-elevated)]">
          <div
            className={`flex items-center ${
              isDesktop && !open ? 'justify-center flex-col gap-2' : 'gap-2'
            }`}
          >
            <div className="w-10 h-10 bg-black text-[var(--primary)] flex items-center justify-center text-sm font-bold shrink-0 border border-black">
              {user.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            {(isDesktop ? open : true) && (
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{user.nombre}</p>
                <p className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] truncate">
                  {roleLabel}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={handleLogout}
              className="w-10 h-10 border-[1.5px] border-black text-black hover:bg-[var(--danger)] hover:text-white flex items-center justify-center shrink-0"
              title="Cerrar sesión"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <div
        className="admin-content min-h-screen min-w-0 w-full transition-[padding] duration-250 ease-out"
        style={{ paddingLeft: isDesktop ? sideWidth : 0 }}
      >
        <div className="admin-page w-full min-w-0 max-w-[100vw] overflow-x-hidden">
          {children}
        </div>
      </div>
    </div>
  )
}
