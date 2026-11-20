'use client'

import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'
import { paginasWebApi, type PaginaContactoItem } from '@/lib/paginasWebApi'
import ReservasPaginaTable, { type ReservaPaginaRow } from '@/components/pagina-web/ReservasPaginaTable'
import { syncVendedorPaginaSession } from '@/lib/syncVendedorPaginaSession'
import { TokenManager } from '@/utils/auth'
import { useRouter } from 'next/navigation'

export default function MiPaginaWebPage() {
  const router = useRouter()
  const [url, setUrl] = useState<string | null>(null)
  const [slug, setSlug] = useState<string | null>(null)
  const [reservas, setReservas] = useState<ReservaPaginaRow[]>([])
  const [plantilla, setPlantilla] = useState<string | null>(null)
  const [medios, setMedios] = useState<PaginaContactoItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [nuevas, setNuevas] = useState(0)

  const cargar = useCallback(async () => {
    try {
      const [reservasRes, contactoRes] = await Promise.all([
        paginasWebApi.misReservas(),
        paginasWebApi.getContactoPagina(),
      ])
      if (!reservasRes.success) throw new Error(reservasRes.message || 'Error')
      setUrl(reservasRes.data?.pagina?.url || null)
      setSlug(reservasRes.data?.pagina?.slug || null)
      const list: ReservaPaginaRow[] = reservasRes.data?.reservas || []
      setReservas(list)
      setNuevas(list.filter((r) => r.estado_venta === 'SIN_REVISAR').length)
      if (contactoRes.success) {
        setPlantilla(contactoRes.data?.plantilla_contacto ?? null)
        setMedios(
          (contactoRes.data?.medios_pago || []).filter((m: PaginaContactoItem) => m.activo !== false)
        )
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error')
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      const synced = await syncVendedorPaginaSession()
      const user = synced || TokenManager.getUser()
      if (String(user?.rol).toUpperCase() !== 'VENDEDOR') {
        router.replace('/dashboard')
        return
      }
      let habilitada = Boolean(user?.pagina_web_habilitada)
      if (!habilitada) {
        const res = await paginasWebApi.miPagina()
        habilitada = Boolean(res.success && res.data?.habilitada)
        if (habilitada) await syncVendedorPaginaSession()
      }
      if (!habilitada) {
        setError('Tu página web no está habilitada. Contacta al super administrador.')
        setLoading(false)
        return
      }
      await cargar()
      setLoading(false)
    })()
  }, [router, cargar])

  return (
    <div className="min-h-screen bg-slate-50 py-6 px-3 sm:py-8 sm:px-4">
      <div className="max-w-5xl mx-auto w-full min-w-0">
        <MotionPageHeader url={url} slug={slug} nuevas={nuevas} />
        {error && <p className="text-red-600 mb-4 text-sm">{error}</p>}
        {loading ? (
          <p className="text-slate-500 text-sm">Cargando reservas…</p>
        ) : (
          <ReservasPaginaTable
            reservas={reservas}
            plantilla={plantilla}
            medios={medios}
            onActualizada={cargar}
          />
        )}
      </div>
    </div>
  )
}

function MotionPageHeader({
  url,
  slug,
  nuevas,
}: {
  url: string | null
  slug: string | null
  nuevas: number
}) {
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch {
      window.prompt('Copia tu enlace:', url)
    }
  }

  return (
    <header className="mb-8">
      <h1 className="text-2xl font-semibold text-slate-900 mb-4">Tu página web</h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-stretch mb-4">
        <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 mb-1">
            Tu enlace personalizado
          </p>
          {url ? (
            <div className="flex items-center gap-2 min-w-0">
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-indigo-600 font-medium truncate flex-1 min-w-0"
                title={url}
              >
                {url}
              </a>
              <button
                type="button"
                onClick={copiar}
                className="shrink-0 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-100"
              >
                {copiado ? 'Copiado ✓' : 'Copiar'}
              </button>
            </div>
          ) : (
            <p className="text-sm text-slate-500">Sin enlace configurado.</p>
          )}
          {slug ? <p className="text-xs text-slate-400 mt-1">/{slug}</p> : null}
        </div>

        <Link
          href="/mi-pagina-web/ajustes"
          className="sm:w-auto shrink-0 inline-flex items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
        >
          Ajustes de página
        </Link>
      </div>

      <MotionCardNuevas nuevas={nuevas} />
    </header>
  )
}

function MotionCardNuevas({ nuevas }: { nuevas: number }) {
  if (nuevas <= 0) {
    return (
      <p className="text-sm text-slate-500 rounded-lg border border-slate-200 bg-white px-4 py-3">
        Reservas hechas desde tu enlace. Usa <strong>Contactar</strong> para escribir al cliente por
        WhatsApp; las nuevas pasan a <strong>Revisada</strong> al contactarlas.
      </p>
    )
  }
  return (
    <p className="text-sm text-amber-900 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3">
      Tienes <strong>{nuevas}</strong> reserva{nuevas === 1 ? '' : 's'} nueva{nuevas === 1 ? '' : 's'} sin
      revisar. Pulsa <strong>Contactar</strong> para abrir WhatsApp y marcarlas como revisadas.
    </p>
  )
}