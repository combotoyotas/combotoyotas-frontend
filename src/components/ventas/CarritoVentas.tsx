'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Link from 'next/link'
import { ventasApi } from '@/lib/ventasApi'
import { BoletaEnCarrito, Cliente, VentaRequest } from '@/types/ventas'
import BoletaTicket from '@/components/BoletaTicket'
import ResponsiveBoletaWrapper from '@/components/ResponsiveBoletaWrapper'
import DialogoReserva from './DialogoReserva'
import ReciboAbono, { ReciboAbonoData } from './ReciboAbono'
import { formatearInputPesos, parsearInputPesos } from '@/utils/formatPesos'
import { generarWhatsAppChatLink } from '@/utils/telefono'
import { WHATSAPP_VENTAS_ACTIVO } from '@/config/features'
import BoletaEntregaAcciones from '@/components/ventas/BoletaEntregaAcciones'
import { guardarBoletaEnDispositivo, nombreArchivoBoleta } from '@/utils/ventasBoletaEntrega'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import PrincipalGiftLabel from '@/components/ventas/PrincipalGiftLabel'
import { ajustesApi, type LineaVentaItem, type MedioPagoItem } from '@/lib/ajustesApi'
import { TokenManager } from '@/utils/auth'
import VentasMobileActionBar, { type VentasMobileAction } from '@/components/ventas/VentasMobileActionBar'
import VentasCenteredOverlay from '@/components/ventas/VentasCenteredOverlay'

const MEDIOS_PAGO_MAP: Record<string, string> = {
  'd397d917-c0d0-4c61-b2b3-2ebfab7deeb7': 'Efectivo',
  'af6e15fc-c52c-4491-abe1-20243af301c4': 'Nequi',
  'db94562d-bb01-42a3-9414-6e369a1a70ba': 'PSE',
  daviplata: 'Daviplata',
  nequi: 'Nequi',
  efectivo: 'Efectivo',
  pse: 'PSE',
  transferencia: 'PSE',
  '57a2f560-b3d7-4fa8-91cf-24e6b2a6d7ff': 'Tarjeta Crédito',
}

interface CarritoVentasProps {
  boletas: BoletaEnCarrito[]
  cliente: Cliente
  precioBoleta: number
  rifaId: string
  rifaNombre?: string
  fechaSorteo?: string | null
  onBoletaRemovida: (boletaId: string) => void
  onVentaCompletada: () => void
}

export default function CarritoVentas({ 
  boletas, 
  cliente, 
  precioBoleta, 
  rifaId,
  rifaNombre,
  fechaSorteo,
  onBoletaRemovida,
  onVentaCompletada
}: CarritoVentasProps) {
  const [medioPagoId, setMedioPagoId] = useState<string>('')
  const [notas, setNotas] = useState('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paso, setPaso] = useState<'resumen' | 'procesando' | 'completado' | 'error'>('resumen')
  
  // Estados para abonos parciales
  const [tipoVenta, setTipoVenta] = useState<'COMPLETA' | 'ABONO' | 'RESERVA' | null>(null)
  const [abonosPorBoleta, setAbonosPorBoleta] = useState<Record<string, number>>({})
  const [ventaResponse, setVentaResponse] = useState<any>(null)
  const [mostrarDialogoReserva, setMostrarDialogoReserva] = useState(false)
  const [reciboData, setReciboData] = useState<ReciboAbonoData | null>(null)
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false)
  const [mediosPago, setMediosPago] = useState<MedioPagoItem[]>([])
  const [lineasVenta, setLineasVenta] = useState<LineaVentaItem[]>([])
  const [lineaVentaId, setLineaVentaId] = useState('')
  const [esVendedor, setEsVendedor] = useState(false)
  const [requiereLinea, setRequiereLinea] = useState(false)

  useEffect(() => {
    const user = TokenManager.getUser()
    const rol = String(user?.rol || '').toUpperCase()
    setEsVendedor(rol === 'VENDEDOR')
    const needLinea = rol === 'VENDEDOR' || rol === 'ADMIN' || rol === 'SUPER_ADMIN'
    setRequiereLinea(needLinea)
    ajustesApi
      .mediosParaVentas()
      .then((m) => {
        setMediosPago(m)
        setMedioPagoId((prev) => (prev && m.some((x) => x.id === prev) ? prev : m[0]?.id || ''))
      })
      .catch(() => setMediosPago([]))
    if (needLinea) {
      ajustesApi
        .lineasParaVentas()
        .then((l) => {
          setLineasVenta(l)
          if (l.length === 1) setLineaVentaId(l[0].id)
        })
        .catch(() => setLineasVenta([]))
    }
  }, [])

  const labelMedio = (id: string) =>
    mediosPago.find((m) => m.id === id)?.nombre || MEDIOS_PAGO_MAP[id] || id

  // Calcular totales
  const subtotal = boletas.length * precioBoleta
  const total = subtotal
  const montoAbono = tipoVenta === 'ABONO' ? Object.values(abonosPorBoleta).reduce((sum, v) => sum + (v || 0), 0) : 0
  const saldoPendiente = tipoVenta === 'ABONO' ? total - montoAbono : 0
  const tipoVentaSeleccionado = tipoVenta !== null

  const reservaDeshabilitada =
    procesando ||
    boletas.length === 0 ||
    !cliente.nombre ||
    !cliente.telefono ||
    (requiereLinea && (!lineaVentaId || lineasVenta.length === 0))

  const cobrarDeshabilitado =
    !tipoVentaSeleccionado ||
    procesando ||
    boletas.length === 0 ||
    !cliente.nombre ||
    !cliente.telefono ||
    !medioPagoId ||
    (tipoVenta === 'ABONO' && montoAbono <= 0) ||
    (requiereLinea && (!lineaVentaId || lineasVenta.length === 0)) ||
    (esVendedor && mediosPago.length === 0)

  const etiquetaCobrar = procesando
    ? 'Procesando...'
    : !tipoVentaSeleccionado
      ? 'Elige tipo de operación'
      : !medioPagoId
        ? 'Elige método de pago'
        : tipoVenta === 'ABONO'
          ? `Cobrar abono $${montoAbono.toLocaleString('es-CO')}`
          : `Cobrar $${total.toLocaleString('es-CO')}`

  const accionesMobileCobro: VentasMobileAction[] =
    paso !== 'resumen' || boletas.length === 0
      ? []
      : tipoVenta === 'RESERVA'
        ? [
            {
              id: 'reserva',
              label: procesando ? 'Procesando...' : '📌 Crear reserva',
              onClick: () => setMostrarDialogoReserva(true),
              disabled: reservaDeshabilitada,
              variant: 'danger',
            },
          ]
        : [
            {
              id: 'cobrar',
              label: etiquetaCobrar,
              onClick: () => setMostrarConfirmacion(true),
              disabled: cobrarDeshabilitado,
              variant: tipoVenta === 'ABONO' ? 'warning' : 'success',
            },
          ]

  // Helpers para abono por boleta
  const setAbonoBoleta = (boletaId: string, monto: number) => {
    setAbonosPorBoleta(prev => ({ ...prev, [boletaId]: Math.max(0, Math.min(monto, precioBoleta)) }))
  }

  const aplicarPorcentajeATodas = (porcentaje: number) => {
    const montoIndividual = Math.floor(precioBoleta * porcentaje)
    const nuevo: Record<string, number> = {}
    boletas.forEach(b => { nuevo[b.id] = montoIndividual })
    setAbonosPorBoleta(nuevo)
  }

  // Remover boleta del carrito
  const removerBoleta = async (boleta: BoletaEnCarrito) => {
    try {
      await ventasApi.desbloquearBoletaDelCarrito(boleta.id, boleta.reserva_token)
      onBoletaRemovida(boleta.id)
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Error al remover boleta del carrito'
      setError(msg)
    }
  }

  // Procesar venta
  const procesarVenta = async () => {
    if (!cliente?.nombre || !cliente?.telefono) {
      setError('Complete la información del cliente')
      return
    }

    if (boletas.length === 0) {
      setError('Seleccione al menos una boleta')
      return
    }

    if (tipoVenta !== 'RESERVA' && !medioPagoId) {
      setError('Seleccione un método de pago')
      return
    }

    if (esVendedor && tipoVenta !== 'RESERVA' && mediosPago.length === 0) {
      setError('Configura al menos un medio de pago en Ajustes')
      return
    }

    if (requiereLinea && tipoVenta !== null) {
      if (lineasVenta.length === 0) {
        setError(
          esVendedor
            ? 'Configura al menos una línea de venta en Ajustes'
            : 'El super admin debe crear líneas de venta globales en Ajustes'
        )
        return
      }
      if (!lineaVentaId) {
        setError('Selecciona la línea de venta (canal)')
        return
      }
    }

    // Validaciones para abonos
    if (tipoVenta === 'ABONO') {
      if (montoAbono <= 0) {
        setError('Debes abonar al menos a una boleta')
        return
      }
      if (montoAbono >= total) {
        setError('Para pago completo, seleccione "Venta Completa"')
        return
      }
      // Validar que ningún abono exceda el precio de la boleta
      for (const boleta of boletas) {
        const abonoIndividual = abonosPorBoleta[boleta.id] || 0
        if (abonoIndividual > precioBoleta) {
          setError(`El abono de boleta #${boleta.numero.toString().padStart(4, '0')} no puede exceder $${precioBoleta.toLocaleString('es-CO')}`)
          return
        }
      }
    }

    setProcesando(true)
    setError(null)
    setPaso('procesando')

    try {
      const ventaData: VentaRequest = {
        rifa_id: rifaId,
        cliente: {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email,
          direccion: cliente.direccion,
          identificacion: cliente.identificacion
        },
        boletas: boletas.map(b => ({
          id: b.id,
          reserva_token: b.reserva_token,
          numero_principal: b.numero_principal ?? b.numero,
        })),
        medio_pago_id: medioPagoId,
        total_venta: total,
        total_pagado: tipoVenta === 'ABONO' ? montoAbono : total,
        notas: notas || undefined,
        ...(lineaVentaId ? { linea_venta_id: lineaVentaId } : {}),
        ...(tipoVenta === 'ABONO' ? {
          abonos_por_boleta: boletas
            .filter(b => (abonosPorBoleta[b.id] || 0) > 0)
            .map(b => ({
              boleta_id: b.id,
              monto: abonosPorBoleta[b.id]
            }))
        } : {})
      }

      const response = await ventasApi.crearVenta(ventaData)
      setVentaResponse(response.data)
      
      // Generar datos para recibo
      const boletasResp = response.data?.boletas ?? []
      const mpLabel = labelMedio(medioPagoId)
      const pagadoHoy = tipoVenta === 'ABONO' ? montoAbono : total
      setReciboData({
        tipo: tipoVenta === 'ABONO' ? 'venta_abono' : 'venta_nueva',
        montoRegistrado: pagadoHoy,
        totalVenta: total,
        totalPagado: pagadoHoy,
        saldoPendiente: tipoVenta === 'ABONO' ? saldoPendiente : 0,
        clienteNombre: cliente.nombre,
        clienteTelefono: cliente.telefono,
        clienteEmail: cliente.email,
        clienteIdentificacion: cliente.identificacion,
        rifaNombre: rifaNombre,
        metodoPago: mpLabel,
        notas: notas || undefined,
        ventaId: response.data?.id,
        boletas: boletasResp.map((b: any) => {
          const abonoBoleta = tipoVenta === 'ABONO' ? (abonosPorBoleta[b.id] || 0) : precioBoleta
          const saldoB = precioBoleta - abonoBoleta
          const local = boletas.find((x) => x.id === b.id)
          return {
            numero: b.numero,
            numeros: Array.isArray(b.numeros) ? b.numeros.map(Number) : [Number(b.numero)],
            numero_principal: b.numero_principal ?? local?.numero_principal ?? b.numero,
            estado: abonoBoleta >= precioBoleta ? 'PAGADA' : abonoBoleta > 0 ? 'ABONADA' : 'PENDIENTE',
            precioBoleta: precioBoleta,
            totalPagado: abonoBoleta,
            saldoPendiente: saldoB > 0 ? saldoB : 0
          }
        })
      })
      
      // Éxito - se queda en la vista de completado hasta que el usuario pulse un botón
      setPaso('completado')
    } catch (error: any) {
      console.error('Error procesando venta:', error)
      setError(error.message || 'Error procesando la venta')
      setPaso('error')
    } finally {
      setProcesando(false)
    }
  }

  // Liberar todos los bloqueos en caso de cancelación
  const liberarBloqueos = async () => {
    // Intentar liberar cada boleta individualmente (silenciar errores)
    for (const b of boletas) {
      try {
        await ventasApi.desbloquearBoletaDelCarrito(b.id, b.reserva_token)
      } catch {
        /* token viejo o ya liberada */
      }
    }
  }

  // Cancelar venta
  const cancelarVenta = async () => {
    await liberarBloqueos()
    onBoletaRemovida('all')
  }

  // Formatear tiempo restante
  const tiempoRestante = (boleta: BoletaEnCarrito) => {
    const ahora = new Date()
    const expiracion = new Date(boleta.bloqueo_hasta)
    const diff = expiracion.getTime() - ahora.getTime()
    
    if (diff <= 0) return 'Expirado'
    
    const minutos = Math.floor(diff / (1000 * 60))
    const segundos = Math.floor((diff % (1000 * 60)) / 1000)
    
    return `${minutos}:${segundos.toString().padStart(2, '0')}`
  }

  const construirReciboDesdeVenta = useCallback((): ReciboAbonoData | null => {
    if (!ventaResponse) return null
    const boletasResp = ventaResponse.boletas ?? []
    const mpLabel = labelMedio(medioPagoId)
    const pagadoHoy = tipoVenta === 'ABONO' ? montoAbono : total
    return {
      tipo: tipoVenta === 'ABONO' ? 'venta_abono' : 'venta_nueva',
      montoRegistrado: pagadoHoy,
      totalVenta: total,
      totalPagado: pagadoHoy,
      saldoPendiente: tipoVenta === 'ABONO' ? saldoPendiente : 0,
      clienteNombre: cliente.nombre,
      clienteTelefono: cliente.telefono,
      clienteEmail: cliente.email,
      clienteIdentificacion: cliente.identificacion,
      rifaNombre: rifaNombre,
      metodoPago: mpLabel,
      notas: notas || undefined,
      ventaId: ventaResponse.id,
      boletas: boletasResp.map((b: { id: string; numero: number; numeros?: number[] }) => {
        const abonoBoleta = tipoVenta === 'ABONO' ? abonosPorBoleta[b.id] || 0 : precioBoleta
        const saldoB = precioBoleta - abonoBoleta
        const local = boletas.find((x) => x.id === b.id)
        return {
          numero: b.numero,
          numeros: Array.isArray(b.numeros) ? b.numeros.map(Number) : [Number(b.numero)],
          numero_principal: (b as { numero_principal?: number }).numero_principal ?? local?.numero_principal ?? b.numero,
          estado: abonoBoleta >= precioBoleta ? 'PAGADA' : abonoBoleta > 0 ? 'ABONADA' : 'PENDIENTE',
          precioBoleta: precioBoleta,
          totalPagado: abonoBoleta,
          saldoPendiente: saldoB > 0 ? saldoB : 0,
        }
      }),
    }
  }, [
    ventaResponse,
    medioPagoId,
    tipoVenta,
    montoAbono,
    total,
    saldoPendiente,
    cliente,
    rifaNombre,
    notas,
    precioBoleta,
    abonosPorBoleta,
    boletas,
    labelMedio,
  ])

  const accionesMobileCompletado: VentasMobileAction[] = [
    {
      id: 'nueva-venta',
      label: 'Nueva venta',
      onClick: onVentaCompletada,
      variant: 'primary',
    },
  ]

  const descargarTodas = useCallback(async () => {
    const boletasData = ventaResponse?.boletas ?? []
    const identificacion = cliente.identificacion || 'SIN_CC'
    for (const b of boletasData) {
      const elementId = `boleta-print-${b.id}`
      await guardarBoletaEnDispositivo(
        elementId,
        nombreArchivoBoleta(b.numero, identificacion)
      )
      await new Promise((r) => setTimeout(r, 500))
    }
  }, [ventaResponse, cliente.identificacion])

  const whatsappLink = generarWhatsAppChatLink(cliente.telefono)

  if (paso === 'procesando') {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
        <div className="text-center py-8">
          <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
            <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <h3 className="text-lg font-medium text-slate-900 mb-2">Procesando Venta</h3>
          <p className="text-slate-600">Estamos procesando tu venta...</p>
        </div>
      </div>
    )
  }

  if (paso === 'completado') {
    const boletasVenta = ventaResponse?.boletas ?? []

    return (
      <div className="space-y-6 pb-[calc(var(--tabbar-h)+var(--sab)+3.75rem)] lg:pb-8">
        {/* Modal de Recibo/Factura */}
        {reciboData && (
          <ReciboAbono
            data={reciboData}
            onClose={() => setReciboData(null)}
          />
        )}

        <VentasMobileActionBar
          visible={!reciboData}
          layout="stack"
          compact
          ariaLabel="Venta completada"
          actions={accionesMobileCompletado}
        />

        {/* Sección de Boletas para imprimir/descargar */}
        {boletasVenta.length > 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <h3 className="text-base sm:text-lg font-medium text-slate-900">🎫 Boletas de la Compra</h3>
              <div className="flex flex-wrap items-center gap-2 lg:hidden">
                <button
                  type="button"
                  onClick={() => {
                    const data = construirReciboDesdeVenta()
                    if (data) setReciboData(data)
                  }}
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 px-2 py-1"
                >
                  Ver recibo
                </button>
                {WHATSAPP_VENTAS_ACTIVO && whatsappLink && (
                  <a
                    href={whatsappLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-green-700 hover:text-green-900 px-2 py-1"
                  >
                    WhatsApp
                  </a>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={descargarTodas}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Descargar Todas
                </button>
              </div>
            </div>

            <div className="space-y-6">
              {boletasVenta.map((b: any) => {
                const estadoRaw =
                  tipoVenta === 'RESERVA'
                    ? 'RESERVADA'
                    : tipoVenta === 'ABONO'
                      ? (abonosPorBoleta[b.id] || 0) >= precioBoleta
                        ? 'PAGADA'
                        : 'ABONADA'
                      : 'PAGADA'
                return (
                <div key={b.id} className="border border-slate-200 rounded-lg p-4 overflow-visible">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
                    <span className="font-bold text-slate-900">
                      <PrincipalGiftLabel
                        numeros={b.numeros}
                        numero={b.numero}
                        numeroPrincipal={b.numero_principal}
                        compact
                      />
                    </span>
                    <BoletaEntregaAcciones
                      elementId={`boleta-print-${b.id}`}
                      numero={b.numero}
                      numeros={b.numeros}
                      identificacion={cliente.identificacion}
                      telefono={cliente.telefono}
                      clienteNombre={cliente.nombre}
                      rifaNombre={rifaNombre}
                      estadoLabel={estadoRaw}
                      estadoRaw={estadoRaw}
                      boletaId={b.id}
                    />
                  </div>
              {/* Boleta renderizada */}
              <ResponsiveBoletaWrapper id={`boleta-print-${b.id}`}>
                <BoletaTicket
                  qrUrl={b.qr_url || `https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=boleta-${b.id}`}
                  barcode={b.barcode || ''}
                  numero={b.numero}
                  numeros={b.numeros}
                  numeroPrincipal={b.numero_principal}
                  imagenUrl={b.imagen_url}
                  rifaNombre={rifaNombre || ''}
                  estado={
                    tipoVenta === 'RESERVA'
                      ? 'RESERVADA'
                      : tipoVenta === 'ABONO'
                        ? (abonosPorBoleta[b.id] || 0) >= precioBoleta
                          ? 'PAGADA'
                          : 'ABONADA'
                        : 'CON_PAGO'
                  }
                  clienteInfo={{
                    nombre: cliente.nombre,
                    identificacion: cliente.identificacion,
                    direccion: cliente.direccion,
                  }}
                  deuda={
                    tipoVenta === 'RESERVA'
                      ? precioBoleta
                      : tipoVenta === 'ABONO'
                        ? Math.max(precioBoleta - (abonosPorBoleta[b.id] || 0), 0)
                        : 0
                  }
                  reservadaHasta={
                    tipoVenta === 'RESERVA' ? ventaResponse?.bloqueo_hasta : undefined
                  }
                  precio={precioBoleta}
                />
              </ResponsiveBoletaWrapper>
                </div>
              )})}
            </div>
          </div>
        )}

        {/* Botones de acción — escritorio */}
        <div className="hidden lg:block">
          <div className="max-w-7xl mx-auto flex flex-wrap justify-center gap-3">
            {WHATSAPP_VENTAS_ACTIVO && whatsappLink && (
              <a
                href={whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium inline-flex items-center gap-2"
              >
                WhatsApp del cliente
              </a>
            )}
            <button
              type="button"
              onClick={() => {
                const data = construirReciboDesdeVenta()
                if (data) setReciboData(data)
              }}
              className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium inline-flex items-center gap-2"
            >
              Ver recibo
            </button>
            <button
              type="button"
              onClick={onVentaCompletada}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              Nueva venta
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-slate-200 p-4 sm:p-6 lg:pb-6 ${
        paso === 'resumen' && boletas.length > 0
          ? 'pb-[calc(var(--tabbar-h)+var(--sab)+4.75rem)]'
          : 'pb-28 lg:pb-6'
      }`}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center mb-4 sm:mb-6">
        <h2 className="text-base sm:text-lg font-bold text-black">Resumen de Venta</h2>
        <div className="text-sm text-slate-600">
          {boletas.length} boleta{boletas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      {/* Boletas en el carrito */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black mb-3">Boletas Seleccionadas</h3>
        <div className="space-y-2">
          {boletas.map((boleta) => (
            <div
              key={boleta.id}
              className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg"
            >
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 min-w-0">
                <PrincipalGiftLabel
                  numeros={boleta.numeros}
                  numero={boleta.numero}
                  numeroPrincipal={boleta.numero_principal}
                  compact
                />
                <div className="text-sm text-slate-600 shrink-0">
                  ${precioBoleta.toLocaleString('es-CO')}
                </div>
                <div className="text-xs text-amber-600 shrink-0">
                  Bloqueo: {tiempoRestante(boleta)}
                </div>
              </div>
              <button
                onClick={() => removerBoleta(boleta)}
                disabled={procesando}
                className="text-red-500 hover:text-red-700 disabled:opacity-50"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* Tipo de Venta */}
      <div className="mb-6">
        <h3 className="text-sm font-bold text-black mb-3">Tipo de Operación</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3">
          <button
            onClick={() => setTipoVenta('COMPLETA')}
            disabled={procesando}
            className={`p-3 sm:p-4 border-2 rounded-lg transition-all min-h-[72px] ${
              tipoVenta === 'COMPLETA'
                ? 'border-green-500 bg-green-50 text-green-700 ring-2 ring-green-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-green-300 hover:bg-green-50/50'
            }`}
          >
            <div className="font-medium text-sm">✅ Venta Completa</div>
            <div className={`text-xs mt-1 ${tipoVenta === 'COMPLETA' ? 'text-green-600' : 'text-slate-500'}`}>Pago total</div>
          </button>
          <button
            onClick={() => setTipoVenta('ABONO')}
            disabled={procesando}
            className={`p-3 sm:p-4 border-2 rounded-lg transition-all min-h-[72px] ${
              tipoVenta === 'ABONO'
                ? 'border-yellow-500 bg-yellow-50 text-yellow-700 ring-2 ring-yellow-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-yellow-300 hover:bg-yellow-50/50'
            }`}
          >
            <div className="font-medium text-sm">💰 Con Abono</div>
            <div className={`text-xs mt-1 ${tipoVenta === 'ABONO' ? 'text-yellow-600' : 'text-slate-500'}`}>Pago parcial</div>
          </button>
          <button
            onClick={() => setTipoVenta('RESERVA')}
            disabled={procesando}
            className={`p-3 sm:p-4 border-2 rounded-lg transition-all min-h-[72px] ${
              tipoVenta === 'RESERVA'
                ? 'border-red-500 bg-red-50 text-red-700 ring-2 ring-red-300'
                : 'border-slate-200 bg-white text-slate-700 hover:border-red-300 hover:bg-red-50/50'
            }`}
          >
            <div className="font-medium text-sm">📌 Reservar</div>
            <div className={`text-xs mt-1 ${tipoVenta === 'RESERVA' ? 'text-red-600' : 'text-slate-500'}`}>Bloquear boletas</div>
          </button>
        </div>
      </div>

      {/* Abono por boleta individual */}
      {tipoVenta === 'ABONO' && (
        <div className="mb-6">
          <h3 className="text-sm font-bold text-black mb-3">Abono por Boleta</h3>
          <p className="text-xs text-slate-500 mb-3">
            Ingresa cuánto abonar a cada boleta individualmente. Precio por boleta: <strong>${precioBoleta.toLocaleString('es-CO')}</strong>
          </p>

          {/* Botones rápidos para todas */}
          <div className="flex flex-wrap gap-2 mb-4">
            <span className="text-xs text-slate-500 self-center mr-1">Aplicar a todas:</span>
            <button
              onClick={() => aplicarPorcentajeATodas(0.3)}
              className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200 font-medium"
            >
              30%
            </button>
            <button
              onClick={() => aplicarPorcentajeATodas(0.5)}
              className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200 font-medium"
            >
              50%
            </button>
            <button
              onClick={() => aplicarPorcentajeATodas(0.7)}
              className="px-3 py-1 bg-slate-100 text-slate-700 rounded text-xs hover:bg-slate-200 font-medium"
            >
              70%
            </button>
            <button
              onClick={() => setAbonosPorBoleta({})}
              className="px-3 py-1 bg-red-50 text-red-600 rounded text-xs hover:bg-red-100 font-medium"
            >
              Limpiar
            </button>
          </div>

          {/* Inputs por boleta */}
          <div className="space-y-3">
            {boletas.map((boleta) => {
              const abonoActual = abonosPorBoleta[boleta.id] || 0
              const saldoBoleta = precioBoleta - abonoActual
              return (
                <div
                  key={boleta.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <div className="flex-shrink-0 min-w-0">
                    <div className="text-sm font-bold text-slate-800 leading-tight">
                      {formatBoletaNumeros(boleta.numeros, boleta.numero)}
                    </div>
                    <div className="text-[10px] text-slate-500">${precioBoleta.toLocaleString('es-CO')}</div>
                  </div>
                  <div className="flex-1">
                    <div className="relative">
                      <span className="absolute left-2 top-1/2 transform -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={formatearInputPesos(abonoActual)}
                        onChange={(e) => {
                          const val = parsearInputPesos(e.target.value)
                          setAbonoBoleta(boleta.id, Math.min(val, precioBoleta))
                        }}
                        placeholder="0"
                        className="w-full pl-6 pr-2 py-1.5 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-black"
                      />
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right w-24">
                    {abonoActual > 0 ? (
                      <div>
                        <div className="text-[10px] text-slate-500">Saldo</div>
                        <div className={`text-xs font-semibold ${saldoBoleta > 0 ? 'text-orange-600' : 'text-green-600'}`}>
                          ${saldoBoleta.toLocaleString('es-CO')}
                        </div>
                      </div>
                    ) : (
                      <span className="text-[10px] text-slate-400">Sin abono</span>
                    )}
                  </div>
                  {/* Botones rápidos individuales */}
                  <div className="flex-shrink-0 flex gap-1">
                    {[0.5, 1].map((pct) => (
                      <button
                        key={pct}
                        onClick={() => setAbonoBoleta(boleta.id, Math.floor(precioBoleta * pct))}
                        className="px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded text-[10px] hover:bg-slate-300"
                      >
                        {pct === 1 ? '100%' : `${pct * 100}%`}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>

          {/* Resumen de abonos */}
          {montoAbono > 0 && (
            <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex justify-between text-sm">
                <span className="text-green-800">Total abonado hoy:</span>
                <span className="font-bold text-green-700">${montoAbono.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-orange-700">Saldo pendiente total:</span>
                <span className="font-bold text-orange-600">${saldoPendiente.toLocaleString('es-CO')}</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Información del cliente */}
      <div className="mb-6 p-3 bg-blue-50 border border-blue-200 rounded-lg">
        <h3 className="text-sm font-medium text-blue-900 mb-2">Cliente</h3>
        <div className="text-sm text-blue-800">
          <div className="font-medium">{cliente?.nombre || 'Sin nombre'}</div>
          {cliente?.telefono && <div>{cliente.telefono}</div>}
          {cliente?.email && <div>{cliente.email}</div>}
        </div>
      </div>

      {/* Método de pago - Solo para Venta Completa y Abono */}
      {tipoVenta !== 'RESERVA' && (
        <div className="mb-6">
          <label className="block text-sm font-bold text-black mb-2">
            Método de Pago
          </label>
          <select
            value={medioPagoId}
            onChange={(e) => setMedioPagoId(e.target.value)}
            disabled={procesando}
            className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-black"
          >
            <option value="">Seleccionar método de pago</option>
            {mediosPago.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
          {esVendedor && mediosPago.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">
              Crea tus medios en <Link href="/ajustes" className="underline">Ajustes</Link>.
            </p>
          )}
        </div>
      )}

      {requiereLinea && tipoVenta !== null && (
        <div className="mb-6">
          <label className="block text-sm font-bold text-black mb-2">Línea de venta</label>
          <select
            value={lineaVentaId}
            onChange={(e) => setLineaVentaId(e.target.value)}
            disabled={procesando}
            className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 bg-white text-black"
          >
            <option value="">Seleccionar canal…</option>
            {lineasVenta.map((l) => (
              <option key={l.id} value={l.id}>
                {l.nombre}
              </option>
            ))}
          </select>
          {lineasVenta.length === 0 && (
            <p className="text-xs text-amber-700 mt-1">
              {esVendedor ? (
                <>
                  Crea líneas en <Link href="/ajustes" className="underline">Ajustes</Link>.
                </>
              ) : (
                'Pide al super admin que cree líneas globales en Ajustes.'
              )}
            </p>
          )}
        </div>
      )}

      {/* Notas - Solo para Venta Completa y Abono */}
      {tipoVenta !== 'RESERVA' && (
        <div className="mb-6">
          <label className="block text-sm font-bold text-black mb-2">
            Notas (opcional)
          </label>
          <textarea
            value={notas}
            onChange={(e) => setNotas(e.target.value)}
            disabled={procesando}
            rows={2}
            className="w-full px-4 py-2 border border-slate-400 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none bg-white text-black placeholder:text-slate-500"
            placeholder={tipoVenta === 'ABONO' ? 'Detalles del abono y acuerdo de pago...' : 'Notas adicionales sobre la venta...'}
          />
        </div>
      )}

      {/* Resumen de totales */}
      <div className="border-t border-slate-200 pt-4 mb-6">
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Subtotal ({boletas.length} boletas)</span>
            <span className="text-slate-900">${subtotal.toLocaleString('es-CO')}</span>
          </div>
          
          {tipoVenta === 'ABONO' && montoAbono > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Abono inicial</span>
                <span className="text-green-600 font-medium">${montoAbono.toLocaleString('es-CO')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Saldo pendiente</span>
                <span className="text-orange-600 font-medium">${saldoPendiente.toLocaleString('es-CO')}</span>
              </div>
            </>
          )}
          
          <div className="flex justify-between text-lg font-medium border-t pt-2">
            <span className="text-slate-900">
              {tipoVenta === 'ABONO' ? 'Total Venta' : 'Total a Pagar'}
            </span>
            <span className="text-slate-900">${total.toLocaleString('es-CO')}</span>
          </div>
          
          {tipoVenta === 'ABONO' && (
            <div className="flex justify-between text-sm bg-amber-50 p-2 rounded">
              <span className="text-amber-800">Pagado hoy</span>
              <span className="text-amber-800 font-medium">${montoAbono.toLocaleString('es-CO')}</span>
            </div>
          )}
        </div>
      </div>

      {/* Aviso si no se ha seleccionado tipo */}
      {!tipoVentaSeleccionado && boletas.length > 0 && (
        <div className="mb-4 p-3 bg-amber-50 border border-amber-300 rounded-lg text-center">
          <p className="text-amber-800 text-sm font-medium">⚠️ Selecciona un tipo de operación para continuar</p>
        </div>
      )}

      {/* Botones de acción — escritorio (móvil usa VentasMobileActionBar en portal) */}
      <div className="hidden lg:block pt-2 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex flex-row gap-3 max-w-7xl">
          {boletas.length > 0 && (
            <button
              type="button"
              onClick={cancelarVenta}
              disabled={procesando}
              className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 disabled:opacity-50 min-h-[44px]"
            >
              Cancelar
            </button>
          )}

          {tipoVenta === 'RESERVA' ? (
            <button
              type="button"
              onClick={() => setMostrarDialogoReserva(true)}
              disabled={reservaDeshabilitada}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px]"
            >
              {procesando ? 'Procesando...' : '📌 Crear Reserva'}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMostrarConfirmacion(true)}
              disabled={cobrarDeshabilitado}
              className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed font-medium min-h-[44px] ${
                tipoVenta === 'COMPLETA'
                  ? 'bg-green-600 hover:bg-green-700'
                  : tipoVenta === 'ABONO'
                    ? 'bg-yellow-600 hover:bg-yellow-700'
                    : 'bg-slate-400'
              }`}
            >
              {etiquetaCobrar}
            </button>
          )}
        </div>
      </div>

      <VentasMobileActionBar
        visible={
          paso === 'resumen' &&
          !mostrarDialogoReserva &&
          !mostrarConfirmacion &&
          accionesMobileCobro.length > 0
        }
        ariaLabel="Cobrar o reservar"
        actions={accionesMobileCobro}
      />

      {/* Modal de confirmación */}
      {mostrarConfirmacion && (
        <VentasCenteredOverlay
          open={mostrarConfirmacion}
          onBackdropClick={() => setMostrarConfirmacion(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 max-h-[min(90dvh,32rem)] overflow-y-auto">
            <div className={`text-center mb-4 p-3 rounded-lg ${tipoVenta === 'COMPLETA' ? 'bg-green-50' : 'bg-yellow-50'}`}>
              <h3 className={`text-lg font-bold ${tipoVenta === 'COMPLETA' ? 'text-green-800' : 'text-yellow-800'}`}>
                {tipoVenta === 'COMPLETA' ? '✅ Confirmar Pago Total' : '💰 Confirmar Abono'}
              </h3>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Cliente:</span>
                <span className="font-medium text-slate-900">{cliente.nombre}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Proyecto:</span>
                <span className="font-medium text-slate-900">{rifaNombre || 'Sin nombre'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Boletas ({boletas.length}):</span>
                <span className="font-medium text-slate-900">
                  {boletas.map(b => formatBoletaNumeros(b.numeros, b.numero)).join(', ')}
                </span>
              </div>
              <div className="border-t pt-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Total venta:</span>
                  <span className="font-bold text-slate-900">${total.toLocaleString('es-CO')}</span>
                </div>
                {tipoVenta === 'ABONO' && (
                  <>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-600">Abono hoy:</span>
                      <span className="font-bold text-green-700">${montoAbono.toLocaleString('es-CO')}</span>
                    </div>
                    <div className="flex justify-between mt-1">
                      <span className="text-slate-600">Saldo pendiente:</span>
                      <span className="font-bold text-orange-600">${saldoPendiente.toLocaleString('es-CO')}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="flex justify-between">
                <span className="text-slate-600">Método de pago:</span>
                <span className="font-medium text-slate-900">{labelMedio(medioPagoId)}</span>
              </div>
            </div>
            
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setMostrarConfirmacion(false)}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50 font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={() => { setMostrarConfirmacion(false); procesarVenta() }}
                disabled={procesando}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium disabled:opacity-50 ${
                  tipoVenta === 'COMPLETA' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-yellow-600 hover:bg-yellow-700'
                }`}
              >
                {procesando ? 'Procesando...' : '✅ Confirmar'}
              </button>
            </div>
          </div>
        </VentasCenteredOverlay>
      )}

      {/* Diálogo de reserva */}
      <DialogoReserva
        isOpen={mostrarDialogoReserva}
        boletas={boletas}
        cliente={cliente}
        precioBoleta={precioBoleta}
        rifaId={rifaId}
        rifaNombre={rifaNombre}
        fechaSorteo={fechaSorteo}
        onClose={() => setMostrarDialogoReserva(false)}
        lineaVentaId={lineaVentaId || undefined}
        requiereLinea={requiereLinea}
        onReservaCompletada={(data) => {
          setMostrarDialogoReserva(false)
          const boletasApi = data.boletas_reservadas ?? []
          const boletasMerged = boletasApi.map((b) => {
            const local = boletas.find((x) => x.id === b.id)
            return {
              ...b,
              barcode: local?.barcode,
              qr_url: b.qr_url ?? local?.qr_url,
              imagen_url: b.imagen_url ?? local?.imagen_url,
            }
          })
          setVentaResponse({
            ...data,
            boletas: boletasMerged,
          })
          setTipoVenta('RESERVA')
          setPaso('completado')
          if (typeof window !== 'undefined') {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }}
      />
    </div>
  )
}
