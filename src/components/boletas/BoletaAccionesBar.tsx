'use client'

import { useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  buildBoletaMenuActions,
  type BoletaEstadoInfo,
  type BoletaMenuAction,
} from '@/components/boletas/BoletaOpcionesMenu'
import type { Boleta, BoletaDetail } from '@/types/boleta'
import type { Rifa } from '@/types/rifa'

type Props = {
  boleta: Boleta | BoletaDetail
  rifaId?: string | null
  rifaInfo?: Rifa | null
  estadoInfo: BoletaEstadoInfo
  onImprimir: () => void
  onEditarNota?: () => void
  /** En la página de detalle no mostrar «Ver detalle». */
  ocultarVerDetalle?: boolean
}

function toBoletaLista(b: Boleta | BoletaDetail): Boleta {
  if ('tiene_cliente' in b && 'tipo_estado' in b) return b as Boleta
  const d = b as BoletaDetail
  return {
    id: d.id,
    numero: d.numero,
    numeros: d.numeros,
    venta_id: d.venta_id,
    estado: d.estado,
    qr_url: d.qr_url,
    barcode: d.barcode,
    cliente_info: d.cliente_info ?? null,
    vendedor_info: d.vendedor_info ?? null,
    tiene_cliente: Boolean(d.cliente_info),
    tipo_estado: 'DISPONIBLE',
    bloqueo_hasta: d.bloqueo_hasta,
    imagen_url: d.imagen_url,
    nota: d.nota,
  }
}

function btnClass(action: BoletaMenuAction): string {
  const base =
    'min-h-[44px] w-full sm:w-auto sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed'
  switch (action.id) {
    case 'vender':
      return `${base} bg-indigo-600 text-white hover:bg-indigo-700`
    case 'abonar':
      return `${base} bg-green-600 text-white hover:bg-green-700`
    case 'recordatorio':
      return `${base} bg-amber-600 text-white hover:bg-amber-700`
    case 'print':
      return `${base} bg-blue-600 text-white hover:bg-blue-700`
    case 'whatsapp':
      return `${base} bg-emerald-600 text-white hover:bg-emerald-700`
    case 'nota':
      return `${base} border border-slate-300 text-slate-800 bg-white hover:bg-slate-50`
    case 'ver':
      return `${base} bg-slate-700 text-white hover:bg-slate-800`
    default:
      return `${base} bg-slate-700 text-white hover:bg-slate-800`
  }
}

export default function BoletaAccionesBar({
  boleta,
  rifaId,
  rifaInfo,
  estadoInfo,
  onImprimir,
  onEditarNota,
  ocultarVerDetalle = false,
}: Props) {
  const router = useRouter()
  const boletaLista = useMemo(() => toBoletaLista(boleta), [boleta])

  const actions = useMemo(() => {
    const list = buildBoletaMenuActions({
      boleta: boletaLista,
      rifaInfo,
      rifaId,
      estadoInfo,
      onVerDetalle: () => router.push(`/boletas/${boletaLista.id}`),
      onImprimir,
      onEditarNota,
      onIrAVender: (href) => router.push(href),
      onIrAAbonar: (href) => router.push(href),
      onClose: () => {},
    })
    return ocultarVerDetalle ? list.filter((a) => a.id !== 'ver') : list
  }, [boletaLista, rifaInfo, rifaId, estadoInfo, onImprimir, onEditarNota, ocultarVerDetalle, router])

  if (actions.length === 0) return null

  return (
    <div className="flex flex-wrap gap-2 w-full sm:w-auto sm:justify-end">
      {actions.map((action) => (
        <button
          key={action.id}
          type="button"
          disabled={action.disabled}
          title={action.hint}
          onClick={action.onClick}
          className={btnClass(action)}
        >
          <span className="shrink-0 scale-90">{action.icon}</span>
          <span className="truncate">{action.label}</span>
        </button>
      ))}
    </div>
  )
}