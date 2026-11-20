'use client'

import { useState, useMemo, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { Boleta } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'
import { getStorageImageUrl } from '@/lib/storageImageUrl'
import { boletaApi } from '@/lib/boletaApi'
import { ventasApi } from '@/lib/ventasApi'
import type { BoletaBusquedaExterna } from '@/lib/boletaConsultaBusqueda'
import BoletaConsultaExternaPanel from '@/components/boletas/BoletaConsultaExternaPanel'
import BoletaNotaEditorModal from '@/components/boletas/BoletaNotaEditorModal'
import {
  clearVentasNuevaDraft,
  saveVentasPrefillBoletaIds,
} from '@/lib/ventasNuevaDraft'
import { downloadBoletaFromElement } from '@/utils/downloadBoletaImage'
import {
  BOLETA_BADGE_STYLES,
  BOLETA_BODY_TEXT,
  BOLETA_CLIENTE_CIUDAD_STYLE,
  BOLETA_CLIENTE_NOMBRE_STYLE,
  BOLETA_BONO_HTML,
  BOLETA_LEFT_STYLE,
  BOLETA_NUMERO_STYLE,
  BOLETA_PRECIO_STYLE,
  BOLETA_RULES_HTML,
  BOLETA_TICKET_STYLE,
} from '@/constants/boletaTheme'
import {
  BOLETA_WIDTH,
  BOLETA_LEFT_WIDTH,
  BOLETA_RIGHT_WIDTH,
  BOLETA_DEFAULT_HEIGHT,
  boletaHeightForImage,
} from '@/constants/boletaDimensions'
import { formatBoletaNumeros, normalizeNumeros, getPrincipalGift, sanitizeBoletaSearchDigits } from '@/utils/formatBoletaNumeros'
import { boletaEstaBloqueadaSinCliente, getBoletaEstadoMenuInfo } from '@/utils/boletaEstadoMenu'
import { ventasPublicasApi } from '@/lib/ventasPublicasApi'
import BoletaOpcionesMenu from '@/components/boletas/BoletaOpcionesMenu'
import BoletaFiltroStatCard from '@/components/boletas/BoletaFiltroStatCard'
import {
  BOLETA_SEARCH_TABS,
  type BoletaSearchMode,
  boletaMatchesSearchMode,
  scoreBoletaNombreMatch,
} from '@/utils/boletaSearch'

interface BoletaListProps {
  boletas: Boleta[]
  loading: boolean
  rifaInfo?: Rifa | null
  onRefreshBoletas?: () => void | Promise<void>
  /** Vendedor sin red: solo consulta, sin detalle ni acciones. */
  offlineMode?: boolean
}

/** DISPONIBLE en BD pero con venta_id = dato inconsistente; no se puede volver a vender. */
function boletaDisponibleParaVenta(boleta: Boleta): boolean {
  const estadoRaw = boleta.estado?.toString().trim().toUpperCase() || ''
  if (estadoRaw !== 'DISPONIBLE') return false
  if (boleta.venta_id) return false
  if (boleta.bloqueo_hasta && new Date(boleta.bloqueo_hasta) > new Date()) return false
  return true
}

export default function BoletaList({
  boletas,
  loading,
  rifaInfo,
  onRefreshBoletas,
  offlineMode = false,
}: BoletaListProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [searchMode, setSearchMode] = useState<BoletaSearchMode>('boleta')
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(20)
  const [filtroEstado, setFiltroEstado] = useState<string | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [downloading, setDownloading] = useState(false)
  const [iniciandoVenta, setIniciandoVenta] = useState(false)
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0 })
  const [editingNotaId, setEditingNotaId] = useState<string | null>(null)
  const [notaTemp, setNotaTemp] = useState('')
  const [savingNota, setSavingNota] = useState(false)
  const [notasLocales, setNotasLocales] = useState<Record<string, string | null>>({})
  const [vistaModo, setVistaModo] = useState<'tabla' | 'grilla'>('tabla')
  const [menuBoleta, setMenuBoleta] = useState<Boleta | null>(null)
  const [menuAnchorEl, setMenuAnchorEl] = useState<HTMLElement | null>(null)
  const [isDesktop, setIsDesktop] = useState(false)
  const [userRole, setUserRole] = useState<string | null>(null)
  const [consultaExterna, setConsultaExterna] = useState<BoletaBusquedaExterna | null>(null)
  const [consultaExternaLoading, setConsultaExternaLoading] = useState(false)
  const [consultaExternaNotFound, setConsultaExternaNotFound] = useState(false)
  const [desbloqueandoId, setDesbloqueandoId] = useState<string | null>(null)
  const router = useRouter()
  const esDoble = Boolean(rifaInfo?.doble_oportunidad)

  useEffect(() => {
    try {
      const raw = localStorage.getItem('user')
      if (!raw) return
      const user = JSON.parse(raw) as { rol?: string }
      setUserRole(String(user.rol || '').toUpperCase())
    } catch {
      setUserRole(null)
    }
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const sync = () => setIsDesktop(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  const openMenu = (boleta: Boleta, anchor: HTMLElement | null) => {
    setMenuAnchorEl(anchor)
    setMenuBoleta(boleta)
  }

  const closeMenu = () => {
    setMenuBoleta(null)
    setMenuAnchorEl(null)
  }

  const handleDesbloquearBoleta = useCallback(
    async (boleta: Boleta) => {
      if (desbloqueandoId) return
      setDesbloqueandoId(boleta.id)
      try {
        let token = boleta.reserva_token?.trim() || ''
        if (!token) {
          const detail = await boletaApi.getBoletaById(boleta.id)
          token = detail.data?.reserva_token?.trim() || ''
        }
        if (token) {
          await ventasApi.desbloquearBoletaDelCarrito(boleta.id, token)
        } else if (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN') {
          await ventasPublicasApi.liberarBoleta(boleta.id)
        } else {
          window.alert(
            'No se pudo desbloquear: no tienes el token de reserva. Libera la boleta desde ventas o contacta al administrador.'
          )
          return
        }
        await onRefreshBoletas?.()
      } catch (e) {
        window.alert(e instanceof Error ? e.message : 'No se pudo desbloquear la boleta')
      } finally {
        setDesbloqueandoId(null)
      }
    },
    [desbloqueandoId, onRefreshBoletas, userRole]
  )

  const renderBotonDesbloquear = (boleta: Boleta, compact = false) => {
    if (offlineMode) return null
    if (!boletaEstaBloqueadaSinCliente(boleta)) return null
    const busy = desbloqueandoId === boleta.id
    return (
      <button
        type="button"
        disabled={Boolean(desbloqueandoId)}
        onClick={() => handleDesbloquearBoleta(boleta)}
        className={
          compact
            ? 'shrink-0 min-h-[32px] px-2 py-1 text-[10px] font-bold rounded-lg border border-amber-500 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50'
            : 'inline-flex items-center min-h-[28px] px-2.5 py-1 text-[11px] font-bold rounded-lg border border-amber-500 text-amber-900 bg-amber-50 hover:bg-amber-100 disabled:opacity-50'
        }
        title="Quitar bloqueo temporal y dejar disponible"
      >
        {busy ? '…' : 'Desbloquear'}
      </button>
    )
  }

  const renderAccionesBoleta = (boleta: Boleta, compact = false) => {
    if (offlineMode) return null
    const btnClass = compact
      ? 'p-2.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 active:bg-slate-200'
      : 'text-slate-600 hover:text-blue-600 transition-colors p-1.5 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-lg hover:bg-slate-100'

    return (
      <div className={`flex items-center shrink-0 ${compact ? 'gap-0.5' : 'gap-1 justify-end'}`}>
        <button
          type="button"
          onClick={() => router.push(`/boletas/${boleta.id}`)}
          className={btnClass}
          title="Ver detalle"
          aria-label={`Ver boleta ${formatBoletaNumeros(boleta.numeros, boleta.numero)}`}
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
        </button>
        <button
          type="button"
          onClick={(e) => openMenu(boleta, e.currentTarget)}
          className={btnClass}
          title="Más opciones"
          aria-label={`Opciones boleta ${formatBoletaNumeros(boleta.numeros, boleta.numero)}`}
          aria-haspopup="dialog"
        >
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24" aria-hidden>
            <circle cx="12" cy="5" r="1.75" />
            <circle cx="12" cy="12" r="1.75" />
            <circle cx="12" cy="19" r="1.75" />
          </svg>
        </button>
      </div>
    )
  }

  // Determina label y clases del estado según la boleta
  const getEstadoInfo = getBoletaEstadoMenuInfo

  // Cálculos para las Cards (Heurística: Visibilidad del estado del sistema)
  const stats = useMemo(() => {
    return boletas.reduce(
      (acc, boleta) => {
        const estadoRaw = boleta.estado?.toString().trim().toUpperCase() || ''
        if (boletaDisponibleParaVenta(boleta)) acc.disponibles++
        else if (estadoRaw === 'PAGADA' || estadoRaw === 'CON_PAGO') acc.vendidas++
        else if (boletaEstaBloqueadaSinCliente(boleta)) acc.bloqueadas++
        else if (estadoRaw === 'RESERVADA' && boleta.cliente_info) acc.reservadas++
        else if (estadoRaw === 'ABONADA') acc.abonadas++
        return acc
      },
      { disponibles: 0, vendidas: 0, reservadas: 0, abonadas: 0, bloqueadas: 0 }
    )
  }, [boletas])

  // Filtros y Paginación
  const filteredBoletas = useMemo(() => {
    let result = boletas

    // Filtro por estado (click en tarjeta)
    if (filtroEstado) {
      result = result.filter(boleta => {
        const estadoRaw = boleta.estado?.toString().trim().toUpperCase() || ''
        if (filtroEstado === 'DISPONIBLE') return boletaDisponibleParaVenta(boleta)
        if (filtroEstado === 'VENDIDAS') return estadoRaw === 'PAGADA' || estadoRaw === 'CON_PAGO'
        if (filtroEstado === 'RESERVADAS') return estadoRaw === 'RESERVADA' && boleta.cliente_info
        if (filtroEstado === 'ABONADAS') return estadoRaw === 'ABONADA'
        if (filtroEstado === 'BLOQUEADAS') return boletaEstaBloqueadaSinCliente(boleta)
        return true
      })
    }

    // Filtro por búsqueda: nombre, cédula o número (sin mezclar mal)
    if (searchTerm.trim()) {
      result = result.filter((boleta) => boletaMatchesSearchMode(boleta, searchTerm, searchMode))

      if (searchMode === 'nombre') {
        result = [...result].sort((a, b) => {
          const sa = scoreBoletaNombreMatch(a, searchTerm)
          const sb = scoreBoletaNombreMatch(b, searchTerm)
          if (sa !== sb) return sa - sb
          return a.numero - b.numero
        })
      }
    }

    return result
  }, [boletas, searchTerm, searchMode, filtroEstado])

  const searchNumeroParsed = useMemo(() => {
    if (searchMode !== 'boleta' || !searchTerm.trim()) return null
    const digits = sanitizeBoletaSearchDigits(searchTerm.trim())
    if (!digits) return null
    const n = parseInt(digits.replace(/^0+/, '') || digits, 10)
    return Number.isFinite(n) && n >= 0 ? n : null
  }, [searchMode, searchTerm])

  const showConsultaExterna =
    !offlineMode &&
    userRole === 'VENDEDOR' &&
    searchMode === 'boleta' &&
    searchNumeroParsed != null &&
    filteredBoletas.length === 0 &&
    Boolean(searchTerm.trim())

  useEffect(() => {
    if (!showConsultaExterna || !rifaInfo?.id) {
      setConsultaExterna(null)
      setConsultaExternaNotFound(false)
      setConsultaExternaLoading(false)
      return
    }

    let cancelled = false
    const timer = window.setTimeout(async () => {
      setConsultaExternaLoading(true)
      setConsultaExternaNotFound(false)
      setConsultaExterna(null)
      try {
        const res = await ventasApi.buscarBoletaPorNumero(rifaInfo.id, searchNumeroParsed!)
        if (cancelled) return
        if (res.data) {
          setConsultaExterna(res.data as BoletaBusquedaExterna)
          setConsultaExternaNotFound(false)
        } else {
          setConsultaExterna(null)
          setConsultaExternaNotFound(true)
        }
      } catch (err: unknown) {
        if (cancelled) return
        const status = (err as { response?: { status?: number } })?.response?.status
        if (status === 404) {
          setConsultaExterna(null)
          setConsultaExternaNotFound(true)
        } else {
          setConsultaExterna(null)
          setConsultaExternaNotFound(false)
        }
      } finally {
        if (!cancelled) setConsultaExternaLoading(false)
      }
    }, 350)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [showConsultaExterna, rifaInfo?.id, searchNumeroParsed])

  const paginatedBoletas = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage
    return filteredBoletas.slice(startIndex, startIndex + itemsPerPage)
  }, [filteredBoletas, currentPage, itemsPerPage])

  const totalPages = Math.ceil(filteredBoletas.length / itemsPerPage)
  const startIndex = filteredBoletas.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1
  const endIndex = Math.min(currentPage * itemsPerPage, filteredBoletas.length)

  const handlePageChange = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  const formatBoletaNumber = (numero: number) => numero.toString().padStart(4, '0')

  const colorCeldaNumero = (estadoRaw: string) => {
    const e = (estadoRaw || '').toUpperCase()
    if (e === 'DISPONIBLE') return 'bg-emerald-300 text-black hover:ring-2 hover:ring-emerald-600'
    if (e === 'RESERVADA') return 'bg-blue-500 text-white hover:ring-2 hover:ring-blue-700'
    if (e === 'ABONADA') return 'bg-orange-400 text-black hover:ring-2 hover:ring-orange-600'
    if (e === 'PAGADA' || e === 'CON_PAGO') return 'bg-green-700 text-white hover:ring-2 hover:ring-green-900'
    if (e === 'ANULADA' || e === 'CANCELADA') return 'bg-red-600 text-white hover:ring-2 hover:ring-red-800'
    return 'bg-slate-200 text-slate-700'
  }

  /** Celdas de grilla: un item por cada número del pool (hereda estado de la boleta) */
  const celdasNumeros = useMemo(() => {
    if (!esDoble) return []
    const cells: Array<{
      numero: number
      boletaId: string
      estado: string
      par: number[]
      cliente?: string | null
    }> = []
    for (const b of filteredBoletas) {
      const nums = normalizeNumeros(b.numeros, b.numero)
      for (const n of nums) {
        cells.push({
          numero: n,
          boletaId: b.id,
          estado: b.estado || 'DISPONIBLE',
          par: nums,
          cliente: b.cliente_info?.nombre || null,
        })
      }
    }
    cells.sort((a, b) => a.numero - b.numero)
    return cells
  }, [filteredBoletas, esDoble])

  // --- Selección ---
  const toggleSelect = useCallback((id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const toggleSelectAll = useCallback(() => {
    if (selectedIds.size === filteredBoletas.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredBoletas.map(b => b.id)))
    }
  }, [filteredBoletas, selectedIds.size])

  const allFilteredSelected = filteredBoletas.length > 0 && selectedIds.size === filteredBoletas.length

  const selectedBoletas = useMemo(() => {
    return boletas
      .filter((b) => selectedIds.has(b.id))
      .sort((a, b) => a.numero - b.numero)
  }, [boletas, selectedIds])

  const todasSeleccionadasDisponibles = useMemo(() => {
    if (selectedBoletas.length === 0) return false
    return selectedBoletas.every((b) => boletaDisponibleParaVenta(b))
  }, [selectedBoletas])

  const puedeVenderSeleccion =
    filtroEstado === 'DISPONIBLE' &&
    todasSeleccionadasDisponibles &&
    selectedBoletas.length > 0 &&
    Boolean(rifaInfo?.id)

  const quitarSeleccion = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.delete(id)
      return next
    })
  }, [])

  const handleVenderSeleccionadas = useCallback(() => {
    if (!puedeVenderSeleccion || !rifaInfo?.id) return
    setIniciandoVenta(true)
    try {
      clearVentasNuevaDraft()
      saveVentasPrefillBoletaIds(
        rifaInfo.id,
        selectedBoletas.map((b) => b.id)
      )
      router.push(
        `/ventas/nueva-venta?auto=1&rifa_id=${encodeURIComponent(rifaInfo.id)}&source=boletas-list`
      )
    } finally {
      setIniciandoVenta(false)
    }
  }, [puedeVenderSeleccion, rifaInfo?.id, router, selectedBoletas])

  // --- Helpers para descarga ---
  const imageToDataUrl = async (src: string): Promise<string | null> => {
    // Método 1: fetch + blob (más confiable que Image + crossOrigin)
    try {
      console.log('[Descarga] Cargando imagen via fetch:', src)
      const resp = await fetch(src, { mode: 'cors' })
      if (resp.ok) {
        const blob = await resp.blob()
        return await new Promise<string>((resolve) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result as string)
          reader.readAsDataURL(blob)
        })
      }
    } catch (e) {
      console.warn('[Descarga] fetch falló, intentando con Image:', e)
    }

    // Método 2: Image + canvas (fallback)
    return new Promise((resolve) => {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        try {
          const c = document.createElement('canvas')
          c.width = img.naturalWidth
          c.height = img.naturalHeight
          const ctx = c.getContext('2d')
          if (ctx) {
            ctx.drawImage(img, 0, 0)
            resolve(c.toDataURL('image/jpeg', 0.92))
          } else resolve(null)
        } catch { resolve(null) }
      }
      img.onerror = () => { console.warn('[Descarga] Image.onerror'); resolve(null) }
      img.src = src
      setTimeout(() => { console.warn('[Descarga] Image timeout'); resolve(null) }, 15000)
    })
  }

  // --- Descarga masiva ---
  const handleBulkDownload = useCallback(async () => {
    if (selectedIds.size === 0) return
    setDownloading(true)
    const boletasToDownload = boletas.filter(b => selectedIds.has(b.id))
    setDownloadProgress({ current: 0, total: boletasToDownload.length })

    try {
      // 1) Resolver la URL de imagen (desde boleta o rifa)
      const imagenRifaFallback = getStorageImageUrl(rifaInfo?.imagen_url ?? null) ?? rifaInfo?.imagen_url ?? null
      const primeraBoletaImg = boletasToDownload[0]?.imagen_url
      const imagenSrc = getStorageImageUrl(primeraBoletaImg ?? null) ?? primeraBoletaImg ?? imagenRifaFallback

      console.log('[Descarga] rifaInfo.imagen_url:', rifaInfo?.imagen_url)
      console.log('[Descarga] primera boleta imagen_url:', primeraBoletaImg)
      console.log('[Descarga] imagenSrc resuelta:', imagenSrc)

      // 2) Convertir imagen a data URL (base64) UNA SOLA VEZ — elimina CORS y red
      let imagenDataUrl: string | null = null
      if (imagenSrc) {
        imagenDataUrl = await imageToDataUrl(imagenSrc)
        console.log('[Descarga] imagenDataUrl:', imagenDataUrl ? `OK (${imagenDataUrl.substring(0, 50)}...)` : 'FALLÓ - null')
      } else {
        console.warn('[Descarga] No hay URL de imagen para las boletas')
      }

      let ticketHeight = BOLETA_DEFAULT_HEIGHT
      if (imagenDataUrl) {
        ticketHeight = await new Promise<number>((resolve) => {
          const img = new Image()
          img.onload = () =>
            resolve(boletaHeightForImage(img.naturalWidth, img.naturalHeight))
          img.onerror = () => resolve(BOLETA_DEFAULT_HEIGHT)
          img.src = imagenDataUrl
        })
      }

      // 3) Crear contenedor reutilizable fuera del viewport
      const container = document.createElement('div')
      container.style.cssText = 'position:fixed;top:-2000px;left:0;width:900px;pointer-events:none;'
      document.body.appendChild(container)

      // 4) Pre-cargar datos financieros de boletas ABONADAS seleccionadas
      const financieroMap: Record<string, { precio_boleta: number; total_pagado: number; saldo_pendiente: number }> = {}
      const abonosMap: Record<string, { monto: number; fecha: string; estado?: string }[]> = {}
      const boletasConDetalle = boletasToDownload.filter((b) => {
        const e = (b.estado ?? '').toString().trim().toUpperCase()
        return e === 'ABONADA' || e === 'PAGADA' || e === 'CON_PAGO' || e === 'VENDIDA'
      })
      if (boletasConDetalle.length > 0) {
        const detalles = await Promise.all(
          boletasConDetalle.map((b) =>
            boletaApi
              .getBoletaById(b.id)
              .then((r) => ({
                id: b.id,
                financiero: r.data.boleta_financiero,
                abonos: r.data.abonos ?? [],
              }))
              .catch(() => null)
          )
        )
        detalles.forEach((d) => {
          if (!d) return
          if (d.financiero) financieroMap[d.id] = d.financiero
          if (d.abonos?.length) abonosMap[d.id] = d.abonos
        })
      }

      for (let i = 0; i < boletasToDownload.length; i++) {
        const boleta = boletasToDownload[i]
        setDownloadProgress({ current: i + 1, total: boletasToDownload.length })

        const estadoNorm = (boleta.estado ?? '').toString().trim().toUpperCase()
        const tieneCliente = Boolean(boleta.cliente_info && (boleta.cliente_info.nombre || boleta.cliente_info.identificacion))
        const precioNum = rifaInfo?.precio_boleta ? Number(rifaInfo.precio_boleta) : null

        const reservadaHastaFmt = boleta.bloqueo_hasta ? (() => {
          try {
            const dt = new Date(boleta.bloqueo_hasta)
            if (isNaN(dt.getTime())) return boleta.bloqueo_hasta
            return dt.toLocaleString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
          } catch { return boleta.bloqueo_hasta }
        })() : null

        const esReservada = estadoNorm === 'RESERVADA'
        const esCancelada = estadoNorm === 'ANULADA' || estadoNorm === 'CANCELADA'
        const pagadoWords = ['CON_PAGO', 'PAGADA', 'PAGADO', 'VENDIDA']
        const esPagada = pagadoWords.includes(estadoNorm) && tieneCliente
        const fin = financieroMap[boleta.id]
        const saldoFin = fin ? fin.saldo_pendiente : null
        const esAbonada =
          estadoNorm === 'ABONADA' ||
          (tieneCliente && typeof saldoFin === 'number' && saldoFin > 0 && !esPagada)
        const bonoCancelado =
          tieneCliente &&
          (pagadoWords.includes(estadoNorm) ||
            (typeof saldoFin === 'number' && saldoFin <= 0 && !esReservada && !esAbonada && !esCancelada))

        let estadoHTML = ''
        const ciudadCliente =
          (boleta.cliente_info?.direccion ?? '').trim() || '—'
        const bloqueCliente = () =>
          `<div style="${BOLETA_BODY_TEXT}"><p style="margin:0">A nombre de:</p><p style="${BOLETA_CLIENTE_NOMBRE_STYLE}">${boleta.cliente_info?.nombre ?? '—'}</p><p style="${BOLETA_CLIENTE_CIUDAD_STYLE}">${ciudadCliente}</p></div>`

        if (esCancelada) {
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.cancelada}">BOLETA CANCELADA</div><p style="${BOLETA_BODY_TEXT};font-weight:700;">Esta boleta no tiene validez</p>`
        } else if (esReservada && tieneCliente) {
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.reservada}">RESERVADA</div>${bloqueCliente()}`
        } else if (esReservada && !tieneCliente) {
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.bloqueada}">BLOQUEADA</div><p style="${BOLETA_BODY_TEXT}">Boleta bloqueada momentáneamente</p>`
        } else if (esPagada) {
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.pagada}">PAGADA</div>${bloqueCliente()}`
        } else if (esAbonada) {
          const saldo = fin ? fin.saldo_pendiente : (precioNum ? precioNum : 0)
          let totalAb = fin?.total_pagado ?? 0
          if (!totalAb && abonosMap[boleta.id]?.length) {
            totalAb = abonosMap[boleta.id]
              .filter((a) => (a.estado ?? '').toString().toUpperCase() !== 'ANULADO')
              .reduce((s, a) => s + (Number(a.monto) || 0), 0)
          }
          const abonoLine =
            totalAb > 0
              ? `<p style="${BOLETA_BODY_TEXT};font-weight:700;color:#15803d;margin:0 0 4px">Abonó: $${totalAb.toLocaleString('es-CO')}</p>`
              : ''
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.abonada}">ABONADA</div><p style="${BOLETA_BODY_TEXT};font-weight:700;color:#b45309;margin:0 0 4px">Deuda: $${saldo.toLocaleString('es-CO')}</p>${abonoLine}${bloqueCliente()}`
        } else {
          estadoHTML = `<div style="${BOLETA_BADGE_STYLES.disponible}">DISPONIBLE</div>`
        }
        void reservadaHastaFmt

        const qrSrc = boleta.qr_url || ''
        const { principal, gift, ordered } = getPrincipalGift(
          boleta.numeros,
          boleta.numero,
          (boleta as any).numero_principal
        )
        const numsLabel =
          gift != null
            ? `Principal #${String(principal).padStart(4, '0')} · Regalo #${String(gift).padStart(4, '0')}`
            : `Principal #${String(principal ?? boleta.numero).padStart(4, '0')}`
        const numsHtml = `<div style="${BOLETA_NUMERO_STYLE}">#${String(principal ?? 0).padStart(4, '0')}</div>${
          gift != null
            ? `<div style="font-size:11px;font-weight:700;color:#333;margin-top:2px;text-align:center;">+ #${String(gift).padStart(4, '0')}</div>`
            : ''
        }`
        void ordered
        void numsLabel

        const rightContent = imagenDataUrl
          ? `<img src="${imagenDataUrl}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
          : `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#f5f5f5;text-align:center;color:#111;"><div><p style="font-weight:700">${rifaInfo?.nombre || 'Proyecto'}</p><p>#${String(principal ?? boleta.numero).padStart(4, '0')}</p></div></div>`

        container.innerHTML = `
          <div class="boleta-ticket boleta-ticket--oficial" style="${BOLETA_TICKET_STYLE}width:${BOLETA_WIDTH}px;height:${ticketHeight}px;">
            <div style="${BOLETA_LEFT_STYLE}width:${BOLETA_LEFT_WIDTH}px;height:${ticketHeight}px;">
              ${BOLETA_RULES_HTML}
              ${estadoHTML}
              <div style="display:flex;justify-content:center;width:100%;">
                <img src="${qrSrc}" style="width:72px;height:72px;padding:3px;background:#fff;border:1px solid #111;" alt="QR" />
              </div>
              ${(() => { const n = getNotaBoleta(boleta); return n ? `<p style="${BOLETA_BODY_TEXT};font-size:10px;font-weight:700;margin:2px 0 4px;">${n}</p>` : ''; })()}
              ${numsHtml}
              ${precioNum ? `<div style="${BOLETA_PRECIO_STYLE}">$${precioNum.toLocaleString('es-CO')}</div>` : ''}
            </div>
            <div style="flex-shrink:0;position:relative;overflow:hidden;height:${ticketHeight}px;width:${BOLETA_RIGHT_WIDTH}px;">
              ${rightContent}
              ${BOLETA_BONO_HTML(principal ?? boleta.numero, gift, bonoCancelado, ticketHeight, esAbonada, abonosMap[boleta.id])}
            </div>
          </div>
        `

        // Esperar mínimo a que QR cargue (imagen de rifa ya es data URL, instantánea)
        const qrImg = container.querySelector('img[alt="QR"]') as HTMLImageElement | null
        if (qrImg && !qrImg.complete) {
          await new Promise<void>(resolve => {
            qrImg.onload = () => resolve()
            qrImg.onerror = () => resolve()
            setTimeout(resolve, 3000)
          })
        }

        const ticketEl = container.querySelector('.boleta-ticket') as HTMLElement
        if (ticketEl) {
          const num = boleta.numero.toString().padStart(4, '0')
          const cc = boleta.cliente_info?.identificacion
            ? boleta.cliente_info.identificacion.replace(/\s+/g, '_')
            : 'SIN_CC'

          await downloadBoletaFromElement(
            ticketEl,
            `boleta_${num}_CC_${cc}.png`
          )
        }

        // Espera corta entre descargas (solo para no saturar el navegador)
        if (i < boletasToDownload.length - 1) {
          await new Promise(r => setTimeout(r, 300))
        }
      }

      container.remove()
    } catch (err) {
      console.error('Error en descarga masiva:', err)
    } finally {
      setDownloading(false)
      setDownloadProgress({ current: 0, total: 0 })
    }
  }, [selectedIds, boletas, rifaInfo])

  // --- Nota ---
  const getNotaBoleta = (boleta: Boleta): string | null => {
    if (boleta.id in notasLocales) return notasLocales[boleta.id]
    return boleta.nota ?? null
  }

  const handleEditNota = (boleta: Boleta) => {
    setEditingNotaId(boleta.id)
    setNotaTemp(getNotaBoleta(boleta) || '')
  }

  const handleSaveNota = async (boletaId: string) => {
    setSavingNota(true)
    try {
      const notaValue = notaTemp.trim() || null
      await boletaApi.updateBoletaNota(boletaId, notaValue)
      setNotasLocales(prev => ({ ...prev, [boletaId]: notaValue }))
      setEditingNotaId(null)
    } catch (err) {
      console.error('Error guardando nota:', err)
      alert('Error al guardar la nota')
    } finally {
      setSavingNota(false)
    }
  }

  const handleCancelNota = () => {
    setEditingNotaId(null)
    setNotaTemp('')
  }

  const editingBoleta = useMemo(
    () => (editingNotaId ? boletas.find((b) => b.id === editingNotaId) ?? null : null),
    [editingNotaId, boletas]
  )

  const editingBoletaLabel = editingBoleta
    ? `Boleta #${formatBoletaNumeros(editingBoleta.numeros, editingBoleta.numero)}`
    : undefined

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-slate-900 mb-4"></div>
        <div className="ml-4 text-slate-600 font-medium text-lg">Cargando la información del proyecto...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header y Botón Principal CTA
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestión de Boletas</h1>
          <p className="text-slate-500 text-sm mt-1">Administra los estados y clientes de la proyecto actual.</p>
        </div>
        <button 
          onClick={() => router.push('/boletas/crear')} // Ajusta tu ruta aquí
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl shadow-md hover:shadow-lg transform transition-all active:scale-95 font-semibold flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Crear Boletas
        </button>
      </div> */}

      {/* Cards de Resumen - Clickeables como Filtros */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2 sm:gap-3 min-w-0">
        <BoletaFiltroStatCard
          label="Disponibles"
          count={stats.disponibles}
          active={filtroEstado === 'DISPONIBLE'}
          accent="emerald"
          onClick={() => {
            setFiltroEstado(filtroEstado === 'DISPONIBLE' ? null : 'DISPONIBLE')
            setCurrentPage(1)
          }}
        />
        <BoletaFiltroStatCard
          label="Vendidas"
          count={stats.vendidas}
          active={filtroEstado === 'VENDIDAS'}
          accent="green"
          onClick={() => {
            setFiltroEstado(filtroEstado === 'VENDIDAS' ? null : 'VENDIDAS')
            setCurrentPage(1)
          }}
        />
        <BoletaFiltroStatCard
          label="Reservadas"
          count={stats.reservadas}
          active={filtroEstado === 'RESERVADAS'}
          accent="blue"
          onClick={() => {
            setFiltroEstado(filtroEstado === 'RESERVADAS' ? null : 'RESERVADAS')
            setCurrentPage(1)
          }}
        />
        <BoletaFiltroStatCard
          label="Abonadas"
          count={stats.abonadas}
          active={filtroEstado === 'ABONADAS'}
          accent="orange"
          onClick={() => {
            setFiltroEstado(filtroEstado === 'ABONADAS' ? null : 'ABONADAS')
            setCurrentPage(1)
          }}
        />
        <BoletaFiltroStatCard
          label="Bloqueadas"
          count={stats.bloqueadas}
          active={filtroEstado === 'BLOQUEADAS'}
          accent="amber"
          onClick={() => {
            setFiltroEstado(filtroEstado === 'BLOQUEADAS' ? null : 'BLOQUEADAS')
            setCurrentPage(1)
          }}
        />
      </div>

      {/* Buscador y Controles */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-slate-500 mb-2">Buscar boletas</p>
        <div
          className="flex gap-1 p-1 mb-3 bg-slate-100 rounded-xl overflow-x-auto snap-x snap-mandatory [-webkit-overflow-scrolling:touch]"
          role="tablist"
          aria-label="Tipo de búsqueda"
        >
          {BOLETA_SEARCH_TABS.map((tab) => {
            const active = searchMode === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => {
                  setSearchMode(tab.id)
                  setSearchTerm('')
                  setCurrentPage(1)
                }}
                className={`flex-1 min-w-[4.5rem] snap-start min-h-[44px] px-3 py-2 rounded-lg text-sm font-bold transition-colors touch-manipulation ${
                  active ? 'bg-white text-indigo-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
        <div className="flex flex-col lg:flex-row gap-3 sm:gap-4 justify-between items-stretch lg:items-center">
          <div className="w-full lg:w-2/3">
            <div className="relative flex-1 min-w-0">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-slate-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" /></svg>
              </div>
              <input
                type="search"
                inputMode={BOLETA_SEARCH_TABS.find((t) => t.id === searchMode)?.inputMode as 'text' | 'numeric' | 'tel' | undefined}
                placeholder={BOLETA_SEARCH_TABS.find((t) => t.id === searchMode)?.placeholder}
                value={searchTerm}
                onChange={(e) => {
                  let v = e.target.value
                  if (searchMode === 'boleta') {
                    v = sanitizeBoletaSearchDigits(v)
                  } else if (searchMode === 'cedula' || searchMode === 'telefono') {
                    v = v.replace(/[^\d\s+\-()]/g, '')
                  }
                  setSearchTerm(v)
                  setCurrentPage(1)
                }}
                className="w-full pl-10 pr-4 py-3 min-h-[48px] border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none transition-shadow text-black bg-white placeholder:text-slate-500 text-base"
                autoComplete="off"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 w-full lg:w-auto">
            {esDoble && (
              <div className="flex rounded-lg border border-slate-300 overflow-hidden">
                <button
                  type="button"
                  onClick={() => setVistaModo('tabla')}
                  className={`px-3 py-2 text-sm font-medium ${vistaModo === 'tabla' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                >
                  Lista
                </button>
                <button
                  type="button"
                  onClick={() => setVistaModo('grilla')}
                  className={`px-3 py-2 text-sm font-medium ${vistaModo === 'grilla' ? 'bg-slate-900 text-white' : 'bg-white text-slate-700'}`}
                >
                  Grilla
                </button>
              </div>
            )}
            {vistaModo === 'tabla' && (
              <>
            <label htmlFor="itemsPerPage" className="text-sm font-medium text-slate-600">Mostrar:</label>
            <select
              id="itemsPerPage"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-3 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 outline-none text-black bg-white"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Resumen de Resultados */}
      <div className="flex flex-wrap justify-between items-center gap-3 px-1">
        <div className="text-sm text-slate-600">
          <span className="font-semibold text-slate-900">{startIndex}</span>
          {' – '}
          <span className="font-semibold text-slate-900">{endIndex}</span>
          {' de '}
          <span className="font-semibold text-slate-900">{filteredBoletas.length}</span>
          {filteredBoletas.length !== boletas.length && (
            <span className="ml-1 text-slate-500 hidden sm:inline">(filtradas de {boletas.length})</span>
          )}
        </div>
        {vistaModo === 'tabla' && (
          <div className="flex items-center gap-2 lg:hidden text-sm text-slate-600">
            <label htmlFor="itemsPerPageMobile" className="font-medium whitespace-nowrap">
              Mostrar:
            </label>
            <select
              id="itemsPerPageMobile"
              value={itemsPerPage}
              onChange={(e) => {
                setItemsPerPage(Number(e.target.value))
                setCurrentPage(1)
              }}
              className="px-2 py-1.5 min-h-[40px] border border-slate-300 rounded-lg text-slate-900 bg-white text-sm"
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
        )}
        {(searchTerm || filtroEstado) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('')
              setFiltroEstado(null)
              setCurrentPage(1)
            }}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium underline-offset-2 hover:underline min-h-[44px] px-2"
          >
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Barra de acciones de selección */}
      {!offlineMode && selectedIds.size > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-sm font-semibold text-blue-800">
              {selectedIds.size} boleta{selectedIds.size !== 1 ? 's' : ''} seleccionada
              {selectedIds.size !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setSelectedIds(new Set())}
              className="text-xs text-blue-600 hover:text-blue-800 underline min-h-[44px] px-1"
            >
              Deseleccionar todo
            </button>
          </div>
          <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto pr-1">
            {selectedBoletas.map((boleta) => {
              const numeroFmt = formatBoletaNumeros(boleta.numeros, boleta.numero)
              return (
                <span
                  key={boleta.id}
                  className="inline-flex items-center gap-1 pl-2.5 pr-1 py-1 rounded-lg bg-white border border-blue-200 text-sm font-mono font-semibold text-slate-800 shadow-sm"
                >
                  #{numeroFmt}
                  <button
                    type="button"
                    onClick={() => quitarSeleccion(boleta.id)}
                    className="p-1.5 min-h-[32px] min-w-[32px] rounded-md text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
                    aria-label={`Quitar boleta ${numeroFmt} de la selección`}
                    title="Quitar de la selección"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </span>
              )
            })}
          </div>
          <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center justify-end gap-2 pt-1">
            {puedeVenderSeleccion && (
              <button
                type="button"
                onClick={handleVenderSeleccionadas}
                disabled={iniciandoVenta || downloading}
                className="px-5 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm order-first sm:order-none"
              >
                {iniciandoVenta ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    Abriendo venta…
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"
                      />
                    </svg>
                    Vender ({selectedIds.size})
                  </>
                )}
              </button>
            )}
            <button
              type="button"
              onClick={handleBulkDownload}
              disabled={downloading || iniciandoVenta}
              className="px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {downloading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                  Descargando {downloadProgress.current}/{downloadProgress.total}...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                    />
                  </svg>
                  Descargar ({selectedIds.size})
                </>
              )}
            </button>
          </div>
          {filtroEstado !== 'DISPONIBLE' && selectedIds.size > 0 && (
            <p className="text-xs text-blue-700/90">
              Para vender varias a la vez, usa el filtro <strong>Disponibles</strong> y selecciona solo boletas
              disponibles.
            </p>
          )}
          {filtroEstado === 'DISPONIBLE' && selectedIds.size > 0 && !todasSeleccionadasDisponibles && (
            <p className="text-xs text-amber-800">
              Quita de la selección cualquier boleta que ya no esté disponible para habilitar <strong>Vender</strong>.
            </p>
          )}
        </div>
      )}

      {showConsultaExterna && (
        <BoletaConsultaExternaPanel
          loading={consultaExternaLoading}
          notFound={consultaExternaNotFound}
          numeroBuscado={searchNumeroParsed}
          data={consultaExterna}
        />
      )}

      {/* Grilla de números (doble oportunidad) */}
      {esDoble && vistaModo === 'grilla' && (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 space-y-4">
          <div className="flex flex-wrap gap-3 text-xs font-semibold">
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-300" /> Disponible</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-blue-500" /> Reservado</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-orange-400" /> Abonado</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-green-700" /> Pagado</span>
            <span className="inline-flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-600" /> Anulado</span>
            <span className="text-slate-500 ml-auto">{celdasNumeros.length} números</span>
          </div>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(44px,1fr))] gap-1 max-h-[70vh] overflow-y-auto p-1">
            {celdasNumeros.map((cell) => (
              <button
                key={`${cell.boletaId}-${cell.numero}`}
                type="button"
                title={`${formatBoletaNumeros(cell.par)} · ${cell.estado}${cell.cliente ? ` · ${cell.cliente}` : ''}`}
                onClick={() => router.push(`/boletas/${cell.boletaId}`)}
                className={`h-9 text-[10px] font-mono font-bold rounded transition-transform active:scale-95 ${colorCeldaNumero(cell.estado)}`}
              >
                {String(cell.numero).padStart(4, '0')}
              </button>
            ))}
          </div>
          {celdasNumeros.length === 0 && (
            <p className="text-center text-slate-500 py-12">No hay números para mostrar con los filtros actuales.</p>
          )}
        </div>
      )}

      {/* Lista compacta (móvil / tablet) */}
      {(!esDoble || vistaModo === 'tabla') && (
        <div className="lg:hidden bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          {paginatedBoletas.length === 0 ? (
            <div className="px-4 py-14 text-center text-slate-500 text-sm">
              {showConsultaExterna && (consultaExternaLoading || consultaExterna || consultaExternaNotFound)
                ? null
                : searchTerm
                  ? 'No hay resultados para tu búsqueda.'
                  : 'Aún no hay boletas en este proyecto.'}
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {paginatedBoletas.map((boleta) => {
                const estado = getEstadoInfo(boleta)
                const asignado =
                  boleta.cliente_info?.nombre ||
                  boleta.inventario_info?.nombre ||
                  'Sin asignar'
                const numeroFmt = formatBoletaNumeros(boleta.numeros, boleta.numero)
                return (
                  <li key={boleta.id} className="flex items-center gap-2 px-2 sm:px-3 py-2.5 min-h-[60px]">
                    {!offlineMode && (
                      <input
                        type="checkbox"
                        checked={selectedIds.has(boleta.id)}
                        onChange={() => toggleSelect(boleta.id)}
                        className="w-4 h-4 shrink-0 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        aria-label={`Seleccionar boleta ${numeroFmt}`}
                      />
                    )}
                    <div className="flex-1 min-w-0 pr-1">
                      <p className="font-mono font-bold text-slate-900 text-sm leading-tight truncate">
                        #{numeroFmt}
                      </p>
                      <p className="text-xs text-slate-500 truncate italic mt-0.5">{asignado}</p>
                    </div>
                    <span className="shrink-0 flex items-center gap-1">
                      <span
                        className={`max-w-[88px] text-center inline-flex px-2 py-1 text-[10px] sm:text-xs font-bold rounded-full leading-tight ${estado.classes}`}
                      >
                        {estado.label}
                      </span>
                      {renderBotonDesbloquear(boleta, true)}
                    </span>
                    {renderAccionesBoleta(boleta, true)}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}

      {/* Tabla de Boletas (escritorio) */}
      {(!esDoble || vistaModo === 'tabla') && (
      <div className="hidden lg:block bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50/80 border-b border-slate-200">
              <tr>
                {!offlineMode && (
                  <th className="px-4 py-4 text-center">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      title="Seleccionar todas"
                    />
                  </th>
                )}
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Número</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Estado</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Contacto</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">ID / Cédula</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Asignada a</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Vendedor</th>
                <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nota</th>
                {/* <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">QR</th> */}
                {!offlineMode && (
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">
                    Acciones
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedBoletas.length === 0 ? (
                <tr>
                  <td colSpan={offlineMode ? 9 : 11} className="px-6 py-16 text-center text-slate-500">
                    {showConsultaExterna && (consultaExternaLoading || consultaExterna || consultaExternaNotFound) ? (
                      <span className="sr-only">Consulta de boleta en curso o mostrada arriba</span>
                    ) : (
                      <div className="flex flex-col items-center justify-center">
                        <svg className="w-12 h-12 text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                        <p className="text-base">{searchTerm ? 'No hay resultados para tu búsqueda.' : 'Aún no hay boletas en este proyecto.'}</p>
                      </div>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedBoletas.map((boleta) => {
                  const estado = getEstadoInfo(boleta)
                  return (
                    <tr key={boleta.id} className="hover:bg-slate-50/80 transition-colors group">
                      {!offlineMode && (
                        <td className="px-4 py-4 text-center">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(boleta.id)}
                            onChange={() => toggleSelect(boleta.id)}
                            className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                      )}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2 py-1 rounded inline-block">
                          {formatBoletaNumeros(boleta.numeros, boleta.numero)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex flex-wrap items-center gap-1.5">
                          <span className={`inline-flex px-3 py-1 text-xs font-bold rounded-full ${estado.classes}`}>
                            {estado.label}
                          </span>
                          {renderBotonDesbloquear(boleta, false)}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm font-medium text-slate-900">{boleta.cliente_info?.nombre || <span className="text-slate-400 italic">Sin asignar</span>}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">{boleta.cliente_info?.telefono || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">{boleta.cliente_info?.identificacion || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {boleta.inventario_info?.nombre ? (
                          <div>
                            <div className="text-sm font-medium text-indigo-900">
                              {boleta.inventario_info.nombre}
                            </div>
                            {boleta.inventario_info.serie != null && (
                              <div className="text-[10px] text-indigo-600/80 font-semibold uppercase tracking-wide">
                                Serie {boleta.inventario_info.serie}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-slate-400 italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-slate-600">{boleta.vendedor_info?.nombre || '-'}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-start gap-1 group/nota">
                          {getNotaBoleta(boleta) ? (
                            <span className="text-xs text-slate-600 italic max-w-[150px] truncate" title={getNotaBoleta(boleta) || ''}>
                              {getNotaBoleta(boleta)}
                            </span>
                          ) : (
                            <span className="text-xs text-slate-300 italic">—</span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleEditNota(boleta)}
                            className="text-slate-400 hover:text-blue-500 transition-colors p-1 min-h-[32px] min-w-[32px] opacity-100 lg:opacity-0 lg:group-hover/nota:opacity-100"
                            title="Editar nota"
                            aria-label="Editar nota"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                          </button>
                        </div>
                      </td>
                      {/* <td className="px-6 py-4 whitespace-nowrap text-center">
                        {boleta.qr_url ? (
                          <button onClick={() => window.open(boleta.qr_url || '', '_blank')} className="text-blue-600 hover:text-blue-800 text-xs font-semibold inline-flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 transition-colors">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
                            Ver QR
                          </button>
                        ) : (
                          <span className="text-slate-400 text-xs italic">N/A</span>
                        )}
                      </td> */}
                      {!offlineMode && (
                        <td className="px-4 py-4 whitespace-nowrap text-right">
                          {renderAccionesBoleta(boleta, false)}
                        </td>
                      )}
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
      )}

      {/* Paginación Mejorada */}
      {(!esDoble || vistaModo === 'tabla') && totalPages > 1 && (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 py-4">
          <div className="text-sm text-slate-500">
            Página <span className="font-semibold text-slate-900">{currentPage}</span> de <span className="font-semibold text-slate-900">{totalPages}</span>
          </div>
          <div className="flex items-center space-x-1 bg-white border border-slate-200 p-1 rounded-lg shadow-sm">
            <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 transition-colors">Anterior</button>
            <div className="hidden sm:flex items-center px-2">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage <= 3 ? i + 1 : currentPage >= totalPages - 2 ? totalPages - 4 + i : currentPage - 2 + i
                if (totalPages <= 5) pageNum = i + 1
                return (
                  <button key={pageNum} onClick={() => handlePageChange(pageNum)} className={`w-8 h-8 mx-0.5 text-sm font-medium rounded-md flex items-center justify-center transition-colors ${currentPage === pageNum ? 'bg-blue-600 text-white shadow' : 'text-slate-600 hover:bg-slate-100'}`}>
                    {pageNum}
                  </button>
                )
              })}
            </div>
            <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages} className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent text-slate-700 transition-colors">Siguiente</button>
          </div>
        </div>
      )}

      <BoletaNotaEditorModal
        open={editingNotaId != null}
        boletaLabel={editingBoletaLabel}
        value={notaTemp}
        onChange={setNotaTemp}
        onSave={() => editingNotaId && void handleSaveNota(editingNotaId)}
        onCancel={handleCancelNota}
        saving={savingNota}
      />

      {menuBoleta && !offlineMode && (
        <BoletaOpcionesMenu
          open
          onClose={closeMenu}
          boleta={menuBoleta}
          rifaInfo={rifaInfo}
          estadoInfo={getEstadoInfo(menuBoleta)}
          onVerDetalle={() => router.push(`/boletas/${menuBoleta.id}`)}
          onImprimir={() =>
            router.push(`/boletas/${menuBoleta.id}/print?foto=1`)
          }
          onEditarNota={() => handleEditNota(menuBoleta)}
          rifaId={rifaInfo?.id ?? null}
          onIrAVender={(href) => router.push(href)}
          onIrAAbonar={(href) => router.push(href)}
          mode={isDesktop ? 'popover' : 'sheet'}
          anchorEl={menuAnchorEl}
        />
      )}

    </div>
  )
}