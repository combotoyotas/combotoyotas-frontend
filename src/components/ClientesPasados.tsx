'use client'

import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Filter,
  History,
  Loader2,
  MessageCircle,
  Phone,
  PhoneOff,
  RotateCcw,
  Search,
  Trophy,
  X,
} from 'lucide-react'
import {
  clientesPasadosApi,
  type ClientePasado,
  type ContactoHistorial,
  type EstadoContacto,
  type FiltroEstado,
  type FiltroOrden,
  type Paginacion,
  type ProyectoBoletasDetalle,
  type ResumenClientesPasados,
  type EstadoBoletaPasada,
  type TipoBoleta,
} from '@/lib/clientesPasadosApi'
import { formatLineaOrigen } from '@/utils/lineaOrigen'
import { generarWhatsAppChatLink } from '@/utils/telefono'

const PAGE_SIZE = 25
const LINEAS_CONTACTO = [1, 2, 3, 4, 5, 6, 7] as const
const DEBOUNCE_MS = 450

interface Consulta {
  q: string
  tipos: TipoBoleta[]
  min: number | null
  max: number | null
  estado: FiltroEstado
  linea: string
  rifaId: string
  orden: FiltroOrden
  page: number
}

const CONSULTA_INICIAL: Consulta = {
  q: '',
  tipos: [],
  min: null,
  max: null,
  estado: 'todos',
  linea: '',
  rifaId: '',
  orden: 'mas_boletas',
  page: 1,
}

const PRESETS_CANTIDAD: { label: string; min: number | null; max: number | null }[] = [
  { label: 'Todas', min: null, max: null },
  { label: '1', min: 1, max: 1 },
  { label: '2 – 4', min: 2, max: 4 },
  { label: '5 o más', min: 5, max: null },
  { label: '10 o más', min: 10, max: null },
]

const TIPOS_UI: { key: TipoBoleta; label: string; activo: string; punto: string }[] = [
  { key: 'pagadas', label: 'Pagadas', activo: 'bg-emerald-600 text-white border-emerald-600', punto: 'bg-emerald-500' },
  { key: 'abonadas', label: 'Abonadas', activo: 'bg-blue-600 text-white border-blue-600', punto: 'bg-blue-500' },
  { key: 'reservadas', label: 'Reservadas', activo: 'bg-amber-500 text-white border-amber-500', punto: 'bg-amber-500' },
]

// ── Utilidades ──────────────────────────────────────────────────────────────

function formatFechaHora(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
}

/** "PROYECTO 2 EL GRAN CAMION" -> "Proyecto 2"; sin número -> nombre en formato título. */
function nombreCorto(nombre: string) {
  const m = nombre.match(/PROYECTO\s+(\d+)/i)
  if (m) return `Proyecto ${m[1]}`
  return nombre
    .toLowerCase()
    .replace(/\b\p{L}/gu, (c) => c.toUpperCase())
}

function textoLineas(c: ClientePasado): { principal: string | null; secundario: string | null } {
  const lineas = c.lineas_venta ?? []
  const principal = lineas.length ? lineas.map((l) => formatLineaOrigen(l)).join(', ') : null
  const secundario =
    !lineas.length && c.linea_contacto_previo ? `Contactado antes por Línea ${c.linea_contacto_previo}` : null
  return { principal, secundario }
}

function formatNumeroBoleta(numero: number) {
  return `#${String(numero).padStart(4, '0')}`
}

function etiquetaEstadoBoleta(estado: EstadoBoletaPasada) {
  if (estado === 'PAGADA') return 'Pagada'
  if (estado === 'ABONADA') return 'Abonada'
  return 'Reservada'
}

function claseNumeroBoleta(estado: EstadoBoletaPasada) {
  if (estado === 'PAGADA') return 'bg-emerald-100 text-emerald-900 ring-emerald-200/80'
  if (estado === 'ABONADA') return 'bg-blue-100 text-blue-900 ring-blue-200/80'
  return 'bg-amber-100 text-amber-900 ring-amber-200/80'
}

function clickIgnoraExpand(e: React.MouseEvent) {
  return (e.target as HTMLElement).closest('button, a, input, select, textarea, [data-no-expand]') != null
}

function ModalPortal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
    }
  }, [onClose])

  // Los modales solo se montan tras una acción del usuario (nunca en SSR).
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center sm:p-4 bg-black/50 overscroll-contain"
      onClick={onClose}
      role="presentation"
    >
      <div onClick={(e) => e.stopPropagation()} className="w-full sm:w-auto sm:max-w-full" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>,
    document.body
  )
}

// ── Subcomponentes de presentación ──────────────────────────────────────────

function EstadoBadge({ c }: { c: ClientePasado }) {
  if (c.estado_contacto === 'SIN_CONTACTAR') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 ring-1 ring-red-100">
        <span className="h-1.5 w-1.5 rounded-full bg-red-500" /> Sin contactar
      </span>
    )
  }
  if (c.estado_contacto === 'NO_CONTESTO') {
    return (
      <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 ring-1 ring-amber-200">
        <PhoneOff className="h-3 w-3" /> No contestó
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-emerald-200">
      <CheckCircle2 className="h-3 w-3" /> Contactado
    </span>
  )
}

function ObservacionCelda({ texto }: { texto: string | null | undefined }) {
  if (!texto?.trim()) {
    return <span className="text-xs italic text-slate-400">Sin observación</span>
  }
  return (
    <p className="max-w-xs text-sm text-slate-700 whitespace-pre-wrap break-words" title={texto}>
      {texto}
    </p>
  )
}

function UltimoContactoInfo({ c }: { c: ClientePasado }) {
  if (c.estado_contacto === 'SIN_CONTACTAR' && c.total_contactos === 0) return null
  return (
    <div className="mt-1 space-y-0.5 text-[11px] leading-tight text-slate-500">
      <div>
        {formatFechaHora(c.ultimo_contacto_en)}
        {c.ultimo_contacto_por ? ` · ${c.ultimo_contacto_por}` : ''}
        {c.ultimo_contacto_linea ? ` · L${c.ultimo_contacto_linea}` : ''}
      </div>
    </div>
  )
}

function BoletasPills({ c }: { c: ClientePasado }) {
  return (
    <div className="flex flex-wrap items-center gap-1">
      {c.pagadas > 0 && (
        <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-xs font-bold text-emerald-800">{c.pagadas} Pag</span>
      )}
      {c.abonadas > 0 && (
        <span className="rounded bg-blue-100 px-1.5 py-0.5 text-xs font-bold text-blue-800">{c.abonadas} Abo</span>
      )}
      {c.reservadas > 0 && (
        <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-bold text-amber-800">{c.reservadas} Res</span>
      )}
    </div>
  )
}

function PanelBoletasPasadas({
  proyectos,
  loading,
  error,
}: {
  proyectos: ProyectoBoletasDetalle[] | null
  loading: boolean
  error: string
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-slate-500">
        <Loader2 className="h-4 w-4 animate-spin text-indigo-500" />
        Cargando números de boletas…
      </div>
    )
  }
  if (error) {
    return <p className="py-2 text-sm text-red-600">{error}</p>
  }
  if (!proyectos?.length) return null

  return (
    <div className="space-y-3 rounded-xl border border-indigo-100 bg-white p-3 shadow-sm">
      <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Números por proyecto</p>
      {proyectos.map((p) => (
        <div key={p.rifa_id} className="border-t border-slate-100 pt-3 first:border-0 first:pt-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-slate-900">{nombreCorto(p.rifa_nombre)}</span>
            <span className="text-xs text-slate-500">{p.rifa_nombre}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
              {p.pagadas + p.abonadas + p.reservadas} boletas
            </span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {p.boletas.map((b) => (
              <span
                key={`${p.rifa_id}-${b.numero}`}
                title={`${formatNumeroBoleta(b.numero)} · ${etiquetaEstadoBoleta(b.estado)}`}
                className={`inline-flex rounded-md px-2 py-1 font-mono text-xs font-bold ring-1 ${claseNumeroBoleta(b.estado)}`}
              >
                {formatNumeroBoleta(b.numero)}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

function ProyectosChips({ c }: { c: ClientePasado }) {
  return (
    <div className="flex flex-wrap gap-1">
      {c.proyectos.map((p) => {
        const total = p.pagadas + p.abonadas + p.reservadas
        const detalle = [
          p.pagadas ? `${p.pagadas} pagadas` : '',
          p.abonadas ? `${p.abonadas} abonadas` : '',
          p.reservadas ? `${p.reservadas} reservadas` : '',
        ]
          .filter(Boolean)
          .join(', ')
        return (
          <span
            key={p.rifa_id}
            title={`${p.rifa_nombre}: ${detalle}`}
            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
          >
            {nombreCorto(p.rifa_nombre)}
            <span className="rounded-full bg-white px-1.5 text-[10px] font-bold text-slate-900">×{total}</span>
          </span>
        )
      })}
    </div>
  )
}

function TelefonoCelda({ c }: { c: ClientePasado }) {
  const wa = generarWhatsAppChatLink(c.telefono)
  return (
    <div>
      <div className="flex items-center gap-1.5">
        <a href={c.telefono ? `tel:${c.telefono}` : undefined} className="text-sm font-medium text-slate-900 hover:text-indigo-600">
          {c.telefono || '—'}
        </a>
        {wa && (
          <a
            href={wa}
            target="_blank"
            rel="noopener noreferrer"
            className="rounded-md p-1 text-emerald-600 hover:bg-emerald-50"
            title="Abrir WhatsApp"
            aria-label={`Abrir WhatsApp de ${c.nombre}`}
          >
            <MessageCircle className="h-4 w-4" />
          </a>
        )}
      </div>
      {c.registros_mismo_telefono > 1 && (
        <span
          className="mt-0.5 inline-block rounded bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700"
          title="Hay otros clientes de este módulo con el mismo teléfono: probablemente es la misma persona"
        >
          Tel. repetido ×{c.registros_mismo_telefono}
        </span>
      )}
    </div>
  )
}

// ── Componente principal ────────────────────────────────────────────────────

export default function ClientesPasados() {
  const [consulta, setConsulta] = useState<Consulta>(CONSULTA_INICIAL)
  const [qInput, setQInput] = useState('')
  const [minInput, setMinInput] = useState('')
  const [maxInput, setMaxInput] = useState('')

  const [clientes, setClientes] = useState<ClientePasado[]>([])
  const [pagination, setPagination] = useState<Paginacion>({ page: 1, limit: PAGE_SIZE, total: 0, totalPages: 1 })
  const [resumen, setResumen] = useState<ResumenClientesPasados | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')

  // Modal de contacto
  const [contactoCliente, setContactoCliente] = useState<ClientePasado | null>(null)
  const [resultado, setResultado] = useState<EstadoContacto | null>(null)
  const [linea, setLinea] = useState<number | null>(null)
  const [observacion, setObservacion] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [errorModal, setErrorModal] = useState('')

  // Modal de historial
  const [historialCliente, setHistorialCliente] = useState<ClientePasado | null>(null)
  const [historial, setHistorial] = useState<ContactoHistorial[]>([])
  const [cargandoHistorial, setCargandoHistorial] = useState(false)
  const [errorHistorial, setErrorHistorial] = useState('')

  const [expandidoId, setExpandidoId] = useState<string | null>(null)
  const [boletasDetalle, setBoletasDetalle] = useState<Record<string, ProyectoBoletasDetalle[]>>({})
  const [boletasCargando, setBoletasCargando] = useState<string | null>(null)
  const [boletasError, setBoletasError] = useState<Record<string, string>>({})

  const reqId = useRef(0)

  // ── Carga de datos ──
  const cargarLista = useCallback(async () => {
    const id = ++reqId.current
    setLoading(true)
    setError('')
    try {
      const res = await clientesPasadosApi.listar({
        page: consulta.page,
        limit: PAGE_SIZE,
        q: consulta.q,
        tipos: consulta.tipos,
        min: consulta.min,
        max: consulta.max,
        estado: consulta.estado,
        linea: consulta.linea || undefined,
        rifa_id: consulta.rifaId || undefined,
        orden: consulta.orden,
      })
      if (id !== reqId.current) return
      // Si la página quedó vacía (p. ej. se contactó al último de la última página), retroceder.
      if (res.data.length === 0 && consulta.page > 1) {
        setConsulta((c) => ({ ...c, page: Math.max(Math.min(c.page - 1, res.pagination.totalPages), 1) }))
        return
      }
      setClientes(res.data)
      setPagination(res.pagination)
      setLoading(false)
    } catch (e) {
      if (id !== reqId.current) return
      setError(e instanceof Error ? e.message : 'No se pudo cargar el listado')
      setLoading(false)
    }
  }, [consulta])

  const cargarResumen = useCallback(async () => {
    try {
      setResumen(await clientesPasadosApi.resumen())
    } catch {
      /* el resumen es informativo; el listado muestra sus propios errores */
    }
  }, [])

  useEffect(() => {
    cargarLista()
  }, [cargarLista])

  useEffect(() => {
    cargarResumen()
  }, [cargarResumen])

  // Búsqueda y rango personalizado con debounce para no saturar el servidor
  useEffect(() => {
    const t = setTimeout(() => {
      const parse = (v: string) => {
        const n = parseInt(v, 10)
        return Number.isFinite(n) && n >= 0 ? n : null
      }
      const q = qInput.trim()
      const min = parse(minInput)
      const max = parse(maxInput)
      setConsulta((c) => (c.q === q && c.min === min && c.max === max ? c : { ...c, q, min, max, page: 1 }))
    }, DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [qInput, minInput, maxInput])

  useEffect(() => {
    if (!aviso) return
    const t = setTimeout(() => setAviso(''), 4500)
    return () => clearTimeout(t)
  }, [aviso])

  useEffect(() => {
    setExpandidoId(null)
  }, [consulta.page, consulta.q, consulta.tipos, consulta.min, consulta.max, consulta.estado, consulta.linea, consulta.rifaId, consulta.orden])

  const toggleExpandCliente = useCallback(
    async (c: ClientePasado) => {
      if (expandidoId === c.cliente_id) {
        setExpandidoId(null)
        return
      }
      setExpandidoId(c.cliente_id)
      if (boletasDetalle[c.cliente_id]) return

      setBoletasCargando(c.cliente_id)
      setBoletasError((prev) => {
        const next = { ...prev }
        delete next[c.cliente_id]
        return next
      })
      try {
        const { proyectos } = await clientesPasadosApi.boletas(c.cliente_id)
        setBoletasDetalle((prev) => ({ ...prev, [c.cliente_id]: proyectos }))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'No se pudieron cargar las boletas'
        setBoletasError((prev) => ({ ...prev, [c.cliente_id]: msg }))
      } finally {
        setBoletasCargando(null)
      }
    },
    [boletasDetalle, expandidoId]
  )

  const clickFilaCliente = (e: React.MouseEvent, c: ClientePasado) => {
    if (clickIgnoraExpand(e)) return
    void toggleExpandCliente(c)
  }

  // ── Acciones sobre filtros ──
  const actualizar = (parcial: Partial<Consulta>) =>
    setConsulta((c) => ({ ...c, ...parcial, page: parcial.page ?? 1 }))

  const toggleTipo = (tipo: TipoBoleta) =>
    actualizar({
      tipos: consulta.tipos.includes(tipo) ? consulta.tipos.filter((t) => t !== tipo) : [...consulta.tipos, tipo],
    })

  const aplicarPreset = (min: number | null, max: number | null) => {
    setMinInput(min === null ? '' : String(min))
    setMaxInput(max === null ? '' : String(max))
    actualizar({ min, max })
  }

  const limpiarFiltros = () => {
    setQInput('')
    setMinInput('')
    setMaxInput('')
    setConsulta(CONSULTA_INICIAL)
  }

  const hayFiltros =
    consulta.q !== '' ||
    consulta.tipos.length > 0 ||
    consulta.min !== null ||
    consulta.max !== null ||
    consulta.estado !== 'todos' ||
    consulta.linea !== '' ||
    consulta.rifaId !== ''

  const rangoInvalido = consulta.min !== null && consulta.max !== null && consulta.min > consulta.max

  // ── Modal de contacto ──
  const abrirContacto = (c: ClientePasado) => {
    setContactoCliente(c)
    setResultado(null)
    setLinea(null)
    setObservacion('')
    setErrorModal('')
  }

  const cerrarContacto = useCallback(() => {
    if (guardando) return
    setContactoCliente(null)
  }, [guardando])

  const necesitaLinea = resultado === 'CONTACTADO' || resultado === 'NO_CONTESTO'
  const puedeGuardar =
    resultado === 'SIN_CONTACTAR' || (necesitaLinea && linea !== null)

  const guardarContacto = async () => {
    if (!contactoCliente || !resultado || !puedeGuardar) return
    setGuardando(true)
    setErrorModal('')
    try {
      await clientesPasadosApi.registrarContacto(contactoCliente.cliente_id, {
        estado: resultado,
        linea_contacto: resultado === 'SIN_CONTACTAR' ? null : linea,
        ...(observacion.trim() ? { observacion: observacion.trim() } : {}),
      })
      const nombre = contactoCliente.nombre
      setContactoCliente(null)
      setAviso(`Contacto registrado para ${nombre}`)
      await Promise.all([cargarLista(), cargarResumen()])
    } catch (e) {
      setErrorModal(e instanceof Error ? e.message : 'No se pudo registrar el contacto')
    } finally {
      setGuardando(false)
    }
  }

  // ── Modal de historial ──
  const abrirHistorial = async (c: ClientePasado) => {
    setHistorialCliente(c)
    setHistorial([])
    setErrorHistorial('')
    setCargandoHistorial(true)
    try {
      setHistorial(await clientesPasadosApi.historial(c.cliente_id))
    } catch (e) {
      setErrorHistorial(e instanceof Error ? e.message : 'No se pudo cargar el historial')
    } finally {
      setCargandoHistorial(false)
    }
  }

  const cerrarHistorial = useCallback(() => setHistorialCliente(null), [])

  const copiarTelefono = async (c: ClientePasado) => {
    if (!c.telefono) return
    try {
      await navigator.clipboard.writeText(c.telefono)
      setAviso(`Teléfono de ${c.nombre} copiado`)
    } catch {
      /* clipboard no disponible */
    }
  }

  // ── Datos derivados para la UI ──
  const proyectoActual = resumen?.proyectos_actuales?.map((p) => nombreCorto(p.nombre)).join(', ')

  const tarjetas: { key: FiltroEstado; label: string; valor: number; estilo: string }[] = [
    { key: 'todos', label: 'Todos', valor: resumen?.total ?? 0, estilo: 'bg-slate-900 text-white' },
    { key: 'sin_contactar', label: 'Sin contactar', valor: resumen?.sin_contactar ?? 0, estilo: 'bg-red-600 text-white' },
    { key: 'contactado', label: 'Contactados', valor: resumen?.contactados ?? 0, estilo: 'bg-emerald-600 text-white' },
    { key: 'no_contesto', label: 'No contestaron', valor: resumen?.no_contesto ?? 0, estilo: 'bg-amber-500 text-white' },
  ]

  const conteoTipo: Record<TipoBoleta, number> = {
    pagadas: resumen?.con_pagadas ?? 0,
    abonadas: resumen?.con_abonadas ?? 0,
    reservadas: resumen?.con_reservadas ?? 0,
  }

  const desde = pagination.total === 0 ? 0 : (pagination.page - 1) * pagination.limit + 1
  const hasta = Math.min(pagination.page * pagination.limit, pagination.total)

  return (
    <div className="space-y-5">
      {/* Encabezado */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900">Clientes pasados</h2>
        <p className="mt-1 text-sm text-slate-500">
          Clientes de proyectos terminados que <strong>aún no han comprado</strong> en el proyecto actual
          {proyectoActual ? ` (${proyectoActual})` : ''}. Cuando a un cliente se le asigna una boleta, sale
          automáticamente de este módulo.
        </p>
      </div>

      {/* Aviso de éxito */}
      {aviso && (
        <div className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm font-medium text-emerald-800" role="status">
          <CheckCircle2 className="h-4 w-4 shrink-0" /> {aviso}
        </div>
      )}

      {/* Tarjetas por estado */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tarjetas.map((t) => {
          const activa = consulta.estado === t.key
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => actualizar({ estado: t.key })}
              aria-pressed={activa}
              className={`rounded-xl p-3.5 text-left shadow-sm transition-all hover:shadow-md ${t.estilo} ${
                activa ? 'ring-2 ring-offset-2 ring-slate-900' : 'opacity-90 hover:opacity-100'
              }`}
            >
              <div className="text-2xl font-black tabular-nums">{t.valor.toLocaleString('es-CO')}</div>
              <div className="text-xs font-semibold opacity-90">{t.label}</div>
            </button>
          )
        })}
        <div
          className="col-span-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3.5 lg:col-span-1"
          title="Clientes que fueron contactados desde este módulo y ya compraron en el proyecto actual"
        >
          <div className="flex items-center gap-1.5 text-2xl font-black tabular-nums text-indigo-700">
            <Trophy className="h-5 w-5" />
            {(resumen?.recuperados ?? 0).toLocaleString('es-CO')}
          </div>
          <div className="text-xs font-semibold text-indigo-700">Recuperados</div>
          <div className="mt-0.5 text-[10px] text-indigo-500">Contactados que ya compraron</div>
        </div>
      </div>

      {/* Filtros */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="h-4 w-4 text-slate-400" /> Filtros
          </div>
          {hayFiltros && (
            <button
              type="button"
              onClick={limpiarFiltros}
              className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              <X className="h-3.5 w-3.5" /> Limpiar filtros
            </button>
          )}
        </div>

        {/* Búsqueda */}
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={qInput}
            onChange={(e) => setQInput(e.target.value)}
            placeholder="Buscar por nombre, cédula, teléfono o email..."
            className="w-full rounded-lg border border-slate-300 bg-white py-2 pl-9 pr-3 text-sm text-black placeholder-slate-500 outline-none focus:border-transparent focus:ring-2 focus:ring-indigo-600"
          />
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          {/* Tipo de boletas */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Tuvieron boletas… <span className="font-normal normal-case text-slate-400">(puedes elegir varias)</span>
            </label>
            <div className="flex flex-wrap gap-2">
              {TIPOS_UI.map((t) => {
                const activo = consulta.tipos.includes(t.key)
                return (
                  <button
                    key={t.key}
                    type="button"
                    onClick={() => toggleTipo(t.key)}
                    aria-pressed={activo}
                    className={`inline-flex items-center gap-2 rounded-lg border px-3.5 py-2 text-sm font-semibold transition-all ${
                      activo ? `${t.activo} shadow-sm` : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {!activo && <span className={`h-2 w-2 rounded-full ${t.punto}`} />}
                    {t.label}
                    <span className={`text-xs ${activo ? 'opacity-80' : 'text-slate-400'}`}>
                      {conteoTipo[t.key].toLocaleString('es-CO')}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Cantidad de boletas */}
          <div>
            <label className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              Cantidad de boletas{' '}
              <span className="font-normal normal-case text-slate-400">
                {consulta.tipos.length ? '(de los tipos elegidos)' : '(en total)'}
              </span>
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {PRESETS_CANTIDAD.map((p) => {
                const activo = consulta.min === p.min && consulta.max === p.max
                return (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => aplicarPreset(p.min, p.max)}
                    aria-pressed={activo}
                    className={`rounded-lg px-3 py-2 text-sm font-semibold transition-all ${
                      activo
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    {p.label}
                  </button>
                )
              })}
              <div className="ml-1 flex items-center gap-1.5 text-sm text-slate-500">
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={minInput}
                  onChange={(e) => setMinInput(e.target.value)}
                  placeholder="Desde"
                  aria-label="Cantidad mínima de boletas"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-black outline-none focus:ring-2 focus:ring-indigo-600"
                />
                <span>a</span>
                <input
                  type="number"
                  min={0}
                  inputMode="numeric"
                  value={maxInput}
                  onChange={(e) => setMaxInput(e.target.value)}
                  placeholder="Hasta"
                  aria-label="Cantidad máxima de boletas"
                  className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 text-sm text-black outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>
            </div>
            {rangoInvalido && (
              <p className="mt-1 text-xs font-medium text-red-600">El mínimo no puede ser mayor que el máximo.</p>
            )}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Proyecto</label>
            <select
              value={consulta.rifaId}
              onChange={(e) => actualizar({ rifaId: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">Todos los proyectos pasados</option>
              {resumen?.proyectos_pasados.map((p) => (
                <option key={p.id} value={p.id}>
                  {nombreCorto(p.nombre)} ({p.clientes.toLocaleString('es-CO')})
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Línea de ventas</label>
            <select
              value={consulta.linea}
              onChange={(e) => actualizar({ linea: e.target.value })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="">Todas las líneas</option>
              {LINEAS_CONTACTO.map((l) => (
                <option key={l} value={String(l)}>
                  Línea {l}
                </option>
              ))}
              <option value="PISTA">Pista (físico)</option>
              <option value="SIN_DATO">Sin información de línea</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold uppercase text-slate-500">Ordenar por</label>
            <select
              value={consulta.orden}
              onChange={(e) => actualizar({ orden: e.target.value as FiltroOrden })}
              className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-black outline-none focus:ring-2 focus:ring-indigo-600"
            >
              <option value="mas_boletas">Más boletas primero</option>
              <option value="recientes">Proyecto más reciente</option>
              <option value="nombre">Nombre (A–Z)</option>
              <option value="ultimo_contacto">Último contacto</option>
            </select>
          </div>
        </div>
      </div>

      {/* Resultados */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {error ? (
          <div className="p-10 text-center">
            <p className="mb-3 font-medium text-red-600">{error}</p>
            <button
              type="button"
              onClick={cargarLista}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Reintentar
            </button>
          </div>
        ) : loading && clientes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mx-auto mb-3 h-10 w-10 animate-spin rounded-full border-b-2 border-slate-900" />
            <p className="font-medium text-slate-500">Cargando clientes...</p>
          </div>
        ) : clientes.length === 0 ? (
          <div className="p-12 text-center">
            <div className="mb-3 text-4xl">🔍</div>
            <p className="font-medium text-slate-600">No hay clientes con estos filtros</p>
            {hayFiltros && (
              <button
                type="button"
                onClick={limpiarFiltros}
                className="mt-3 text-sm font-semibold text-indigo-600 hover:underline"
              >
                Limpiar filtros
              </button>
            )}
          </div>
        ) : (
          <div className={loading ? 'opacity-60 transition-opacity' : 'transition-opacity'}>
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/70 px-4 py-2 text-xs text-slate-500">
              <span>
                Mostrando <strong className="text-slate-700">{desde.toLocaleString('es-CO')}</strong>–
                <strong className="text-slate-700">{hasta.toLocaleString('es-CO')}</strong> de{' '}
                <strong className="text-slate-700">{pagination.total.toLocaleString('es-CO')}</strong> clientes
              </span>
              {loading && <span className="animate-pulse">Actualizando…</span>}
            </div>

            {/* Tabla (escritorio) */}
            <div className="hidden overflow-x-auto xl:block">
              <table className="w-full">
                <thead className="border-b border-slate-200 bg-slate-50">
                  <tr>
                    {['Cliente', 'Boletas en proyectos pasados', 'Línea de ventas', 'Estado', 'Observación', 'Acción'].map((h, i, arr) => (
                      <th
                        key={h}
                        className={`px-4 py-3 text-xs font-bold uppercase text-slate-600 ${i === arr.length - 1 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {clientes.map((c) => {
                    const lineas = textoLineas(c)
                    const expandido = expandidoId === c.cliente_id
                    return (
                      <Fragment key={c.cliente_id}>
                        <tr
                          onClick={(e) => clickFilaCliente(e, c)}
                          aria-expanded={expandido}
                          className={`cursor-pointer align-top transition-colors ${expandido ? 'bg-indigo-50/50' : 'hover:bg-slate-50'}`}
                        >
                        <td className="px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-500 text-sm font-bold text-white">
                              {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <div className="text-sm font-bold text-slate-900">{c.nombre}</div>
                                {expandido ? (
                                  <ChevronUp className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                                ) : (
                                  <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                                )}
                              </div>
                              <div className="mb-1 text-xs text-slate-500">{c.identificacion || c.email || '—'}</div>
                              <div data-no-expand>
                                <TelefonoCelda c={c} />
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="mb-1.5 flex flex-wrap items-center gap-2">
                            <span className="text-sm font-black text-slate-900">
                              {c.total} <span className="text-xs font-medium text-slate-400">en total</span>
                            </span>
                            <BoletasPills c={c} />
                          </div>
                          <ProyectosChips c={c} />
                          {!expandido && (
                            <p className="mt-1 text-[10px] font-medium text-indigo-500/80">Clic en la fila para ver números</p>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {lineas.principal ? (
                            <span className="inline-flex rounded-full bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                              {lineas.principal}
                            </span>
                          ) : lineas.secundario ? (
                            <span className="text-xs text-slate-500">{lineas.secundario}</span>
                          ) : (
                            <span className="text-xs text-slate-400">Sin información</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <EstadoBadge c={c} />
                          <UltimoContactoInfo c={c} />
                        </td>
                        <td className="px-4 py-3 align-top">
                          <ObservacionCelda texto={c.ultimo_contacto_observacion} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1.5">
                            {c.telefono && (
                              <button
                                type="button"
                                onClick={() => copiarTelefono(c)}
                                className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                                title="Copiar teléfono"
                                aria-label={`Copiar teléfono de ${c.nombre}`}
                              >
                                <Copy className="h-4 w-4" />
                              </button>
                            )}
                            {c.total_contactos > 0 && (
                              <button
                                type="button"
                                onClick={() => abrirHistorial(c)}
                                className="inline-flex items-center gap-1 rounded-lg px-2.5 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100"
                                title="Ver historial de contactos"
                              >
                                <History className="h-4 w-4" /> {c.total_contactos}
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => abrirContacto(c)}
                              className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg bg-indigo-600 px-3.5 py-2 text-sm font-bold text-white shadow-md shadow-indigo-600/20 hover:bg-indigo-500"
                            >
                              <Phone className="h-4 w-4" />
                              {c.estado_contacto === 'SIN_CONTACTAR' ? 'Contactar' : 'Actualizar'}
                            </button>
                          </div>
                        </td>
                      </tr>
                        {expandido && (
                          <tr className="bg-indigo-50/50">
                            <td colSpan={6} className="px-4 pb-4 pt-0">
                              <PanelBoletasPasadas
                                proyectos={boletasDetalle[c.cliente_id] ?? null}
                                loading={boletasCargando === c.cliente_id}
                                error={boletasError[c.cliente_id] ?? ''}
                              />
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Tarjetas (móvil / tablet / pantallas estrechas con menú abierto) */}
            <div className="divide-y divide-slate-100 xl:hidden">
              {clientes.map((c) => {
                const lineas = textoLineas(c)
                const expandido = expandidoId === c.cliente_id
                return (
                  <div
                    key={c.cliente_id}
                    role="button"
                    tabIndex={0}
                    aria-expanded={expandido}
                    onClick={(e) => clickFilaCliente(e, c)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        void toggleExpandCliente(c)
                      }
                    }}
                    className={`space-y-3 p-4 ${expandido ? 'bg-indigo-50/40' : ''}`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-slate-700 to-slate-500 font-bold text-white">
                        {c.nombre?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 truncate font-bold text-slate-900">
                          {c.nombre}
                          {expandido ? (
                            <ChevronUp className="h-4 w-4 shrink-0 text-indigo-500" aria-hidden />
                          ) : (
                            <ChevronDown className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">{c.identificacion || c.email || '—'}</div>
                        <div className="mt-1" data-no-expand>
                          <TelefonoCelda c={c} />
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-black leading-none text-slate-900">{c.total}</div>
                        <div className="text-[10px] text-slate-400">boletas</div>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <BoletasPills c={c} />
                      <ProyectosChips c={c} />
                    </div>

                    {expandido && (
                      <PanelBoletasPasadas
                        proyectos={boletasDetalle[c.cliente_id] ?? null}
                        loading={boletasCargando === c.cliente_id}
                        error={boletasError[c.cliente_id] ?? ''}
                      />
                    )}

                    <div className="text-xs text-slate-600">
                      <span className="font-semibold text-slate-500">Línea de ventas: </span>
                      {lineas.principal ?? lineas.secundario ?? <span className="text-slate-400">Sin información</span>}
                    </div>

                    <div>
                      <EstadoBadge c={c} />
                      <UltimoContactoInfo c={c} />
                    </div>

                    <div className="rounded-lg border border-slate-100 bg-slate-50 px-3 py-2">
                      <div className="text-[10px] font-bold uppercase tracking-wide text-slate-500">Observación</div>
                      <ObservacionCelda texto={c.ultimo_contacto_observacion} />
                    </div>

                    <div className="flex items-center justify-end gap-2" data-no-expand>
                      {c.total_contactos > 0 && (
                        <button
                          type="button"
                          onClick={() => abrirHistorial(c)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600"
                        >
                          <History className="h-4 w-4" /> Historial ({c.total_contactos})
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => abrirContacto(c)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white"
                      >
                        <Phone className="h-4 w-4" />
                        {c.estado_contacto === 'SIN_CONTACTAR' ? 'Contactar' : 'Actualizar'}
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      {/* Paginación */}
      {pagination.totalPages > 1 && !error && (
        <div className="flex flex-col items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:flex-row">
          <div className="text-sm font-medium text-slate-700">
            Página {pagination.page} de {pagination.totalPages.toLocaleString('es-CO')}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => actualizar({ page: 1 })}
              disabled={pagination.page === 1 || loading}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              «
            </button>
            <button
              type="button"
              onClick={() => actualizar({ page: pagination.page - 1 })}
              disabled={pagination.page === 1 || loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              ← Anterior
            </button>
            <button
              type="button"
              onClick={() => actualizar({ page: pagination.page + 1 })}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Siguiente →
            </button>
          </div>
        </div>
      )}

      {/* Modal: registrar contacto */}
      {contactoCliente && (
        <ModalPortal onClose={cerrarContacto}>
          <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-2xl">
            <div className="border-b border-slate-200 px-5 py-4 sm:px-6">
              <h3 className="text-lg font-bold text-slate-900">Registrar contacto</h3>
              <p className="mt-0.5 truncate text-sm text-slate-500">
                {contactoCliente.nombre} — {contactoCliente.telefono || 'sin teléfono'}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <EstadoBadge c={contactoCliente} />
                <span className="text-[11px] text-slate-400">estado actual</span>
              </div>
            </div>

            <div className="space-y-5 px-5 py-4 sm:px-6">
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Resultado de la llamada / mensaje</p>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setResultado('CONTACTADO')}
                    aria-pressed={resultado === 'CONTACTADO'}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                      resultado === 'CONTACTADO'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                        : 'border-slate-200 text-slate-700 hover:border-emerald-300'
                    }`}
                  >
                    <CheckCircle2 className="h-5 w-5" /> Contactado
                  </button>
                  <button
                    type="button"
                    onClick={() => setResultado('NO_CONTESTO')}
                    aria-pressed={resultado === 'NO_CONTESTO'}
                    className={`flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-bold transition-all ${
                      resultado === 'NO_CONTESTO'
                        ? 'border-amber-500 bg-amber-50 text-amber-800'
                        : 'border-slate-200 text-slate-700 hover:border-amber-300'
                    }`}
                  >
                    <PhoneOff className="h-5 w-5" /> No contestó
                  </button>
                </div>
              </div>

              {necesitaLinea && (
                <div>
                  <p className="mb-2 text-sm font-semibold text-slate-700">
                    ¿Desde qué línea? <span className="font-normal text-slate-400">(obligatorio)</span>
                  </p>
                  <div className="grid grid-cols-7 gap-1.5">
                    {LINEAS_CONTACTO.map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLinea(linea === l ? null : l)}
                        aria-pressed={linea === l}
                        className={`rounded-lg border-2 py-2.5 text-sm font-bold transition-all active:scale-95 ${
                          linea === l
                            ? 'border-indigo-600 bg-indigo-600 text-white shadow-md'
                            : 'border-slate-200 text-slate-700 hover:border-indigo-300 hover:bg-indigo-50'
                        }`}
                      >
                        L{l}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label htmlFor="obs-contacto" className="mb-2 block text-sm font-semibold text-slate-700">
                  Observación{' '}
                  <span className="font-normal text-slate-500">(opcional)</span>
                </label>
                <textarea
                  id="obs-contacto"
                  value={observacion}
                  onChange={(e) => setObservacion(e.target.value)}
                  maxLength={2000}
                  rows={3}
                  placeholder="Ej: llamar el lunes 10 a.m., quiere boleta #0420, pidió info de premios…"
                  className="w-full resize-none rounded-lg border border-slate-300 px-3 py-2 text-sm text-black placeholder-slate-400 outline-none focus:ring-2 focus:ring-indigo-600"
                />
              </div>

              {contactoCliente.estado_contacto !== 'SIN_CONTACTAR' && (
                <button
                  type="button"
                  onClick={() => setResultado('SIN_CONTACTAR')}
                  aria-pressed={resultado === 'SIN_CONTACTAR'}
                  className={`inline-flex items-center gap-1.5 text-xs font-semibold ${
                    resultado === 'SIN_CONTACTAR' ? 'text-red-600' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {resultado === 'SIN_CONTACTAR'
                    ? 'Se reiniciará a “Sin contactar”'
                    : 'Reiniciar a “Sin contactar” (corregir un error)'}
                </button>
              )}

              {errorModal && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700" role="alert">
                  {errorModal}
                </div>
              )}
            </div>

            <div className="flex gap-3 border-t border-slate-200 bg-slate-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={cerrarContacto}
                disabled={guardando}
                className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50 sm:flex-none sm:rounded-lg sm:py-2"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={guardarContacto}
                disabled={!puedeGuardar || guardando}
                className="flex-1 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:rounded-lg sm:py-2"
              >
                {guardando ? 'Guardando...' : 'Guardar'}
              </button>
            </div>
          </div>
        </ModalPortal>
      )}

      {/* Modal: historial */}
      {historialCliente && (
        <ModalPortal onClose={cerrarHistorial}>
          <div className="flex max-h-[min(85vh,640px)] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:mx-auto sm:max-w-lg sm:rounded-2xl">
            <div className="shrink-0 border-b border-slate-200 px-5 py-4 sm:px-6">
              <h3 className="text-lg font-bold text-slate-900">Historial de contactos</h3>
              <p className="mt-0.5 truncate text-sm text-slate-500">{historialCliente.nombre}</p>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4 sm:px-6">
              {cargandoHistorial ? (
                <div className="py-8 text-center">
                  <div className="mx-auto h-8 w-8 animate-spin rounded-full border-b-2 border-slate-900" />
                </div>
              ) : errorHistorial ? (
                <p className="py-6 text-center text-sm text-red-600">{errorHistorial}</p>
              ) : historial.length === 0 ? (
                <p className="py-6 text-center text-sm text-slate-500">Sin contactos registrados.</p>
              ) : (
                <ul className="space-y-3">
                  {historial.map((h) => (
                    <li key={h.id} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-bold text-slate-900">
                            {h.estado === 'SIN_CONTACTAR'
                              ? 'Reiniciado a sin contactar'
                              : h.estado === 'NO_CONTESTO'
                                ? 'No contestó'
                                : 'Contactado'}
                          </div>
                          <div className="text-xs text-slate-500">
                            {h.registrado_por_nombre || 'Usuario'}
                            {h.linea_contacto ? ` · Línea ${h.linea_contacto}` : ''}
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-1 text-right text-xs text-slate-500">
                          <Clock className="h-3 w-3" /> {formatFechaHora(h.created_at)}
                        </div>
                      </div>
                      <p className="mt-2 text-sm text-slate-700">
                        {h.observacion?.trim() ? h.observacion : (
                          <span className="italic text-slate-400">Sin observación</span>
                        )}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="flex shrink-0 justify-end border-t border-slate-200 bg-slate-50 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:px-6">
              <button
                type="button"
                onClick={cerrarHistorial}
                className="w-full rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800 sm:w-auto sm:rounded-lg sm:py-2"
              >
                Cerrar
              </button>
            </div>
          </div>
        </ModalPortal>
      )}
    </div>
  )
}
