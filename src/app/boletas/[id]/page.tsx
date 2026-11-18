'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { boletaApi } from '@/lib/boletaApi'
import type { BoletaDetail } from '@/types/boleta'
import BoletaDetailComponent from '@/components/BoletaDetail'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import { boletaEstadoDisplay } from '@/utils/boletaEstadoDisplay'
import { getModuleLastPath } from '@/lib/moduleLastPath'
import { isAdminRole } from '@/lib/moduleSessionCache'
import { descargarBoletaDetalleComoFoto } from '@/lib/boletaDescargarDesdeDetalle'
import { isMobileDevice } from '@/utils/downloadBoletaImage'

export default function BoletaDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [boleta, setBoleta] = useState<BoletaDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [descargandoFoto, setDescargandoFoto] = useState(false)

  const volverALista = useCallback(() => {
    if (isAdminRole(userRole)) {
      router.push('/boletas/ver')
      return
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back()
      return
    }
    router.push(getModuleLastPath('boletas', '/boletas/ver'))
  }, [router, userRole])

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUserRole(user.rol)
      fetchBoletaDetail()
    } catch {
      router.push('/login')
    }
  }, [router])

  const fetchBoletaDetail = async () => {
    try {
      setLoading(true)
      const boletaId = params.id as string

      if (!boletaId) {
        setError('ID de boleta no proporcionado')
        return
      }

      const response = await boletaApi.getBoletaById(boletaId)
      setBoleta(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar los detalles de la boleta')
    } finally {
      setLoading(false)
    }
  }

  const handleDescargarFoto = useCallback(async () => {
    if (!boleta) return
    setDescargandoFoto(true)
    try {
      await descargarBoletaDetalleComoFoto(
        boleta.id,
        boleta.numero,
        boleta.cliente_info?.identificacion
      )
    } catch (err) {
      console.error(err)
      window.alert('No se pudo guardar la imagen de la boleta')
    } finally {
      setDescargandoFoto(false)
    }
  }, [boleta])

  const handlePrint = useCallback(() => {
    if (!boleta) return
    if (isMobileDevice()) {
      void handleDescargarFoto()
      return
    }
    router.push(`/boletas/${boleta.id}/print`)
  }, [boleta, handleDescargarFoto, router])

  if (userRole && userRole !== 'SUPER_ADMIN' && userRole !== 'VENDEDOR' && userRole !== 'ADMIN') {
    return (
      <div className="min-h-[50vh] flex items-center justify-center px-4">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg max-w-md">
          <h2 className="text-lg font-medium mb-2">Acceso Restringido</h2>
          <p>Este módulo solo está disponible para usuarios con rol SUPER_ADMIN, VENDEDOR o ADMIN</p>
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 min-h-[44px]"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center text-slate-500">
        Cargando detalles de la boleta…
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-8 max-w-md mx-auto">
        <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-lg">
          <h2 className="text-lg font-medium mb-2">Error</h2>
          <p>{error}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={fetchBoletaDetail}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 min-h-[44px]"
            >
              Reintentar
            </button>
            <button
              type="button"
              onClick={volverALista}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 min-h-[44px]"
            >
              Volver a boletas
            </button>
          </div>
        </div>
      </div>
    )
  }

  if (!boleta) {
    return (
      <div className="px-4 py-8 max-w-md mx-auto">
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-6 py-4 rounded-lg">
          <h2 className="text-lg font-medium mb-2">Boleta no encontrada</h2>
          <button
            type="button"
            onClick={volverALista}
            className="mt-4 px-4 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 min-h-[44px]"
          >
            Volver a boletas
          </button>
        </div>
      </div>
    )
  }

  const numeroLabel = formatBoletaNumeros(boleta.numeros, boleta.numero)
  const estadoUi = boletaEstadoDisplay(boleta.estado)

  return (
    <div className="pb-28 lg:pb-6">
      <div
        className="sticky z-20 -mx-3 sm:mx-0 mb-3 sm:mb-4 border-b border-slate-200 bg-white/95 backdrop-blur-md px-3 sm:px-0 py-2 lg:static lg:border-0 lg:bg-transparent lg:backdrop-blur-none"
        style={{ top: 'calc(3.5rem + var(--sat, 0px))' }}
      >
        <div className="flex items-center gap-2 min-h-[44px]">
          <button
            type="button"
            onClick={volverALista}
            className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-600 min-h-[44px] px-2 -ml-2 rounded-lg hover:bg-indigo-50"
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Volver
          </button>
          <span className="hidden sm:inline text-slate-300">|</span>
          <h1 className="text-base sm:text-xl font-bold text-slate-900 truncate flex-1 min-w-0">
            Boleta #{numeroLabel}
          </h1>
          <span
            className={`shrink-0 inline-flex px-2.5 py-1 text-xs font-bold rounded-full ${estadoUi.badgeClass}`}
          >
            {estadoUi.label.toUpperCase()}
          </span>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
        {descargandoFoto && (
          <p className="text-sm text-indigo-600 font-medium mb-2" role="status">
            Guardando imagen…
          </p>
        )}
        <BoletaDetailComponent boleta={boleta} onPrint={handlePrint} onBoletaUpdated={fetchBoletaDetail} />
      </main>
    </div>
  )
}