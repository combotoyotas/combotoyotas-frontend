'use client'

import { useEffect } from 'react'

export type AsignacionResumenData = {
  rifaNombre: string
  modo: string
  serie: number | null
  vendedorNombre: string
  pedidas: number
  asignadas: number
  omitidas: number
  pachas: { par: string; numeros: number[]; boleta_id?: string }[]
  porSerie?: { serie: number; pedidas: number; asignadas: number }[]
}

type Props = {
  data: AsignacionResumenData | null
  onClose: () => void
}

export default function AsignacionResumenModal({ data, onClose }: Props) {
  useEffect(() => {
    if (data) document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = 'unset'
    }
  }, [data])

  if (!data) return null

  const modoLabel =
    data.modo === 'SERIES_LOTE'
      ? 'Varias series (aleatorio en pool)'
      : data.modo === 'SERIE'
        ? `Serie ${data.serie ?? '—'} (aleatorio en pool)`
        : data.modo === 'NUMEROS'
          ? 'Números específicos'
          : data.modo

  const exitoTotal = data.asignadas > 0 && data.omitidas === 0
  const exitoParcial = data.asignadas > 0 && data.omitidas > 0

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50">
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[min(90vh,640px)] flex flex-col overflow-hidden"
        role="dialog"
        aria-labelledby="asignacion-resumen-title"
      >
        <div
          className={`px-5 py-4 border-b ${
            data.asignadas === 0
              ? 'bg-red-50 border-red-100'
              : exitoTotal
                ? 'bg-emerald-50 border-emerald-100'
                : 'bg-amber-50 border-amber-100'
          }`}
        >
          <h2 id="asignacion-resumen-title" className="text-lg font-semibold text-slate-900">
            {data.asignadas === 0
              ? 'No se asignó inventario'
              : exitoTotal
                ? 'Asignación completada'
                : 'Asignación parcial'}
          </h2>
          <p className="text-sm text-slate-600 mt-1">{data.rifaNombre}</p>
        </div>

        <div className="px-5 py-4 overflow-y-auto flex-1 space-y-4">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Vendedor
              </dt>
              <dd className="font-semibold text-slate-900">{data.vendedorNombre}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Modo
              </dt>
              <dd className="font-medium text-slate-800">{modoLabel}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Asignadas
              </dt>
              <dd className="font-bold text-emerald-700 tabular-nums">
                {data.asignadas}
                <span className="text-slate-400 font-normal"> / {data.pedidas}</span>
              </dd>
            </div>
            {data.omitidas > 0 && (
              <div>
                <dt className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  No asignadas
                </dt>
                <dd className="font-bold text-amber-700 tabular-nums">{data.omitidas}</dd>
              </div>
            )}
          </dl>

          {data.porSerie && data.porSerie.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                Por serie
              </p>
              <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 text-sm">
                {data.porSerie.map((row) => (
                  <li
                    key={row.serie}
                    className="flex justify-between gap-3 px-3 py-2 bg-white tabular-nums"
                  >
                    <span className="font-medium text-slate-800">Serie {row.serie}</span>
                    <span className="text-slate-600">
                      <span className="font-semibold text-emerald-700">{row.asignadas}</span>
                      <span className="text-slate-400"> / {row.pedidas}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {data.asignadas === 0 ? (
            <p className="text-sm text-red-800 bg-red-50 rounded-xl px-3 py-2">
              Ninguna boleta quedó libre para asignar (ya tienen dueño, venta en curso o bloqueo).
            </p>
          ) : (
            <>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Boletas asignadas ({data.pachas.length})
                </p>
                <ul className="rounded-xl border border-slate-200 divide-y divide-slate-100 max-h-52 overflow-y-auto">
                  {data.pachas.map((p, idx) => (
                    <li
                      key={p.boleta_id ?? `${idx}-${p.par}`}
                      className="px-3 py-2 text-sm font-semibold tabular-nums text-slate-800 bg-white"
                    >
                      {p.par}
                    </li>
                  ))}
                </ul>
              </div>
              {exitoParcial && (
                <p className="text-xs text-amber-900 bg-amber-50 rounded-xl px-3 py-2">
                  Algunas boletas pedidas no se asignaron porque dejaron de estar disponibles en el
                  pool.
                </p>
              )}
            </>
          )}
        </div>

        <div className="px-5 py-4 border-t border-slate-100 bg-slate-50/80">
          <button
            type="button"
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-medium text-sm hover:bg-indigo-700"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  )
}
