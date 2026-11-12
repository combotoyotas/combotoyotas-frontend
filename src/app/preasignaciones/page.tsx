'use client'

import { useEffect, useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import ClienteSearch from '@/components/ventas/ClienteSearch'
import { rifaApi } from '@/lib/rifaApi'
import type { Rifa } from '@/types/rifa'
import type { Cliente } from '@/types/ventas'
import {
  preasignacionesApi,
  type Preasignacion,
  type AplicarResultado,
  type CuotasPreasignacion,
  type ResumenPreasignSuper,
} from '@/lib/preasignacionesApi'

const SOLO_INVENTARIO_ID = '__solo_inventario__'

type ConfirmState = {
  title: string
  message: string
  type?: 'danger' | 'warning' | 'info'
  onConfirm: () => void
} | null

interface ClienteGrupo {
  clienteId: string
  clienteNombre: string
  clienteIdentificacion: string | null
  clienteTelefono: string | null
  numeros: Preasignacion[]
}

function formatNumero(n: number) {
  return String(n).padStart(4, '0')
}

function formatFecha(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

function agruparPorCliente(items: Preasignacion[], esInventarioAjeno = false): ClienteGrupo[] {
  const mapa = new Map<string, ClienteGrupo>()
  for (const item of items) {
    const grupoId = item.cliente_id ?? SOLO_INVENTARIO_ID
    if (!mapa.has(grupoId)) {
      mapa.set(grupoId, {
        clienteId: grupoId,
        clienteNombre: item.cliente_id
          ? item.cliente_nombre || 'Cliente'
          : esInventarioAjeno
            ? 'Solo número (sin cliente asignado)'
            : 'Solo número (mi inventario)',
        clienteIdentificacion: item.cliente_id ? item.cliente_identificacion : null,
        clienteTelefono: item.cliente_id ? item.cliente_telefono : null,
        numeros: [],
      })
    }
    mapa.get(grupoId)!.numeros.push(item)
  }
  for (const grupo of mapa.values()) {
    grupo.numeros.sort((a, b) => a.numero_boleta - b.numero_boleta)
  }
  return Array.from(mapa.values()).sort((a, b) => a.clienteNombre.localeCompare(b.clienteNombre))
}

interface CreadorSeccion {
  creado_por: string
  nombre: string
  rol: string
  items: Preasignacion[]
}

function agruparPorCreador(items: Preasignacion[]): { vendedores: CreadorSeccion[]; admins: CreadorSeccion[] } {
  const mapa = new Map<string, CreadorSeccion>()
  for (const item of items) {
    const id = item.creado_por || 'sin-creador'
    if (!mapa.has(id)) {
      mapa.set(id, {
        creado_por: id,
        nombre: item.creado_por_nombre || 'Sin creador',
        rol: (item.creado_por_rol || '').toUpperCase() || '—',
        items: [],
      })
    }
    mapa.get(id)!.items.push(item)
  }
  const vendedores: CreadorSeccion[] = []
  const admins: CreadorSeccion[] = []
  for (const seccion of mapa.values()) {
    seccion.items.sort((a, b) => a.numero_boleta - b.numero_boleta)
    if (seccion.rol === 'VENDEDOR') vendedores.push(seccion)
    else admins.push(seccion)
  }
  vendedores.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  admins.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'))
  return { vendedores, admins }
}

function itemCoincideBusqueda(item: Preasignacion, termino: string): boolean {
  if (!termino) return true
  const t = termino.toLowerCase()
  return (
    (item.cliente_nombre || '').toLowerCase().includes(t) ||
    (item.cliente_identificacion || '').toLowerCase().includes(t) ||
    (item.cliente_telefono || '').toLowerCase().includes(t) ||
    (item.creado_por_nombre || '').toLowerCase().includes(t) ||
    formatNumero(item.numero_boleta).includes(t)
  )
}

export default function PreasignacionesPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; nombre: string; rol: string } | null>(null)

  const [items, setItems] = useState<Preasignacion[]>([])
  const [gruposNuevos, setGruposNuevos] = useState<ClienteGrupo[]>([])
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [procesando, setProcesando] = useState<string | null>(null) // id/clienteId en proceso
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const [showBuscarCliente, setShowBuscarCliente] = useState(false)
  const [expandido, setExpandido] = useState<Record<string, boolean>>({})
  const [nuevoNumeroPorCliente, setNuevoNumeroPorCliente] = useState<Record<string, string>>({})
  const [editandoChip, setEditandoChip] = useState<{ id: string; valor: string } | null>(null)

  // Modal "Asignar a la nuevo proyecto" (solo SUPER_ADMIN)
  const [showAplicar, setShowAplicar] = useState(false)
  const [rifas, setRifas] = useState<Rifa[]>([])
  const [rifaSeleccionada, setRifaSeleccionada] = useState('')
  const [cargandoRifas, setCargandoRifas] = useState(false)
  const [aplicando, setAplicando] = useState(false)
  const [resultadoAplicar, setResultadoAplicar] = useState<AplicarResultado | null>(null)
  const [cuotas, setCuotas] = useState<CuotasPreasignacion | null>(null)
  const [soloNumeroInput, setSoloNumeroInput] = useState('')
  const [resumenSuper, setResumenSuper] = useState<ResumenPreasignSuper | null>(null)
  const [filtroCreadorId, setFiltroCreadorId] = useState<string | null>(null)

  const esSuperAdmin = user?.rol?.toUpperCase() === 'SUPER_ADMIN'
  const esVendedor = user?.rol?.toUpperCase() === 'VENDEDOR'
  const esAdmin = user?.rol?.toUpperCase() === 'ADMIN'

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) { router.push('/login'); return }
    try {
      const parsed = JSON.parse(userData)
      if (!['SUPER_ADMIN', 'ADMIN', 'VENDEDOR'].includes(parsed.rol?.toUpperCase())) {
        router.push('/dashboard')
        return
      }
      setUser(parsed)
    } catch { router.push('/login') }
  }, [router])

  const cargar = useCallback(async () => {
    if (!user) return
    setLoading(true); setError('')
    try {
      const rol = user.rol?.toUpperCase()
      const [data, cuotasData] = await Promise.all([
        preasignacionesApi.listar(),
        preasignacionesApi.cuotas(),
      ])
      setItems(data)
      setCuotas(cuotasData)
      if (rol === 'SUPER_ADMIN') {
        const resumenData = await preasignacionesApi.resumenSuper()
        setResumenSuper(resumenData)
      } else {
        setResumenSuper(null)
      }
    } catch (e: any) {
      setError(e.message || 'Error al cargar las preasignaciones')
    } finally {
      setLoading(false)
    }
  }, [user])

  useEffect(() => {
    if (!user) return
    cargar()
  }, [user, cargar])

  useEffect(() => {
    if (!esSuperAdmin) return
    const timer = setTimeout(() => {
      preasignacionesApi
        .resumenSuper(q.trim() || undefined)
        .then(setResumenSuper)
        .catch(() => setResumenSuper(null))
    }, 350)
    return () => clearTimeout(timer)
  }, [q, esSuperAdmin])

  const terminoBusqueda = q.trim()

  const itemsVisibles = useMemo(() => {
    let list = items
    if (esSuperAdmin && filtroCreadorId) {
      list = list.filter((i) => i.creado_por === filtroCreadorId)
    }
    if (terminoBusqueda) {
      list = list.filter((i) => itemCoincideBusqueda(i, terminoBusqueda))
    }
    return list
  }, [items, esSuperAdmin, filtroCreadorId, terminoBusqueda])

  const seccionesSuper = useMemo(() => {
    if (!esSuperAdmin) return null
    return agruparPorCreador(itemsVisibles)
  }, [itemsVisibles, esSuperAdmin])

  const gruposExistentes = useMemo(
    () => agruparPorCliente(itemsVisibles, false),
    [itemsVisibles]
  )

  const grupos = useMemo(() => {
    if (esSuperAdmin) return []
    const idsExistentes = new Set(gruposExistentes.map((g) => g.clienteId))
    const extras = gruposNuevos.filter((g) => !idsExistentes.has(g.clienteId))
    const todos = [...extras, ...gruposExistentes]
    if (!terminoBusqueda) return todos
    return todos.filter((g) =>
      g.clienteNombre.toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      (g.clienteIdentificacion || '').toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      (g.clienteTelefono || '').toLowerCase().includes(terminoBusqueda.toLowerCase()) ||
      g.numeros.some((n) => formatNumero(n.numero_boleta).includes(terminoBusqueda))
    )
  }, [gruposExistentes, gruposNuevos, terminoBusqueda, esSuperAdmin])

  const totalNumeros = items.length
  const totalVisibles = itemsVisibles.length

  const onClienteSeleccionado = (cliente: Cliente) => {
    setShowBuscarCliente(false)
    if (!cliente.id) return
    const yaExiste = gruposExistentes.some((g) => g.clienteId === cliente.id) ||
      gruposNuevos.some((g) => g.clienteId === cliente.id)
    if (!yaExiste) {
      setGruposNuevos((prev) => [
        ...prev,
        {
          clienteId: cliente.id!,
          clienteNombre: cliente.nombre,
          clienteIdentificacion: cliente.identificacion || null,
          clienteTelefono: cliente.telefono || null,
          numeros: [],
        },
      ])
    }
    setExpandido((prev) => ({ ...prev, [cliente.id!]: true }))
    setQ('')
  }

  const agregarSoloNumero = async (valorRaw?: string) => {
    const valor = (valorRaw ?? soloNumeroInput).trim()
    const numero = Number(valor)
    setError(''); setAviso('')
    if (!valor || !Number.isInteger(numero) || numero < 0 || numero > 9999) {
      setError('Escribe un número de boleta válido (0 a 9999).')
      return
    }
    setProcesando('solo-numero')
    try {
      await preasignacionesApi.crear({ numero_boleta: numero })
      setSoloNumeroInput('')
      setAviso(`Boleta #${formatNumero(numero)} reservada para tu inventario.`)
      await cargar()
    } catch (e: any) {
      setError(e.message || 'Error al preasignar el número')
    } finally {
      setProcesando(null)
    }
  }

  const agregarNumero = async (clienteId: string) => {
    if (clienteId === SOLO_INVENTARIO_ID) {
      await agregarSoloNumero(nuevoNumeroPorCliente[clienteId] || '')
      return
    }
    const valor = (nuevoNumeroPorCliente[clienteId] || '').trim()
    const numero = Number(valor)
    setError(''); setAviso('')
    if (!valor || !Number.isInteger(numero) || numero < 0 || numero > 9999) {
      setError('Escribe un número de boleta válido (0 a 9999).')
      return
    }

    setProcesando(clienteId)
    try {
      await preasignacionesApi.crear({ cliente_id: clienteId, numero_boleta: numero })
      setNuevoNumeroPorCliente((prev) => ({ ...prev, [clienteId]: '' }))
      setAviso(`Boleta #${formatNumero(numero)} preasignada correctamente.`)
      await cargar()
    } catch (e: any) {
      setError(e.message || 'Error al preasignar el número')
    } finally {
      setProcesando(null)
    }
  }

  const quitarNumero = (item: Preasignacion) => {
    setConfirm({
      title: 'Quitar número preasignado',
      message: `Se quitará la boleta #${formatNumero(item.numero_boleta)} de ${item.cliente_nombre}. Esto NO afecta ninguna venta ya creada anteriormente.`,
      type: 'danger',
      onConfirm: async () => {
        setProcesando(item.id); setError(''); setAviso('')
        try {
          await preasignacionesApi.eliminar(item.id)
          setAviso('Número quitado.')
          await cargar()
        } catch (e: any) {
          setError(e.message || 'Error al quitar el número')
        } finally {
          setProcesando(null)
          setConfirm(null)
        }
      },
    })
  }

  const guardarEdicionChip = async () => {
    if (!editandoChip) return
    const numero = Number(editandoChip.valor)
    if (!Number.isInteger(numero) || numero < 0 || numero > 9999) {
      setError('El número debe estar entre 0 y 9999.')
      return
    }
    setProcesando(editandoChip.id); setError(''); setAviso('')
    try {
      await preasignacionesApi.actualizar(editandoChip.id, { numero_boleta: numero })
      setAviso('Número actualizado.')
      setEditandoChip(null)
      await cargar()
    } catch (e: any) {
      setError(e.message || 'Error al actualizar el número')
    } finally {
      setProcesando(null)
    }
  }

  const quitarClienteVacio = (clienteId: string) => {
    setGruposNuevos((prev) => prev.filter((g) => g.clienteId !== clienteId))
  }

  const abrirAplicar = async () => {
    setShowAplicar(true)
    setResultadoAplicar(null)
    setRifaSeleccionada('')
    setCargandoRifas(true)
    try {
      const res = await rifaApi.getRifasOperativas()
      setRifas(res.data || [])
    } catch (e: any) {
      setError(e.message || 'Error al cargar proyectos')
    } finally {
      setCargandoRifas(false)
    }
  }

  const confirmarAplicar = () => {
    if (!rifaSeleccionada) return
    const rifa = rifas.find((r) => r.id === rifaSeleccionada)
    setConfirm({
      title: 'Asignar boletas preasignadas a este proyecto',
      message: `Se intentará reservar cada número preasignado en "${rifa?.nombre}". Las boletas que ya estén vendidas, reservadas o no existan se OMITIRÁN sin tocarlas. Las que estén DISPONIBLE quedarán como una reserva formal (venta pendiente) a nombre del cliente correspondiente. ¿Continuar?`,
      type: 'warning',
      onConfirm: async () => {
        setAplicando(true); setError('')
        try {
          const resultado = await preasignacionesApi.aplicarARifa(rifaSeleccionada)
          setResultadoAplicar(resultado)
          await cargar()
        } catch (e: any) {
          setError(e.message || 'Error al aplicar las preasignaciones')
        } finally {
          setAplicando(false)
          setConfirm(null)
        }
      },
    })
  }

  const renderListaGrupos = (lista: ClienteGrupo[], expPrefix: string) => (
    <div className="space-y-3">
      {lista.map((grupo) => {
        const expKey = `${expPrefix}::${grupo.clienteId}`
        const abierto = expandido[expKey] ?? grupo.numeros.length <= 6
        return (
          <div key={expKey} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <button
              type="button"
              onClick={() => setExpandido((prev) => ({ ...prev, [expKey]: !abierto }))}
              className="w-full flex items-center justify-between gap-3 px-5 py-4 text-left hover:bg-slate-50"
            >
              <div>
                <p className="font-semibold text-slate-900">{grupo.clienteNombre}</p>
                <p className="text-xs text-slate-500">
                  {grupo.clienteIdentificacion || '—'} · {grupo.clienteTelefono || '—'}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-700">
                  {grupo.numeros.length} boleta{grupo.numeros.length !== 1 ? 's' : ''}
                </span>
                <svg
                  className={`w-4 h-4 text-slate-400 transition-transform ${abierto ? 'rotate-180' : ''}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {abierto && (
              <div className="px-5 pb-5 border-t border-slate-100 pt-4">
                <div className="flex flex-wrap gap-2 mb-4">
                  {grupo.numeros.map((n) => (
                    <div
                      key={n.id}
                      className="group flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 pl-3 pr-1.5 py-1"
                      title={
                        n.ultima_aplicacion_en
                          ? `Aplicada a ${n.ultima_aplicacion_rifa_nombre} · ${formatFecha(n.ultima_aplicacion_en)}`
                          : 'Aún no aplicada'
                      }
                    >
                      {editandoChip?.id === n.id ? (
                        <input
                          autoFocus
                          type="number"
                          min={0}
                          max={9999}
                          value={editandoChip.valor}
                          onChange={(e) => setEditandoChip({ id: n.id, valor: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && guardarEdicionChip()}
                          onBlur={guardarEdicionChip}
                          className="w-16 text-sm border border-indigo-300 rounded px-1 py-0.5"
                        />
                      ) : (
                        <button
                          type="button"
                          onClick={() => setEditandoChip({ id: n.id, valor: String(n.numero_boleta) })}
                          className="font-mono font-semibold text-sm text-slate-800 hover:text-indigo-600"
                        >
                          #{formatNumero(n.numero_boleta)}
                        </button>
                      )}
                      {n.ultima_aplicacion_en && (
                        <span className="text-[10px] text-blue-600 font-medium">✓</span>
                      )}
                      {!esSuperAdmin && (
                        <button
                          type="button"
                          onClick={() => quitarNumero(n)}
                          disabled={procesando === n.id}
                          className="w-5 h-5 rounded-full flex items-center justify-center text-slate-400 hover:bg-red-100 hover:text-red-600 disabled:opacity-40"
                          title="Quitar número"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                  {grupo.numeros.length === 0 && (
                    <p className="text-sm text-slate-400 italic">Sin boletas en este grupo.</p>
                  )}
                </div>

                {!esSuperAdmin && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={0}
                      max={9999}
                      value={nuevoNumeroPorCliente[grupo.clienteId] || ''}
                      onChange={(e) =>
                        setNuevoNumeroPorCliente((prev) => ({ ...prev, [grupo.clienteId]: e.target.value }))
                      }
                      onKeyDown={(e) => e.key === 'Enter' && agregarNumero(grupo.clienteId)}
                      placeholder="Número de boleta"
                      className="w-40 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => agregarNumero(grupo.clienteId)}
                      disabled={
                        procesando === grupo.clienteId || !(nuevoNumeroPorCliente[grupo.clienteId] || '').trim()
                      }
                      className="px-3 py-1.5 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                      {procesando === grupo.clienteId ? 'Agregando...' : '+ Agregar boleta'}
                    </button>
                    {grupo.numeros.length === 0 && grupo.clienteId !== SOLO_INVENTARIO_ID && (
                      <button
                        type="button"
                        onClick={() => quitarClienteVacio(grupo.clienteId)}
                        className="text-xs text-slate-400 hover:text-slate-600 ml-auto"
                      >
                        Cancelar
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )

  const listaVaciaSuper =
    esSuperAdmin &&
    seccionesSuper &&
    seccionesSuper.vendedores.length === 0 &&
    seccionesSuper.admins.length === 0

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-slate-500 text-sm">Cargando...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-5xl">
      <header className="mb-6 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Operación</p>
            <h1 className="text-2xl font-semibold tracking-tight mt-1 text-slate-900">
              Boletas preasignadas
            </h1>
            <p className="text-xs text-slate-500 mt-1 max-w-xl">
              Guarda números favoritos por cliente o, si eres vendedor, solo el número para tu inventario.
              Al aplicar a un proyecto nuevo, las tuyas pasan a tu inventario y, si hay cliente, quedan reservadas.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {esSuperAdmin && (
              <button
                onClick={abrirAplicar}
                className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 min-h-[44px]"
              >
                Asignar al nuevo proyecto
              </button>
            )}
            <button
              onClick={() => setShowBuscarCliente(true)}
              className="px-4 py-2.5 bg-slate-900 text-white rounded-xl font-medium text-sm hover:bg-slate-800 min-h-[44px]"
            >
              + Buscar cliente
            </button>
          </div>
        </div>
      </header>

      <main>
        {esAdmin && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
            Como administrador solo ves y gestionas preasignaciones hechas por admins, y solo
            puedes asignar números a clientes creados por un administrador o super administrador.
          </div>
        )}

        {cuotas?.aplica && (
          <div className="mb-4 rounded-xl border border-indigo-200 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900 space-y-2">
            {!cuotas.configurado ? (
              <p className="font-medium text-amber-800">
                Tu tope de inventario no está configurado. Pide al administrador que lo defina en
                Inventario de vendedores (define también tus límites de preasignación).
              </p>
            ) : (
              <>
                <p className="font-medium">
                  Tope inventario: {cuotas.max_inventario} boletas · Preasignación total:{' '}
                  {cuotas.total ?? 0}/{cuotas.max_total} (10% por serie = {cuotas.max_por_serie} máx.
                  en cada serie 0–9).
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1 rounded-md bg-white/80 border border-indigo-100 px-2 py-0.5 text-xs font-mono"
                    >
                      S{s}: {cuotas.por_serie?.[s] ?? 0}/{cuotas.cupo_por_serie?.[s] ?? 0}
                    </span>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {esSuperAdmin && resumenSuper && (
          <div className="mb-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900 mb-3">
              Resumen preasignaciones ({resumenSuper.total_registros} números)
            </h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Vendedores
                </p>
                {resumenSuper.vendedores.length === 0 ? (
                  <p className="text-xs text-slate-400">Ninguno</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {resumenSuper.vendedores.map((r) => (
                      <li key={r.creado_por}>
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroCreadorId(r.creado_por)
                            document.getElementById('lista-preasignaciones')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className={`w-full flex justify-between gap-2 border-b border-slate-50 pb-1 text-left rounded-md px-1 -mx-1 hover:bg-slate-50 ${
                            filtroCreadorId === r.creado_por ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''
                          }`}
                        >
                          <span className="font-medium truncate">{r.nombre}</span>
                          <span className="tabular-nums shrink-0">
                            {r.total_preasignadas}
                            {r.max_inventario != null && (
                              <span className="text-slate-400 text-xs ml-1">(tope inv. {r.max_inventario})</span>
                            )}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Administradores
                </p>
                {resumenSuper.admins.length === 0 ? (
                  <p className="text-xs text-slate-400">Ninguno</p>
                ) : (
                  <ul className="space-y-2 text-sm">
                    {resumenSuper.admins.map((r) => (
                      <li key={r.creado_por}>
                        <button
                          type="button"
                          onClick={() => {
                            setFiltroCreadorId(r.creado_por)
                            document.getElementById('lista-preasignaciones')?.scrollIntoView({ behavior: 'smooth' })
                          }}
                          className={`w-full flex justify-between gap-2 border-b border-slate-50 pb-1 text-left rounded-md px-1 -mx-1 hover:bg-slate-50 ${
                            filtroCreadorId === r.creado_por ? 'bg-indigo-50 ring-1 ring-indigo-200' : ''
                          }`}
                        >
                          <span className="font-medium truncate">{r.nombre}</span>
                          <span className="tabular-nums shrink-0">{r.total_preasignadas}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <p className="text-xs text-slate-500 mt-3">
              Pulsa un nombre para ver solo sus boletas abajo. El buscador filtra por número, cliente o vendedor/admin.
            </p>
            {filtroCreadorId && (
              <button
                type="button"
                onClick={() => setFiltroCreadorId(null)}
                className="mt-2 text-xs font-medium text-indigo-600 hover:text-indigo-800"
              >
                Ver todos los creadores ({resumenSuper.total_registros} números)
              </button>
            )}
          </div>
        )}

        {esVendedor && (
          <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
            <p className="text-sm font-medium text-slate-800 mb-2">Preasignar solo número (sin cliente)</p>
            <p className="text-xs text-slate-500 mb-3">
              Al aplicar al proyecto, la boleta quedará en tu inventario disponible para vender.
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <input
                type="number"
                min={0}
                max={9999}
                value={soloNumeroInput}
                onChange={(e) => setSoloNumeroInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && agregarSoloNumero()}
                placeholder="Ej. 1047"
                className="w-40 rounded-lg border border-slate-300 px-3 py-2 text-sm"
              />
              <button
                type="button"
                onClick={() => agregarSoloNumero()}
                disabled={procesando === 'solo-numero' || !soloNumeroInput.trim()}
                className="px-4 py-2 text-sm rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-50 font-medium min-h-[44px]"
              >
                {procesando === 'solo-numero' ? 'Guardando…' : '+ Agregar a mi inventario'}
              </button>
            </div>
          </div>
        )}

        <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
          <label className="block text-sm font-medium text-slate-700 mb-2">
            {esSuperAdmin
              ? `Buscar boleta, cliente o vendedor${filtroCreadorId ? ` (${totalVisibles} de ${totalNumeros})` : ` (${totalVisibles} visibles)`}`
              : `Filtrar por cliente o número (${totalVisibles} boleta${totalVisibles !== 1 ? 's' : ''} preasignada${totalVisibles !== 1 ? 's' : ''})`}
          </label>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={esSuperAdmin ? 'Ej: 0938, Andres, Juan Pérez' : 'Ej: 0047  ó  Juan Pérez'}
            className="w-full rounded-xl border border-slate-300 px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        {error && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 text-red-700 px-4 py-3 text-sm">{error}</div>
        )}
        {aviso && (
          <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 px-4 py-3 text-sm">{aviso}</div>
        )}

        {loading ? (
          <div className="flex items-center gap-3 text-slate-500 text-sm py-10 justify-center">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Cargando...
          </div>
        ) : esSuperAdmin && seccionesSuper ? (
          listaVaciaSuper ? (
            <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-slate-500 text-sm">
              No hay boletas que coincidan con el filtro.
            </div>
          ) : (
            <div id="lista-preasignaciones" className="space-y-10">
              {seccionesSuper.vendedores.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Vendedores
                  </h2>
                  <div className="space-y-8">
                    {seccionesSuper.vendedores.map((sec) => (
                      <div key={sec.creado_por}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">{sec.nombre}</h3>
                          <span className="text-sm text-slate-500 tabular-nums">
                            {`${sec.items.length} boleta${sec.items.length !== 1 ? 's' : ''} preasignada${sec.items.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                        {renderListaGrupos(agruparPorCliente(sec.items, true), sec.creado_por)}
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {seccionesSuper.admins.length > 0 && (
                <section>
                  <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
                    Administradores
                  </h2>
                  <div className="space-y-8">
                    {seccionesSuper.admins.map((sec) => (
                      <div key={sec.creado_por}>
                        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-200 pb-2 mb-3">
                          <h3 className="text-lg font-semibold text-slate-900">{sec.nombre}</h3>
                          <span className="text-sm text-slate-500 tabular-nums">
                            {`${sec.items.length} boleta${sec.items.length !== 1 ? 's' : ''} preasignada${sec.items.length !== 1 ? 's' : ''}`}
                          </span>
                        </div>
                        {renderListaGrupos(agruparPorCliente(sec.items, true), sec.creado_por)}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          )
        ) : grupos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 text-center py-12 text-slate-500 text-sm">
            No hay boletas preasignadas todavía. Usa &quot;+ Buscar cliente&quot; para empezar.
          </div>
        ) : (
          renderListaGrupos(grupos, 'mi')
        )}
      </main>

      {/* Modal: buscar cliente para agregar/gestionar */}
      {showBuscarCliente && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Buscar cliente</h3>
              <button onClick={() => setShowBuscarCliente(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6">
              <ClienteSearch permitirCrear={false} onClienteSelected={onClienteSeleccionado} />
            </div>
          </div>
        </div>
      )}

      {/* Modal: aplicar a nuevo proyecto (SUPER_ADMIN) */}
      {showAplicar && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">Asignar boletas preasignadas a un proyecto</h3>
              <button onClick={() => setShowAplicar(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="p-6 space-y-4">
              {!resultadoAplicar ? (
                <>
                  <p className="text-sm text-slate-600">
                    Se revisará cada uno de los {totalNumeros} número(s) preasignado(s). Las boletas que ya estén
                    vendidas o reservadas por otro motivo NO se tocarán; solo se reservan las que estén disponibles.
                  </p>
                  <div>
                    <label className="block text-sm font-bold text-black mb-2">Proyecto destino</label>
                    {cargandoRifas ? (
                      <p className="text-sm text-slate-500">Cargando proyectos...</p>
                    ) : (
                      <select
                        value={rifaSeleccionada}
                        onChange={(e) => setRifaSeleccionada(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-400 rounded-lg bg-white text-black"
                      >
                        <option value="">Selecciona un proyecto...</option>
                        {rifas.map((r) => (
                          <option key={r.id} value={r.id} disabled={['TERMINADA', 'CANCELADA'].includes(r.estado)}>
                            {r.nombre} ({r.estado}){['TERMINADA', 'CANCELADA'].includes(r.estado) ? ' - no disponible' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>
                </>
              ) : (
                <div className="space-y-4">
                  <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-sm text-emerald-800">
                    Listo. {resultadoAplicar.asignadas.length} de {resultadoAplicar.total_preasignaciones} boleta(s)
                    quedaron reservadas en &quot;{resultadoAplicar.rifa_nombre}&quot;.
                  </div>

                  {resultadoAplicar.asignadas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-2">Asignadas</p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {resultadoAplicar.asignadas.map((a) => (
                          <div key={a.venta_id} className="text-sm text-slate-700">
                            #{formatNumero(a.numero_boleta)} → {a.cliente_nombre}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {resultadoAplicar.omitidas.length > 0 && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-amber-600 mb-2">
                        Omitidas ({resultadoAplicar.omitidas.length})
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {resultadoAplicar.omitidas.map((o, i) => (
                          <div key={i} className="text-sm text-slate-600">
                            #{formatNumero(o.numero_boleta)} ({o.cliente_nombre}): {o.motivo}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="p-6 border-t border-slate-100 flex justify-end gap-3">
              <button
                onClick={() => setShowAplicar(false)}
                className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                {resultadoAplicar ? 'Cerrar' : 'Cancelar'}
              </button>
              {!resultadoAplicar && (
                <button
                  onClick={confirmarAplicar}
                  disabled={!rifaSeleccionada || aplicando}
                  className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-medium"
                >
                  {aplicando ? 'Aplicando...' : 'Aplicar'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {confirm && (
        <ConfirmDialog
          isOpen={!!confirm}
          title={confirm.title}
          message={confirm.message}
          type={confirm.type}
          confirmText={procesando || aplicando ? 'Procesando...' : 'Confirmar'}
          onConfirm={confirm.onConfirm}
          onCancel={() => !(procesando || aplicando) && setConfirm(null)}
        />
      )}
      </div>
    </div>
  )
}
