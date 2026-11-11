'use client'

import { useMemo, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export type CuadriculaBoleta = {
  id: string
  numero: number
  numero_principal: number
  estado: string
  tipo_estado: string
  /** true = se puede comprar (disponible y sin bloqueo activo) */
  comprable?: boolean
}

type Alcance = 'pool_libre' | 'inventario_vendedor' | 'todas'

interface BoletaCuadriculaProps {
  boletas: CuadriculaBoleta[]
  rifaNombre?: string
  alcance?: Alcance
  vendedorNombre?: string | null
  loading?: boolean
}

const PREFERRED_COLS = 12
const MAX_SHEET_ROWS = 30
const CELLS_PER_SHEET = PREFERRED_COLS * MAX_SHEET_ROWS

function chunkSheet<T>(items: T[], size: number): T[][] {
  if (items.length === 0) return [[]]
  const sheets: T[][] = []
  for (let i = 0; i < items.length; i += size) {
    sheets.push(items.slice(i, i + size))
  }
  return sheets
}

/** Hoja fija 12×30 cuando la página está llena; última hoja con menos números. */
function layoutForSheet(countOnSheet: number) {
  const cols = PREFERRED_COLS
  if (countOnSheet >= CELLS_PER_SHEET) {
    return { cols, rows: MAX_SHEET_ROWS, totalCells: CELLS_PER_SHEET }
  }
  const rows = countOnSheet <= 0 ? 1 : Math.min(MAX_SHEET_ROWS, Math.ceil(countOnSheet / cols))
  return { cols, rows, totalCells: rows * cols }
}

function formatNumero(n: number) {
  return String(n).padStart(4, '0')
}

function isComprable(boleta: CuadriculaBoleta): boolean {
  if (typeof boleta.comprable === 'boolean') {
    return boleta.comprable
  }
  return String(boleta.estado || '').toUpperCase() === 'DISPONIBLE'
}

function cellStyles(boleta: CuadriculaBoleta) {
  if (isComprable(boleta)) {
    return 'bg-white text-slate-900'
  }
  return 'bg-emerald-300 text-emerald-950'
}

const cellBase =
  'min-h-0 min-w-0 w-full h-full flex items-center justify-center font-mono font-semibold border-0 p-0 leading-none text-[clamp(5px,2.35vw,11px)] sm:text-[10px]'

export default function BoletaCuadricula({
  boletas,
  rifaNombre,
  alcance,
  vendedorNombre,
  loading,
}: BoletaCuadriculaProps) {
  const router = useRouter()

  const [sheetIndex, setSheetIndex] = useState(0)

  const sorted = useMemo(
    () => [...boletas].sort((a, b) => a.numero_principal - b.numero_principal),
    [boletas]
  )

  const sheets = useMemo(() => chunkSheet(sorted, CELLS_PER_SHEET), [sorted])

  useEffect(() => {
    setSheetIndex(0)
  }, [boletas])

  const safeSheetIndex = Math.min(sheetIndex, Math.max(0, sheets.length - 1))
  const sheetBoletas = sheets[safeSheetIndex] || []

  const layout = useMemo(() => layoutForSheet(sheetBoletas.length), [sheetBoletas.length])

  const cells = useMemo(() => {
    const list: Array<CuadriculaBoleta | null> = sheetBoletas.map((b) => b)
    while (list.length < layout.totalCells) {
      list.push(null)
    }
    return list
  }, [sheetBoletas, layout.totalCells])

  const alcanceShort =
    alcance === 'inventario_vendedor' ? 'Inv.' : alcance === 'pool_libre' ? 'Pool' : 'Todas'

  if (loading) {
    return (
      <div className="flex flex-1 min-h-0 items-center justify-center text-slate-500 text-sm">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-slate-400 border-t-transparent mr-2" />
        Cargando…
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1 h-full min-h-0 overflow-hidden">
      <div className="shrink-0 flex items-center justify-between gap-1 px-0.5 py-0.5 text-[9px] sm:text-[10px] text-slate-600 border-b border-slate-100">
        <span className="truncate font-semibold text-slate-800 min-w-0">
          {rifaNombre || 'Proyecto'}
        </span>
        <span className="shrink-0 tabular-nums">
          {alcanceShort} · {layout.cols}×{layout.rows}
        </span>
        {sheets.length > 1 ? (
          <span className="shrink-0 flex items-center gap-0.5">
            <button
              type="button"
              disabled={safeSheetIndex <= 0}
              onClick={() => setSheetIndex((i) => Math.max(0, i - 1))}
              className="px-1 disabled:opacity-30"
              aria-label="Hoja anterior"
            >
              ←
            </button>
            <span className="font-mono">
              {safeSheetIndex + 1}/{sheets.length}
            </span>
            <button
              type="button"
              disabled={safeSheetIndex >= sheets.length - 1}
              onClick={() => setSheetIndex((i) => Math.min(sheets.length - 1, i + 1))}
              className="px-1 disabled:opacity-30"
              aria-label="Hoja siguiente"
            >
              →
            </button>
          </span>
        ) : (
          <span className="shrink-0 text-slate-400">1 hoja</span>
        )}
      </div>

      <div className="flex-1 min-h-0 w-full overflow-hidden">
        <div
          className="grid gap-px bg-slate-400 border border-slate-400 overflow-hidden w-full h-full min-h-0"
          style={{
            gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`,
            gridTemplateRows: `repeat(${layout.rows}, minmax(0, 1fr))`,
          }}
        >
          {cells.map((boleta, index) => {
            if (!boleta) {
              return <div key={`empty-${index}`} className={`${cellBase} bg-white`} aria-hidden />
            }

            const displayNum = boleta.numero_principal ?? boleta.numero
            return (
              <button
                key={boleta.id}
                type="button"
                onClick={() => router.push(`/boletas/${boleta.id}`)}
                className={`${cellBase} transition-colors active:opacity-80 ${cellStyles(boleta)}`}
                title={`#${formatNumero(displayNum)} · ${boleta.estado}`}
              >
                {formatNumero(displayNum)}
              </button>
            )
          })}
        </div>
      </div>

      <div className="shrink-0 flex justify-center gap-3 py-0.5 text-[7px] sm:text-[8px] text-slate-600 border-t border-slate-100">
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 border border-slate-300 bg-white" />
          Se puede comprar
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="w-2.5 h-2.5 bg-emerald-300 border border-emerald-400" />
          No disponible
        </span>
      </div>
    </div>
  )
}
