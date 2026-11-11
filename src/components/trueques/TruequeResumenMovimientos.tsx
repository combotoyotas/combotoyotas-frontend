'use client'

export type TruequeTipoOp = 'TRUEQUE' | 'ENVIO_A_B' | 'ENVIO_B_A'

export type MovimientoTrueque = {
  numero: number
  desde: string
  hacia: string
}

export function buildMovimientos(
  tipo: TruequeTipoOp,
  numerosA: number[],
  numerosB: number[],
  labelA: string,
  labelB: string
): MovimientoTrueque[] {
  const lines: MovimientoTrueque[] = []
  if (tipo === 'TRUEQUE') {
    for (const n of numerosA) {
      lines.push({ numero: n, desde: labelA, hacia: labelB })
    }
    for (const n of numerosB) {
      lines.push({ numero: n, desde: labelB, hacia: labelA })
    }
    return lines
  }
  if (tipo === 'ENVIO_A_B') {
    for (const n of numerosA) {
      lines.push({ numero: n, desde: labelA, hacia: labelB })
    }
    return lines
  }
  for (const n of numerosB) {
    lines.push({ numero: n, desde: labelB, hacia: labelA })
  }
  return lines
}

const fmt = (n: number) => String(n).padStart(4, '0')

type Props = {
  tipo: TruequeTipoOp
  movimientos: MovimientoTrueque[]
  variante?: 'preview' | 'hecho'
}

export default function TruequeResumenMovimientos({ tipo, movimientos, variante = 'preview' }: Props) {
  const titulo =
    tipo === 'TRUEQUE'
      ? variante === 'hecho'
        ? 'Trueque realizado'
        : 'Así quedará el trueque'
      : variante === 'hecho'
        ? 'Envío realizado'
        : 'Así quedará el envío'

  const grupos = movimientos.reduce(
    (acc, m) => {
      const key = `${m.desde}→${m.hacia}`
      if (!acc[key]) acc[key] = { desde: m.desde, hacia: m.hacia, numeros: [] as number[] }
      acc[key].numeros.push(m.numero)
      return acc
    },
    {} as Record<string, { desde: string; hacia: string; numeros: number[] }>
  )

  return (
    <div className="space-y-3">
      <p className="text-xs font-bold uppercase tracking-wide text-slate-500">{titulo}</p>
      <ul className="space-y-3 max-h-[280px] overflow-y-auto pr-1">
        {Object.values(grupos).map((g) => (
          <li
            key={`${g.desde}-${g.hacia}`}
            className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-sm"
          >
            <div className="flex flex-wrap items-center gap-1.5 text-slate-700 mb-2">
              <span className="font-medium text-slate-900">{g.desde}</span>
              <span className="text-slate-400" aria-hidden>
                →
              </span>
              <span className="font-medium text-slate-900">{g.hacia}</span>
              <span className="text-xs text-slate-500 ml-auto">{g.numeros.length} boleta(s)</span>
            </div>
            <div className="flex flex-wrap gap-1">
              {g.numeros.sort((a, b) => a - b).map((n) => (
                <span
                  key={n}
                  className="font-mono text-xs px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-800"
                >
                  #{fmt(n)}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
      {movimientos.length > 0 && movimientos.length <= 24 && (
        <div className="border-t border-slate-200 pt-3">
          <p className="text-[10px] font-bold uppercase text-slate-400 mb-2">Detalle por boleta</p>
          <ul className="space-y-1.5 text-xs">
            {movimientos.map((m) => (
              <li
                key={`${m.numero}-${m.desde}-${m.hacia}`}
                className="flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono bg-white border border-slate-100 rounded-lg px-2 py-1.5"
              >
                <span className="font-bold text-slate-900">#{fmt(m.numero)}</span>
                <span className="text-slate-400">·</span>
                <span className="text-slate-600">{m.desde}</span>
                <span className="text-emerald-600">→</span>
                <span className="text-slate-800 font-medium">{m.hacia}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {tipo === 'TRUEQUE' && movimientos.length >= 2 && (
        <p className="text-[11px] text-slate-500 leading-snug">
          Cada boleta sale del inventario de quien la tenía y entra al de la otra columna.
        </p>
      )}
    </div>
  )
}
