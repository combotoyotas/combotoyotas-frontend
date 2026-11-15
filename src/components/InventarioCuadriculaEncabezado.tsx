'use client'

import Image from 'next/image'
import {
  MARCA_RIFAS,
  PREFIJO_PREMIO_ANTICIPADO,
  PREFIJO_PREMIO_MAYOR,
  cuerpoPremioAnticipado,
  cuerpoPremioMayor,
  lineaVendedor,
} from '@/lib/inventarioEncabezado'

type Props = {
  rifaNombre?: string
  vendedorNombre?: string | null
}

/** Misma estructura que el encabezado del PDF de inventario vendedor. */
export default function InventarioCuadriculaEncabezado({ rifaNombre, vendedorNombre }: Props) {
  const premioMayor = cuerpoPremioMayor(rifaNombre || '')
  const premioAnticipado = cuerpoPremioAnticipado()
  const vendedor = lineaVendedor(vendedorNombre)

  return (
    <div className="shrink-0 flex gap-2 sm:gap-3 p-1.5 sm:p-2 border-b border-slate-200 bg-white text-black leading-snug">
      <div className="shrink-0 flex items-start">
        <Image
          src="/icons/combotoyotas-logo.png"
          alt=""
          width={56}
          height={56}
          className="w-10 h-10 sm:w-14 sm:h-14 object-contain"
          priority
        />
      </div>
      <div className="min-w-0 flex-1 space-y-0.5 sm:space-y-1 text-[7px] sm:text-[8.5px] lg:text-[9px]">
        <p className="font-bold text-[9px] sm:text-[11px] tracking-tight">{MARCA_RIFAS}</p>
        <p className="text-left">
          <span className="font-bold">{PREFIJO_PREMIO_MAYOR}</span>
          <span className="font-normal">{premioMayor}</span>
        </p>
        <p className="text-left">
          <span className="font-bold">{PREFIJO_PREMIO_ANTICIPADO}</span>
          <span className="font-normal">{premioAnticipado}</span>
        </p>
        <p className="font-bold text-[8px] sm:text-[10px] pt-0.5">{vendedor}</p>
      </div>
    </div>
  )
}