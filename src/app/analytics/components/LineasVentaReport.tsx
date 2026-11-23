'use client'

import { useMemo, useState } from 'react'

export type LineaVentaReporteRow = {
  linea_id: string
  linea_nombre: string
  boletas: number
  recaudo: number
}

type Props = {
  lineas: LineaVentaReporteRow[]
  fechaInicio?: string
  fechaFin?: string
}

export default function LineasVentaReport({ lineas, fechaInicio, fechaFin }: Props) {
  const [lineaFiltro, setLineaFiltro] = useState<string>('todas')

  const opciones = useMemo(
    () => [
      { id: 'todas', nombre: 'Todas las líneas' },
      ...lineas.map((l) => ({ id: l.linea_id, nombre: l.linea_nombre })),
    ],
    [lineas]
  )

  const filas = useMemo(() => {
    if (lineaFiltro === 'todas') return lineas
    return lineas.filter((l) => l.linea_id === lineaFiltro)
  }, [lineas, lineaFiltro])

  const totales = useMemo(
    () =>
      filas.reduce(
        (acc, row) => ({
          boletas: acc.boletas + row.boletas,
          recaudo: acc.recaudo + row.recaudo,
        }),
        { boletas: 0, recaudo: 0 }
      ),
    [filas]
  )

  if (!lineas.length) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 text-sm text-slate-500">
        No hay ventas con línea de venta en el periodo seleccionado. La línea se guarda al reservar o
        vender (la primera que elijas en ese momento).
      </div>
    )
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-6 space-y-4 min-w-0">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-900">Por línea de venta</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Boletas vendidas en el periodo y recaudo de abonos confirmados, agrupados según la línea
            elegida al crear la venta o reserva (los abonos siguen esa misma venta).
            {fechaInicio && fechaFin ? ` (${fechaInicio} → ${fechaFin})` : ''}
          </p>
        </div>
        <label className="flex flex-col gap-1 text-xs text-slate-600 shrink-0">
          Filtrar línea
          <select
            value={lineaFiltro}
            onChange={(e) => setLineaFiltro(e.target.value)}
            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm min-h-[44px] bg-white min-w-[12rem]"
          >
            {opciones.map((o) => (
              <option key={o.id} value={o.id}>
                {o.nombre}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="overflow-x-auto -mx-1">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-50 text-slate-500 text-xs uppercase">
            <tr>
              <th className="px-3 py-2 text-left">Línea</th>
              <th className="px-3 py-2 text-right">Boletas</th>
              <th className="px-3 py-2 text-right">Recaudo</th>
            </tr>
          </thead>
          <tbody>
            {filas.map((row) => (
              <tr key={row.linea_id} className="border-t border-slate-100">
                <td className="px-3 py-2.5 font-medium text-slate-800">{row.linea_nombre}</td>
                <td className="px-3 py-2.5 text-right tabular-nums">{row.boletas}</td>
                <td className="px-3 py-2.5 text-right tabular-nums font-medium text-indigo-700">
                  ${row.recaudo.toLocaleString('es-CO')}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t-2 border-slate-200 bg-slate-50/80 text-slate-800">
            <tr>
              <td className="px-3 py-2.5 font-semibold">Total{lineaFiltro !== 'todas' ? ' (filtro)' : ''}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">{totales.boletas}</td>
              <td className="px-3 py-2.5 text-right font-semibold tabular-nums">
                ${totales.recaudo.toLocaleString('es-CO')}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}