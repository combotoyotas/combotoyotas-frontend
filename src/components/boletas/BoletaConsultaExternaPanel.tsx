'use client'

import {
  type BoletaBusquedaExterna,
  etiquetaEstadoBoletaBusqueda,
  ubicacionBoletaBusqueda,
} from '@/lib/boletaConsultaBusqueda'
import { formatBoletaNumeros } from '@/utils/formatBoletaNumeros'

type Props = {
  loading: boolean
  notFound: boolean
  numeroBuscado: number | null
  data: BoletaBusquedaExterna | null
}

export default function BoletaConsultaExternaPanel({
  loading,
  notFound,
  numeroBuscado,
  data,
}: Props) {
  if (numeroBuscado == null) return null

  if (loading) {
    return (
      <div
        className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-sm text-slate-600"
        role="status"
        aria-live="polite"
      >
        Consultando boleta #{String(numeroBuscado).padStart(4, '0')}…
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-5 text-center text-sm text-amber-900">
        No hay boleta con el número{' '}
        <span className="font-mono font-bold">#{String(numeroBuscado).padStart(4, '0')}</span> en este
        proyecto.
      </div>
    )
  }

  if (!data) return null

  const numeroFmt = formatBoletaNumeros(data.numeros, data.numero)
  const ubicacion = ubicacionBoletaBusqueda(data)
  const estado = etiquetaEstadoBoletaBusqueda(data)

  return (
    <div className="rounded-xl border border-violet-200 bg-violet-50/80 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-violet-100 bg-white/60">
        <p className="text-xs font-semibold uppercase tracking-wide text-violet-700">
          Boleta fuera de tu listado
        </p>
        <p className="text-sm text-slate-600 mt-0.5">
          Este número existe en el proyecto pero no está en tu inventario asignado.
        </p>
      </div>
      <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 px-4 py-4 text-sm">
        <div>
          <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Número</dt>
          <dd className="mt-1 font-mono text-lg font-bold text-slate-900">#{numeroFmt}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Inventario</dt>
          <dd className="mt-1 font-medium text-slate-900">{ubicacion}</dd>
        </div>
        <div>
          <dt className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Estado</dt>
          <dd className="mt-1 font-medium text-slate-900">{estado}</dd>
        </div>
      </dl>
    </div>
  )
}