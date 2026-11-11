'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import PageHeader from '@/components/admin/PageHeader'
import AsignacionResumenModal, {
  type AsignacionResumenData,
} from '@/components/inventario/AsignacionResumenModal'
import VerificacionNumerosPanel from '@/components/inventario/VerificacionNumerosPanel'
import ConfirmDialog from '@/components/ui/ConfirmDialog'
import { rifaApi } from '@/lib/rifaApi'
import type { Rifa } from '@/types/rifa'
import {
  inventarioApi,
  type InventarioBoleta,
  type InventarioDetalle,
  type InventarioResumen,
  type InventarioVendedorResumen,
  type VerificacionNumerosResult,
  type VerificacionNumeroItem,
} from '@/lib/inventarioApi'

const formatNumero = (n: number) => String(n).padStart(4, '0')

/** La serie es la milésima del número: serie 0 = 0000-0999, serie 1 = 1000-1999, etc. */
const SERIES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]

function parseNumeros(texto: string): { numeros: number[]; error: string | null } {
  const partes = texto
    .split(/[\s,;]+/)
    .map((p) => p.trim())
    .filter(Boolean)
  if (partes.length === 0) return { numeros: [], error: 'Escribe al menos un número' }

  const numeros: number[] = []
  for (const parte of partes) {
    const n = Number(parte)
    if (!Number.isInteger(n) || n < 0 || n > 9999) {
      return { numeros: [], error: `"${parte}" no es un número de boleta válido (0 a 9999)` }
    }
    numeros.push(n)
  }
  // Orden de entrada; quita duplicados conservando la primera aparición.
  const vistos = new Set<number>()
  const ordenados: number[] = []
  for (const n of numeros) {
    if (!vistos.has(n)) {
      vistos.add(n)
      ordenados.push(n)
    }
  }
  return { numeros: ordenados, error: null }
}

function parseNumeroUnico(texto: string): { numero: number | null; error: string | null } {
  const t = texto.trim()
  if (!t) return { numero: null, error: 'Escribe las 4 cifras del número' }
  if (!/^\d{4}$/.test(t)) {
    return {
      numero: null,
      error: 'Debes escribir exactamente 4 cifras (ej. 0009, 1234). No se rellenan ceros solos.',
    }
  }
  const n = Number(t)
  if (!Number.isInteger(n) || n < 0 || n > 9999) {
    return { numero: null, error: 'Número inválido: debe estar entre 0000 y 9999' }
  }
  return { numero: n, error: null }
}

function puedeGestionarBoleta(b: InventarioBoleta): boolean {
  return b.estado === 'DISPONIBLE' && !b.bloqueada
}

function boletaCoincideBusqueda(b: InventarioBoleta, query: string): boolean {
  const q = query.trim()
  if (!q) return true
  const etiquetas = b.numeros.map(formatNumero)
  if (etiquetas.some((e) => e.includes(q))) return true
  const n = Number(q)
  if (Number.isInteger(n) && n >= 0 && n <= 9999) {
    return b.numeros.includes(n) || b.numero === n || b.numero_principal === n
  }
  return etiquetas.join(' ').toLowerCase().includes(q.toLowerCase())
}

type ConfirmState = {
  title: string
  message: string
  type: 'danger' | 'warning' | 'info'
  confirmText?: string
  onConfirm: () => void
} | null

const btnPrimario =
  'px-4 py-2.5 bg-indigo-600 text-white rounded-xl font-medium text-sm shadow-lg shadow-indigo-600/20 hover:bg-indigo-700 disabled:opacity-50 min-h-[44px]'
const btnSecundario =
  'px-3 py-2 bg-white text-slate-700 border border-slate-200 rounded-xl text-sm font-medium hover:bg-slate-50 disabled:opacity-50 min-h-[40px]'
const btnPeligro =
  'px-3 py-2 bg-red-600 text-white rounded-xl text-sm font-medium hover:bg-red-700 disabled:opacity-50 min-h-[40px]'
const inputBase =
  'w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500'
const labelBase =
  'block text-[10px] font-bold uppercase tracking-[0.14em] text-slate-400 mb-1'

export default function InventarioVendedoresPage() {
  const router = useRouter()
  const [user, setUser] = useState<{ id: string; nombre: string; rol: string } | null>(null)

  const [rifas, setRifas] = useState<Rifa[]>([])
  const [rifaId, setRifaId] = useState('')
  const [resumen, setResumen] = useState<InventarioResumen | null>(null)
  const [detalle, setDetalle] = useState<InventarioDetalle | null>(null)
  const [vendedorAbierto, setVendedorAbierto] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState('')
  const [aviso, setAviso] = useState('')
  const [confirm, setConfirm] = useState<ConfirmState>(null)

  const [modoAsignar, setModoAsignar] = useState<'serie' | 'numeros'>('serie')
  const [asignarVendedor, setAsignarVendedor] = useState('')
  const [cantidadesPorSerie, setCantidadesPorSerie] = useState<Record<number, string>>(() =>
    Object.fromEntries(SERIES.map((s) => [s, '']))
  )
  const [carritoAsignar, setCarritoAsignar] = useState<VerificacionNumeroItem[]>([])
  const [inputNumeroAsignar, setInputNumeroAsignar] = useState('')
  const [errorInputAsignar, setErrorInputAsignar] = useState('')
  const [agregandoAlCarrito, setAgregandoAlCarrito] = useState(false)
  const inputNumeroAsignarRef = useRef<HTMLInputElement>(null)
  const [quitarNumeros, setQuitarNumeros] = useState('')
  const [buscarDetalle, setBuscarDetalle] = useState('')
  const [destinoPorBoleta, setDestinoPorBoleta] = useState<Record<string, string>>({})
  const [mostrarRangos, setMostrarRangos] = useState(false)
  const [previewQuitar, setPreviewQuitar] = useState<VerificacionNumerosResult | null>(null)
  const [verificandoQuitar, setVerificandoQuitar] = useState(false)
  const [resumenAsignacion, setResumenAsignacion] = useState<AsignacionResumenData | null>(null)
  const [topeDraft, setTopeDraft] = useState<Record<string, string>>({})
  const [guardandoTope, setGuardandoTope] = useState<string | null>(null)

  const puedeGestionar = ['SUPER_ADMIN', 'ADMIN'].includes(
    (user?.rol || '').toUpperCase()
  )

  useEffect(() => {
    const token = localStorage.getItem('token')
    const userData = localStorage.getItem('user')
    if (!token || !userData) {
      router.push('/login')
      return
    }
    try {
      const parsed = JSON.parse(userData)
      if (!['SUPER_ADMIN', 'ADMIN'].includes((parsed.rol || '').toUpperCase())) {
        router.push('/mis-reportes')
        return
      }
      setUser(parsed)
    } catch {
      router.push('/login')
    }
  }, [router])

  useEffect(() => {
    if (!user) return
    const cargarRifas = async () => {
      try {
        const res = await rifaApi.getRifasOperativas()
        const lista = res.data || []
        setRifas(lista)
        if (lista.length > 0) setRifaId(lista[0].id)
        else setLoading(false)
      } catch (e: any) {
        setError(e.message || 'Error al cargar los proyectos')
        setLoading(false)
      }
    }
    cargarRifas()
  }, [user])

  const cargarResumen = useCallback(async () => {
    if (!rifaId) return
    setLoading(true)
    setError('')
    try {
      const data = await inventarioApi.getResumen(rifaId)
      setResumen(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar el inventario')
      setResumen(null)
    } finally {
      setLoading(false)
    }
  }, [rifaId])

  useEffect(() => {
    setDetalle(null)
    setVendedorAbierto(null)
    setCarritoAsignar([])
    setInputNumeroAsignar('')
    setErrorInputAsignar('')
    setPreviewQuitar(null)
    cargarResumen()
  }, [cargarResumen])

  const parseQuitar = useMemo(() => parseNumeros(quitarNumeros), [quitarNumeros])

  useEffect(() => {
    if (!rifaId) {
      setPreviewQuitar(null)
      return
    }
    const { numeros, error } = parseNumeros(quitarNumeros)
    if (error || numeros.length === 0) {
      setPreviewQuitar(null)
      return
    }
    let cancelado = false
    const timer = setTimeout(async () => {
      setVerificandoQuitar(true)
      try {
        const data = await inventarioApi.verificarNumeros(rifaId, {
          numeros,
          context: 'QUITAR',
        })
        if (!cancelado) setPreviewQuitar(data)
      } catch {
        if (!cancelado) setPreviewQuitar(null)
      } finally {
        if (!cancelado) setVerificandoQuitar(false)
      }
    }, 400)
    return () => {
      cancelado = true
      clearTimeout(timer)
    }
  }, [rifaId, quitarNumeros, parseQuitar.error])

  const numerosAsignablesPreview = useMemo(
    () => carritoAsignar.map((i) => i.numero_solicitado),
    [carritoAsignar]
  )

  const numerosLiberablesPreview = useMemo(
    () =>
      previewQuitar?.items.filter((i) => i.liberable).map((i) => i.numero_solicitado) ?? [],
    [previewQuitar]
  )

  const planAsignacionSeries = useMemo(() => {
    const items: { serie: number; cantidad: number }[] = []
    for (const s of SERIES) {
      const raw = (cantidadesPorSerie[s] ?? '').trim()
      if (!raw) continue
      const n = Number(raw)
      if (!Number.isInteger(n) || n < 1) continue
      items.push({ serie: s, cantidad: Math.min(n, 5000) })
    }
    return items
  }, [cantidadesPorSerie])

  const totalPedidoSeries = useMemo(
    () => planAsignacionSeries.reduce((acc, row) => acc + row.cantidad, 0),
    [planAsignacionSeries]
  )

  const setCantidadSerie = (serie: number, valor: string) => {
    setCantidadesPorSerie((prev) => ({ ...prev, [serie]: valor }))
  }

  const limpiarCantidadesSeries = () => {
    setCantidadesPorSerie(Object.fromEntries(SERIES.map((s) => [s, ''])))
  }

  const quitarDelCarrito = (numero: number) => {
    setCarritoAsignar((prev) => prev.filter((i) => i.numero_solicitado !== numero))
  }

  const enfocarInputNumero = useCallback(() => {
    requestAnimationFrame(() => {
      inputNumeroAsignarRef.current?.focus()
      inputNumeroAsignarRef.current?.select()
    })
  }, [])

  useEffect(() => {
    if (modoAsignar === 'numeros' && asignarVendedor) {
      enfocarInputNumero()
    }
  }, [modoAsignar, asignarVendedor, enfocarInputNumero])

  const agregarNumeroAlCarrito = async () => {
    setErrorInputAsignar('')
    if (!rifaId) return
    if (!asignarVendedor) {
      setErrorInputAsignar('Elige un vendedor antes de agregar números.')
      enfocarInputNumero()
      return
    }
    const { numero, error } = parseNumeroUnico(inputNumeroAsignar)
    if (error || numero === null) {
      setErrorInputAsignar(error || 'Número inválido')
      enfocarInputNumero()
      return
    }
    if (carritoAsignar.some((i) => i.numero_solicitado === numero)) {
      setErrorInputAsignar(`#${formatNumero(numero)} ya está en el carrito.`)
      enfocarInputNumero()
      return
    }
    setAgregandoAlCarrito(true)
    try {
      const data = await inventarioApi.verificarNumeros(rifaId, {
        numeros: [numero],
        context: 'ASIGNAR',
        vendedor_id: asignarVendedor,
      })
      const item = data.items[0]
      if (!item?.asignable) {
        setErrorInputAsignar(
          item?.mensaje || 'No disponible: elige otro número antes de continuar.'
        )
        enfocarInputNumero()
        return
      }
      setCarritoAsignar((prev) => [...prev, item])
      setInputNumeroAsignar('')
      enfocarInputNumero()
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'No se pudo comprobar el número.'
      setErrorInputAsignar(msg)
      enfocarInputNumero()
    } finally {
      setAgregandoAlCarrito(false)
      enfocarInputNumero()
    }
  }

  const onInputNumeroKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputNumeroAsignar.length !== 4) {
        setErrorInputAsignar('Completa las 4 cifras antes de Enter (ej. 0009).')
        enfocarInputNumero()
        return
      }
      void agregarNumeroAlCarrito()
    }
  }

  const vendedores = useMemo(() => resumen?.vendedores || [], [resumen])
  const soloVendedores = useMemo(
    () => vendedores.filter((v) => v.rol.toUpperCase() === 'VENDEDOR'),
    [vendedores]
  )

  const librosPorSerie = useMemo(() => {
    const mapa = new Map<number, number>()
    for (const s of resumen?.series_libres || []) mapa.set(s.serie, s.libres)
    return mapa
  }, [resumen])

  const refrescarDetalleActual = useCallback(async () => {
    if (!rifaId || !vendedorAbierto) return
    await cargarResumen()
    setDetalle(await inventarioApi.getDetalleVendedor(rifaId, vendedorAbierto))
  }, [rifaId, vendedorAbierto, cargarResumen])

  const abrirDetalle = async (vendedorId: string) => {
    if (vendedorAbierto === vendedorId) {
      setVendedorAbierto(null)
      setDetalle(null)
      setBuscarDetalle('')
      setDestinoPorBoleta({})
      return
    }
    setVendedorAbierto(vendedorId)
    setDetalle(null)
    setBuscarDetalle('')
    setDestinoPorBoleta({})
    setMostrarRangos(false)
    try {
      const data = await inventarioApi.getDetalleVendedor(rifaId, vendedorId)
      setDetalle(data)
    } catch (e: any) {
      setError(e.message || 'Error al cargar el detalle del vendedor')
    }
  }

  const ejecutarAsignar = async () => {
    setProcesando(true)
    setError('')
    setAviso('')
    try {
      const payload =
        modoAsignar === 'serie'
          ? {
              vendedor_id: asignarVendedor,
              asignaciones_series: planAsignacionSeries,
            }
          : {
              vendedor_id: asignarVendedor,
              numeros: numerosAsignablesPreview,
            }

      const resultado = await inventarioApi.asignar(rifaId, payload)
      const pedidas =
        resultado.pedidas ??
        (modoAsignar === 'serie' ? totalPedidoSeries : (payload.numeros?.length ?? 0))

      setResumenAsignacion({
        rifaNombre: resumen?.rifa.nombre || 'Proyecto',
        modo: resultado.modo,
        serie: resultado.serie ?? null,
        vendedorNombre: resultado.vendedor.nombre,
        pedidas,
        asignadas: resultado.asignadas,
        omitidas: resultado.omitidas ?? Math.max(0, pedidas - resultado.asignadas),
        pachas: resultado.pachas ?? [],
        porSerie: resultado.por_serie,
      })

      if (resultado.asignadas === 0) {
        setError('')
      } else if (resultado.asignadas < pedidas) {
        setAviso('')
      } else {
        setAviso('')
      }

      setCarritoAsignar([])
      setInputNumeroAsignar('')
      setErrorInputAsignar('')
      if (modoAsignar === 'serie') limpiarCantidadesSeries()
      await cargarResumen()
      if (vendedorAbierto) {
        setDetalle(await inventarioApi.getDetalleVendedor(rifaId, vendedorAbierto))
      }
    } catch (e: any) {
      setError(e.message || 'Error al asignar las boletas')
    } finally {
      setProcesando(false)
      setConfirm(null)
    }
  }

  const confirmarAsignar = () => {
    setError('')
    setAviso('')
    if (!asignarVendedor) {
      setError('Elige a qué vendedor le vas a asignar las boletas.')
      return
    }
    const vendedor = soloVendedores.find((v) => v.id === asignarVendedor)

    if (modoAsignar === 'serie') {
      if (planAsignacionSeries.length === 0) {
        setError('Indica cuántas boletas quieres en al menos una serie (0 = omitir).')
        return
      }
      for (const row of planAsignacionSeries) {
        const raw = (cantidadesPorSerie[row.serie] ?? '').trim()
        const n = Number(raw)
        if (!Number.isInteger(n) || n < 1 || n > 5000) {
          setError(`Cantidad inválida en serie ${row.serie}: usa un entero entre 1 y 5000.`)
          return
        }
      }
      const detalleSeries = planAsignacionSeries
        .map((row) => {
          const libres = librosPorSerie.get(row.serie) || 0
          const aviso = row.cantidad > libres ? ' (puede asignar menos si no alcanzan)' : ''
          return `• Serie ${row.serie} (${formatNumero(row.serie * 1000)}-${formatNumero(row.serie * 1000 + 999)}): ${row.cantidad} pedidas — ${libres} libres${aviso}`
        })
        .join('\n')
      setConfirm({
        title: 'Confirmar asignación por series',
        message: `Vendedor: ${vendedor?.nombre}\nTotal pedido: ${totalPedidoSeries} boletas (aleatorias del pool por serie)\n\n${detalleSeries}\n\nAl confirmar verás el resumen con totales por serie y cada boleta asignada.`,
        type: 'info',
        confirmText: `Asignar (${totalPedidoSeries})`,
        onConfirm: ejecutarAsignar,
      })
      return
    }

    if (carritoAsignar.length === 0) {
      setError('Agrega al menos un número al carrito (Enter tras comprobar que esté libre).')
      return
    }
    const listaPreview = carritoAsignar
      .map((i) => (i.par ? i.par : `#${formatNumero(i.numero_solicitado)}`))
      .join('\n')
    setConfirm({
      title: 'Confirmar asignación por números',
      message: `Vendedor: ${vendedor?.nombre}\nBoletas en el carrito: ${carritoAsignar.length}\n\n${listaPreview}\n\nAl terminar verás el resumen final con las boletas asignadas.`,
      type: 'info',
      confirmText: `Asignar (${carritoAsignar.length})`,
      onConfirm: ejecutarAsignar,
    })
  }

  const ejecutarQuitarNumeros = async (vendedorId: string | null, numeros: number[]) => {
    setProcesando(true)
    setError('')
    setAviso('')
    try {
      const resultado = await inventarioApi.quitar(rifaId, {
        vendedor_id: vendedorId,
        numeros,
      })
      if (resultado.liberadas === 0) {
        setError(
          'No se liberó ninguna boleta. Solo se pueden quitar boletas DISPONIBLES sin bloqueo activo.'
        )
      } else {
        setAviso(`${resultado.liberadas} boleta(s) volvieron al pool sin asignar.`)
      }
      setQuitarNumeros('')
      setPreviewQuitar(null)
      await cargarResumen()
      if (vendedorAbierto) {
        setDetalle(await inventarioApi.getDetalleVendedor(rifaId, vendedorAbierto))
      }
    } catch (e: any) {
      setError(e.message || 'Error al liberar las boletas')
    } finally {
      setProcesando(false)
      setConfirm(null)
    }
  }

  const confirmarQuitarNumeros = () => {
    setError('')
    setAviso('')
    if (parseQuitar.error) {
      setError(parseQuitar.error)
      return
    }
    const liberables =
      numerosLiberablesPreview.length > 0
        ? numerosLiberablesPreview
        : previewQuitar
          ? []
          : parseQuitar.numeros
    if (previewQuitar && liberables.length === 0) {
      setError('Ningún número se puede liberar al pool (no están en inventario de vendedor o no están disponibles).')
      return
    }
    const lista = liberables.length > 0 ? liberables : parseQuitar.numeros
    setConfirm({
      title: 'Quitar boletas del inventario',
      message: previewQuitar
        ? `Se liberarán ${liberables.length} de ${parseQuitar.numeros.length} comprobados al pool común: ${lista
            .slice(0, 20)
            .map(formatNumero)
            .join(', ')}${lista.length > 20 ? '…' : ''}.`
        : `Se quitarán hasta ${parseQuitar.numeros.length} boleta(s) del vendedor que las tenga.`,
      type: 'danger',
      confirmText: `Quitar${previewQuitar ? ` (${liberables.length})` : ''}`,
      onConfirm: () => ejecutarQuitarNumeros(null, lista),
    })
  }

  const guardarTopeVendedor = async (v: InventarioVendedorResumen) => {
    const raw = (topeDraft[v.id] ?? String(v.max_boletas_inventario ?? '')).trim()
    const valor = raw === '' ? null : Number(raw)
    if (valor != null && (!Number.isInteger(valor) || valor < 0)) {
      setError('El tope debe ser un entero ≥ 0 (vacío = sin tope configurado).')
      return
    }
    setGuardandoTope(v.id)
    setError('')
    try {
      await inventarioApi.actualizarTopeVendedor(v.id, valor)
      setAviso(`Tope de ${v.nombre} actualizado.`)
      await cargarResumen()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar el tope')
    } finally {
      setGuardandoTope(null)
    }
  }

  const confirmarVaciarVendedor = (vendedor: InventarioVendedorResumen) => {
    setConfirm({
      title: `Vaciar inventario de ${vendedor.nombre}`,
      message: `Se liberarán las ${vendedor.asignadas_libres} boletas DISPONIBLES asignadas a ${vendedor.nombre} y volverán al pool común. Sus ventas en curso (${vendedor.reservadas} reservadas, ${vendedor.abonadas} abonadas, ${vendedor.pagadas} pagadas) no se tocan.`,
      type: 'danger',
      confirmText: 'Vaciar',
      onConfirm: async () => {
        setProcesando(true)
        setError('')
        setAviso('')
        try {
          const resultado = await inventarioApi.quitar(rifaId, { vendedor_id: vendedor.id })
          setAviso(`${resultado.liberadas} boleta(s) liberadas de ${vendedor.nombre}.`)
          await cargarResumen()
          if (vendedorAbierto === vendedor.id) {
            setDetalle(await inventarioApi.getDetalleVendedor(rifaId, vendedor.id))
          }
        } catch (e: any) {
          setError(e.message || 'Error al vaciar el inventario')
        } finally {
          setProcesando(false)
          setConfirm(null)
        }
      },
    })
  }

  const confirmarLiberarBoleta = (b: InventarioBoleta, vendedorNombre: string) => {
    const par = b.numeros.map(formatNumero).join(' / ')
    setConfirm({
      title: 'Devolver al pool de administración',
      message: `La boleta ${par} saldrá del inventario de ${vendedorNombre} y quedará disponible para admin, superadmin y web. Solo aplica si está DISPONIBLE y sin bloqueo.`,
      type: 'warning',
      confirmText: 'Al pool',
      onConfirm: async () => {
        if (!vendedorAbierto) return
        setProcesando(true)
        setError('')
        setAviso('')
        try {
          const resultado = await inventarioApi.quitar(rifaId, {
            vendedor_id: vendedorAbierto,
            numeros: [b.numero_principal ?? b.numero],
          })
          if (resultado.liberadas === 0) {
            setError('No se pudo liberar: la boleta ya no está disponible para quitar.')
          } else {
            setAviso(`Boleta ${par} devuelta al pool común.`)
          }
          await refrescarDetalleActual()
        } catch (e: any) {
          setError(e.message || 'Error al liberar la boleta')
        } finally {
          setProcesando(false)
          setConfirm(null)
        }
      },
    })
  }

  const confirmarTransferirBoleta = (
    b: InventarioBoleta,
    destinoId: string,
    origenNombre: string
  ) => {
    const destino = soloVendedores.find((v) => v.id === destinoId)
    if (!destino) return
    const par = b.numeros.map(formatNumero).join(' / ')
    setConfirm({
      title: 'Transferir a otro vendedor',
      message: `Mover boleta ${par} de ${origenNombre} → ${destino.nombre}. Solo boletas DISPONIBLES sin bloqueo.`,
      type: 'info',
      confirmText: 'Transferir',
      onConfirm: async () => {
        if (!vendedorAbierto) return
        setProcesando(true)
        setError('')
        setAviso('')
        try {
          const resultado = await inventarioApi.mover(rifaId, {
            origen_id: vendedorAbierto,
            destino_id: destinoId,
            numeros: [b.numero_principal ?? b.numero],
          })
          if (resultado.asignadas === 0) {
            setError('No se pudo transferir: revisa que la boleta siga disponible.')
          } else {
            setAviso(`Boleta ${par} transferida a ${destino.nombre}.`)
          }
          setDestinoPorBoleta((prev) => {
            const next = { ...prev }
            delete next[b.boleta_id]
            return next
          })
          await refrescarDetalleActual()
        } catch (e: any) {
          setError(e.message || 'Error al transferir')
        } finally {
          setProcesando(false)
          setConfirm(null)
        }
      },
    })
  }

  const boletasDetalleFiltradas = useMemo(() => {
    if (!detalle) return []
    return detalle.boletas.filter((b) => boletaCoincideBusqueda(b, buscarDetalle))
  }, [detalle, buscarDetalle])

  const otrosVendedoresDetalle = useMemo(() => {
    if (!vendedorAbierto) return []
    return soloVendedores.filter((v) => v.id !== vendedorAbierto && v.activo)
  }, [soloVendedores, vendedorAbierto])

  const confirmarSembrar = () => {
    setConfirm({
      title: 'Registrar ventas existentes en el inventario',
      message:
        'Se registrarán en el inventario las boletas que ya tienen venta (reservadas, abonadas, pagadas) a nombre del vendedor que las vendió. Es solo para ver quién tiene qué: no cambia estados, ni ventas, ni permisos de abono.',
      type: 'info',
      confirmText: 'Registrar',
      onConfirm: async () => {
        setProcesando(true)
        setError('')
        setAviso('')
        try {
          const res = await inventarioApi.sembrar(rifaId)
          setAviso(`${res.registradas} boleta(s) con venta quedaron registradas en el inventario.`)
          await cargarResumen()
        } catch (e: any) {
          setError(e.message || 'Error al registrar las ventas existentes')
        } finally {
          setProcesando(false)
          setConfirm(null)
        }
      },
    })
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-slate-500">Cargando...</span>
        </div>
      </div>
    )
  }

  const vendedoresSinStock = soloVendedores.filter(
    (v) => v.activo && v.asignadas_libres === 0
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50/80 to-white">
      <div className="px-3 sm:px-6 lg:px-8 py-4 sm:py-6 max-w-6xl mx-auto">
        <PageHeader
          eyebrow="Operación"
          title="Inventario de vendedores"
          description="Asigna boletas solo a vendedores. Los nuevos vendedores empiezan en cero hasta que les repartas stock. Admin y superadmin venden del pool común (boletas sin asignar)."
        />

        <div className="mb-4">
          <label className={labelBase} htmlFor="rifa">
            Proyecto
          </label>
          <select
            id="rifa"
            value={rifaId}
            onChange={(e) => setRifaId(e.target.value)}
            className={`${inputBase} max-w-md`}
          >
            {rifas.length === 0 && <option value="">Sin proyectos disponibles</option>}
            {rifas.map((r) => (
              <option key={r.id} value={r.id}>
                {r.nombre}
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div className="mb-4 border border-slate-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </div>
        )}
        {aviso && (
          <div className="mb-4 border border-slate-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            {aviso}
          </div>
        )}

        {loading && (
          <div className="flex items-center gap-3 py-10">
            <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Cargando inventario...</span>
          </div>
        )}

        {!loading && resumen && (
          <>
            <div className="mb-5 rounded-2xl border border-emerald-200/80 bg-emerald-50/90 px-4 py-4 text-sm shadow-sm">
              <p className="font-semibold text-emerald-900 mb-1">Inventario por vendedor activo</p>
              <p className="text-emerald-800/90 leading-relaxed">
                Cada vendedor solo vende las boletas que tenga asignadas. Admin, superadmin y la web
                usan el pool común ({resumen.pool.disponibles_libres.toLocaleString('es-CO')} libres
                ahora).
              </p>
              {vendedoresSinStock.length > 0 && (
                <p className="mt-2 text-amber-900/90 text-xs">
                  {vendedoresSinStock.length} vendedor(es) activo(s) sin boletas libres:{' '}
                  {vendedoresSinStock.map((v) => v.nombre).join(', ')}. Asígnales stock para que
                  puedan vender.
                </p>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
              {[
                {
                  label: 'Pool admin / web',
                  valor: resumen.pool.disponibles_libres,
                  hint: 'Sin asignar a vendedor',
                },
                {
                  label: 'Libres en vendedores',
                  valor: soloVendedores.reduce((acc, v) => acc + v.asignadas_libres, 0),
                },
                { label: 'Bloqueos vigentes', valor: resumen.bloqueos_vigentes },
                { label: 'Total del proyecto', valor: resumen.rifa.total_boletas },
              ].map((kpi) => (
                <div
                  key={kpi.label}
                  className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm"
                >
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                    {kpi.label}
                  </p>
                  <p className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                    {kpi.valor.toLocaleString('es-CO')}
                  </p>
                  {'hint' in kpi && kpi.hint && (
                    <p className="text-[10px] text-slate-400 mt-0.5">{kpi.hint}</p>
                  )}
                </div>
              ))}
            </div>

            <section className="mb-6">
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-700 mb-2">
                Pool común — libres por serie
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Solo boletas disponibles para asignar a vendedores o vender como admin.
              </p>
              <div className="flex flex-wrap gap-2">
                {SERIES.map((serie) => {
                  const libres = librosPorSerie.get(serie) || 0
                  return (
                    <div
                      key={serie}
                      className={`rounded-xl border border-slate-200/80 px-3 py-2 text-center min-w-[92px] shadow-sm ${
                        libres > 0 ? 'bg-white' : 'bg-slate-100/80 opacity-70'
                      }`}
                    >
                      <p className="text-[10px] font-bold uppercase tracking-[0.1em] text-slate-400">
                        Serie {serie}
                      </p>
                      <p className="text-base font-[800]">{libres.toLocaleString('es-CO')}</p>
                      <p className="text-[10px] text-slate-400">
                        {formatNumero(serie * 1000)}-{formatNumero(serie * 1000 + 999)}
                      </p>
                    </div>
                  )
                })}
              </div>
            </section>

            {puedeGestionar && (
              <section className="mb-6 space-y-4">
                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
                <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800 mb-1">
                  Asignar al inventario de un vendedor
                </h2>
                <p className="text-xs text-slate-500 mb-4">
                  En <strong>números específicos</strong>, escribe un número (0–9999), pulsa{' '}
                  <strong>Enter</strong> y, si está libre en el pool, se agrega al carrito. Si no está
                  disponible, corrige el número antes de seguir. Solo administradores usan el pool común.
                </p>

                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setModoAsignar('serie')}
                    className={
                      modoAsignar === 'serie'
                        ? 'px-3 py-2 bg-slate-900 text-white border border-slate-200 font-bold uppercase text-[11px] tracking-wider'
                        : btnSecundario
                    }
                  >
                    Por serie
                  </button>
                  <button
                    onClick={() => {
                      setModoAsignar('numeros')
                      setCarritoAsignar([])
                      setInputNumeroAsignar('')
                      setErrorInputAsignar('')
                    }}
                    className={
                      modoAsignar === 'numeros'
                        ? 'px-3 py-2 bg-slate-900 text-white border border-slate-200 font-bold uppercase text-[11px] tracking-wider'
                        : btnSecundario
                    }
                  >
                    Números específicos
                  </button>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="sm:col-span-2">
                    <label className={labelBase} htmlFor="vendedor">
                      Vendedor
                    </label>
                    <select
                      id="vendedor"
                      value={asignarVendedor}
                      onChange={(e) => setAsignarVendedor(e.target.value)}
                      className={inputBase}
                    >
                      <option value="">Selecciona un vendedor</option>
                      {soloVendedores
                        .filter((v) => v.activo)
                        .map((v) => (
                          <option key={v.id} value={v.id}>
                            {v.nombre}
                            {v.asignadas_libres === 0 ? ' — sin boletas' : ` — ${v.asignadas_libres} libres`}
                          </option>
                        ))}
                    </select>
                  </div>

                  {modoAsignar === 'serie' ? (
                    <div className="sm:col-span-2 lg:col-span-4">
                      <div className="flex flex-wrap items-end justify-between gap-2 mb-2">
                        <p className={labelBase + ' mb-0'}>
                          Cantidad por serie (vacío = no asignar)
                        </p>
                        {totalPedidoSeries > 0 && (
                          <button
                            type="button"
                            onClick={limpiarCantidadesSeries}
                            className="text-[11px] font-medium text-slate-500 hover:text-indigo-600"
                          >
                            Limpiar todo
                          </button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {SERIES.map((s) => {
                          const libres = librosPorSerie.get(s) || 0
                          const cant = Number((cantidadesPorSerie[s] ?? '').trim() || 0)
                          const excede = cant > libres && libres >= 0
                          return (
                            <div
                              key={s}
                              className={`flex items-center gap-2 rounded-xl border px-2 py-2 ${
                                excede
                                  ? 'border-amber-300 bg-amber-50/50'
                                  : cant > 0
                                    ? 'border-indigo-200 bg-indigo-50/30'
                                    : 'border-slate-200 bg-white'
                              }`}
                            >
                              <div className="min-w-0 flex-1">
                                <p className="text-xs font-bold text-slate-800">
                                  Serie {s}
                                  <span className="font-normal text-slate-400 ml-1">
                                    {formatNumero(s * 1000)}-{formatNumero(s * 1000 + 999)}
                                  </span>
                                </p>
                                <p className="text-[10px] text-slate-500">{libres} libres</p>
                              </div>
                              <input
                                type="number"
                                min={0}
                                max={5000}
                                placeholder="0"
                                value={cantidadesPorSerie[s] ?? ''}
                                onChange={(e) => setCantidadSerie(s, e.target.value)}
                                className="w-20 shrink-0 px-2 py-1.5 border border-slate-200 rounded-lg text-sm text-right tabular-nums"
                                aria-label={`Cantidad serie ${s}`}
                              />
                            </div>
                          )
                        })}
                      </div>
                      {totalPedidoSeries > 0 && (
                        <p className="mt-2 text-xs font-semibold text-indigo-800 tabular-nums">
                          Total a asignar: {totalPedidoSeries.toLocaleString('es-CO')} boletas
                          (aleatorias del pool en cada serie)
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="sm:col-span-2 lg:col-span-4 space-y-3">
                      <div>
                        <label className={labelBase} htmlFor="numero-carrito">
                          Agregar número
                        </label>
                        <div className="flex gap-2">
                          <input
                            ref={inputNumeroAsignarRef}
                            id="numero-carrito"
                            type="text"
                            inputMode="numeric"
                            pattern="[0-9]*"
                            maxLength={4}
                            value={inputNumeroAsignar}
                            onChange={(e) => {
                              setInputNumeroAsignar(e.target.value.replace(/\D/g, '').slice(0, 4))
                              setErrorInputAsignar('')
                            }}
                            onKeyDown={onInputNumeroKeyDown}
                            placeholder="0000"
                            className={`${inputBase} max-w-[160px] tabular-nums text-lg font-semibold tracking-wider`}
                            autoComplete="off"
                            disabled={agregandoAlCarrito || procesando}
                          />
                          <button
                            type="button"
                            onClick={() => void agregarNumeroAlCarrito()}
                            disabled={
                              agregandoAlCarrito ||
                              procesando ||
                              inputNumeroAsignar.length !== 4 ||
                              !asignarVendedor
                            }
                            className={btnSecundario}
                          >
                            {agregandoAlCarrito ? 'Comprobando…' : 'Agregar'}
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-slate-500">
                          Siempre <strong>4 cifras</strong> (0009, no solo 9). Enter agrega al carrito si
                          está libre.
                        </p>
                        {errorInputAsignar && (
                          <p className="mt-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                            {errorInputAsignar}
                          </p>
                        )}
                        {!asignarVendedor && (
                          <p className="mt-2 text-xs text-amber-700">
                            Elige un vendedor arriba para poder agregar números.
                          </p>
                        )}
                      </div>

                      <div className="rounded-xl border border-slate-200/90 bg-slate-50/60 p-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">
                            Carrito ({carritoAsignar.length})
                          </p>
                          {carritoAsignar.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setCarritoAsignar([])}
                              className="text-[11px] font-medium text-slate-500 hover:text-red-600"
                            >
                              Vaciar carrito
                            </button>
                          )}
                        </div>
                        {carritoAsignar.length === 0 ? (
                          <p className="text-xs text-slate-400 py-2">
                            Aún no hay boletas. Agrega números con Enter.
                          </p>
                        ) : (
                          <ul className="flex flex-wrap gap-2">
                            {carritoAsignar.map((item) => (
                              <li
                                key={item.numero_solicitado}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50/90 pl-2.5 pr-1 py-1 text-xs"
                              >
                                <span className="font-bold tabular-nums text-emerald-900">
                                  {item.par || `#${formatNumero(item.numero_solicitado)}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => quitarDelCarrito(item.numero_solicitado)}
                                  className="w-6 h-6 rounded-md text-slate-500 hover:bg-white hover:text-red-600 font-bold leading-none"
                                  aria-label={`Quitar ${formatNumero(item.numero_solicitado)}`}
                                >
                                  ×
                                </button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {modoAsignar === 'serie' ? (
                  <p className="text-xs text-slate-500 mt-3">
                    Completa las series que quieras en un solo paso. Si pides más de las libres en
                    alguna serie, se asignan solo las que queden disponibles.
                  </p>
                ) : (
                  <p className="text-xs text-slate-500 mt-1">
                    Cuando el carrito tenga las boletas que quieras, pulsa <strong>Asignar</strong>.
                  </p>
                )}

                <div className="mt-4 flex flex-wrap gap-2 items-center">
                  <button
                    onClick={confirmarAsignar}
                    disabled={
                      procesando ||
                      !asignarVendedor ||
                      (modoAsignar === 'serie' && totalPedidoSeries === 0) ||
                      (modoAsignar === 'numeros' && carritoAsignar.length === 0)
                    }
                    className={btnPrimario}
                  >
                    {procesando
                      ? 'Procesando...'
                      : modoAsignar === 'serie'
                        ? `Asignar${totalPedidoSeries > 0 ? ` (${totalPedidoSeries})` : ''}`
                        : `Asignar${carritoAsignar.length > 0 ? ` (${carritoAsignar.length})` : ''}`}
                  </button>
                </div>
                </div>

                <div className="rounded-2xl border border-slate-200/80 bg-white p-4 sm:p-5 shadow-sm">
                  <h3 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-800 mb-1">
                    Devolver al pool de administración
                  </h3>
                  <p className="text-xs text-slate-500 mb-3">
                    Quita boletas del inventario de un vendedor. La comprobación indica de quién salen
                    y si se pueden liberar.
                  </p>
                  <div className="flex flex-col gap-2">
                    <div>
                      <label className={labelBase} htmlFor="quitar">
                        Números a liberar
                      </label>
                      <input
                        id="quitar"
                        type="text"
                        value={quitarNumeros}
                        onChange={(e) => setQuitarNumeros(e.target.value)}
                        placeholder="0123, 4335"
                        className={inputBase}
                        autoComplete="off"
                      />
                      <VerificacionNumerosPanel
                        titulo="Comprobación para liberar"
                        cargando={verificandoQuitar}
                        items={previewQuitar?.items ?? null}
                        resumen={previewQuitar?.resumen ?? null}
                        modo="QUITAR"
                        errorParseo={quitarNumeros.trim() ? parseQuitar.error : null}
                      />
                    </div>
                    <div>
                      <button
                        onClick={confirmarQuitarNumeros}
                        disabled={
                          procesando ||
                          (!!previewQuitar &&
                            numerosLiberablesPreview.length === 0 &&
                            parseQuitar.numeros.length > 0)
                        }
                        className={btnPeligro}
                      >
                        {previewQuitar
                          ? `Quitar al pool (${numerosLiberablesPreview.length})`
                          : 'Quitar al pool'}
                      </button>
                    </div>
                  </div>
                </div>

                <details className="rounded-2xl border border-slate-200/80 bg-white shadow-sm group">
                  <summary className="cursor-pointer list-none px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-slate-600">
                    Herramientas avanzadas
                  </summary>
                  <div className="px-4 pb-4 pt-0 border-t border-slate-100 flex flex-wrap items-center gap-3">
                    <button onClick={confirmarSembrar} disabled={procesando} className={btnSecundario}>
                      Registrar ventas existentes
                    </button>
                    <span className="text-xs text-slate-500">
                      Registra en inventario las boletas ya vendidas (solo lectura histórica).
                    </span>
                  </div>
                </details>
              </section>
            )}

            <section>
              <h2 className="text-sm font-bold uppercase tracking-[0.14em] text-slate-700 mb-2">
                Vendedores
              </h2>
              <p className="text-xs text-slate-500 mb-3">
                Un vendedor recién creado aparece aquí con 0 boletas hasta que le asignes stock.
              </p>
              {resumen.boletas_sin_vendedor > 0 && (
                <p className="text-xs text-slate-500 mb-2">
                  Hay {resumen.boletas_sin_vendedor} boleta(s) con venta pero sin vendedor
                  identificable.
                </p>
              )}

              <div className="overflow-x-auto rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900 text-white">
                    <tr>
                      {[
                        'Vendedor',
                        'Estado',
                        'Tope máx.',
                        'Asignadas',
                        'Libres',
                        'Bloqueadas',
                        'Reservadas',
                        'Abonadas',
                        'Pagadas',
                        '',
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-3 py-2 text-left text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {soloVendedores.length === 0 && (
                      <tr>
                        <td colSpan={10} className="px-3 py-6 text-center text-slate-400">
                          No hay vendedores registrados. Créalos en Equipo.
                        </td>
                      </tr>
                    )}
                    {soloVendedores.map((v) => (
                      <tr key={v.id} className="border-t border-slate-100 align-top hover:bg-slate-50/80">
                        <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                          {v.nombre}
                        </td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">
                          {!v.activo ? (
                            <span className="text-slate-400">Inactivo</span>
                          ) : v.asignadas_total === 0 ? (
                            <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-semibold uppercase text-amber-800">
                              Sin asignar
                            </span>
                          ) : (
                            <span className="text-emerald-700">Con inventario</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5">
                          {puedeGestionar ? (
                            <div className="flex items-center gap-1 min-w-[7rem]">
                              <input
                                type="number"
                                min={0}
                                className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg"
                                placeholder="—"
                                value={
                                  topeDraft[v.id] ??
                                  (v.max_boletas_inventario != null
                                    ? String(v.max_boletas_inventario)
                                    : '')
                                }
                                onChange={(e) =>
                                  setTopeDraft((prev) => ({ ...prev, [v.id]: e.target.value }))
                                }
                                title="Máximo de boletas en inventario en este proyecto. Preasignación: 10% por serie."
                              />
                              <button
                                type="button"
                                disabled={guardandoTope === v.id}
                                onClick={() => guardarTopeVendedor(v)}
                                className="text-[10px] font-semibold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                              >
                                {guardandoTope === v.id ? '…' : 'OK'}
                              </button>
                            </div>
                          ) : (
                            <span className="tabular-nums text-slate-600">
                              {v.max_boletas_inventario ?? '—'}
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums text-slate-600">
                          {v.asignadas_total}
                          {v.max_boletas_inventario != null && (
                            <span className="text-slate-400">/{v.max_boletas_inventario}</span>
                          )}
                        </td>
                        <td className="px-3 py-2.5 font-bold tabular-nums">{v.asignadas_libres}</td>
                        <td className="px-3 py-2">{v.asignadas_bloqueadas}</td>
                        <td className="px-3 py-2">{v.reservadas}</td>
                        <td className="px-3 py-2">{v.abonadas}</td>
                        <td className="px-3 py-2">{v.pagadas}</td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex gap-2">
                            <button onClick={() => abrirDetalle(v.id)} className={btnSecundario}>
                              {vendedorAbierto === v.id ? 'Cerrar' : 'Ver'}
                            </button>
                            {puedeGestionar && v.asignadas_libres > 0 && (
                              <button
                                onClick={() => confirmarVaciarVendedor(v)}
                                disabled={procesando}
                                className={btnPeligro}
                              >
                                Vaciar
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {vendedorAbierto && (
                <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                  {!detalle ? (
                    <div className="flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-slate-500">Cargando detalle...</span>
                    </div>
                  ) : (
                    <>
                      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
                        <div>
                          <h3 className="text-base font-semibold text-slate-900">
                            {detalle.vendedor.nombre}
                          </h3>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {detalle.total} en inventario
                            {buscarDetalle.trim() && (
                              <>
                                {' '}
                                · {boletasDetalleFiltradas.length} coinciden con la búsqueda
                              </>
                            )}
                          </p>
                        </div>
                        <div className="w-full sm:max-w-xs">
                          <label className={labelBase} htmlFor="buscar-boleta">
                            Buscar número
                          </label>
                          <input
                            id="buscar-boleta"
                            type="search"
                            value={buscarDetalle}
                            onChange={(e) => setBuscarDetalle(e.target.value)}
                            placeholder="Ej. 485, 0485, 0984"
                            className={inputBase}
                          />
                        </div>
                      </div>

                      {detalle.rangos.length > 0 && (
                        <div className="mb-4">
                          <button
                            type="button"
                            onClick={() => setMostrarRangos((v) => !v)}
                            className="text-[10px] font-bold uppercase tracking-[0.14em] text-indigo-600 hover:text-indigo-800"
                          >
                            {mostrarRangos ? 'Ocultar' : 'Ver'} rangos ({detalle.rangos.length})
                          </button>
                          {mostrarRangos && (
                            <div className="flex flex-wrap gap-2 mt-2 max-h-24 overflow-y-auto">
                              {detalle.rangos.map((r) => (
                                <span
                                  key={`${r.desde}-${r.hasta}`}
                                  className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-xs font-semibold"
                                >
                                  {r.desde === r.hasta
                                    ? `#${formatNumero(r.desde)}`
                                    : `#${formatNumero(r.desde)}-#${formatNumero(r.hasta)}`}{' '}
                                  <span className="text-slate-400">({r.cantidad})</span>
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      <div className="max-h-[min(420px,55vh)] overflow-y-auto rounded-xl border border-slate-200/80">
                        <table className="w-full text-xs">
                          <thead className="bg-slate-100 sticky top-0 z-10">
                            <tr>
                              {[
                                'Boleta',
                                'Serie',
                                'Estado',
                                'Cliente',
                                ...(puedeGestionar ? ['Acciones'] : []),
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-2 py-2 text-left font-bold uppercase tracking-[0.1em] text-[10px] whitespace-nowrap"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {boletasDetalleFiltradas.map((b) => {
                              const gestionable = puedeGestionarBoleta(b)
                              const destino = destinoPorBoleta[b.boleta_id] || ''
                              return (
                                <tr
                                  key={b.boleta_id}
                                  className="border-t border-slate-100 hover:bg-slate-50/90"
                                >
                                  <td className="px-2 py-2 font-semibold tabular-nums text-slate-900">
                                    {b.numeros.map(formatNumero).join(' / ')}
                                  </td>
                                  <td className="px-2 py-2">{b.serie ?? '—'}</td>
                                  <td className="px-2 py-2">
                                    <span
                                      className={
                                        b.estado === 'DISPONIBLE'
                                          ? 'text-emerald-700'
                                          : 'text-slate-600'
                                      }
                                    >
                                      {b.estado}
                                    </span>
                                    {b.bloqueada && (
                                      <span className="ml-1 text-[10px] text-amber-700">
                                        bloqueada
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-2 py-2 max-w-[120px] truncate">
                                    {b.cliente_nombre || '—'}
                                  </td>
                                  {puedeGestionar && (
                                    <td className="px-2 py-2">
                                      {gestionable ? (
                                        <div className="flex flex-col gap-1.5 min-w-[140px]">
                                          <button
                                            type="button"
                                            disabled={procesando}
                                            onClick={() =>
                                              confirmarLiberarBoleta(b, detalle.vendedor.nombre)
                                            }
                                            className="text-left text-[11px] font-medium text-slate-700 hover:text-indigo-700 underline-offset-2 hover:underline disabled:opacity-50"
                                          >
                                            Al pool admin
                                          </button>
                                          <div className="flex gap-1 items-center">
                                            <select
                                              value={destino}
                                              disabled={procesando || otrosVendedoresDetalle.length === 0}
                                              onChange={(e) =>
                                                setDestinoPorBoleta((prev) => ({
                                                  ...prev,
                                                  [b.boleta_id]: e.target.value,
                                                }))
                                              }
                                              className="flex-1 min-w-0 px-1.5 py-1 border border-slate-200 rounded-lg text-[11px] bg-white"
                                            >
                                              <option value="">A vendedor…</option>
                                              {otrosVendedoresDetalle.map((v) => (
                                                <option key={v.id} value={v.id}>
                                                  {v.nombre}
                                                </option>
                                              ))}
                                            </select>
                                            <button
                                              type="button"
                                              disabled={procesando || !destino}
                                              onClick={() =>
                                                confirmarTransferirBoleta(
                                                  b,
                                                  destino,
                                                  detalle.vendedor.nombre
                                                )
                                              }
                                              className="shrink-0 px-2 py-1 rounded-lg bg-indigo-600 text-white text-[10px] font-semibold hover:bg-indigo-700 disabled:opacity-40"
                                              title="Transferir"
                                            >
                                              →
                                            </button>
                                          </div>
                                        </div>
                                      ) : (
                                        <span className="text-[10px] text-slate-400">
                                          Sin acciones
                                        </span>
                                      )}
                                    </td>
                                  )}
                                </tr>
                              )
                            })}
                            {detalle.boletas.length === 0 && (
                              <tr>
                                <td
                                  colSpan={puedeGestionar ? 5 : 4}
                                  className="px-2 py-6 text-center text-slate-400"
                                >
                                  Sin boletas asignadas.
                                </td>
                              </tr>
                            )}
                            {detalle.boletas.length > 0 && boletasDetalleFiltradas.length === 0 && (
                              <tr>
                                <td
                                  colSpan={puedeGestionar ? 5 : 4}
                                  className="px-2 py-6 text-center text-slate-400"
                                >
                                  Ninguna boleta coincide con &quot;{buscarDetalle.trim()}&quot;.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </>
                  )}
                </div>
              )}
            </section>
          </>
        )}
      </div>

      <ConfirmDialog
        isOpen={Boolean(confirm)}
        title={confirm?.title || ''}
        message={confirm?.message || ''}
        type={confirm?.type || 'warning'}
        confirmText={confirm?.confirmText}
        onConfirm={() => confirm?.onConfirm()}
        onCancel={() => setConfirm(null)}
      />

      <AsignacionResumenModal
        data={resumenAsignacion}
        onClose={() => setResumenAsignacion(null)}
      />
    </div>
  )
}
