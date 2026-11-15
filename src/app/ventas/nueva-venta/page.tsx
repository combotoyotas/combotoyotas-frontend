'use client'

import { Suspense, useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ventasApi } from '@/lib/ventasApi'
import { boletaApi } from '@/lib/boletaApi'
import { normalizeNumeros } from '@/utils/formatBoletaNumeros'
import { rifaApi } from '@/lib/rifaApi'
import { Rifa } from '@/types/rifa'
import { Cliente, BoletaEnCarrito } from '@/types/ventas'
import SelectorBoletas from '@/components/ventas/SelectorBoletas'
import ClienteSearch from '@/components/ventas/ClienteSearch'
import ClienteSeleccionado from '@/components/ventas/ClienteSeleccionado'
import CarritoVentas from '@/components/ventas/CarritoVentas'
import MisReservas from '@/components/ventas/MisReservas'
import { RealTimeNotifications } from '@/components/ventas/RealTimeNotifications'
import VentasMobileContinueFab from '@/components/ventas/VentasMobileContinueFab'
import { useVentasRealTime } from '@/hooks/useWebSocket'
import {
  clearVentasAutoPrefillCache,
  clearVentasNuevaDraft,
  consumeVentasPrefillBoletaIds,
  filterBoletasCarritoVigentes,
  isBrowserFullReload,
  loadVentasAutoPrefillCache,
  loadVentasNuevaDraft,
  saveVentasAutoPrefillCache,
  saveVentasNuevaDraft,
} from '@/lib/ventasNuevaDraft'
import { setModuleLastPath } from '@/lib/moduleLastPath'

// Componente temporal para SelectorRifa
function SelectorRifa({ rifas, rifaSeleccionada, onRifaSeleccionada }: { 
  rifas: Rifa[], 
  rifaSeleccionada: Rifa | null, 
  onRifaSeleccionada: (rifa: Rifa) => void 
}) {
  return (
    <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
      <h2 className="text-lg font-medium text-slate-900 mb-4">Seleccionar proyecto</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rifas.map((rifa) => (
          <button
            key={rifa.id}
            onClick={() => onRifaSeleccionada(rifa)}
            className={`p-4 border-2 rounded-lg text-left transition-all ${
              rifaSeleccionada?.id === rifa.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-slate-200 hover:border-slate-300'
            }`}
          >
            <div className="font-medium text-slate-900">{rifa.nombre}</div>
            <div className="text-sm text-slate-600 mt-1">
              Premio: {rifa.premio || 'No especificado'}
            </div>
            <div className="text-sm text-slate-500">
              Precio: ${typeof rifa.precio_boleta === 'number' ? rifa.precio_boleta : parseFloat(rifa.precio_boleta || '0')}
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

export default function VentasPage() {
  return (
    <Suspense fallback={<div className="p-8 text-slate-600">Cargando ventas…</div>}>
      <VentasPageContent />
    </Suspense>
  )
}

function VentasPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [rifaSeleccionada, setRifaSeleccionada] = useState<Rifa | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [avisoBoleta, setAvisoBoleta] = useState<string | null>(null)
  
  // Estado del flujo de ventas
  const [pasoActual, setPasoActual] = useState<'seleccionar-rifa' | 'seleccionar-boletas' | 'datos-cliente' | 'resumen'>('seleccionar-rifa')
  const [boletasSeleccionadas, setBoletasSeleccionadas] = useState<BoletaEnCarrito[]>([])
  const [mostrarReservas, setMostrarReservas] = useState(false)
  const [prefillDesdeBoleta, setPrefillDesdeBoleta] = useState(false)
  const [cliente, setCliente] = useState<Cliente>({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    identificacion: ''
  })
  const draftRestoredRef = useRef(false)

  // WebSocket para actualizaciones en tiempo real
  const { eventosRecientes, conectado } = useVentasRealTime(
    rifaSeleccionada?.id || ''
  )

  // Cargar proyectos activos
  const cargarRifas = async () => {
    try {
      const token = localStorage.getItem('token')
      const userData = localStorage.getItem('user')
      
      if (!token || !userData) {
        router.push('/login')
        return
      }

      const user = JSON.parse(userData)
      
      // Verificar rol
      if (user.rol !== 'SUPER_ADMIN' && user.rol !== 'VENDEDOR' && user.rol !== 'ADMIN') {
        router.push('/dashboard')
        return
      }

      // Cargar proyectos activos usando endpoint operativo (sin acceso al módulo de rifas)
      try {
        const response = await rifaApi.getRifasOperativas('ACTIVA')
        setRifas(response.data)
        setError(null) // Limpiar error si todo funciona
      } catch (rifaError: any) {
        console.warn('Error cargando proyectos, verificando si es HTML 404...', rifaError)
        
        // Verificar específicamente si es un error de HTML (404 page)
        if (rifaError.message && rifaError.message.includes('Unexpected token')) {
          console.log('Endpoint /api/rifas devuelve HTML (404), usando rifa de ejemplo')
          
          // Rifa de ejemplo para pruebas mientras el backend no tiene el endpoint
          const rifaEjemplo: Rifa = {
            id: 'rifa-ejemplo-123',
            nombre: 'Proyecto ejemplo - Pruebas',
            slug: 'rifa-ejemplo-pruebas',
            premio: 'Premio de Ejemplo $1000',
            premio_principal: 'Premio de Ejemplo $1000',
            descripcion: 'Proyecto de ejemplo para probar el sistema de ventas',
            estado: 'ACTIVA',
            precio_boleta: '10.00',
            total_boletas: 100,
            boletas_vendidas: 0,
            boletas_disponibles: 100,
            fecha_inicio: new Date().toISOString(),
            fecha_fin: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            fecha_sorteo: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            imagen_url: null,
            terminos_condiciones: null,
            creado_por: user.id,
            creador_nombre: user.nombre,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }
          
          setRifas([rifaEjemplo])
          setError('Usando proyecto de ejemplo. El endpoint /api/rifas no está disponible en el backend.')
        } else {
          // Si es otro tipo de error, dejar que se maneje normalmente
          throw rifaError
        }
      }
      
    } catch (error) {
      console.error('Error general en cargarRifas:', error)
      setError('Error cargando proyectos activos')
    } finally {
      setLoading(false)
    }
  }

  // Seleccionar proyecto
  const seleccionarRifa = (rifa: Rifa) => {
    setRifaSeleccionada(rifa)
    setPasoActual('seleccionar-boletas')
    setBoletasSeleccionadas([])
  }

  // Manejar selección de boletas
  const handleBoletaSeleccionada = (boleta: BoletaEnCarrito) => {
    setBoletasSeleccionadas(prev => [...prev, boleta])
  }

  const handleBoletaRemovida = (boletaId: string) => {
    if (boletaId === 'all') {
      // Limpiar todo
      setBoletasSeleccionadas([])
      setPasoActual('seleccionar-boletas')
    } else {
      setBoletasSeleccionadas(prev => prev.filter(b => b.id !== boletaId))
    }
  }

  // Continuar al siguiente paso
  const continuarSiguiente = () => {
    switch (pasoActual) {
      case 'seleccionar-boletas':
        if (boletasSeleccionadas.length > 0) {
          setPasoActual('datos-cliente')
        }
        break
      case 'datos-cliente':
        if (cliente.nombre && cliente.telefono) {
          setPasoActual('resumen')
        }
        break
    }
  }

  // Venta completada
  const handleVentaCompletada = () => {
    clearVentasAutoPrefillCache()
    clearVentasNuevaDraft()
    // Resetear estado
    setBoletasSeleccionadas([])
    setCliente({
      nombre: '',
      telefono: '',
      email: '',
      direccion: '',
      identificacion: ''
    })
    setPasoActual('seleccionar-boletas')
    
    // Opcional: mostrar notificación de éxito
    // alert('¡Venta completada exitosamente!')
  }

  // Volver al paso anterior
  const volverPasoAnterior = () => {
    switch (pasoActual) {
      case 'seleccionar-boletas':
        setRifaSeleccionada(null)
        setPasoActual('seleccionar-rifa')
        break
      case 'datos-cliente':
        setPasoActual('seleccionar-boletas')
        break
      case 'resumen':
        setPasoActual('datos-cliente')
        break
    }
  }

  // Indicador de conexión WebSocket
  const ConexionIndicator = () => (
    <div className="flex items-center space-x-2">
      <div className={`w-2 h-2 rounded-full ${conectado ? 'bg-green-500' : 'bg-red-500'}`} />
      <span className="text-xs text-slate-600">
        {conectado ? 'Conectado' : 'Desconectado'}
      </span>
    </div>
  )

  useEffect(() => {
    if (isBrowserFullReload()) {
      clearVentasAutoPrefillCache()
    }
    cargarRifas()
    setModuleLastPath('ventas', '/ventas/nueva-venta')
  }, [])

  useEffect(() => {
    if (loading || rifas.length === 0 || draftRestoredRef.current) return

    const fullReload = isBrowserFullReload()
    const autoVender = searchParams.get('auto') === '1'

    if (autoVender && fullReload) {
      draftRestoredRef.current = true
      const rifaId = searchParams.get('rifa_id')
      const qs = rifaId ? `?rifa_id=${encodeURIComponent(rifaId)}` : ''
      router.replace(`/ventas/nueva-venta${qs}`, { scroll: false })
      return
    }

    if (autoVender) {
      draftRestoredRef.current = true
      return
    }

    const draft = loadVentasNuevaDraft()
    draftRestoredRef.current = true
    if (!draft) return

    if (draft.rifaId) {
      const rifa = rifas.find((r) => r.id === draft.rifaId)
      if (rifa) setRifaSeleccionada(rifa)
    }
    setCliente(draft.cliente)
    setMostrarReservas(draft.mostrarReservas)

    if (fullReload) {
      setBoletasSeleccionadas([])
      const paso =
        draft.pasoActual === 'datos-cliente' || draft.pasoActual === 'resumen'
          ? 'seleccionar-boletas'
          : draft.pasoActual
      setPasoActual(paso)
      saveVentasNuevaDraft({
        pasoActual: paso,
        rifaId: draft.rifaId,
        boletasSeleccionadas: [],
        cliente: draft.cliente,
        mostrarReservas: draft.mostrarReservas,
      })
      return
    }

    const vigentes = filterBoletasCarritoVigentes(draft.boletasSeleccionadas)
    setBoletasSeleccionadas(vigentes)
    const paso =
      vigentes.length === 0 &&
      (draft.pasoActual === 'datos-cliente' || draft.pasoActual === 'resumen')
        ? 'seleccionar-boletas'
        : draft.pasoActual
    setPasoActual(paso)
  }, [loading, rifas, searchParams, router])

  useEffect(() => {
    if (loading || !draftRestoredRef.current) return
    saveVentasNuevaDraft({
      pasoActual,
      rifaId: rifaSeleccionada?.id ?? null,
      boletasSeleccionadas,
      cliente,
      mostrarReservas,
    })
    setModuleLastPath('ventas', '/ventas/nueva-venta')
  }, [
    loading,
    pasoActual,
    rifaSeleccionada,
    boletasSeleccionadas,
    cliente,
    mostrarReservas,
  ])

  useEffect(() => {
    if (loading || prefillDesdeBoleta || rifas.length === 0) return

    const rifaId = searchParams.get('rifa_id')
    if (searchParams.get('auto') !== '1' || !rifaId) return

    const boletaIdParam = searchParams.get('boleta_id')
    const source = searchParams.get('source')
    let boletaIds: string[] = []
    if (boletaIdParam) {
      boletaIds = [boletaIdParam]
    } else if (source === 'boletas-list') {
      const prefillBulk = consumeVentasPrefillBoletaIds()
      if (prefillBulk && prefillBulk.rifaId === rifaId) {
        boletaIds = prefillBulk.boletaIds
      }
    }

    if (boletaIds.length === 0) return

    const prefillSignature = `auto:${rifaId}:${[...boletaIds].sort().join(',')}`
    const cached = loadVentasAutoPrefillCache(prefillSignature)
    if (cached) {
      const rifaCached = rifas.find((r) => r.id === cached.rifaId)
      if (rifaCached) {
        setRifaSeleccionada(rifaCached)
        setPasoActual('seleccionar-boletas')
        setBoletasSeleccionadas(cached.boletas)
        router.replace(
          `/ventas/nueva-venta?rifa_id=${encodeURIComponent(rifaCached.id)}`,
          { scroll: false }
        )
        setPrefillDesdeBoleta(true)
        return
      }
    }

    const rifa = rifas.find((r) => r.id === rifaId)
    if (!rifa) {
      setAvisoBoleta('No se encontró el proyecto de la boleta.')
      setPrefillDesdeBoleta(true)
      return
    }

    const precio =
      typeof rifa.precio_boleta === 'number'
        ? rifa.precio_boleta
        : parseFloat(String(rifa.precio_boleta || '0'))

    ;(async () => {
      const bloqueadas: BoletaEnCarrito[] = []
      const errores: string[] = []
      try {
        clearVentasNuevaDraft()
        setAvisoBoleta(null)
        setRifaSeleccionada(rifa)
        setPasoActual('seleccionar-boletas')
        for (const boletaId of boletaIds) {
          try {
            const detail = await boletaApi.getBoletaById(boletaId)
            const b = detail.data
            const nums = normalizeNumeros(b.numeros, b.numero)
            const block = await ventasApi.bloquearBoleta(boletaId, 15, b.numero)
            const bloqueo = block.data
            bloqueadas.push({
              id: b.id,
              numero: b.numero,
              numeros: nums,
              numero_principal: b.numero,
              precio,
              reserva_token: bloqueo.reserva_token,
              bloqueo_hasta: bloqueo.bloqueo_hasta,
              qr_url: b.qr_url,
              barcode: b.barcode,
              imagen_url: b.imagen_url ?? undefined,
            })
          } catch (e: unknown) {
            const msg = e instanceof Error ? e.message : 'Error al bloquear'
            errores.push(msg)
          }
        }

        if (bloqueadas.length > 0) {
          bloqueadas.sort((a, b) => a.numero - b.numero)
          setBoletasSeleccionadas(bloqueadas)
          saveVentasAutoPrefillCache(prefillSignature, rifa.id, bloqueadas)
          router.replace(
            `/ventas/nueva-venta?rifa_id=${encodeURIComponent(rifa.id)}`,
            { scroll: false }
          )
          setAvisoBoleta(
            errores.length > 0
              ? `Se agregaron ${bloqueadas.length} boleta(s). Otras no se pudieron bloquear: ${errores[0]}`
              : null
          )
        } else {
          setAvisoBoleta(
            errores[0] ??
              'No se pudo reservar la boleta automáticamente. Puedes buscarla y agregarla en el listado.'
          )
        }
      } catch (e: unknown) {
        setAvisoBoleta(
          e instanceof Error
            ? e.message
            : 'No se pudo agregar la boleta. Puedes seleccionarla manualmente abajo.'
        )
      } finally {
        setPrefillDesdeBoleta(true)
      }
    })()
  }, [loading, prefillDesdeBoleta, rifas, searchParams])

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-8 h-8 bg-blue-100 rounded-full mb-4">
            <svg className="w-4 h-4 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-slate-600">Cargando sistema de ventas...</p>
        </div>
      </div>
    )
  }

  const continuarBoletasLabel =
    boletasSeleccionadas.length > 0
      ? `Continuar (${boletasSeleccionadas.length} boleta${boletasSeleccionadas.length !== 1 ? 's' : ''})`
      : 'Continuar'

  return (
    <div className="min-h-screen bg-slate-50">
      <VentasMobileContinueFab
        visible={pasoActual === 'seleccionar-boletas' && boletasSeleccionadas.length > 0}
        label={continuarBoletasLabel}
        onContinue={() => setPasoActual('datos-cliente')}
      />
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-slate-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center min-h-14 sm:h-16 py-2">
            <div className="flex items-center gap-2 sm:gap-4 min-w-0">
              <button
                onClick={() => router.push('/dashboard')}
                className="text-slate-600 hover:text-slate-900 text-sm shrink-0"
              >
                ← <span className="hidden sm:inline">Dashboard</span>
              </button>
              <h1 className="text-base sm:text-xl font-semibold text-slate-900 truncate">Ventas</h1>
            </div>
            <ConexionIndicator />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main
        className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 lg:pb-8 ${
          pasoActual === 'seleccionar-boletas' && boletasSeleccionadas.length > 0
            ? 'pb-[calc(var(--tabbar-h)+var(--sab)+5rem)]'
            : pasoActual === 'datos-cliente' || pasoActual === 'resumen'
              ? 'pb-[calc(var(--tabbar-h)+var(--sab)+5rem)]'
              : 'pb-28'
        }`}
      >
        {error ? (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-slate-900 font-medium mb-2">Error cargando el sistema</p>
            <p className="text-slate-600">{error}</p>
            <button
              onClick={cargarRifas}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {avisoBoleta && (
              <div
                role="alert"
                className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                {avisoBoleta}
              </div>
            )}
            {/* Indicador de paso actual */}
            <div className="flex flex-wrap items-center justify-center gap-1 sm:gap-2 mb-6 sm:mb-8 px-1">
              {[
                { key: 'seleccionar-rifa', n: 1, label: 'Proyecto', short: 'Proy.' },
                { key: 'seleccionar-boletas', n: 2, label: 'Boletas', short: 'Bol.' },
                { key: 'datos-cliente', n: 3, label: 'Cliente', short: 'Cli.' },
                { key: 'resumen', n: 4, label: 'Cobrar', short: 'Pago' },
              ].map((step, i) => (
                <div key={step.key} className="flex items-center gap-1 sm:gap-2">
                  {i > 0 && <div className="w-4 sm:w-8 h-px bg-slate-300" />}
                  <div
                    className={`flex items-center gap-1 sm:gap-2 px-2 sm:px-3 py-1.5 sm:py-2 rounded-full text-xs sm:text-sm font-medium ${
                      pasoActual === step.key ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    <span>{step.n}</span>
                    <span className="hidden sm:inline">{step.label}</span>
                    <span className="sm:hidden">{step.short}</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Sección de Reservas Activas
            <div className="bg-white rounded-lg shadow-sm border border-slate-200">
              <button
                onClick={() => setMostrarReservas(!mostrarReservas)}
                className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">📌</span>
                  <div className="text-left">
                    <h3 className="font-medium text-slate-900">Mis Reservas Activas</h3>
                    <p className="text-sm text-slate-600">Gestiona tus boletas bloqueadas</p>
                  </div>
                </div>
                <svg
                  className={`w-5 h-5 text-slate-600 transition-transform ${mostrarReservas ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
                </svg>
              </button>

              {mostrarReservas && (
                <div className="border-t border-slate-200 p-6">
                  <MisReservas rifaId={rifaSeleccionada?.id} />
                </div>
              )}
            </div> */}

            {/* Contenido del paso actual */}
            {pasoActual === 'seleccionar-rifa' && (
              <div className="space-y-6">
                <SelectorRifa
                  rifas={rifas}
                  rifaSeleccionada={rifaSeleccionada}
                  onRifaSeleccionada={seleccionarRifa}
                />
              </div>
            )}

            {pasoActual === 'seleccionar-boletas' && rifaSeleccionada && (
              <div className="space-y-6">
                <SelectorBoletas
                  rifaId={rifaSeleccionada.id}
                  precioBoleta={typeof rifaSeleccionada.precio_boleta === 'number' ? rifaSeleccionada.precio_boleta : parseFloat(rifaSeleccionada.precio_boleta || '0')}
                  onBoletaSeleccionada={handleBoletaSeleccionada}
                  onBoletaRemovida={handleBoletaRemovida}
                  boletasSeleccionadas={boletasSeleccionadas}
                  onContinuar={() => setPasoActual('datos-cliente')}
                />
                
                {/* Navegación escritorio */}
                <div className="hidden lg:flex justify-between items-center gap-3 pt-2">
                  <button
                    type="button"
                    onClick={volverPasoAnterior}
                    className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 min-h-[44px]"
                  >
                    ← Volver
                  </button>
                  {boletasSeleccionadas.length > 0 ? (
                    <button
                      type="button"
                      onClick={() => setPasoActual('datos-cliente')}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center justify-center gap-2 min-h-[44px] font-medium"
                    >
                      <span>
                        Continuar ({boletasSeleccionadas.length} boleta
                        {boletasSeleccionadas.length !== 1 ? 's' : ''})
                      </span>
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  ) : (
                    <p className="text-slate-500 text-sm">Selecciona al menos una boleta</p>
                  )}
                </div>

                <div className="lg:hidden pt-1">
                  <button
                    type="button"
                    onClick={volverPasoAnterior}
                    className="text-sm text-slate-600 hover:text-slate-900 font-medium min-h-[44px] px-1"
                  >
                    ← Volver al proyecto
                  </button>
                </div>
              </div>
            )}

            {pasoActual === 'datos-cliente' && (
              <div className="space-y-4 sm:space-y-6 pb-4">
                <ClienteSearch
                 rifaId={rifaSeleccionada?.id}
                 onClienteSelected={(clienteSeleccionado) => {
                 setCliente(clienteSeleccionado)
                 setTimeout(() => {
                 setPasoActual('resumen')
                 }, 0)
                 }}
                />
                
                <div className="sm:pt-2">
                  <button
                    onClick={volverPasoAnterior}
                    className="w-full sm:w-auto px-4 py-3 sm:py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 min-h-[48px]"
                  >
                    ← Volver a boletas
                  </button>
                </div>
              </div>
            )}

            {/* Paso 4: Resumen y Venta */}
             {pasoActual === 'resumen' && rifaSeleccionada&& (
              <div className="space-y-6">
                <ClienteSeleccionado
                  cliente={cliente}
                  onCambiarCliente={() => setPasoActual('datos-cliente')}
                />
                
                <CarritoVentas
                  boletas={boletasSeleccionadas}
                  cliente={cliente}
                  precioBoleta={typeof rifaSeleccionada.precio_boleta === 'number' ? rifaSeleccionada.precio_boleta : parseFloat(rifaSeleccionada.precio_boleta || '0')}
                  rifaId={rifaSeleccionada.id}
                  rifaNombre={rifaSeleccionada.nombre}
                  fechaSorteo={rifaSeleccionada.fecha_sorteo}
                  onBoletaRemovida={handleBoletaRemovida}
                  onVentaCompletada={handleVentaCompletada}
                />
                
                <div className="flex justify-between">
                  <button
                    onClick={volverPasoAnterior}
                    className="px-6 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
                  >
                    ← Volver
                  </button>
                </div>
              </div>
            )}

            {/* Fallback si no hay contenido */}
            {pasoActual === 'resumen' && (!cliente || cliente.nombre.trim() === '') && (
              <div className="text-center py-12">
                <svg className="w-16 h-16 mx-auto mb-4 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l2.414 2.414a1 1 0 01.707.293H17a2 2 0 012-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                <p className="text-slate-600 font-medium mb-2">No hay cliente seleccionado</p>
                <p className="text-slate-500 mb-4">Por favor, regresa y selecciona o crea un cliente para continuar.</p>
                <button
                  onClick={() => setPasoActual('datos-cliente')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Seleccionar Cliente
                </button>
              </div>
            )}
          </div>
        )}

        {/* Notificaciones en tiempo real */}
        <RealTimeNotifications 
          eventos={eventosRecientes}
        />
      </main>
    </div>
  )
}
