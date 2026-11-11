'use client'

export type VerificacionItem = {
  numero_solicitado: number
  codigo: string
  mensaje: string
  asignable?: boolean
  liberable?: boolean
  par?: string
  inventario_de?: string | null
}

type Props = {
  titulo: string
  cargando: boolean
  items: VerificacionItem[] | null
  resumen: { total: number; asignables?: number; liberables?: number; bloqueados: number } | null
  modo: 'ASIGNAR' | 'QUITAR'
  errorParseo?: string | null
}

const formatNumero = (n: number) => String(n).padStart(4, '0')

const ESTILO: Record<string, { dot: string; badge: string; label: string }> = {
  ASIGNABLE: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    label: 'Lista',
  },
  LIBERABLE: {
    dot: 'bg-emerald-500',
    badge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    label: 'Libera',
  },
  YA_EN_VENDEDOR: {
    dot: 'bg-slate-400',
    badge: 'bg-slate-100 text-slate-600 border-slate-200',
    label: 'Ya asignada',
  },
  YA_ASIGNADA: {
    dot: 'bg-amber-500',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    label: 'Otro vendedor',
  },
  EN_POOL_ADMIN: {
    dot: 'bg-indigo-400',
    badge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    label: 'Pool admin',
  },
  NO_DISPONIBLE: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200',
    label: 'No disponible',
  },
  NO_LIBERABLE: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200',
    label: 'No libera',
  },
  CON_CLIENTE: {
    dot: 'bg-red-500',
    badge: 'bg-red-50 text-red-800 border-red-200',
    label: 'Con cliente',
  },
  BLOQUEADA: {
    dot: 'bg-amber-600',
    badge: 'bg-amber-50 text-amber-900 border-amber-200',
    label: 'Bloqueada',
  },
  NO_ENCONTRADA: {
    dot: 'bg-slate-300',
    badge: 'bg-slate-100 text-slate-500 border-slate-200',
    label: 'No existe',
  },
}

function estilo(codigo: string) {
  return ESTILO[codigo] || ESTILO.NO_ENCONTRADA
}

export default function VerificacionNumerosPanel({
  titulo,
  cargando,
  items,
  resumen,
  modo,
  errorParseo,
}: Props) {
  if (errorParseo) {
    return (
      <div className="mt-3 rounded-xl border border-red-200 bg-red-50/80 px-3 py-2 text-xs text-red-800">
        {errorParseo}
      </div>
    )
  }

  if (!items && !cargando) return null

  const okCount =
    modo === 'ASIGNAR' ? resumen?.asignables ?? 0 : resumen?.liberables ?? 0
  const total = resumen?.total ?? 0

  return (
    <div className="mt-3 rounded-xl border border-slate-200/90 bg-slate-50/50 overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-slate-200/80 bg-white/80">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-slate-600">{titulo}</p>
        {cargando ? (
          <span className="text-xs text-slate-500 flex items-center gap-2">
            <span className="w-3 h-3 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            Comprobando…
          </span>
        ) : resumen ? (
          <span className="text-xs font-semibold tabular-nums">
            <span className="text-emerald-700">{okCount}</span>
            <span className="text-slate-400"> / {total}</span>
            <span className="text-slate-500 font-normal ml-1">
              {modo === 'ASIGNAR' ? 'asignables' : 'liberables'}
            </span>
          </span>
        ) : null}
      </div>

      {items && items.length > 0 && (
        <ul className="max-h-48 overflow-y-auto divide-y divide-slate-100">
          {items.map((item, index) => {
            const s = estilo(item.codigo)
            return (
              <li
                key={`${index}-${item.numero_solicitado}`}
                className="flex items-start gap-2 px-3 py-2 text-xs bg-white/60"
              >
                <span className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${s.dot}`} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold tabular-nums text-slate-900">
                      #{formatNumero(item.numero_solicitado)}
                    </span>
                    <span
                      className={`inline-flex px-1.5 py-0.5 rounded-md border text-[10px] font-semibold uppercase tracking-wide ${s.badge}`}
                    >
                      {s.label}
                    </span>
                  </div>
                  <p className="text-slate-600 mt-0.5 leading-snug">{item.mensaje}</p>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      {!cargando && resumen && okCount === 0 && total > 0 && (
        <p className="px-3 py-2 text-xs text-amber-800 bg-amber-50/90 border-t border-amber-100">
          Ningún número de la lista se puede {modo === 'ASIGNAR' ? 'asignar' : 'liberar'} ahora.
          Revisa el detalle arriba.
        </p>
      )}
    </div>
  )
}
