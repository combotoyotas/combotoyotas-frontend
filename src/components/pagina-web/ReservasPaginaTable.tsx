'use client'

import { useState } from 'react'
import { paginasWebApi, type PaginaContactoItem } from '@/lib/paginasWebApi'
import {
  aplicarPlantillaPagina,
  etiquetaEstadoReserva,
  formatoBoletasNumeros,
  whatsAppClienteDesdeReserva,
} from '@/utils/paginaWebMensaje'

export type ReservaPaginaRow = {
  id: string
  cliente_nombre: string
  cliente_identificacion?: string
  cliente_telefono?: string
  estado_venta: string
  monto_total: number
  rifa_nombre: string
  cantidad_boletas: number
  numeros_boletas?: number[]
  created_at: string
}

function formatoFecha(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-CO', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function formatoCOP(n: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(n)
}

export default function ReservasPaginaTable({
  reservas,
  onActualizada,
  plantilla,
  medios,
}: {
  reservas: ReservaPaginaRow[]
  onActualizada: () => void
  plantilla: string | null
  medios: PaginaContactoItem[]
}) {
  const [busyId, setBusyId] = useState<string | null>(null)

  const contactar = async (r: ReservaPaginaRow) => {
    const boletas = formatoBoletasNumeros(r.numeros_boletas || [])
    const mensaje = aplicarPlantillaPagina(plantilla, {
      nombre: r.cliente_nombre,
      cedula: r.cliente_identificacion,
      rifa: r.rifa_nombre,
      boletas,
      total: formatoCOP(r.monto_total),
      medios,
    })
    const url = whatsAppClienteDesdeReserva(r.cliente_telefono, mensaje)
    if (!url) {
      alert('El cliente no tiene teléfono válido para WhatsApp.')
      return
    }
    setBusyId(r.id)
    try {
      if (r.estado_venta === 'SIN_REVISAR') {
        await paginasWebApi.marcarReservaContactada(r.id)
        onActualizada()
      }
    } catch {
      /* abrir WA igual */
    } finally {
      setBusyId(null)
    }
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!reservas.length) {
    return (
      <p className="text-center text-slate-500 py-12 text-sm border border-dashed border-slate-200 rounded-xl bg-white">
        Aún no hay reservas desde tu enlace público.
      </p>
    )
  }

  return (
    <>
      {/* Móvil y tablet: tarjetas (sin scroll horizontal) */}
      <ul className="space-y-3 md:hidden">
        {reservas.map((r) => (
          <ReservaCard
            key={r.id}
            reserva={r}
            busy={busyId === r.id}
            onContactar={() => contactar(r)}
          />
        ))}
      </ul>

      {/* Escritorio: tabla compacta sin columna rifa */}
      <div className="hidden md:block rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-sm table-fixed">
          <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="w-[22%] px-3 py-3 font-semibold">Fecha</th>
              <th className="w-[26%] px-3 py-3 font-semibold">Cliente</th>
              <th className="w-[22%] px-3 py-3 font-semibold">Boletas</th>
              <th className="w-[12%] px-3 py-3 font-semibold">Estado</th>
              <th className="w-[10%] px-3 py-3 font-semibold">Total</th>
              <th className="w-[8%] px-3 py-3 font-semibold text-right"> </th>
            </tr>
          </thead>
          <tbody>
            {reservas.map((r) => {
              const est = etiquetaEstadoReserva(r.estado_venta)
              const sinTel = !r.cliente_telefono?.trim()
              return (
                <tr key={r.id} className="border-t border-slate-100 hover:bg-slate-50/80">
                  <td className="px-3 py-3 text-slate-600 text-xs leading-snug">
                    {formatoFecha(r.created_at)}
                  </td>
                  <td className="px-3 py-3 min-w-0">
                    <span className="font-medium text-slate-900 block truncate">{r.cliente_nombre}</span>
                    {r.cliente_identificacion ? (
                      <span className="text-xs text-slate-500">CC {r.cliente_identificacion}</span>
                    ) : null}
                  </td>
                  <td className="px-3 py-3 font-mono text-xs text-slate-800 break-words">
                    {formatoBoletasNumeros(r.numeros_boletas || [])}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.className}`}
                    >
                      {est.label}
                    </span>
                  </td>
                  <td className="px-3 py-3 font-medium text-slate-900 text-xs">
                    {formatoCOP(r.monto_total)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <button
                      type="button"
                      disabled={busyId === r.id || sinTel}
                      onClick={() => contactar(r)}
                      className="inline-flex rounded-lg bg-[#25D366] text-white text-xs font-bold px-2.5 py-1.5 disabled:opacity-40"
                    >
                      {busyId === r.id ? '…' : r.estado_venta === 'SIN_REVISAR' ? 'Contactar' : 'WA'}
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ReservaCard({
  reserva: r,
  busy,
  onContactar,
}: {
  reserva: ReservaPaginaRow
  busy: boolean
  onContactar: () => void
}) {
  const est = etiquetaEstadoReserva(r.estado_venta)
  const sinTel = !r.cliente_telefono?.trim()
  const boletas = formatoBoletasNumeros(r.numeros_boletas || [])

  return (
    <li className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900 truncate">{r.cliente_nombre}</p>
          {r.cliente_identificacion ? (
            <p className="text-xs text-slate-500 mt-0.5">CC {r.cliente_identificacion}</p>
          ) : null}
        </div>
        <span
          className={`shrink-0 inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${est.className}`}
        >
          {est.label}
        </span>
      </div>

      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-xs mb-3">
        <dt className="text-slate-400">Fecha</dt>
        <dd className="text-slate-700">{formatoFecha(r.created_at)}</dd>
        <dt className="text-slate-400">Boletas</dt>
        <dd className="font-mono text-slate-800 break-words">{boletas}</dd>
        <dt className="text-slate-400">Total</dt>
        <dd className="font-semibold text-slate-900">{formatoCOP(r.monto_total)}</dd>
      </dl>

      {sinTel ? <p className="text-xs text-red-500 mb-2">Sin teléfono — no se puede contactar</p> : null}

      <button
        type="button"
        disabled={busy || sinTel}
        onClick={onContactar}
        className="w-full rounded-lg bg-[#25D366] text-white text-sm font-bold py-2.5 disabled:opacity-40 active:scale-[0.99]"
      >
        {busy ? 'Abriendo…' : r.estado_venta === 'SIN_REVISAR' ? 'Contactar por WhatsApp' : 'WhatsApp'}
      </button>
    </li>
  )
}