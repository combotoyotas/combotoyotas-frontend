'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { verificarBoleta, type VerificacionData } from '@/lib/verificarApi'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'

export default function VerificarPage() {
  const params = useParams()
  const hash = params.hash as string

  const [data, setData] = useState<VerificacionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!hash) return
    verificarBoleta(hash).then((result) => {
      if (result) {
        setData(result)
      } else {
        setError(true)
      }
      setLoading(false)
    })
  }, [hash])

  if (loading) return <LoadingScreen />
  if (error || !data) return <ErrorScreen />

  return <BoletaVerificada data={data} />
}

/* ─── LOADING ─── */
function LoadingScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center">
      <div className="text-center">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-blue-500/20 rounded-full" />
          <div className="absolute inset-0 border-4 border-transparent border-t-blue-400 rounded-full animate-spin" />
          <div className="absolute inset-3 border-4 border-transparent border-t-amber-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
        </div>
        <p className="text-blue-200 text-lg font-light tracking-wide">Verificando boleta...</p>
        <p className="text-blue-400/50 text-sm mt-1">Validando autenticidad</p>
      </div>
    </div>
  )
}

/* ─── ERROR ─── */
function ErrorScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-red-950/30 to-slate-900 flex items-center justify-center p-4">
      <div className="max-w-md w-full text-center">
        <div className="w-24 h-24 mx-auto mb-6 bg-red-500/10 rounded-full flex items-center justify-center border border-red-500/20">
          <svg className="w-12 h-12 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-white mb-2">Boleta no encontrada</h1>
        <p className="text-slate-400 mb-6">El código de verificación no es válido o la boleta no existe en nuestro sistema.</p>
        <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700/50">
          <p className="text-slate-500 text-sm">Si crees que esto es un error, contacta al vendedor con tu número de boleta.</p>
        </div>
      </div>
    </div>
  )
}

/* ─── MAIN VIEW ─── */
function BoletaVerificada({ data }: { data: VerificacionData }) {
  const { boleta, rifa, cliente, financiero, abonos } = data

  const estadoConfig: Record<string, { bg: string; text: string; icon: string; label: string }> = {
    PAGADA: { bg: 'from-emerald-500 to-green-600', text: 'text-emerald-100', icon: '✓', label: 'PAGADA' },
    ABONADA: { bg: 'from-amber-500 to-orange-600', text: 'text-amber-100', icon: '◐', label: 'ABONADA' },
    RESERVADA: { bg: 'from-blue-500 to-indigo-600', text: 'text-blue-100', icon: '⏳', label: 'RESERVADA' },
    DISPONIBLE: { bg: 'from-slate-500 to-slate-600', text: 'text-slate-100', icon: '○', label: 'DISPONIBLE' },
    ANULADA: { bg: 'from-red-500 to-red-700', text: 'text-red-100', icon: '✕', label: 'ANULADA' },
    TRANSFERIDA: { bg: 'from-purple-500 to-violet-600', text: 'text-purple-100', icon: '↗', label: 'TRANSFERIDA' },
  }

  const estado = estadoConfig[boleta.estado] || estadoConfig.DISPONIBLE
  const formatCurrency = (n: number) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n)
  const formatDate = (d: string) => {
    try { return new Date(d).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) } catch { return d }
  }

  // Cláusulas de la boleta
  const clausulas = [
    'La boleta sin pago total no participa en el sorteo. El participante debe asegurarse de completar el pago antes de la fecha del sorteo.',
    'El sorteo se realizará con los últimos cuatro dígitos del resultado de la Lotería de Medellín en la fecha programada.',
    'Si el número ganador no ha sido vendido o no se encuentra al día en sus pagos, se repetirá el sorteo en la siguiente fecha disponible de la lotería.',
    'El premio será entregado únicamente al titular registrado de la boleta, previa verificación de identidad con documento oficial.',
    'La boleta es personal e intransferible salvo autorización expresa del organizador. Cualquier cesión no autorizada anula la participación.',
    'El organizador no se hace responsable por boletas adquiridas a través de terceros no autorizados.',
    'Al adquirir esta boleta, el participante acepta los términos y condiciones completos del proyecto, disponibles en el sitio web oficial.',
    'Los abonos realizados no son reembolsables una vez confirmados. En caso de cancelación por parte del participante, se aplicarán las políticas de devolución vigentes.',
    'Esta boleta es un comprobante digital verificable. El código QR vinculado a esta boleta permite la consulta en tiempo real del estado de su participación.',
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900">
      {/* Hero Header */}
      <div className="relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(59,130,246,0.15),transparent_50%)]" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl" />
        
        <div className="relative max-w-lg mx-auto px-4 pt-8 pb-4">
          {/* Verified Badge */}
          <div className="flex justify-center mb-6">
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full px-4 py-2">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-300 text-sm font-medium tracking-wide">BOLETA VERIFICADA</span>
              <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />
              </svg>
            </div>
          </div>

          {/* Boleta Number - Hero */}
          <div className="text-center mb-6">
            <p className="text-blue-400/60 text-xs uppercase tracking-[0.3em] mb-2">{rifa.nombre}</p>
            <div className="relative inline-block">
              <div className="text-4xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-blue-200 leading-tight tracking-tight">
                {formatBoletaNumeros(boleta.numeros, boleta.numero)}
              </div>
              <div className="absolute -inset-4 bg-blue-500/5 rounded-2xl -z-10 blur-xl" />
            </div>
            <p className="text-slate-500 text-xs mt-3 font-mono">{boleta.barcode}</p>
          </div>

          {/* Estado Badge */}
          <div className="flex justify-center mb-8">
            <div className={`bg-gradient-to-r ${estado.bg} rounded-xl px-6 py-3 shadow-lg shadow-black/20`}>
              <div className="flex items-center gap-3">
                <span className="text-2xl">{estado.icon}</span>
                <div>
                  <p className={`text-lg font-bold ${estado.text}`}>{estado.label}</p>
                  {cliente && <p className={`text-sm ${estado.text} opacity-80`}>{cliente.nombre}</p>}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Cards */}
      <div className="max-w-lg mx-auto px-4 pb-12 space-y-4">

        {/* Cliente Card */}
        {cliente && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-blue-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
                </svg>
              </div>
              <h3 className="text-white font-semibold">Titular de la Boleta</h3>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 text-sm">Nombre</span>
                <span className="text-white font-medium">{cliente.nombre}</span>
              </div>
              {cliente.identificacion && (
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 text-sm">Documento</span>
                  <span className="text-slate-300 font-mono text-sm">{cliente.identificacion}</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Financiero Card */}
        {financiero && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75M15 10.5a3 3 0 11-6 0 3 3 0 016 0zm3 0h.008v.008H18V10.5zm-12 0h.008v.008H6V10.5z" />
                </svg>
              </div>
              <h3 className="text-white font-semibold">Información Financiera</h3>
            </div>

            {/* Progress Bar */}
            <div className="mb-5">
              <div className="flex justify-between text-sm mb-2">
                <span className="text-slate-400">Progreso de pago</span>
                <span className="text-emerald-400 font-bold">{financiero.porcentaje_pagado}%</span>
              </div>
              <div className="h-3 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-emerald-500 to-green-400 rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${Math.min(financiero.porcentaje_pagado, 100)}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">Valor Boleta</p>
                <p className="text-white font-bold text-sm">{formatCurrency(financiero.monto_total)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 text-center">
                <p className="text-slate-500 text-xs mb-1">Total Abonado</p>
                <p className="text-emerald-400 font-bold text-sm">{formatCurrency(financiero.abono_total)}</p>
              </div>
              <div className="bg-slate-900/50 rounded-xl p-3 text-center col-span-2">
                <p className="text-slate-500 text-xs mb-1">Saldo Pendiente</p>
                <p className={`font-bold text-lg ${financiero.saldo_pendiente > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {financiero.saldo_pendiente > 0 ? formatCurrency(financiero.saldo_pendiente) : '✓ Pago completo'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Historial de Abonos */}
        {abonos.length > 0 && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 bg-violet-500/10 rounded-xl flex items-center justify-center">
                <svg className="w-5 h-5 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                </svg>
              </div>
              <div>
                <h3 className="text-white font-semibold">Historial de Abonos</h3>
                <p className="text-slate-500 text-xs">{abonos.length} {abonos.length === 1 ? 'pago registrado' : 'pagos registrados'}</p>
              </div>
            </div>

            <div className="space-y-3">
              {abonos.map((abono, i) => (
                <div key={i} className="bg-slate-900/50 rounded-xl p-4 border border-slate-700/30">
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${abono.estado === 'CONFIRMADO' ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                      <span className="text-white font-semibold">{formatCurrency(abono.monto)}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${
                      abono.estado === 'CONFIRMADO' 
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}>
                      {abono.estado}
                    </span>
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>{abono.metodo_pago || 'Sin especificar'}</span>
                    <span>{formatDate(abono.fecha)}</span>
                  </div>
                  {abono.referencia && (
                    <p className="text-xs text-slate-600 mt-1 font-mono">Ref: {abono.referencia}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Info de la Proyecto */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />
              </svg>
            </div>
            <h3 className="text-white font-semibold">Información del proyecto</h3>
          </div>
          
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Proyecto</span>
              <span className="text-white font-medium text-right text-sm max-w-[60%]">{rifa.nombre}</span>
            </div>
            {rifa.premio_principal && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Premio</span>
                <span className="text-amber-400 font-semibold text-sm text-right max-w-[60%]">{rifa.premio_principal}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Precio Boleta</span>
              <span className="text-white font-medium text-sm">{formatCurrency(rifa.precio_boleta)}</span>
            </div>
            {rifa.fecha_sorteo && (
              <div className="flex justify-between">
                <span className="text-slate-400 text-sm">Fecha Sorteo</span>
                <span className="text-white text-sm">{formatDate(rifa.fecha_sorteo)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-slate-400 text-sm">Total Boletas</span>
              <span className="text-slate-300 text-sm">{rifa.total_boletas.toLocaleString('es-CO')}</span>
            </div>
          </div>
        </div>

        {/* Cláusulas */}
        <div className="bg-slate-800/50 backdrop-blur-sm rounded-2xl border border-slate-700/50 p-5 shadow-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-slate-500/10 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div>
              <h3 className="text-white font-semibold">Términos y Condiciones</h3>
              <p className="text-slate-500 text-xs">Cláusulas aplicables a esta boleta</p>
            </div>
          </div>
          
          <div className="space-y-3">
            {clausulas.map((clausula, i) => (
              <div key={i} className="flex gap-3">
                <div className="flex-shrink-0 w-6 h-6 bg-slate-700/50 rounded-lg flex items-center justify-center mt-0.5">
                  <span className="text-slate-500 text-xs font-bold">{i + 1}</span>
                </div>
                <p className="text-slate-400 text-sm leading-relaxed">{clausula}</p>
              </div>
            ))}
          </div>

          {/* Términos personalizados del proyecto */}
          {rifa.terminos_condiciones && (
            <div className="mt-5 pt-4 border-t border-slate-700/50">
              <p className="text-slate-500 text-xs uppercase tracking-wider mb-2">Condiciones específicas de este proyecto</p>
              <p className="text-slate-400 text-sm leading-relaxed">{rifa.terminos_condiciones}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center pt-6 pb-4">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <p className="text-slate-500 text-xs">Verificación realizada el {formatDate(data.verificado_en)}</p>
          </div>
          <p className="text-slate-600 text-xs">
            Este es un documento digital verificable. El código QR de su boleta<br />
            está vinculado de forma única e intransferible a este registro.
          </p>
          <div className="mt-4 flex items-center justify-center gap-3">
            <div className="h-px bg-slate-700 w-12" />
            <svg className="w-5 h-5 text-slate-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10zm-1-7v2h2v-2h-2zm0-8v6h2V7h-2z"/>
            </svg>
            <div className="h-px bg-slate-700 w-12" />
          </div>
          <p className="text-slate-700 text-[10px] mt-2 uppercase tracking-widest">Combo Toyotas</p>
        </div>
      </div>
    </div>
  )
}
