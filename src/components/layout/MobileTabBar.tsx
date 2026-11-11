'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, ShoppingCart, Ticket, Users, Menu } from 'lucide-react'
import { UserRole } from '@/config/modules'

type Props = {
  role: UserRole | null
  onOpenMenu: () => void
}

export default function MobileTabBar({ role, onOpenMenu }: Props) {
  const pathname = usePathname() || '/'

  const items = [
    { href: '/dashboard', label: 'Inicio', icon: LayoutDashboard, match: (p: string) => p === '/dashboard' },
    {
      href: '/ventas',
      label: 'Ventas',
      icon: ShoppingCart,
      match: (p: string) => p.startsWith('/ventas'),
      hidden: !role,
    },
    {
      href: '/boletas/ver',
      label: 'Boletas',
      icon: Ticket,
      match: (p: string) => p.startsWith('/boletas'),
      hidden: !role,
    },
    {
      href: '/clientes',
      label: 'Clientes',
      icon: Users,
      match: (p: string) => p.startsWith('/clientes'),
    },
  ]

  return (
    <nav
      className="mobile-tabbar lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-slate-200/80 bg-white/95 backdrop-blur-md"
      style={{ boxShadow: '0 -8px 24px rgb(15 23 42 / 0.06)' }}
      aria-label="Navegación principal"
    >
      <div className="grid grid-cols-5 h-16">
        {items.map((item) => {
          if (item.hidden) return <span key={item.href} />
          const active = item.match(pathname)
          const Icon = item.icon
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${
                active ? 'text-indigo-600' : 'text-slate-400'
              }`}
            >
              <Icon className={`h-5 w-5 ${active ? 'text-indigo-600' : 'text-slate-400'}`} />
              {item.label}
            </Link>
          )
        })}
        <button
          type="button"
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center gap-0.5 text-[11px] font-medium text-slate-400"
          aria-label="Abrir menú de módulos"
        >
          <Menu className="h-5 w-5" />
          Más
        </button>
      </div>
    </nav>
  )
}
