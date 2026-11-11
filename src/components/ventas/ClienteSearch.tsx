'use client'

import { useState, useEffect } from 'react'
import {
  UserPlus,
  UserSearch,
  IdCard,
  Search,
  Phone,
  Mail,
  MapPin,
  Check,
  AlertCircle,
  Loader2,
  ChevronRight,
  User,
  Sparkles,
} from 'lucide-react'
import { Cliente, ClienteSimilar } from '@/types/ventas'
import { ventasApi } from '@/lib/ventasApi'

interface ClienteSearchProps {
  onClienteSelected: (cliente: Cliente) => void
  onClienteCreated?: (cliente: Cliente) => void
  permitirCrear?: boolean
  rifaId?: string
}

const ESTADO_BOLETA_STYLES: Record<string, string> = {
  PAGADA: 'bg-green-100 text-green-800',
  RESERVADA: 'bg-amber-100 text-amber-800',
  ABONADA: 'bg-blue-100 text-blue-800',
  ANULADA: 'bg-red-100 text-red-800',
  DISPONIBLE: 'bg-slate-100 text-slate-700'
}

function formatNumeroBoleta(numero: number) {
  return String(numero).padStart(4, '0')
}

function getEstadoBoletaStyle(estado: string) {
  return ESTADO_BOLETA_STYLES[estado] || 'bg-slate-100 text-slate-700'
}

export default function ClienteSearch({
  onClienteSelected,
  onClienteCreated,
  permitirCrear = true,
  rifaId
}: ClienteSearchProps) {
  const [modo, setModo] = useState<'BUSCAR' | 'NUEVO'>(permitirCrear ? 'NUEVO' : 'BUSCAR')
  const [tipoBusqueda, setTipoBusqueda] = useState<'CEDULA' | 'GENERAL'>('CEDULA')
  const [busqueda, setBusqueda] = useState('')
  const [cedulaBusqueda, setCedulaBusqueda] = useState('')
  const [resultados, setResultados] = useState<Cliente[]>([])
  const [loading, setLoading] = useState(false)
  const [clienteNuevo, setClienteNuevo] = useState<Cliente>({
    nombre: '',
    telefono: '',
    email: '',
    direccion: '',
    identificacion: ''
  })
  const [creando, setCreando] = useState(false)
  const [clienteCreadoExitosamente, setClienteCreadoExitosamente] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [generandoId, setGenerandoId] = useState(false)
  const [similares, setSimilares] = useState<ClienteSimilar[]>([])
  const [loadingSimilares, setLoadingSimilares] = useState(false)
  const [similaresOcultos, setSimilaresOcultos] = useState(false)
  const [terminoSimilar, setTerminoSimilar] = useState('')


  useEffect(() => {
  if (!permitirCrear) {
    setModo('BUSCAR')
  }
}, [permitirCrear])

  useEffect(() => {
    if (modo !== 'NUEVO') {
      setSimilares([])
      setSimilaresOcultos(false)
      setTerminoSimilar('')
      return
    }

    const nombre = clienteNuevo.nombre.trim()
    const identificacion = (clienteNuevo.identificacion ?? '').trim()
    const termino = identificacion.length >= 5 ? identificacion : nombre

    if (similaresOcultos || termino.length < 3) {
      setSimilares([])
      setLoadingSimilares(false)
      setTerminoSimilar(termino)
      return
    }

    setTerminoSimilar(termino)
    setLoadingSimilares(true)

    const timeoutId = setTimeout(async () => {
      try {
        const response = await ventasApi.buscarClientesSimilares(termino, rifaId)
        setSimilares(response.data || [])
      } catch {
        setSimilares([])
      } finally {
        setLoadingSimilares(false)
      }
    }, 350)

    return () => clearTimeout(timeoutId)
  }, [
    modo,
    clienteNuevo.nombre,
    clienteNuevo.identificacion,
    similaresOcultos,
    rifaId
  ])

  // Buscar clientes cuando cambia la búsqueda
  useEffect(() => {
    const buscarClientes = async () => {
      setLoading(true)
      setError(null)
      
      try {
        let response
        
        if (tipoBusqueda === 'CEDULA' && cedulaBusqueda.length >= 7)  {
          // Búsqueda específica por cédula
          response = await ventasApi.buscarClientePorCedula(cedulaBusqueda.trim())
          setResultados([response.data])
        } else if (tipoBusqueda === 'GENERAL' && busqueda.length >= 3) {
          // Búsqueda general
         const response = await ventasApi.buscarClientes(busqueda)
          setResultados(response.data || [])
        } else {
          setResultados([])
          setLoading(false)
          return
        }
      } catch (error) {
        // console.error('Error buscando clientes:', error)
        // setError('Error buscando clientes')
        setResultados([])
      } finally {
        setLoading(false)
      }
    }

    const timeoutId = setTimeout(buscarClientes, 300)
    return () => clearTimeout(timeoutId)
  }, [busqueda, cedulaBusqueda, tipoBusqueda])

  // Generar identificación secuencial
  const generarIdentificacion = async () => {
    setGenerandoId(true)
    setError(null)
    try {
      const response = await ventasApi.getNextIdentificacion()
      setClienteNuevo(prev => ({ ...prev, identificacion: response.data.identificacion }))
    } catch (err) {
      setError('Error al generar identificación')
    } finally {
      setGenerandoId(false)
    }
  }

  // Crear nuevo cliente
  const crearCliente = async () => {
    if (!clienteNuevo.nombre || !clienteNuevo.telefono) {
      setError('Nombre y teléfono son requeridos')
      return
    }

    setCreando(true)
    setError(null)

    try {
      const payload = {
        ...clienteNuevo,
        email: clienteNuevo.email?.trim() || undefined,
        direccion: clienteNuevo.direccion?.trim() || undefined,
      }
      const response = await ventasApi.crearCliente(payload)
      const nuevoCliente = response.data?.cliente ?? response.data
      
      console.log('Cliente creado exitosamente:', nuevoCliente)
      
      if (!nuevoCliente || !nuevoCliente.nombre) {
        setError('Error: El servidor no devolvió los datos del cliente correctamente')
        return
      }

      // Llamar al callback con el cliente creado
      // Seleccionar automáticamente el cliente recién creado
      onClienteSelected(nuevoCliente)

    //   // Notificar creación si existe callback
    //   if (onClienteCreated) {
    //   onClienteCreated(nuevoCliente)
    //  }
      
      // Marcar como creado exitosamente
      setClienteCreadoExitosamente(true)
      
      // Limpiar formulario
      setClienteNuevo({
        nombre: '',
        telefono: '',
        email: '',
        direccion: '',
        identificacion: ''
      })
      
      // Limpiar error si había
      setError(null)
      
    } catch (error: any) {
      console.error('Error creando cliente:', error)
      setError(error.message || 'Error creando cliente')
    } finally {
      setCreando(false)
    }
  }

  // Seleccionar cliente existente
  const seleccionarCliente = (cliente: Cliente) => {
    onClienteSelected(cliente)
    setBusqueda('')
    setCedulaBusqueda('')
    setResultados([])
    setSimilares([])
    setSimilaresOcultos(false)
    setClienteCreadoExitosamente(false)
    setError(null)
  }

  const usarClienteSimilar = (cliente: ClienteSimilar) => {
    seleccionarCliente({
      id: cliente.id,
      nombre: cliente.nombre,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      identificacion: cliente.identificacion
    })
  }

  const renderPanelSimilares = () => {
    if (modo !== 'NUEVO' || similaresOcultos || terminoSimilar.length < 3) {
      return null
    }

    if (loadingSimilares) {
      return (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Buscando clientes similares...
        </div>
      )
    }

    if (similares.length === 0) {
      return null
    }

    return (
      <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-amber-950">
              ¿Ya existe este cliente?
            </p>
            <p className="text-sm text-amber-900 mt-1">
              Encontramos {similares.length} cliente{similares.length !== 1 ? 's' : ''} parecido{similares.length !== 1 ? 's' : ''}. Revisa cédula, boleta y estado antes de crear uno nuevo.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setSimilaresOcultos(true)}
            className="text-xs font-medium text-amber-800 hover:text-amber-950 whitespace-nowrap"
          >
            Crear nuevo igual
          </button>
        </div>

        <div className="space-y-2 max-h-80 overflow-y-auto">
          {similares.map((cliente) => (
            <div
              key={cliente.id}
              className="rounded-lg border border-amber-200 bg-white p-4 shadow-sm"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0 flex-1">
                  <div className="font-semibold text-slate-900">{cliente.nombre}</div>
                  <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-slate-600">
                    {cliente.codigo && (
                      <span className="font-mono text-slate-500">{cliente.codigo}</span>
                    )}
                    {cliente.identificacion && (
                      <span>C.C: {cliente.identificacion}</span>
                    )}
                    <span>{cliente.telefono}</span>
                    {cliente.email && <span>{cliente.email}</span>}
                  </div>

                  {cliente.boletas?.length > 0 ? (
                    <div className="mt-3 space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Historial de boletas
                      </p>
                      {cliente.boletas.map((boleta, index) => (
                        <div
                          key={`${cliente.id}-${boleta.rifa_id || boleta.rifa_nombre}-${boleta.numero}-${index}`}
                          className="rounded-md border border-slate-100 bg-slate-50 px-3 py-2 text-sm space-y-1"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium text-slate-800">
                              #{formatNumeroBoleta(boleta.numero)}
                            </span>
                            <span className="text-slate-500">·</span>
                            <span className="text-slate-700">{boleta.rifa_nombre}</span>
                            <span
                              className={`rounded-full px-2 py-0.5 text-xs font-medium ${getEstadoBoletaStyle(boleta.estado)}`}
                            >
                              {boleta.estado}
                            </span>
                            {boleta.es_actual && (
                              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-800">
                                Activa
                              </span>
                            )}
                            {boleta.fue_liberada && !boleta.es_actual && (
                              <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-800">
                                Liberada
                              </span>
                            )}
                            {boleta.rifa_estado === 'TERMINADA' && (
                              <span className="rounded-full bg-violet-100 px-2 py-0.5 text-xs font-medium text-violet-800">
                                Proyecto terminado
                              </span>
                            )}
                          </div>
                          {boleta.resumen_pago && (
                            <p className="text-xs text-slate-600">{boleta.resumen_pago}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-slate-500">
                      Sin boletas registradas en proyectos anteriores.
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  onClick={() => usarClienteSimilar(cliente)}
                  className="shrink-0 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Usar este cliente
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  const busquedaActiva =
    tipoBusqueda === 'CEDULA'
      ? cedulaBusqueda.length >= 7
      : busqueda.length >= 3

  const mostrarEmptyBusqueda =
    !loading && resultados.length === 0 && busquedaActiva

  const inputClass =
    'block w-full pl-10 pr-3 py-3 sm:py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-black placeholder:text-slate-400 text-base sm:text-sm min-h-[48px]'

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6 pb-28 sm:pb-6">
      <div className="mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
          <User className="w-5 h-5 text-blue-600 shrink-0" />
          Datos del cliente
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {modo === 'NUEVO'
            ? 'Registra los datos del comprador para continuar al cobro.'
            : 'Busca un cliente que ya haya comprado antes.'}
        </p>
      </div>
      
      {/* Tabs principales — Nuevo primero (mayoría de casos) */}
      {permitirCrear && (
      <div className="grid grid-cols-2 gap-2 mb-5 sm:mb-6">
        <button
          type="button"
          onClick={() => {
            setModo('NUEVO')
            setClienteCreadoExitosamente(false)
            setSimilares([])
            setSimilaresOcultos(false)
            setError(null)
          }}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3 px-3 rounded-xl text-sm font-semibold transition-all min-h-[56px] border-2 ${
            modo === 'NUEVO'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <UserPlus className="w-5 h-5 shrink-0" />
          <span>Nuevo cliente</span>
        </button>
        <button
          type="button"
          onClick={() => {
            setModo('BUSCAR')
            setClienteCreadoExitosamente(false)
            setError(null)
          }}
          className={`flex flex-col sm:flex-row items-center justify-center gap-1.5 sm:gap-2 py-3 sm:py-3 px-3 rounded-xl text-sm font-semibold transition-all min-h-[56px] border-2 ${
            modo === 'BUSCAR'
              ? 'border-blue-600 bg-blue-50 text-blue-700 shadow-sm'
              : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-white'
          }`}
        >
          <UserSearch className="w-5 h-5 shrink-0" />
          <span>Ya registrado</span>
        </button>
      </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-4 flex items-start gap-2 text-sm">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {clienteCreadoExitosamente && (
        <div className="bg-green-50 border border-green-200 text-green-800 px-4 py-3 rounded-xl mb-4 flex items-center gap-2 text-sm font-medium">
          <Check className="w-5 h-5 shrink-0" />
          ¡Cliente registrado! Continuando al cobro...
        </div>
      )}

      {!permitirCrear || modo === 'BUSCAR' ? (
        <div className="space-y-4">
          {/* Sub-tabs búsqueda */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setTipoBusqueda('CEDULA')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                tipoBusqueda === 'CEDULA'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <IdCard className="w-4 h-4" />
              Por cédula
            </button>
            <button
              type="button"
              onClick={() => setTipoBusqueda('GENERAL')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-lg text-sm font-medium transition-all min-h-[44px] ${
                tipoBusqueda === 'GENERAL'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Search className="w-4 h-4" />
              Nombre / teléfono
            </button>
          </div>

          {tipoBusqueda === 'CEDULA' ? (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Número de cédula
              </label>
              <div className="relative">
                <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  inputMode="numeric"
                  value={cedulaBusqueda}
                  onChange={(e) => setCedulaBusqueda(e.target.value.replace(/\D/g, ''))}
                  className={inputClass}
                  placeholder="Ej: 1234567890"
                />
              </div>
              {!busquedaActiva && (
                <p className="mt-2 text-xs text-slate-500">
                  Escribe al menos 7 dígitos para buscar.
                </p>
              )}
            </div>
          ) : (
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Buscar cliente
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className={inputClass}
                  placeholder="Nombre, teléfono o email..."
                />
              </div>
              {!busquedaActiva && (
                <p className="mt-2 text-xs text-slate-500">
                  Escribe al menos 3 caracteres para buscar.
                </p>
              )}
            </div>
          )}

          {loading && busquedaActiva ? (
            <div className="text-center py-8 text-slate-500">
              <Loader2 className="w-8 h-8 mx-auto mb-2 animate-spin text-blue-600" />
              <p className="text-sm">Buscando cliente...</p>
            </div>
          ) : resultados.length > 0 ? (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-slate-700">
                {resultados.length} resultado{resultados.length !== 1 ? 's' : ''}
              </h3>
              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                {resultados.map((cliente) => (
                  <button
                    key={cliente.id}
                    type="button"
                    onClick={() => seleccionarCliente(cliente)}
                    className="w-full text-left p-4 hover:bg-blue-50 active:bg-blue-100 transition-colors flex items-center justify-between gap-3 min-h-[64px]"
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-slate-900 truncate">{cliente.nombre}</div>
                      <div className="text-sm text-slate-600 flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-0.5">
                        <span className="inline-flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {cliente.telefono}
                        </span>
                        {cliente.identificacion && (
                          <span className="inline-flex items-center gap-1">
                            <IdCard className="w-3.5 h-3.5" />
                            {cliente.identificacion}
                          </span>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-blue-600 shrink-0" />
                  </button>
                ))}
              </div>
            </div>
          ) : mostrarEmptyBusqueda ? (
            <div className="text-center py-8 px-2 rounded-xl border border-dashed border-slate-200 bg-slate-50">
              <UserSearch className="w-10 h-10 mx-auto mb-3 text-slate-300" />
              <p className="text-slate-700 font-medium">
                No encontramos ese cliente
              </p>
              <p className="text-sm text-slate-500 mt-1 max-w-xs mx-auto">
                Puedes registrarlo como cliente nuevo en un solo paso.
              </p>
              {permitirCrear && (
                <button
                  type="button"
                  onClick={() => {
                    setModo('NUEVO')
                    if (tipoBusqueda === 'CEDULA' && cedulaBusqueda) {
                      setClienteNuevo((prev) => ({ ...prev, identificacion: cedulaBusqueda }))
                    }
                    setError(null)
                  }}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold min-h-[44px]"
                >
                  <UserPlus className="w-4 h-4" />
                  Crear cliente nuevo
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900 flex items-start gap-2">
            <Sparkles className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
            <span>
              Completa nombre y teléfono. Puedes usar la misma cédula en otra ficha; el sistema asigna un código único por registro.
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Nombre completo <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={clienteNuevo.nombre}
                  onChange={(e) => {
                    setSimilaresOcultos(false)
                    setClienteNuevo({ ...clienteNuevo, nombre: e.target.value })
                  }}
                  className={inputClass}
                  placeholder="Ej: Juan Pérez"
                  autoFocus
                />
              </div>
              <div className="mt-3">{renderPanelSimilares()}</div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Teléfono / WhatsApp <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="tel"
                  inputMode="tel"
                  value={clienteNuevo.telefono}
                  onChange={(e) => setClienteNuevo({ ...clienteNuevo, telefono: e.target.value })}
                  className={inputClass}
                  placeholder="300 123 4567"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Email <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                <input
                  type="email"
                  value={clienteNuevo.email}
                  onChange={(e) => setClienteNuevo({ ...clienteNuevo, email: e.target.value })}
                  className={inputClass}
                  placeholder="correo@ejemplo.com"
                />
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Cédula / identificación
              </label>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <IdCard className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    inputMode="numeric"
                    value={clienteNuevo.identificacion}
                    onChange={(e) => {
                      setSimilaresOcultos(false)
                      setClienteNuevo({ ...clienteNuevo, identificacion: e.target.value })
                    }}
                    className={inputClass}
                    placeholder="1234567890"
                  />
                </div>
                <button
                  type="button"
                  onClick={generarIdentificacion}
                  disabled={generandoId}
                  className="px-4 py-3 sm:py-2.5 bg-slate-100 text-slate-800 text-sm font-semibold rounded-xl hover:bg-slate-200 disabled:opacity-50 border border-slate-200 min-h-[48px] whitespace-nowrap"
                >
                  {generandoId ? 'Generando...' : 'Generar ID'}
                </button>
              </div>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-slate-800 mb-2">
                Dirección <span className="text-slate-400 font-normal">(opcional)</span>
              </label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 w-5 h-5 text-slate-400 pointer-events-none" />
                <textarea
                  value={clienteNuevo.direccion}
                  onChange={(e) => setClienteNuevo({ ...clienteNuevo, direccion: e.target.value })}
                  rows={2}
                  className={`${inputClass} pl-10 min-h-[80px] py-3`}
                  placeholder="Ciudad, barrio..."
                />
              </div>
            </div>
          </div>

          <div className="fixed bottom-0 left-0 right-0 z-30 sm:static bg-white/95 sm:bg-transparent backdrop-blur-sm sm:backdrop-blur-none border-t sm:border-0 border-slate-200 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-0 sm:py-0 -mx-4 sm:mx-0">
            <button
              type="button"
              onClick={crearCliente}
              disabled={creando || !clienteNuevo.nombre.trim() || !clienteNuevo.telefono.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-3.5 sm:py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold min-h-[52px] shadow-lg shadow-blue-600/20 sm:shadow-none"
            >
              {creando ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Guardando cliente...
                </>
              ) : (
                <>
                  <UserPlus className="w-5 h-5" />
                  Continuar con este cliente
                </>
              )}
            </button>
          </div>
        </div>
      )}

      
    </div>
  )
}
