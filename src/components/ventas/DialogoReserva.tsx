'use client'

import { useState } from 'react'
import { ventasApi } from '@/lib/ventasApi'
import { BoletaEnCarrito, Cliente, ReservaResponse } from '@/types/ventas'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'
import VentasCenteredOverlay from '@/components/ventas/VentasCenteredOverlay'

interface DialogoReservaProps {
  isOpen: boolean
  boletas: BoletaEnCarrito[]
  cliente: Cliente
  precioBoleta: number
  rifaId: string
  rifaNombre?: string
  fechaSorteo?: string | null
  lineaVentaId?: string
  requiereLinea?: boolean
  onClose: () => void
  onReservaCompletada: (reserva: ReservaResponse) => void
}

function formatDateForInput(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export default function DialogoReserva({
  isOpen,
  boletas,
  cliente,
  precioBoleta,
  rifaId,
  rifaNombre,
  fechaSorteo,
  lineaVentaId,
  requiereLinea,
  onClose,
  onReservaCompletada
}: DialogoReservaProps) {
  // Calcular fecha máxima (fecha del sorteo o 30 días por defecto)
  const fechaMaxima = fechaSorteo
    ? new Date(fechaSorteo)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  // Fecha mínima: mañana
  const manana = new Date()
  manana.setDate(manana.getDate() + 1)
  manana.setHours(0, 0, 0, 0)

  // Valor inicial: fecha del sorteo si existe, sino 5 días
  const fechaInicialDefault = fechaSorteo
    ? formatDateForInput(fechaMaxima)
    : formatDateForInput(new Date(Date.now() + 5 * 24 * 60 * 60 * 1000))

  const [fechaBloqueo, setFechaBloqueo] = useState<string>(fechaInicialDefault)
  const [notas, setNotas] = useState<string>('')
  const [procesando, setProcesando] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paso, setPaso] = useState<'confirmacion' | 'procesando' | 'error'>('confirmacion')

  const subtotal = boletas.length * precioBoleta

  if (!isOpen) return null

  const fechaExpiracion = new Date(fechaBloqueo + 'T23:59:59')
  const ahora = new Date()
  const diffMs = fechaExpiracion.getTime() - ahora.getTime()
  const diasBloqueo = Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)))

  const procesarReserva = async () => {
    if (!cliente.nombre || !cliente.telefono) {
      setError('Complete la información del cliente')
      return
    }

    if (boletas.length === 0) {
      setError('Seleccione al menos una boleta')
      return
    }

    if (diasBloqueo < 1) {
      setError('La fecha de bloqueo debe ser al menos mañana')
      return
    }

    if (fechaSorteo && new Date(fechaBloqueo) > new Date(fechaSorteo)) {
      setError('La fecha no puede ser posterior al día del sorteo')
      return
    }

    if (requiereLinea && !lineaVentaId) {
      setError('Selecciona la línea de venta en el carrito antes de reservar')
      return
    }

    setProcesando(true)
    setError(null)
    setPaso('procesando')

    try {
      const reservaPayload = {
        rifa_id: rifaId,
        cliente: {
          nombre: cliente.nombre,
          telefono: cliente.telefono,
          email: cliente.email || undefined,
          identificacion: cliente.identificacion || undefined,
          direccion: cliente.direccion || undefined
        },
        boletas: boletas.map((b) => ({
          id: b.id,
          ...(b.numero_principal != null
            ? { numero_principal: b.numero_principal }
            : {}),
        })),
        dias_bloqueo: diasBloqueo,
        notas: notas || undefined,
        ...(lineaVentaId ? { linea_venta_id: lineaVentaId } : {}),
      }
      console.log('[DialogoReserva] Payload enviado:', JSON.stringify(reservaPayload, null, 2))
      const respuesta = await ventasApi.crearReserva({
        ...reservaPayload,
        linea_venta_id: lineaVentaId,
      })

      onReservaCompletada(respuesta.data)
      setPaso('confirmacion')
      setFechaBloqueo(fechaInicialDefault)
      setNotas('')
      onClose()
    } catch (error: any) {
      console.error('Error procesando reserva:', error)
      setError(error.message || 'Error procesando la reserva')
      setPaso('error')
    } finally {
      setProcesando(false)
    }
  }

  const handleClose = () => {
    if (procesando) return
    setError(null)
    setPaso('confirmacion')
    setFechaBloqueo(fechaInicialDefault)
    setNotas('')
    onClose()
  }

  // Estado procesando
  if (paso === 'procesando') {
    return (
      <VentasCenteredOverlay open={isOpen}>
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
          <div className="text-center py-6">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-blue-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">Creando Reserva</h3>
            <p className="text-slate-600">Procesando tu reserva...</p>
          </div>
        </div>
      </VentasCenteredOverlay>
    )
  }

  // Estado error
  if (paso === 'error') {
    return (
      <VentasCenteredOverlay open={isOpen} onBackdropClick={handleClose}>
        <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-6">
          <div className="text-center py-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-red-100 rounded-full mb-4">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
              </svg>
            </div>
            <h3 className="text-lg font-medium text-slate-900 mb-2">
              Error al Crear Reserva
            </h3>
            <p className="text-red-600 mb-4">{error}</p>

            <div className="flex gap-3">
              <button
                onClick={handleClose}
                className="flex-1 px-4 py-2 border border-slate-300 text-slate-700 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={procesarReserva}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </VentasCenteredOverlay>
    )
  }

  const fechaReservaCorta = fechaExpiracion.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })

  // Estado confirmación
  return (
    <VentasCenteredOverlay open={isOpen} onBackdropClick={handleClose}>
      <div
        className="bg-white rounded-2xl shadow-lg max-w-md w-full flex flex-col overflow-hidden"
        style={{
          maxHeight: 'min(90dvh, calc(100dvh - var(--tabbar-h, 0px) - var(--sab, 0px) - 2rem))',
        }}
      >
        <div className="shrink-0 border-b border-slate-200 px-4 py-3 sm:px-5 sm:py-4">
          <h2 className="text-lg sm:text-xl font-semibold text-slate-900">Confirmar Reserva</h2>
          <p className="text-xs sm:text-sm text-slate-600 mt-0.5 hidden sm:block">
            Bloquea boletas hasta la fecha que elijas
          </p>
        </div>

        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain px-4 py-3 sm:p-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
            <div className="flex justify-between items-baseline gap-2 mb-2">
              <h3 className="font-medium text-blue-900 text-sm">Boletas a reservar</h3>
              <span className="text-xs text-blue-700">{boletas.length} en total</span>
            </div>
            <div className="space-y-1.5 max-h-28 overflow-y-auto">
              {boletas.slice(0, 5).map((boleta) => (
                <div key={boleta.id} className="flex justify-between text-sm gap-2">
                  <span className="text-blue-800 font-semibold">
                    {formatBoletaNumeros((boleta as any).numeros, boleta.numero)}
                  </span>
                  <span className="text-blue-600 font-medium shrink-0">
                    ${precioBoleta.toLocaleString('es-CO')}
                  </span>
                </div>
              ))}
              {boletas.length > 5 && (
                <div className="text-xs text-blue-600">+{boletas.length - 5} más</div>
              )}
            </div>
            <div className="border-t border-blue-200 mt-2 pt-2 flex justify-between font-semibold text-sm text-blue-900">
              <span>Total</span>
              <span>${subtotal.toLocaleString('es-CO')}</span>
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-900 mb-2">
              Fecha límite
            </label>
            <input
              type="date"
              value={fechaBloqueo}
              min={formatDateForInput(manana)}
              max={formatDateForInput(fechaMaxima)}
              onChange={(e) => setFechaBloqueo(e.target.value)}
              disabled={procesando}
              className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent bg-white text-black text-base"
            />
            <p className="mt-2 text-xs text-slate-600 flex justify-between gap-2">
              <span>
                Hasta <span className="font-semibold text-slate-800">{fechaReservaCorta}</span>
              </span>
              <span className="shrink-0 text-blue-600 font-semibold">{diasBloqueo} días</span>
            </p>
            {fechaSorteo && (
              <p className="mt-1 text-xs text-amber-800">
                Sorteo:{' '}
                {new Date(fechaSorteo).toLocaleDateString('es-CO', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </p>
            )}
          </div>

          <div className="text-sm text-slate-700 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="font-medium text-slate-900">{cliente.nombre}</span>
            {cliente.telefono ? (
              <span className="text-slate-500"> · {cliente.telefono}</span>
            ) : null}
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Notas (opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              disabled={procesando}
              rows={2}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent resize-none bg-white text-black text-sm placeholder:text-slate-400"
              placeholder="Opcional…"
            />
          </div>
        </div>

        <div className="shrink-0 border-t border-slate-200 bg-white px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-5 sm:py-4 flex gap-2 sm:gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={procesando}
            className="flex-1 min-h-[48px] px-3 py-2 border border-slate-300 text-slate-700 rounded-xl hover:bg-slate-50 disabled:opacity-50 text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={procesarReserva}
            disabled={procesando || boletas.length === 0 || !cliente.nombre || !cliente.telefono}
            className="flex-1 min-h-[48px] px-3 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 font-semibold text-sm"
          >
            {procesando ? 'Procesando…' : 'Crear reserva'}
          </button>
        </div>
      </div>
    </VentasCenteredOverlay>
  )
}
