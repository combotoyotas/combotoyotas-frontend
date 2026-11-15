'use client'

import { useState, useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import BoletaTicket from './BoletaTicket'
import ResponsiveBoletaWrapper from './ResponsiveBoletaWrapper'
import BoletaAccionesBar from '@/components/boletas/BoletaAccionesBar'
import { boletaApi } from '@/lib/boletaApi'
import { formatRegistradoConRol } from '@/utils/formatAbonoRegistradoPor'
import type { BoletaDetail } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'
import { getBoletaEstadoMenuInfo } from '@/utils/boletaEstadoMenu'
import { boletaDetailTicketElementId } from '@/lib/boletaDescargarDesdeDetalle'

interface BoletaDetailProps {
  boleta: BoletaDetail
  onPrint?: () => void
  onBoletaUpdated?: () => void
}

export default function BoletaDetail({ boleta, onPrint, onBoletaUpdated }: BoletaDetailProps) {
  const router = useRouter()
  const [notaModalOpen, setNotaModalOpen] = useState(false)
  const [notaTemp, setNotaTemp] = useState('')
  const [savingNota, setSavingNota] = useState(false)

  const estadoMenuInfo = useMemo(() => getBoletaEstadoMenuInfo(boleta), [boleta])
  const rifaInfoMinima = useMemo<Rifa | null>(
    () =>
      boleta.rifa_nombre
        ? ({
            id: boleta.rifa_id,
            nombre: boleta.rifa_nombre,
          } as Rifa)
        : null,
    [boleta.rifa_id, boleta.rifa_nombre]
  )

  const handleImprimir = useCallback(() => {
    if (onPrint) onPrint()
    else router.push(`/boletas/${boleta.id}/print`)
  }, [onPrint, router, boleta.id])

  const openEditarNota = useCallback(() => {
    setNotaTemp(boleta.nota ?? '')
    setNotaModalOpen(true)
  }, [boleta.nota])

  const handleSaveNota = useCallback(async () => {
    setSavingNota(true)
    try {
      const notaValue = notaTemp.trim() || null
      await boletaApi.updateBoletaNota(boleta.id, notaValue)
      setNotaModalOpen(false)
      onBoletaUpdated?.()
    } catch (err) {
      console.error('Error guardando nota:', err)
      window.alert('Error al guardar la nota')
    } finally {
      setSavingNota(false)
    }
  }, [boleta.id, notaTemp, onBoletaUpdated])

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CO', {
      day: '2-digit',
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP'
    }).format(amount)
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Ticket Preview */}
      <div className="bg-white rounded-xl sm:rounded-lg shadow-lg border border-slate-200 p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
          <div className="min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-slate-900">Vista de Boleta</h3>
            <p className="text-xs text-slate-500 mt-0.5">Mismas acciones que el menú ⋮ de la lista</p>
          </div>
          <BoletaAccionesBar
            boleta={boleta}
            rifaId={boleta.rifa_id}
            rifaInfo={rifaInfoMinima}
            estadoInfo={estadoMenuInfo}
            onImprimir={handleImprimir}
            onEditarNota={openEditarNota}
            ocultarVerDetalle
          />
        </div>

        <div
          id={boletaDetailTicketElementId(boleta.id)}
          className="-mx-1 sm:mx-0 overflow-x-hidden"
        >
        <ResponsiveBoletaWrapper>
          <BoletaTicket
            qrUrl={boleta.qr_url}
            barcode={boleta.barcode}
            numero={boleta.numero}
            numeros={boleta.numeros}
            numeroPrincipal={(boleta as any).numero_principal}
            imagenUrl={(boleta as any).imagen_url ?? (boleta as any).imagenUrl}
            rifaNombre={boleta.rifa_nombre}
            estado={boleta.estado}
            clienteInfo={boleta.cliente_info}
            deuda={boleta.boleta_financiero?.saldo_pendiente ?? boleta.venta_info?.saldo_pendiente}
            reservadaHasta={boleta.bloqueo_hasta}
            precio={boleta.boleta_financiero?.precio_boleta}
            nota={boleta.nota}
            abonos={boleta.abonos}
          />
        </ResponsiveBoletaWrapper>
        </div>
      </div>

      {/* Información útil para vendedor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Customer Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Información de Cliente</h3>
          
          {boleta.cliente_info ? (
            <div className="divide-y divide-slate-100">
              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5 first:pt-0">
                <span className="text-xs sm:text-sm text-slate-500">Nombre</span>
                <span className="text-sm font-medium text-slate-900 sm:text-right break-words">{boleta.cliente_info.nombre}</span>
              </div>
              
              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5">
                <span className="text-xs sm:text-sm text-slate-500">Identificación</span>
                <span className="text-sm font-medium text-slate-900 sm:text-right">{boleta.cliente_info.identificacion}</span>
              </div>
              
              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5">
                <span className="text-xs sm:text-sm text-slate-500">Teléfono</span>
                <span className="text-sm font-medium text-slate-900 sm:text-right">{boleta.cliente_info.telefono}</span>
              </div>
              
              <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5 last:pb-0">
                <span className="text-xs sm:text-sm text-slate-500">Email</span>
                <span className="text-sm font-medium text-slate-900 sm:text-right break-all">{boleta.cliente_info.email || '—'}</span>
              </div>
            </div>
          ) : (
            <div className="text-center py-4">
              <div className="text-slate-400">
                <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <p className="text-sm text-slate-500">Sin cliente asignado</p>
            </div>
          )}
        </div>

        {/* Estado Financiero de esta Boleta */}
        {boleta.boleta_financiero && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Estado Financiero de esta Boleta</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Precio Boleta:</span>
                <span className="text-sm font-medium text-slate-900">{formatCurrency(boleta.boleta_financiero.precio_boleta)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Total Pagado:</span>
                <span className="text-sm font-medium text-green-600">{formatCurrency(boleta.boleta_financiero.total_pagado)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Saldo Pendiente:</span>
                <span className="text-sm font-medium text-orange-600">{formatCurrency(boleta.boleta_financiero.saldo_pendiente)}</span>
              </div>

              {boleta.boleta_financiero.precio_boleta > 0 && (
                <div className="flex justify-between">
                  <span className="text-sm text-slate-600">Porcentaje Pagado:</span>
                  <span className="text-sm font-medium text-slate-900">
                    {Math.round((boleta.boleta_financiero.total_pagado / boleta.boleta_financiero.precio_boleta) * 100)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Información de Venta (referencia) */}
        {boleta.venta_info && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Información de Venta</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">ID Venta:</span>
                <span className="text-sm font-medium text-slate-900">{boleta.venta_info.id}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Fecha Venta:</span>
                <span className="text-sm text-slate-900">{formatDate(boleta.venta_info.fecha_venta)}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Método Pago:</span>
                <span className="text-sm font-medium text-slate-900">{boleta.venta_info.metodo_pago}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Estado Venta:</span>
                <span className="text-sm font-medium text-slate-900">{boleta.venta_info.estado}</span>
              </div>
            </div>
          </div>
        )}

        {/* Seller Information */}
        {boleta.vendedor_info && (
          <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
            <h3 className="text-lg font-medium text-slate-900 mb-4">Información de Vendedor</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Nombre:</span>
                <span className="text-sm font-medium text-slate-900">{boleta.vendedor_info.nombre}</span>
              </div>
              
              <div className="flex justify-between">
                <span className="text-sm text-slate-600">Email:</span>
                <span className="text-sm font-medium text-slate-900">{boleta.vendedor_info.email}</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Historial de Abonos */}
      {boleta.abonos && boleta.abonos.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 p-6">
          <h3 className="text-lg font-medium text-slate-900 mb-4">
            💰 Historial de Abonos ({boleta.abonos.length})
          </h3>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200">
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">#</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Fecha</th>
                  <th className="text-right py-2 px-3 text-slate-600 font-medium">Monto</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Método</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Estado</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Línea</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Registrado por</th>
                  <th className="text-left py-2 px-3 text-slate-600 font-medium">Notas</th>
                </tr>
              </thead>
              <tbody>
                {boleta.abonos.map((abono, index) => (
                  <tr key={abono.id} className="border-b border-slate-100 hover:bg-slate-50">
                    <td className="py-2 px-3 text-slate-500">{index + 1}</td>
                    <td className="py-2 px-3 text-slate-900">{formatDate(abono.fecha)}</td>
                    <td className="py-2 px-3 text-right font-medium text-green-700">{formatCurrency(abono.monto)}</td>
                    <td className="py-2 px-3 text-slate-900">{abono.metodo_pago}</td>
                    <td className="py-2 px-3">
                      <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                        abono.estado === 'CONFIRMADO' ? 'bg-green-100 text-green-800' :
                        abono.estado === 'REGISTRADO' ? 'bg-orange-100 text-orange-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {abono.estado}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {abono.linea_venta_nombre || '—'}
                    </td>
                    <td className="py-2 px-3 text-slate-700">
                      {formatRegistradoConRol(
                        abono.registrado_por_nombre,
                        abono.registrado_por_rol,
                        abono.gateway_pago
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-xs max-w-[200px] truncate">{abono.notas || '—'}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t-2 border-slate-300">
                  <td colSpan={2} className="py-2 px-3 font-semibold text-slate-900">Total abonado</td>
                  <td className="py-2 px-3 text-right font-bold text-green-700">
                    {formatCurrency(boleta.abonos.reduce((sum, a) => sum + a.monto, 0))}
                  </td>
                  <td colSpan={5}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {notaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div
            className="w-full max-w-md bg-white rounded-t-2xl sm:rounded-xl shadow-xl border border-slate-200 p-5"
            role="dialog"
            aria-labelledby="nota-boleta-title"
          >
            <h4 id="nota-boleta-title" className="text-lg font-semibold text-slate-900 mb-2">
              Editar nota interna
            </h4>
            <p className="text-xs text-slate-500 mb-3">Visible en el ticket impreso (pie de la boleta).</p>
            <textarea
              value={notaTemp}
              onChange={(e) => setNotaTemp(e.target.value)}
              rows={4}
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              placeholder="Nota para el vendedor…"
              disabled={savingNota}
            />
            <div className="flex gap-2 mt-4 justify-end">
              <button
                type="button"
                onClick={() => setNotaModalOpen(false)}
                disabled={savingNota}
                className="px-4 py-2 text-sm font-medium text-slate-700 border border-slate-300 rounded-lg hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => void handleSaveNota()}
                disabled={savingNota}
                className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
              >
                {savingNota ? 'Guardando…' : 'Guardar nota'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
