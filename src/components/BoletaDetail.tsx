'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  abrirWhatsappRecordatorioBoleta,
  boletaEstaDisponibleParaVender,
  tipoRecordatorioBoleta,
  urlVenderBoleta,
} from '@/lib/boletaWhatsappAcciones'
import BoletaTicket from './BoletaTicket'
import ResponsiveBoletaWrapper from './ResponsiveBoletaWrapper'
import { downloadBoletaImage } from '@/utils/downloadBoletaImage'
import { formatRegistradoConRol } from '@/utils/formatAbonoRegistradoPor'
import type { BoletaDetail } from '@/types/boleta'
import { boletaEstadoDisplay } from '@/utils/boletaEstadoDisplay'
import { mensajeCompartirBoletaAlCliente } from '@/utils/whatsappMensajes'
import { generarWhatsAppLinkConMensaje } from '@/utils/telefono'
import { WHATSAPP_MENSAJE_ACTIVO, WHATSAPP_VENTAS_ACTIVO } from '@/config/features'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'

interface BoletaDetailProps {
  boleta: BoletaDetail
  onPrint?: () => void
}

export default function BoletaDetail({ boleta, onPrint }: BoletaDetailProps) {
  const router = useRouter()
  const [downloading, setDownloading] = useState(false)
  const [recordatorioCargando, setRecordatorioCargando] = useState(false)

  const tipoRec = tipoRecordatorioBoleta(boleta)
  const puedeVender = boletaEstaDisponibleParaVender(boleta)

  const handleRecordatorio = useCallback(async () => {
    setRecordatorioCargando(true)
    try {
      const r = await abrirWhatsappRecordatorioBoleta(boleta, null)
      if (!r.ok && r.error) window.alert(r.error)
    } finally {
      setRecordatorioCargando(false)
    }
  }, [boleta])

  const handleVender = useCallback(() => {
    router.push(urlVenderBoleta(boleta.rifa_id, boleta.id))
  }, [router, boleta.rifa_id, boleta.id])

  const buildFilename = useCallback(() => {
    const num = boleta.numero.toString().padStart(4, '0')
    const cedula = boleta.cliente_info?.identificacion
    return cedula ? `boleta_${num}_CC_${cedula}` : `boleta_${num}`
  }, [boleta])

  const handleDownloadImage = useCallback(async () => {
    setDownloading(true)
    try {
      await downloadBoletaImage({
        selector: '.boleta-ticket',
        fileName: `${buildFilename()}.png`,
      })
    } catch (err) {
      console.error('Error al descargar imagen:', err)
    } finally {
      setDownloading(false)
    }
  }, [buildFilename])
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

  const estadoUi = boletaEstadoDisplay(boleta.estado)
  const waActivo = WHATSAPP_VENTAS_ACTIVO || WHATSAPP_MENSAJE_ACTIVO
  const whatsappUrl =
    waActivo && boleta.cliente_info?.telefono
      ? generarWhatsAppLinkConMensaje(
          boleta.cliente_info.telefono,
          mensajeCompartirBoletaAlCliente({
            nombreCliente: boleta.cliente_info.nombre,
            rifaNombre: boleta.rifa_nombre,
            numeros: boleta.numeros,
            numero: boleta.numero,
            estadoLabel: estadoUi.label.toUpperCase(),
          })
        )
      : null

  const actionBtn =
    'min-h-[44px] w-full sm:w-auto flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50'

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Ticket Preview */}
      <div className="bg-white rounded-xl sm:rounded-lg shadow-lg border border-slate-200 p-4 sm:p-6 overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start mb-4">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 shrink-0">Vista de Boleta</h3>
          <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
            <button
              type="button"
              onClick={handleDownloadImage}
              disabled={downloading}
              className={`${actionBtn} bg-green-600 text-white hover:bg-green-700`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <span className="truncate">{downloading ? 'Descargando…' : 'Descargar'}</span>
            </button>
            <button
              type="button"
              onClick={onPrint}
              className={`${actionBtn} bg-blue-600 text-white hover:bg-blue-700`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Imprimir
            </button>
            <button
              type="button"
              disabled={!whatsappUrl}
              onClick={() => whatsappUrl && window.open(whatsappUrl, '_blank', 'noopener,noreferrer')}
              title={
                !boleta.cliente_info?.telefono
                  ? 'Asigna un cliente con teléfono para enviar por WhatsApp'
                  : 'Enviar boleta al cliente'
              }
              className={`${actionBtn} bg-emerald-600 text-white hover:bg-emerald-700 disabled:cursor-not-allowed`}
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.435 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              <span className="truncate">WhatsApp</span>
            </button>
            {tipoRec && (
              <button
                type="button"
                disabled={recordatorioCargando || !boleta.cliente_info?.telefono}
                onClick={() => void handleRecordatorio()}
                title={
                  !boleta.cliente_info?.telefono
                    ? 'Asigna un cliente con teléfono para el recordatorio'
                    : tipoRec === 'ABONADA'
                      ? 'Recordatorio con plantilla de boleta abonada'
                      : 'Recordatorio con plantilla de boleta reservada'
                }
                className={`${actionBtn} bg-amber-600 text-white hover:bg-amber-700 disabled:cursor-not-allowed`}
              >
                <span className="truncate">{recordatorioCargando ? 'Abriendo…' : 'Recordatorio'}</span>
              </button>
            )}
            {puedeVender && (
              <button
                type="button"
                onClick={handleVender}
                className={`${actionBtn} bg-indigo-600 text-white hover:bg-indigo-700`}
              >
                <span className="truncate">Vender</span>
              </button>
            )}
          </div>
        </div>

        <div className="-mx-1 sm:mx-0 overflow-x-hidden">
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
          />
        </ResponsiveBoletaWrapper>
        </div>
      </div>

      {/* Detailed Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Basic Information */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 sm:p-6">
          <h3 className="text-base sm:text-lg font-semibold text-slate-900 mb-3 sm:mb-4">Información de la Boleta</h3>
          
          <div className="divide-y divide-slate-100">
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between sm:items-center py-2.5 first:pt-0">
              <span className="text-xs sm:text-sm text-slate-500">Número{boleta.numeros && boleta.numeros.length > 1 ? 's' : ''}</span>
              <span className="text-sm font-mono font-semibold text-slate-900 break-all text-right sm:text-left sm:max-w-[60%]">
                {formatBoletaNumeros(boleta.numeros, boleta.numero)}
              </span>
            </div>
            
            <div className="flex flex-col gap-1 sm:flex-row sm:justify-between sm:items-center py-2.5">
              <span className="text-xs sm:text-sm text-slate-500">Estado</span>
              <span className={`inline-flex self-start sm:self-auto px-2.5 py-1 text-xs font-semibold rounded-full ${estadoUi.badgeClass}`}>
                {estadoUi.label}
              </span>
            </div>
            
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5">
              <span className="text-xs sm:text-sm text-slate-500 shrink-0">Proyecto</span>
              <span className="text-sm font-medium text-slate-900 sm:text-right break-words">{boleta.rifa_nombre}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5">
              <span className="text-xs sm:text-sm text-slate-500">Código de barras</span>
              <span className="text-xs sm:text-sm font-mono text-slate-900 break-all sm:text-right">{boleta.barcode}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5">
              <span className="text-xs sm:text-sm text-slate-500">Fecha creación</span>
              <span className="text-sm text-slate-900 sm:text-right">{formatDate(boleta.created_at)}</span>
            </div>
            
            <div className="flex flex-col gap-0.5 sm:flex-row sm:justify-between py-2.5 last:pb-0">
              <span className="text-xs sm:text-sm text-slate-500">Última actualización</span>
              <span className="text-sm text-slate-900 sm:text-right">{formatDate(boleta.updated_at)}</span>
            </div>
          </div>
        </div>

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

      {/* Reservation Information */}
      {boleta.reserva_token && (
        <div className="bg-yellow-50 rounded-lg border border-yellow-200 p-6">
          <h3 className="text-lg font-medium text-yellow-900 mb-4">Información de Reserva</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="text-sm text-yellow-700">Token de Reserva:</span>
              <p className="font-mono text-sm text-yellow-900 mt-1">{boleta.reserva_token}</p>
            </div>
            
            {boleta.bloqueo_hasta && (
              <div>
                <span className="text-sm text-yellow-700">Bloqueado hasta:</span>
                <p className="text-sm text-yellow-900 mt-1">{formatDate(boleta.bloqueo_hasta)}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
