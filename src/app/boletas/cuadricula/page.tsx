'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { rifaApi } from '@/lib/rifaApi'
import { boletaApi } from '@/lib/boletaApi'
import { Rifa } from '@/types/rifa'
import BoletaCuadricula, { CuadriculaBoleta } from '@/components/BoletaCuadricula'
import OfflineBoletasBanner from '@/components/boletas/OfflineBoletasBanner'
import {
  getVendorUserIdFromStorage,
  isNetworkUnavailableError,
  loadVendorCuadriculaOffline,
  loadVendorRifasOffline,
  saveVendorCuadriculaOffline,
  saveVendorRifasOffline,
} from '@/lib/boletasOfflineStore'

export default function BoletasCuadriculaPage() {
  const router = useRouter()
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [selectedRifa, setSelectedRifa] = useState('')
  const [boletas, setBoletas] = useState<CuadriculaBoleta[]>([])
  const [alcance, setAlcance] = useState<'pool_libre' | 'inventario_vendedor' | 'todas'>('todas')
  const [rifaNombre, setRifaNombre] = useState<string | undefined>()
  const [loading, setLoading] = useState(true)
  const [loadingGrid, setLoadingGrid] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [userName, setUserName] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [offlineMode, setOfflineMode] = useState(false)
  const [offlineSavedAt, setOfflineSavedAt] = useState<number | null>(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    try {
      const user = JSON.parse(userData)
      const rol = String(user.rol || '').toUpperCase()
      if (rol !== 'SUPER_ADMIN' && rol !== 'ADMIN' && rol !== 'VENDEDOR') {
        router.push('/dashboard')
        return
      }
      setUserRole(rol)
      setUserName(user.nombre || null)
      setUserId(user.id ? String(user.id) : null)
      loadRifas()
    } catch {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (rifas.length > 0 && !selectedRifa) {
      setSelectedRifa(rifas[0].id)
    }
  }, [rifas, selectedRifa])

  useEffect(() => {
    if (selectedRifa) {
      loadCuadricula(selectedRifa)
    }
  }, [selectedRifa])

  const isVendedor = userRole === 'VENDEDOR'

  useEffect(() => {
    if (!isVendedor || !userId) return
    const syncOnline = () => {
      if (!navigator.onLine) return
      loadRifas()
      if (selectedRifa) loadCuadricula(selectedRifa)
    }
    window.addEventListener('online', syncOnline)
    return () => window.removeEventListener('online', syncOnline)
  }, [isVendedor, userId, selectedRifa])

  const loadRifas = async () => {
    try {
      setLoading(true)
      const response = await rifaApi.getRifasOperativas()
      setRifas(response.data)
      setError(null)
      setOfflineMode(false)
      const vendorId = getVendorUserIdFromStorage()
      if (vendorId) {
        await saveVendorRifasOffline(vendorId, response.data)
      }
    } catch (err) {
      const vendorId = getVendorUserIdFromStorage()
      if (vendorId && isNetworkUnavailableError(err)) {
        const cached = await loadVendorRifasOffline(vendorId)
        if (cached?.data?.length) {
          setRifas(cached.data)
          setOfflineMode(true)
          setOfflineSavedAt(cached.savedAt)
          setError(null)
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }

  const loadCuadricula = async (rifaId: string) => {
    try {
      setLoadingGrid(true)
      const response = await boletaApi.getBoletasCuadricula(rifaId)
      setBoletas(response.data.boletas)
      setAlcance(response.data.alcance)
      const nombre =
        response.data.rifa?.nombre || rifas.find((r) => r.id === rifaId)?.nombre
      setRifaNombre(nombre)
      setError(null)
      const vendorId = getVendorUserIdFromStorage()
      if (vendorId) {
        await saveVendorCuadriculaOffline(vendorId, rifaId, {
          boletas: response.data.boletas,
          alcance: response.data.alcance,
          rifaNombre: nombre,
        })
        if (!offlineMode) setOfflineSavedAt(Date.now())
      }
      if (navigator.onLine) setOfflineMode(false)
    } catch (err) {
      const vendorId = getVendorUserIdFromStorage()
      if (vendorId && isNetworkUnavailableError(err)) {
        const cached = await loadVendorCuadriculaOffline(vendorId, rifaId)
        if (cached?.data) {
          setBoletas(cached.data.boletas)
          setAlcance(cached.data.alcance)
          setRifaNombre(cached.data.rifaNombre)
          setOfflineMode(true)
          setOfflineSavedAt(cached.savedAt)
          setError(null)
          return
        }
      }
      setError(err instanceof Error ? err.message : 'Error al cargar cuadrícula')
      setBoletas([])
    } finally {
      setLoadingGrid(false)
    }
  }

  const reintentarConexion = async () => {
    await loadRifas()
    if (selectedRifa) await loadCuadricula(selectedRifa)
  }

  if (!userRole) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-500">
        Cargando…
      </div>
    )
  }

  return (
    <div className="cuadricula-viewport lg:relative lg:flex lg:flex-col lg:flex-1 lg:min-h-0 lg:h-full lg:bg-slate-50">
      <header className="app-header shrink-0 z-30 hidden lg:block">
        <div className="max-w-5xl mx-auto px-3 flex items-center justify-between h-12 sm:h-14">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => router.push('/boletas')}
              className="text-slate-400 hover:text-white shrink-0"
              aria-label="Volver"
            >
              ←
            </button>
            <div className="min-w-0">
              <h1 className="text-base font-semibold text-neutral-100 truncate">Cuadrícula</h1>
            </div>
          </div>
          <button
            type="button"
            onClick={() => router.push('/boletas/ver')}
            className="text-xs sm:text-sm text-blue-300 hover:text-blue-200 shrink-0"
          >
            Lista
          </button>
        </div>
      </header>

      <main className="flex-1 min-h-0 flex flex-col w-full max-w-5xl mx-auto px-1.5 sm:px-3 py-0.5 lg:py-2">
        {isVendedor && offlineMode && (
          <div className="shrink-0 mb-1">
            <OfflineBoletasBanner
              savedAt={offlineSavedAt}
              onRetry={reintentarConexion}
              retrying={loading || loadingGrid}
            />
          </div>
        )}
        <div className="shrink-0 flex items-center gap-1.5 mb-0.5">
          <button
            type="button"
            onClick={() => router.push('/boletas')}
            className="text-xs text-violet-700 font-semibold py-1 shrink-0 lg:hidden"
          >
            ← Boletas
          </button>
          <select
            id="rifa-cuadricula"
            aria-label="Proyecto"
            value={selectedRifa}
            onChange={(e) => setSelectedRifa(e.target.value)}
            disabled={loading || rifas.length === 0}
            className="flex-1 min-w-0 py-1.5 px-2 border border-slate-300 rounded-lg text-slate-900 bg-white focus:ring-2 focus:ring-violet-500 outline-none text-xs font-medium"
          >
            {rifas.length === 0 && <option value="">Sin proyectos</option>}
            {rifas.map((rifa) => (
              <option key={rifa.id} value={rifa.id}>
                {rifa.nombre}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => router.push('/boletas/ver')}
            className="text-xs text-slate-600 py-1 shrink-0 lg:hidden"
          >
            Lista
          </button>
        </div>

        {error && (
          <div className="shrink-0 mb-1 bg-red-50 border border-red-200 text-red-700 text-xs p-2 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex-1 min-h-0 flex flex-col bg-white rounded-md lg:rounded-xl border border-slate-200 p-0.5 sm:p-1.5 shadow-sm overflow-hidden">
          <BoletaCuadricula
            boletas={boletas}
            rifaNombre={rifaNombre}
            alcance={alcance}
            vendedorNombre={userRole === 'VENDEDOR' ? userName : null}
            loading={loading || loadingGrid}
            readOnly={isVendedor && offlineMode}
          />
        </div>
      </main>
    </div>
  )
}
