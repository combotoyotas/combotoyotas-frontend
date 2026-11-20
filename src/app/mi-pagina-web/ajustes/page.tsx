'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import PaginaWebContacto from '@/components/pagina-web/PaginaWebContacto'
import PaginaWebPlantilla from '@/components/pagina-web/PaginaWebPlantilla'
import PaginaWebVentaToggle from '@/components/pagina-web/PaginaWebVentaToggle'
import { paginasWebApi } from '@/lib/paginasWebApi'
import { TokenManager } from '@/utils/auth'

export default function MiPaginaWebAjustesPage() {
  const router = useRouter()
  const [ventaActiva, setVentaActiva] = useState(true)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    ;(async () => {
      const user = TokenManager.getUser()
      if (String(user?.rol).toUpperCase() !== 'VENDEDOR') {
        router.replace('/dashboard')
        return
      }
      if (!user?.pagina_web_habilitada) {
        router.replace('/mi-pagina-web')
        return
      }
      try {
        const res = await paginasWebApi.miPagina()
        if (res.success) {
          setVentaActiva(res.data?.venta_activa !== false)
        }
      } finally {
        setReady(true)
      }
    })()
  }, [router])

  if (!ready) {
    return (
      <div className="min-h-screen bg-slate-50 py-8 px-4">
        <p className="text-slate-500 text-sm max-w-3xl mx-auto">Cargando…</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:py-8 sm:px-4">
      <div className="max-w-3xl mx-auto w-full min-w-0">
        <Link
          href="/mi-pagina-web"
          className="text-sm text-indigo-600 hover:underline mb-4 inline-block"
        >
          ← Volver a reservas
        </Link>
        <h1 className="text-2xl font-semibold text-slate-900 mb-1">Ajustes de tu página web</h1>
        <p className="text-sm text-slate-600 mb-6">
          Medios de pago, WhatsApp y mensaje al cliente. Solo aplica a tu enlace público.
        </p>
        <PaginaWebVentaToggle initialActiva={ventaActiva} onChanged={setVentaActiva} />
        <PaginaWebPlantilla />
        <PaginaWebContacto />
      </div>
    </div>
  )
}