'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { boletaApi } from '@/lib/boletaApi'
import { Boleta, BoletaListResponse } from '@/types/boleta'
import { Rifa } from '@/types/rifa'
import { rifaApi } from '@/lib/rifaApi'
import BoletaList from '@/components/BoletaList'

export default function VerBoletasPage() {
  const [boletas, setBoletas] = useState<Boleta[]>([])
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [selectedRifa, setSelectedRifa] = useState<string>('') // Usaremos solo este estado
  const [loading, setLoading] = useState(true)
  const [loadingBoletas, setLoadingBoletas] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [userRole, setUserRole] = useState<string | null>(null)
  const router = useRouter()

  // 1. Efecto inicial: Verificación de sesión y carga de rifas
  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')

    if (!token || !userData) {
      router.push('/login')
      return
    }

    try {
      const user = JSON.parse(userData)
      setUserRole(String(user.rol || '').toUpperCase())
      
      if (user.rol !== 'SUPER_ADMIN' && user.rol !== 'ADMIN' && user.rol !== 'VENDEDOR') {
        setError('No tienes permisos para acceder a este módulo')
        setLoading(false)
        return
      }
      
      fetchRifas()
    } catch (error) {
      router.push('/login')
    }
  }, [router])

  // 2. Efecto de Autoselección: Cuando los proyectos cambian, selecciona la primera
  useEffect(() => {
    if (rifas.length > 0 && !selectedRifa) {
      const primeraRifaId = rifas[0].id
      setSelectedRifa(primeraRifaId)
      fetchBoletas(primeraRifaId)
    }
  }, [rifas]) // Solo se ejecuta cuando se llena la lista de rifas

  const fetchRifas = async () => {
    try {
      setLoading(true)
      const response = await rifaApi.getRifasOperativas()
      setRifas(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar proyectos')
    } finally {
      setLoading(false)
    }
  }

  const fetchBoletas = async (rifaId: string) => {
    if (!rifaId) return
    try {
      setLoadingBoletas(true)
      const response: BoletaListResponse = await boletaApi.getBoletasByRifa(rifaId)
      setBoletas(response.data)
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar boletas')
    } finally {
      setLoadingBoletas(false)
    }
  }

  const handleRifaChange = (rifaId: string) => {
    setSelectedRifa(rifaId)
    fetchBoletas(rifaId)
  }

  // --- Renderizado de estados de error y carga ---

  if (userRole && userRole !== 'SUPER_ADMIN' && userRole !== 'ADMIN' && userRole !== 'VENDEDOR') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white border border-slate-200 shadow-xl rounded-2xl p-8 max-w-md text-center">
          <div className="bg-amber-100 text-amber-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Acceso Restringido</h2>
          <p className="text-slate-500 mb-6">Este módulo es exclusivo para administradores.</p>
          <button onClick={() => router.push('/dashboard')} className="w-full py-3 bg-slate-900 text-white rounded-xl font-semibold hover:bg-slate-800 transition-colors">Volver al Dashboard</button>
        </div>
        
      </div>
    )
  }

  return (
    <div className="app-shell pb-28 lg:pb-0">
      <header className="app-header sticky top-0 z-30 hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-500"
                title="Volver"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
              </button>
              <div>
                <h1 className="text-xl font-bold text-neutral-100 leading-none">Ver Boletas</h1>
                <p className="text-xs text-neutral-500 mt-1 uppercase tracking-wider font-semibold">Panel de Control</p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => router.push('/boletas/cuadricula')}
              className="bg-violet-600 hover:bg-violet-700 text-white px-4 py-3 rounded-xl shadow-md font-semibold text-sm"
            >
              Cuadrícula
            </button>
            {userRole === 'SUPER_ADMIN' && (
              <button
                type="button"
                onClick={() => router.push('/boletas/crear')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform transition-all active:scale-95 font-semibold flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Crear Boletas
              </button>
            )}
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-700 p-4 rounded-r-lg mb-6 shadow-sm flex items-center gap-3">
             <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
             {error}
          </div>
        )}

        {/* Selector de Proyecto */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 sm:p-6 mb-4 sm:mb-8 transition-all hover:shadow-md">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1 min-w-0">
              <label htmlFor="rifa" className="sr-only">
                Proyecto activo
              </label>
              <div className="relative">
                <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <select
                  id="rifa"
                  value={selectedRifa}
                  onChange={(e) => handleRifaChange(e.target.value)}
                  disabled={loading}
                  className="w-full max-w-full pl-11 pr-10 py-3.5 min-h-[52px] bg-slate-50 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:bg-white outline-none text-slate-900 appearance-none transition-all font-semibold text-xs sm:text-sm disabled:opacity-50 truncate"
                >
                  <option value="" disabled>Selecciona un proyecto...</option>
                  {rifas.map((rifa) => (
                    <option key={rifa.id} value={rifa.id}>
                      {rifa.nombre} — {rifa.estado}
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </div>
              </div>
            </div>
            
            {loading && (
              <div className="flex items-center gap-2 text-slate-400 text-sm pb-3">
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-400 border-t-transparent"></div>
                Cargando proyectos...
              </div>
            )}
          </div>
        </div>

        {/* Listado de Boletas (Hijo) */}
        {selectedRifa ? (
          <BoletaList
            boletas={boletas}
            loading={loadingBoletas}
            rifaInfo={rifas.find(r => r.id === selectedRifa) || null}
          />
        ) : !loading && (
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-20 text-center">
            <div className="max-w-xs mx-auto text-slate-400">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
              <h3 className="text-lg font-bold text-slate-900 mb-1">No hay proyectos disponibles</h3>
              <p className="text-sm">Parece que aún no has creado ningun proyecto en el sistema.</p>
            </div>
          </div>
        )}
      </main>

      <div
        className="fixed left-0 right-0 z-30 px-4 flex gap-3 lg:hidden pointer-events-none"
        style={{ bottom: 'calc(4.25rem + env(safe-area-inset-bottom, 0px))' }}
      >
        <button
          type="button"
          onClick={() => router.push('/boletas/cuadricula')}
          className="pointer-events-auto flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-violet-600 to-violet-700 text-white font-semibold text-sm shadow-lg shadow-violet-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          Cuadrícula
        </button>
        {userRole === 'SUPER_ADMIN' && (
          <button
            type="button"
            onClick={() => router.push('/boletas/crear')}
            className="pointer-events-auto flex-1 min-h-[48px] rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold text-sm shadow-lg shadow-blue-900/20 flex items-center justify-center gap-2 active:scale-[0.98]"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Boletas
          </button>
        )}
      </div>
    </div>
  )
}